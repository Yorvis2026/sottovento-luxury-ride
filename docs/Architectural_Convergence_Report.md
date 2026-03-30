# Architectural Convergence Report: Sottovento Luxury Network

**Date:** 2026-03-27
**Author:** Manus AI
**Version:** 1.0

## Executive Summary

This report presents the findings of a comprehensive architectural convergence audit of the Sottovento Luxury Network (SLN) platform. The objective was to identify existing assets that align with the affiliate-network model, assess necessary adjustments, and pinpoint missing components before implementing further dispatch layers. 

The audit confirms that the platform has a robust foundation, particularly in lead attribution, network economics, and driver/vehicle compliance. The existing system was built with the affiliate concept in mind, even if the "company" layer itself is not fully integrated into the core dispatch loop. 

This document outlines a clear, low-risk path to extend the current architecture, prioritizing reuse and incremental evolution over replacement. The recommended sequence ensures that critical production flows—including the recently deployed Fee Split V2, Provisional Scoring, Vehicle Eligibility Gates (VEG), and Smart Dispatch Priority Engine—remain stable and are enhanced, not broken.

---

## SECTION A — Existing Assets Ready for Immediate Reuse

The following components are well-aligned with the affiliate-network model and can be leveraged directly with minimal to no modification.

| Category | Asset | Location / Implementation | Relevance to Affiliate Model |
| :--- | :--- | :--- | :--- |
| **1. Lead Attribution** | `source_driver_id`, `source_type`, `captured_by_driver_code`, `ref_code`, `source_reference`, `source_tablet_id`, `source_campaign_id` | `bookings` table; `lib/dispatch/lead-origin.ts` | **Core Foundation.** Accurately tracks lead origin (driver, tablet, QR, web), which is essential for network economics and assigning ownership. |
| **2. Network Economics** | Fee Split V2 & Commission Engine | `cancel-ride/route.ts`; `lib/dispatch/commission-engine.ts` | **Core Foundation.** Implements the three primary economic models (`SAME_DRIVER`, `SPLIT_NETWORK`, `PLATFORM_ORIGIN`) for distributing revenue from bookings and cancellation fees. |
| **3. Financial Ledger** | `driver_earnings_ledger` table | `migrate-earnings-ledger/route.ts` | **Ready.** Tracks earnings per driver role (`source_driver`, `executor_driver`), providing a clear financial record for network participants. |
| **4. Vehicle Compliance** | Vehicle Eligibility Gates (VEG) v1 | `lib/vehicles/gate.ts`; `vehicles` table | **Ready.** Enforces vehicle-level permit requirements (MCO, Port Canaveral, City) at the dispatch level. Supports the 1-Driver → N-Vehicles model. |
| **5. Driver Reputation** | Provisional Scoring & Scoring Engine V1 | `lib/scoring/engine.ts`; `drivers` table | **Ready.** The `provisional` status, accelerated scoring, and eligibility flags (`is_eligible_for_premium_dispatch`) are perfect for onboarding new affiliate drivers. |
| **6. Dispatch Logic** | Smart Dispatch Priority Engine V1 | `lib/dispatch/priority-engine.ts` | **Ready.** The 5-step ranking engine, including the `source_driver_override` (Step 2), is the mechanism for prioritizing lead owners. |
| **7. Offer Flow** | Offer Timeout & Retry Logic | `respond-offer/route.ts`; `expire-driver-offers/route.ts` | **Ready.** The existing offer loop (`offer_pending` → `timeout` → `network_pool_pending`) provides the scaffolding for multi-stage offers (e.g., offer to company first, then to network). |

---

## SECTION B — Existing Assets Requiring Adjustment

These components are partially implemented or require extension to fully support the affiliate model.

| Category | Asset | Current State | Required Adjustment |
| :--- | :--- | :--- | :--- |
| **1. Company Layer** | `partner_companies` & `partners` tables | **Exists but Decoupled.** The tables exist from a previous module but are not linked to `drivers` or integrated into the core `bookings`/`dispatch` flow. The concept of a driver belonging to a company is absent. | **Add `company_id` to `drivers` table.** This is the critical link. The `parent_company_id` in the `partners` table should be used to associate individual partners (e.g., hotel concierges) with a company. |
| **2. Vehicle Ownership** | `vehicles.driver_id` field | **Driver-Owned Only.** The current schema links every vehicle to a single driver, preventing a company-owned or pooled vehicle model. | **Add `company_id` to `vehicles` table.** Make `driver_id` nullable. A vehicle must belong to either a `driver_id` OR a `company_id`. This enables company-owned fleets. |
| **3. Driver Onboarding** | `POST /api/admin/drivers` | **Individual-Focused.** The endpoint creates a driver but has no mechanism to associate them with a `partner_company` during creation. | **Add `company_id` to the request body.** When a new driver is created, allow them to be immediately assigned to an existing affiliate company. |
| **4. Dispatch Candidate Pool** | `GET /api/admin/dispatch` | **Driver-Centric.** The query pulls a flat list of all active drivers. It is not aware of company structures or which drivers belong to which affiliate. | **Join `drivers` with `partner_companies`.** The candidate pool query must be updated to include `company_id`, `company_name`, and `brand_name` for each driver. |
| **5. Admin Dashboard** | Driver & Dispatch Views | **No Company Information.** The UI shows drivers and bookings individually but does not group them by affiliate or display company branding. | **Display `brand_name` on driver cards.** Add a new "Affiliates" tab or filter to the dispatch dashboard to view activity by company. |

