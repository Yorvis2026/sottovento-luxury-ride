# SLN Pre-Pilot Audit Notes

## Already Implemented ✅
- Section 1.2: Server-side validation in create-checkout-session (all required fields)
- Section 2.1: Pre-create booking before Stripe (pending_payment status)
- Section 2.2: Webhook-based payment finalization (pending_dispatch + paid_at)
- Section 4.1/4.2: Dispatch buckets (6 buckets) — dispatch/route.ts
- Section 6.1: Assign driver from dispatch panel
- Section 7: reject_ride releases assignment (assigned_driver_id = NULL)
- Section 7: return_to_dispatch releases assignment
- Section 8: Admin→Driver live sync (polling + updated_at detection)
- Section 9.2: Ride modes (upcoming/active_window/live_flow)
- Section 9.3: 90-min active window
- Section 10.1: Time guardrail modal (90 min warning)
- Section 11.1: New ride alert modal + vibration
- Section 12: Earnings tab in driver panel

## Missing / Needs Fix ❌
- Section 1.1: 120-min minimum advance booking window (NOT in app/page.tsx)
- Section 1.3: Pricing fallback hierarchy (no fallback fares for unknown routes)
- Section 3.1/3.2: readiness_status field + intake filter gate (not in DB/dispatch)
- Section 3.3: Pre-assignment validation gate (no check before assign)
- Section 7.1: report_incomplete + request_correction do NOT release driver (assigned_driver_id stays)
- Section 9.4: Expandable booking detail (flight_number, passenger_count, luggage, notes shown but no expand toggle for upcoming rides)
- Section 14.1/14.2: Payout section in driver panel (only earnings shown, no payout balance/method)
- Section 14.3: Payout analytics in admin panel (not implemented)
- Section 6.3: Error toasts for assign/cancel failures (partially implemented)
- Section 2.3: Frontend message truth (confirmation page says "sent" regardless)

## Priority Order
1. Section 7.1: Fix report_incomplete + request_correction to release driver → CRITICAL
2. Section 1.1: 120-min advance booking window → HIGH
3. Section 3.3: Pre-assignment validation gate → HIGH
4. Section 1.3: Pricing fallback → MEDIUM
5. Section 9.4: Expandable detail for upcoming rides → MEDIUM
6. Section 14: Payouts → MEDIUM
7. Section 3.1/3.2: readiness_status → LOW (complex DB migration)