---

## SECTION C — Missing Pieces

These components are absent from the current architecture and must be built.

| Category | Missing Component | Description | Priority |
| :--- | :--- | :--- | :--- |
| **1. Company-Level Logic** | **Company Dispatch Queue.** | A mechanism to offer a booking to an *affiliate company* first, allowing their internal dispatcher to assign it to one of their available drivers. This requires a new dispatch status like `offer_pending_company`. | **High** |
| **2. Company-Level Logic** | **Company-Level Scoring.** | A reputation and performance score for each affiliate company, aggregated from their drivers' performance, acceptance rates, and completion rates. | **Medium** |
| **3. UI / UX** | **Affiliate Company Portal.** | A dedicated dashboard for affiliate owners to manage their drivers, view their fleet's earnings, see their company score, and handle bookings assigned to them. | **High** |
| **4. Financials** | **Company Payouts.** | A system to calculate and process bulk payouts to a partner company, which then distributes the earnings to its drivers. The current ledger is driver-centric. | **Medium** |
| **5. Dispatch Logic** | **Multi-Stage Offer Timeout.** | An extension of the offer loop. If a company fails to accept/assign a ride within a set time (e.g., 10 minutes), the booking should automatically fall back to the general SLN network pool and be offered via the Smart Dispatch engine. | **High** |

---

## SECTION D — Recommended Integration Sequence

This sequence is designed to minimize risk by building upon the audited stable systems in a logical order. Each step enables the next.

**Phase 1: Foundational Schema Integration (Low Risk)**
1.  **Add `company_id` to `drivers` Table:** Execute an `ALTER TABLE` migration to link drivers to the existing `partner_companies` table. Backfill existing drivers as needed (most will be `NULL`).
2.  **Add `company_id` to `vehicles` Table:** Modify the `vehicles` table to allow a vehicle to be owned by a company instead of a driver.
3.  **Update Admin Endpoints:** Modify the `POST /admin/drivers` and `POST /admin/vehicles` endpoints to support the new `company_id` association.

**Phase 2: Company-Aware Dispatch (Medium Risk)**
1.  **Integrate Company Logic into Priority Engine:** Update `runPriorityEngine` to recognize when a booking's `source_driver_id` belongs to a driver who is part of a company. This is the hook for company-level priority.
2.  **Implement Company Dispatch Queue:** Introduce a new dispatch status, `offer_pending_company`. When a booking is sourced by an affiliate driver, the dispatch engine should place it in this state and notify the company (requires a basic notification system, email/webhook).
3.  **Create Company Acceptance Endpoint:** Build a new endpoint (`/api/partner/assign-driver`) for the affiliate portal to accept an offer and assign one of their own eligible drivers.

**Phase 3: UI and Fallback Logic (Low Risk)**
1.  **Build Basic Affiliate Portal:** Create a simple dashboard for company owners to see bookings in their `offer_pending_company` queue and assign them.
2.  **Implement Multi-Stage Timeout:** Extend the `expire-driver-offers` cron job. If a booking in `offer_pending_company` is not accepted within the defined window, the cron will change its status to `network_pool_pending`, making it available to the entire SLN network via the existing Smart Dispatch engine.
3.  **Update Admin Dashboard:** Add company branding and filters to the main dispatch dashboard.

**Phase 4: Advanced Features (Medium Risk)**
1.  **Develop Company-Level Scoring:** Aggregate driver performance data to create a reputation score for each affiliate company.
2.  **Implement Company Payouts:** Build the financial logic and Stripe integration to handle bulk payouts to companies.

> **Risk Assessment:** The described sequence poses no immediate risk to existing production flows. The Fee Split V2, Provisional Scoring, and VEG systems are all consumed as inputs and are not modified. The integration path is one of **extension**, adding the company layer on top of the stable, audited foundation. The fallback logic in Phase 3 ensures that if the new company flow fails, bookings seamlessly revert to the proven, existing network dispatch flow. network's proven Smart Dispatch engine, guaranteeing operational continuity.
