export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { checkVehicleEligibility, deriveServiceLocationType, requiresEligibilityGate } from "@/lib/vehicles/gate";
import { runPriorityEngine, type DriverCandidate, type BookingContext, type ServiceType } from "@/lib/dispatch/priority-engine";
import {
  evaluateOverdue,
  buildServerTimeContext,
  classifyOverdueState,
  getAdminActionsForOverdue,
} from "@/lib/dispatch/overdue-engine";
import { calcPreviewImpactAuto } from "@/lib/drs/calcPreviewImpact";
import { checkDriverAvailabilityForBooking } from "@/lib/dispatch/conflict-engine";
import { dispatchToNetwork } from "@/lib/dispatch/dispatch-to-network";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * GET /api/admin/dispatch — 6-bucket operational dispatch control tower
 *
 * Buckets (Dispatch Audit Master Block):
 *   1. driverIssue      — driver rejected / reported issue
 *   2. needsReview      — incomplete data, must NOT be dispatched
 *   3. readyForDispatch — fully validated, awaiting assignment
 *   4. assigned         — driver assigned, waiting for execution
 *   5. inProgress       — ride actively being executed
 *   6. completed        — completed in last 24h
 */
export async function GET(req: NextRequest) {
  // BM12: Dispatch Queue Visibility State Guard
  // admin_override=true allows the admin to see locked (assigned/accepted) rides in the queue
  const { searchParams } = new URL(req.url);
  const adminOverride = searchParams.get('admin_override') === 'true';
  try {
    const rows = await sql`
      SELECT
        b.id,
        COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
        b.pickup_zone,
        b.dropoff_zone,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at,
        b.vehicle_type,
        b.total_price,
        b.status,
        b.dispatch_status,
        COALESCE(b.dispatch_state, 'NEW')   AS dispatch_state,
        COALESCE(b.dispatch_round, 1)       AS dispatch_round,
        COALESCE(b.manual_dispatch_required, FALSE) AS manual_dispatch_required,
        b.payment_status,
        b.assigned_driver_id,
        b.created_at,
        b.updated_at,
        COALESCE(b.service_type, '') AS service_type,
        COALESCE(b.flight_number, '') AS flight_number,
        COALESCE(b.passenger_count, b.passengers::integer, 1) AS passenger_count,
        COALESCE(b.luggage_count, b.luggage::integer, 0) AS luggage_count,
        COALESCE(b.notes, '') AS notes,
        COALESCE(b.lead_source, 'unknown') AS lead_source,
        COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
        COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
        COALESCE(NULLIF(TRIM(c.full_name), ''), b.client_email) AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        d.full_name AS driver_name,
        d.driver_code AS driver_code,
        d.phone AS driver_phone,
        -- ── Affiliate Company fields (Convergence Phase 1) ─────────────────
        d.company_id                                         AS driver_company_id,
        pc.name                                              AS company_name,
        pc.brand_name                                        AS company_brand_display_name,
        -- ── Cancellation fields (Fases 1-10) ──────────────────────────────────
        COALESCE(b.cancellation_reason, '') AS cancel_reason,
        COALESCE(b.cancelled_by_type, 'system') AS cancelled_by_type,
        b.cancelled_at,
        COALESCE(b.cancel_stage, 'before_assignment') AS cancel_stage,
        COALESCE(b.affects_driver_metrics, FALSE) AS affects_driver_metrics,
        COALESCE(b.affects_payout, FALSE) AS affects_payout,
        -- ── Auto Fee Logic V2 — SLN Network fee distribution ─────────────────
        COALESCE(b.cancellation_fee, 0)::numeric            AS cancellation_fee,
        COALESCE(b.source_driver_id::text, '')              AS source_driver_id,
        COALESCE(b.source_type, '')                         AS source_type,
        -- BM20-E2: Refund Preview Badge fields
        b.refund_decision,
        b.refund_status,
        (
          SELECT al.action FROM audit_logs al
          WHERE al.entity_id = b.id
            AND al.action IN (
              'driver_reported_incomplete',
              'driver_requested_correction',
              'driver_rejected_incomplete_ride'
            )
          ORDER BY al.created_at DESC
          LIMIT 1
        ) AS last_driver_action,
        (
          SELECT al.new_data->>'notes' FROM audit_logs al
          WHERE al.entity_id = b.id
            AND al.action IN (
              'driver_reported_incomplete',
              'driver_requested_correction',
              'driver_rejected_incomplete_ride'
            )
          ORDER BY al.created_at DESC
          LIMIT 1
        ) AS driver_issue_notes
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      LEFT JOIN companies pc ON d.company_id = pc.id
      WHERE (
        -- PIPELINE SANITIZATION: archived is ALWAYS excluded from all active buckets.
        -- This covers both manually archived rides and system_cleanup_legacy rides.
        b.status NOT IN ('cancelled', 'archived', 'no_show')
        OR (b.status = 'completed' AND b.updated_at > NOW() - INTERVAL '24 hours')
        OR (b.status = 'cancelled' AND b.updated_at > NOW() - INTERVAL '24 hours')
      )
      -- PIPELINE SANITIZATION: Exclude stale/unclosed rides from the active operational view.
      -- Policy: rides outside the 6-hour operational window (pickup_at < NOW() - 6h) are
      -- considered legacy and must not appear in any active bucket.
      -- Exception: en_route/arrived/in_trip are ALWAYS shown (live flow, regardless of time).
      -- Exception: rides with dispatch_status = 'system_cleanup_legacy' are already archived.
      AND NOT (
        b.status IN ('accepted', 'assigned', 'needs_review', 'ready_for_dispatch',
                     'driver_issue', 'driver_issue_final', 'expired_unfulfilled',
                     'offer_pending', 'driver_confirmed')
        AND b.pickup_at IS NOT NULL
        AND b.pickup_at < NOW() - INTERVAL '6 hours'
        AND b.status NOT IN ('en_route', 'arrived', 'in_trip', 'completed', 'cancelled', 'archived', 'no_show')
      )
      ORDER BY
        CASE
          WHEN b.status = 'driver_issue' THEN 1
          WHEN b.dispatch_status IN ('driver_rejected', 'needs_correction') THEN 1
          WHEN b.status = 'needs_review' THEN 2
          WHEN b.status = 'ready_for_dispatch' THEN 3
          WHEN b.status IN ('assigned', 'driver_confirmed') THEN 4
          WHEN b.status = 'in_progress' THEN 5
          WHEN b.status = 'completed' THEN 6
          ELSE 7
        END,
        b.pickup_at ASC NULLS LAST,
        b.created_at DESC
    `;

    const driverIssue: any[] = [];
    const needsReview: any[] = [];
    const readyForDispatch: any[] = [];
    const assigned: any[] = [];
    const inProgress: any[] = [];
    const completed: any[] = [];
    const recentlyCancelled: any[] = []; // Fase 10: cancelled in last 24h
    const overdueIncidents: any[] = []; // BM17: rides past pickup_at + 15min without execution

    for (const rRaw of rows) {
      // Spread into a mutable object so we can attach computed flags
      const r: any = { ...rRaw };
      const s = r.status ?? "";
      const ds = r.dispatch_status ?? "";
      const lastAction = r.last_driver_action ?? "";

      const hasDriverIssue =
        s === "driver_issue" ||
        ds === "driver_rejected" ||
        ds === "needs_correction" ||
        lastAction === "driver_rejected_incomplete_ride" ||
        lastAction === "driver_reported_incomplete" ||
        lastAction === "driver_requested_correction";

       // ── CRITICAL fields: missing any → needs_review ─────────────────
      // Per Issue 4 refinement:
      //   CRITICAL: client_phone, pickup_location, dropoff_location, pickup_at,
      //             captured_by_driver_code (only when booking comes from network/tablet),
      //             payment_status == paid
      //   NOT critical: vehicle_type, booking_origin, passenger_count, email, flight_number
      const isNetworkOrTabletBooking =
        r.booking_origin === 'tablet' ||
        r.booking_origin === 'driver_qr' ||
        r.booking_origin === 'driver_referral' ||
        r.booking_origin === 'driver_tablet' ||
        r.booking_origin === 'hotel_partner' ||
        (r.captured_by_driver_code && r.captured_by_driver_code !== 'public_site');

      const missingCritical: string[] = [];
      if (!r.client_phone)                                       missingCritical.push("tel. cliente");
      if (!r.pickup_address && !r.pickup_zone)                   missingCritical.push("pickup");
      if (!r.dropoff_address && !r.dropoff_zone)                 missingCritical.push("dropoff");
      if (!r.pickup_at)                                          missingCritical.push("fecha/hora");
      if (r.payment_status !== "paid")                           missingCritical.push("pago pendiente");
      // captured_by is only critical for network/tablet bookings (attribution required)
      if (isNetworkOrTabletBooking && !r.captured_by_driver_code) missingCritical.push("captured_by");

      // ── OPTIONAL fields: missing any → booking_flag only, no dispatch change ──
      // vehicle_type, booking_origin, passenger_count, email, flight_number, luggage, notes
      const missingOptional: string[] = [];
      if (!r.vehicle_type)                                       missingOptional.push("vehículo");
      if (!r.client_email)                                       missingOptional.push("email");
      if (!r.flight_number)                                      missingOptional.push("vuelo");
      if (!r.luggage_count && r.luggage_count !== 0)             missingOptional.push("equipaje");
      if (!r.passenger_count || r.passenger_count <= 0)         missingOptional.push("pasajeros");
      if (!r.notes)                                              missingOptional.push("notas");

      // Attach computed flags to the row object for UI consumption
      (r as any).missing_critical = missingCritical;
      (r as any).missing_optional = missingOptional;
      (r as any).missing_optional_info = missingOptional.length > 0;
      // ── BM20-E3: DRS Impact Preview ───────────────────────────────────────────────────────────
      // Read-only preview — does NOT modify real DRS, BM19, or BM4.
      // Only computed when a driver is assigned (assigned_driver_id != null).
      const drsPreview = calcPreviewImpactAuto({
        assigned_driver_id: r.assigned_driver_id ?? null,
        cancelled_by_type:  r.cancelled_by_type  ?? null,
        dispatch_status:    r.dispatch_status    ?? null,
        status:             r.status             ?? null,
      });
      (r as any).drs_preview_impact = drsPreview?.impactPoints ?? null;
      (r as any).drs_preview_reason = drsPreview?.impactReason ?? null;
      // ── FASE 6: Overdue Detection (BM17 — uses overdue-engine) ──────────────────────────────
      // BM17: Use evaluateOverdue from overdue-engine for consistent detection.
      // INVARIANT: en_route, arrived, in_trip are NEVER overdue (live execution).
      // INVARIANT: Only accepted, assigned, driver_confirmed are eligible.
      const nowMs = Date.now()
      const overdueResult = evaluateOverdue(
        {
          pickup_at: r.pickup_at,
          status: r.status ?? '',
          dispatch_state: r.dispatch_state ?? null,
          dispatch_status: r.dispatch_status ?? null,
          incident_status: r.incident_status ?? null,
          incident_reason_code: r.incident_reason_code ?? null,
          assigned_driver_id: r.assigned_driver_id ?? null,
        },
        new Date()
      );
      ;(r as any).is_overdue = overdueResult.is_overdue
      ;(r as any).overdue_minutes = overdueResult.overdue_since_minutes
      ;(r as any).overdue_reason_required = overdueResult.overdue_reason_required
      ;(r as any).incident_status = overdueResult.incident_status
      ;(r as any).incident_reason_code = overdueResult.incident_reason_code
      ;(r as any).overdue_activation_condition = overdueResult.overdue_activation_condition
      // BM17: Time Source Hardening — attach server-side time context to each ride
      const rideTimeCtx = buildServerTimeContext(r.pickup_at);
      ;(r as any).server_now = rideTimeCtx.server_now
      ;(r as any).server_timezone = rideTimeCtx.server_timezone
      ;(r as any).minutes_until_pickup = rideTimeCtx.minutes_until_pickup
      ;(r as any).pickup_is_past = rideTimeCtx.pickup_is_past
      // ── FASE 8: Offer no-response flag ─────────────────────────────────────────────
      // offer_no_response: booking has been in offer_pending for >10 min without driver response
      const updatedAt = r.updated_at ? new Date(r.updated_at).getTime() : null
      const offerPendingMs = r.dispatch_status === "offer_pending" && updatedAt ? nowMs - updatedAt : 0
      const offerPendingMin = offerPendingMs > 0 ? Math.floor(offerPendingMs / 60000) : 0
      ;(r as any).offer_no_response = r.dispatch_status === "offer_pending" && offerPendingMin >= 10
      ;(r as any).offer_pending_minutes = offerPendingMin

      // BYPASS: driver-captured + paid + critical fields present → never needs_review
      // Business rule: tablet/QR bookings are operationally valid leads.
      // If payment_status=paid AND captured_by_driver_code is set AND critical fields exist,
      // the booking must go to assigned (if already assigned) or readyForDispatch, never needsReview.
      const isDriverCapturedPaid =
        r.payment_status === 'paid' &&
        r.captured_by_driver_code &&
        r.captured_by_driver_code !== 'public_site' &&
        r.captured_by_driver_code !== 'PUBLIC_SITE' &&
        (r.pickup_address || r.pickup_zone) &&
        (r.dropoff_address || r.dropoff_zone);

      // ── Fase 10: cancelled rides go to recentlyCancelled bucket ────────────
      if (s === "cancelled") {
        recentlyCancelled.push(r);
        continue;
      }

      // ── BM17: OVERDUE INCIDENTS BUCKET ──────────────────────────────────────
      // RULE: If is_overdue=true AND status is NOT in live-execution states,
      //   push to overdueIncidents bucket (in ADDITION to its normal bucket).
      //   This allows admin to see overdue rides in a dedicated section while
      //   the ride still appears in its primary bucket (assigned, readyForDispatch, etc.).
      // INVARIANT: en_route, arrived, in_trip are NEVER overdue (live execution).
      const LIVE_EXECUTION_STATUSES = ['en_route', 'arrived', 'in_trip', 'completed', 'cancelled'];
      if ((r as any).is_overdue === true && !LIVE_EXECUTION_STATUSES.includes(s)) {
        // BM19: Add 6-state classification and admin_actions to each overdue ride
        const overdueClassification = classifyOverdueState({
          incident_status: (r as any).incident_status ?? null,
          incident_reason_code: (r as any).incident_reason_code ?? null,
        });
        const adminActions = getAdminActionsForOverdue(overdueClassification);
        overdueIncidents.push({
          ...r,
          overdue_bucket_reason: 'past_pickup_grace',
          // BM19: canonical 6-state classification
          overdue_classification: overdueClassification,
          // BM19: available admin actions for this ride
          admin_actions: adminActions,
        });
      }

      // ── BM12: DISPATCH QUEUE VISIBILITY STATE GUARD ──────────────────────────
      // RULE: Rides with assigned_driver_id != NULL and dispatch_status NOT IN
      //   ('pending_dispatch', 'pool_offer', 'reassignment_required', 'offer_pending')
      //   are EXCLUDED from the Dispatch Queue.
      // These rides have a closed or in-progress dispatch cycle and must not appear
      // in any operational bucket (readyForDispatch, driverIssue, needsReview).
      // They are only visible when admin_override=true is passed as a query param.
      //
      // DISPATCH_QUEUE_VISIBLE_STATUSES: the only dispatch_status values that indicate
      //   an open dispatch cycle that requires admin action.
      const DISPATCH_QUEUE_VISIBLE_STATUSES = [
        'pending_dispatch',
        'pool_offer',
        'reassignment_required',
        'offer_pending',           // active offer awaiting driver response
        'manual_dispatch_required', // admin must manually assign
        'awaiting_source_owner',    // waiting for source driver
        'awaiting_sln_member',      // waiting for SLN member
        'driver_rejected',          // driver rejected — needs reassignment
        'needs_correction',         // driver reported issue — needs admin review
        'ROUND_1_CAPTOR_PRIORITY',  // dispatch engine round 1
        'ROUND_2_PREMIUM_PRIORITY', // dispatch engine round 2
        'ROUND_3_POOL_OPEN',        // dispatch engine round 3 / pool open
        'ADMIN_ATTENTION_REQUIRED', // escalated — admin must act
        'reassignment_needed',      // legacy — driver exit
        'urgent_reassignment',      // legacy — urgent
        'critical_driver_failure',  // legacy — critical
        'fallback_dispatched',      // fallback pool offer sent
        'fallback_accepted',        // fallback accepted
        null, undefined, '',        // no dispatch_status set — treat as open
      ];

      // EXCLUDED_STATUSES: ride statuses that indicate a closed or in-progress cycle.
      // These are ALWAYS excluded from the Dispatch Queue regardless of dispatch_status.
      const DISPATCH_QUEUE_EXCLUDED_STATUSES = [
        'en_route', 'arrived', 'in_trip', 'completed', 'no_show', 'archived',
      ];

      // Guard: rides in live execution or finalized are always excluded
      if (DISPATCH_QUEUE_EXCLUDED_STATUSES.includes(s)) {
        // inProgress and completed buckets still receive these for monitoring
        if (["en_route", "arrived", "in_trip", "in_progress"].includes(s)) {
          inProgress.push(r);
        } else if (s === "completed") {
          completed.push(r);
        }
        // Register audit event for guard application
        ;(r as any).visibility_guard_applied = 'EXCLUDED_LIVE_OR_FINAL';
        continue;
      }

      // Guard: rides with assigned_driver_id AND a closed dispatch_status are excluded
      // UNLESS admin_override=true is passed
      const hasAssignedDriver = !!r.assigned_driver_id;
      const isOpenDispatchStatus = DISPATCH_QUEUE_VISIBLE_STATUSES.includes(ds) ||
        DISPATCH_QUEUE_VISIBLE_STATUSES.includes(null); // null/empty = open
      const isClosedCycle =
        hasAssignedDriver &&
        !isOpenDispatchStatus &&
        ['assigned', 'accepted', 'driver_confirmed'].includes(s) &&
        ds !== 'offer_pending' &&
        ds !== 'reassignment_required';

      if (isClosedCycle && !adminOverride) {
        // BM12: EXCLUDED from Dispatch Queue — closed dispatch cycle
        // Mark as locked and push to assigned bucket for monitoring only
        ;(r as any).locked_dispatch = true;
        ;(r as any).locked_reason = 'bm12_visibility_guard';
        ;(r as any).visibility_guard_applied = 'EXCLUDED_CLOSED_CYCLE';
        ;(r as any).admin_override_required = true;
        // BM14: dispatch_operational=false — ride is in monitoring-only mode
        ;(r as any).dispatch_operational = false;
        ;(r as any).dispatch_mode = 'monitoring';
        assigned.push(r);
        continue;
      }

      if (isClosedCycle && adminOverride) {
        // Admin override: show in assigned bucket with override flag
        ;(r as any).locked_dispatch = false;
        ;(r as any).admin_override_active = true;
        ;(r as any).visibility_guard_applied = 'OVERRIDE_ACTIVE';
        // BM14: admin_override makes it temporarily operational again
        ;(r as any).dispatch_operational = true;
        ;(r as any).dispatch_mode = 'override_active';
      }

      if (hasDriverIssue) {
        driverIssue.push(r);
      } else if (s === "completed") {
        completed.push(r);
      } else if (s === "in_progress" || ["en_route", "arrived", "in_trip"].includes(s)) {
        inProgress.push(r);
      } else if (
        // BM10 Follow-Up 5: CLOSED DISPATCH CYCLE — ride is fully accepted by a driver.
        // A ride belongs in assigned (LOCKED / monitoring-only) when:
        //   (a) dispatch_state = 'ASSIGNED' (canonical post-acceptance state), OR
        //   (b) dispatch_status = 'assigned' AND assigned_driver_id is set (driver confirmed)
        //       AND dispatch_status is NOT 'offer_pending' (no open offer)
        // RULE: rides in this state have CLOSED their dispatch cycle.
        //   - They are shown in the assigned bucket for monitoring purposes only.
        //   - They are NOT operationally open for reassignment.
        //   - The frontend must render them with locked=true (no Reassign button).
        // Guard: if dispatch_status='offer_pending', the offer is still awaiting response —
        // the booking must appear in readyForDispatch so the admin can see it is in-flight.
        (s === "assigned" || s === "driver_confirmed" || s === "accepted") &&
        r.dispatch_status !== "offer_pending" &&
        (
          r.dispatch_state === "ASSIGNED" ||
          r.dispatch_state === "IN_PROGRESS" ||
          !r.dispatch_state ||
          r.dispatch_state === "NEW" ||
          // Rides that were accepted but dispatch_state was not updated (pre-fix)
          (r.dispatch_status === "assigned" && r.assigned_driver_id)
        )
      ) {
        // BM10 Follow-Up 5: Mark as locked — dispatch cycle is CLOSED.
        // locked_dispatch = true signals the frontend to render in monitoring-only mode.
        // The Reassign button must be hidden or disabled for locked rides.
        // Admin can still override via the dedicated override flow (override_state=true).
        ;(r as any).locked_dispatch = true;
        ;(r as any).locked_reason = (
          s === 'accepted' ? 'driver_accepted' :
          s === 'driver_confirmed' ? 'driver_confirmed' :
          r.dispatch_state === 'ASSIGNED' ? 'dispatch_state_assigned' :
          'dispatch_status_assigned'
        );
        // BM14: dispatch_operational=false — ride is in monitoring-only mode
        ;(r as any).dispatch_operational = false;
        ;(r as any).dispatch_mode = 'monitoring';
        assigned.push(r);
      } else if (
        // offer_pending (any status or dispatch_state) → still in dispatch flow
        // Exception: if dispatch_status is already 'assigned', the driver accepted — go to assigned
        (s === "offer_pending" && r.dispatch_status !== "assigned") ||
        (r.dispatch_status === "offer_pending") ||
        (r.dispatch_state === "ROUND_1_CAPTOR_PRIORITY" && r.dispatch_status !== "assigned") ||
        (r.dispatch_state === "ROUND_2_PREMIUM_PRIORITY" && r.dispatch_status !== "assigned") ||
        (r.dispatch_state === "ROUND_3_POOL_OPEN" && r.dispatch_status !== "assigned")
      ) {
        // Actively being dispatched — show in readyForDispatch with dispatch_state context
        readyForDispatch.push(r);
      } else if (
        // ADMIN_ATTENTION_REQUIRED → driver issue bucket for immediate visibility
        r.dispatch_state === "ADMIN_ATTENTION_REQUIRED" ||
        r.manual_dispatch_required === true
      ) {
        driverIssue.push(r);
      } else if (s === "ready_for_dispatch" || s === "offered" || s === "pending_dispatch") {
        readyForDispatch.push(r);
      } else if (s === "needs_review" || s === "new") {
        // BYPASS: driver-captured paid bookings skip needs_review entirely
        if (isDriverCapturedPaid) {
          // Has assigned driver → assigned bucket; otherwise → readyForDispatch for auto-assign
          if (r.assigned_driver_id) {
            assigned.push(r);
          } else {
            readyForDispatch.push(r);
          }
        } else if (s === "needs_review") {
          needsReview.push(r);
        } else {
          // s === 'new': classify based on CRITICAL fields only
          if (missingCritical.length > 0) {
            needsReview.push(r);
          } else {
            readyForDispatch.push(r);
          }
        }
      } else {
        // Unknown status: driver-captured paid bookings still bypass needs_review
        if (isDriverCapturedPaid) {
          if (r.assigned_driver_id) {
            assigned.push(r);
          } else {
            readyForDispatch.push(r);
          }
        } else {
          needsReview.push(r);
        }
      }
    }

    // ── AUTO-ASSIGN via Smart Dispatch Priority Engine V1 ─────────────────
    // Business rule: if a booking is ready_for_dispatch AND has captured_by_driver_code
    // AND has no assigned_driver_id yet → run Priority Engine and assign top-ranked driver.
    // The engine enforces: Hard Eligibility → Lead Ownership → Service Eligibility
    //                       → Reputation Ranking → Recent Behavior Penalty.
    const autoAssignCandidates = readyForDispatch.filter(
      (r: any) => r.captured_by_driver_code && !r.assigned_driver_id
    );
    if (autoAssignCandidates.length > 0) {
      // Fetch all active/provisional drivers with scoring fields (once for all candidates)
      let allDriverRows: any[] = [];
      let vehicleMap: Record<string, any> = {};
      let recentBehaviorMap: Record<string, { late_cancel: number; complaint: number; no_response: number }> = {};
      try {
        allDriverRows = await sql`
          SELECT
            d.id, d.driver_code, d.full_name,
            COALESCE(d.driver_status, 'active')                     AS driver_status,
            COALESCE(d.driver_score_total, 75)::integer             AS driver_score_total,
            COALESCE(d.driver_score_tier, 'GOLD')                   AS driver_score_tier,
            COALESCE(d.is_eligible_for_premium_dispatch, false)     AS is_eligible_for_premium_dispatch,
            COALESCE(d.is_eligible_for_airport_priority, false)     AS is_eligible_for_airport_priority,
            COALESCE(d.rides_completed, 0)::integer                 AS rides_completed,
            COALESCE(d.on_time_rides, 0)::integer                   AS on_time_rides,
            COALESCE(d.late_cancel_count, 0)::integer               AS late_cancel_count,
            COALESCE(d.complaint_count, 0)::integer                 AS complaint_count,
            -- ── BM5: Legal Affiliation + Reliability Score ─────────────────────
            COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER') AS legal_affiliation_type,
            COALESCE(d.reliability_score, 65)::numeric              AS reliability_score,
            COALESCE(d.driver_tier, 'STANDARD')                     AS driver_tier,
            COALESCE(d.acceptance_rate, 0.75)::numeric              AS acceptance_rate,
            COALESCE(d.completion_rate, 0.90)::numeric              AS completion_rate,
            COALESCE(d.driver_cancel_rate, 0.05)::numeric           AS driver_cancel_rate,
            COALESCE(d.fallback_response_rate, 0.80)::numeric       AS fallback_response_rate,
            COALESCE(d.on_time_score, 0.85)::numeric                AS on_time_score,
            COALESCE(d.dispatch_response_score, 0.85)::numeric      AS dispatch_response_score,
            -- ── Affiliate Company fields (Convergence Phase 1) ─────────────────
            d.company_id                                            AS company_id,
            pc.name                                                 AS company_name,
            pc.brand_name                                           AS company_brand_display_name,
            COALESCE(pc.partner_dispatch_mode, 'CAPTURE_ONLY')      AS company_partner_dispatch_mode
          FROM drivers d
          LEFT JOIN companies pc ON d.company_id = pc.id
          WHERE d.driver_status IN ('active', 'provisional')
            AND d.is_eligible = true
        `;
        const driverIds = allDriverRows.map((d: any) => d.id);
        if (driverIds.length > 0) {
          const vehicleRows = await sql`
            SELECT v.driver_id, v.id, v.vehicle_status, v.city_permit_status,
                   v.airport_permit_mco_status, v.port_permit_canaveral_status,
                   v.insurance_status, v.registration_status, v.make, v.model, v.plate
            FROM vehicles v
            WHERE v.driver_id = ANY(${driverIds}::uuid[])
              AND v.vehicle_status = 'active'
            ORDER BY v.is_primary DESC, v.created_at ASC
          `;
          for (const v of vehicleRows) {
            if (!vehicleMap[v.driver_id]) vehicleMap[v.driver_id] = v;
          }
        }
        const recentRows = await sql`
          SELECT al.entity_id AS driver_id,
            SUM(CASE WHEN al.action = 'late_cancel_driver'        THEN 1 ELSE 0 END)::integer AS late_cancel,
            SUM(CASE WHEN al.action = 'client_complaint'          THEN 1 ELSE 0 END)::integer AS complaint,
            SUM(CASE WHEN al.action = 'no_response_offer_timeout' THEN 1 ELSE 0 END)::integer AS no_response
          FROM audit_logs al
          WHERE al.entity_type = 'driver'
            AND al.created_at > NOW() - INTERVAL '7 days'
            AND al.action IN ('late_cancel_driver', 'client_complaint', 'no_response_offer_timeout')
          GROUP BY al.entity_id
        `.catch(() => []);
        for (const r of recentRows) {
          recentBehaviorMap[r.driver_id] = { late_cancel: r.late_cancel ?? 0, complaint: r.complaint ?? 0, no_response: r.no_response ?? 0 };
        }
      } catch { /* non-blocking — driver pool fetch failure */ }

      for (const candidate of autoAssignCandidates) {
        try {
          const slt = deriveServiceLocationType(candidate.pickup_zone ?? "");

          // Resolve source_driver_id from captured_by_driver_code
          let sourceDriverId: string | null = null;
          if (candidate.captured_by_driver_code) {
            const [srcRow] = await sql`
              SELECT id FROM drivers
              WHERE UPPER(driver_code) = UPPER(${candidate.captured_by_driver_code})
              LIMIT 1
            `.catch(() => []);
            if (srcRow?.id) sourceDriverId = srcRow.id;
          }

          const bookingCtx: BookingContext = {
            id:                   candidate.id,
            pickup_zone:          candidate.pickup_zone ?? "",
            service_type:         (candidate.service_type as ServiceType) || "standard",
            source_driver_id:     sourceDriverId,
            source_partner_id:    null,
            booking_source:       candidate.booking_origin ?? 'manual_admin',
            service_location_type: slt as any,
          };

          // Build DriverCandidate array
          const driverCandidates: DriverCandidate[] = allDriverRows.map((d: any) => {
            const behavior = recentBehaviorMap[d.id] ?? { late_cancel: 0, complaint: 0, no_response: 0 };
            return {
              id: d.id, driver_code: d.driver_code, full_name: d.full_name,
              driver_status: d.driver_status,
              driver_score_total: d.driver_score_total, driver_score_tier: d.driver_score_tier,
              is_eligible_for_premium_dispatch: d.is_eligible_for_premium_dispatch,
              is_eligible_for_airport_priority: d.is_eligible_for_airport_priority,
              rides_completed: d.rides_completed, on_time_rides: d.on_time_rides,
              late_cancel_count: d.late_cancel_count, complaint_count: d.complaint_count,
              late_cancel_recent: behavior.late_cancel,
              complaint_recent: behavior.complaint,
              no_response_recent: behavior.no_response,
              // BM5 fields
              legal_affiliation_type: d.legal_affiliation_type ?? 'GENERAL_NETWORK_DRIVER',
              reliability_score: Number(d.reliability_score ?? 65),
              driver_tier: d.driver_tier ?? 'STANDARD',
              acceptance_rate: Number(d.acceptance_rate ?? 0.75),
              completion_rate: Number(d.completion_rate ?? 0.90),
              driver_cancel_rate: Number(d.driver_cancel_rate ?? 0.05),
              fallback_response_rate: Number(d.fallback_response_rate ?? 0.80),
              on_time_score: Number(d.on_time_score ?? 0.85),
              dispatch_response_score: Number(d.dispatch_response_score ?? 0.85),
              company_id: d.company_id ?? null,
              company_partner_dispatch_mode: d.company_partner_dispatch_mode ?? 'CAPTURE_ONLY',
              vehicle: vehicleMap[d.id] ?? null,
            };
          });

          // Run Priority Engine
          const engineResult = runPriorityEngine(driverCandidates, bookingCtx);

          // Persist audit log
          sql`
            INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
            VALUES ('booking', ${candidate.id}::uuid, 'dispatch_priority_calculated', 'system',
              ${JSON.stringify(engineResult.audit_payload)}::jsonb)
          `.catch(() => {});

          // Log source driver override if applicable
          if (engineResult.source_driver_override) {
            sql`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES ('booking', ${candidate.id}::uuid, 'dispatch_source_driver_override', 'system',
                ${JSON.stringify({ source_driver_id: engineResult.source_driver_id, booking_id: candidate.id, timestamp: new Date().toISOString() })}::jsonb)
            `.catch(() => {});
          }

          // Log excluded candidates
          if (engineResult.excluded.length > 0) {
            sql`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES ('booking', ${candidate.id}::uuid, 'dispatch_candidates_excluded', 'system',
                ${JSON.stringify({ excluded: engineResult.excluded, booking_id: candidate.id, timestamp: new Date().toISOString() })}::jsonb)
            `.catch(() => {});
          }

          // ── BM5 Event Logging — dispatch_event_log ─────────────────────────
          const topRankedForLog = engineResult.ranked[0];
          if (topRankedForLog) {
            // Log dispatch_priority_applied
            sql`
              INSERT INTO dispatch_event_log (
                booking_id, driver_id, event_type, priority_level,
                legal_affiliation_type, reliability_score, notes, created_at
              ) VALUES (
                ${candidate.id}::uuid,
                ${topRankedForLog.id}::uuid,
                'dispatch_priority_applied',
                ${topRankedForLog.dispatch_priority_rank},
                ${topRankedForLog.legal_affiliation_type ?? 'GENERAL_NETWORK_DRIVER'},
                ${topRankedForLog.reliability_score ?? 65},
                ${topRankedForLog.priority_reason},
                NOW()
              )
            `.catch(() => {});

            // Log captor_offer_sent if source driver override
            if (engineResult.source_driver_override) {
              sql`
                INSERT INTO dispatch_event_log (
                  booking_id, driver_id, event_type, priority_level,
                  legal_affiliation_type, reliability_score, notes, created_at
                ) VALUES (
                  ${candidate.id}::uuid,
                  ${topRankedForLog.id}::uuid,
                  'captor_offer_sent',
                  1,
                  ${topRankedForLog.legal_affiliation_type ?? 'GENERAL_NETWORK_DRIVER'},
                  ${topRankedForLog.reliability_score ?? 65},
                  'CAPTURE_PRIORITY_ABSOLUTE — captor offered first',
                  NOW()
                )
              `.catch(() => {});
            }

            // Log legal_affiliation_override if SOTTOVENTO_LEGAL_FLEET was prioritized
            if (topRankedForLog.legal_affiliation_type === 'SOTTOVENTO_LEGAL_FLEET' &&
                engineResult.ranked.some(r => r.legal_affiliation_type === 'GENERAL_NETWORK_DRIVER')) {
              sql`
                INSERT INTO dispatch_event_log (
                  booking_id, driver_id, event_type, priority_level,
                  legal_affiliation_type, reliability_score, notes, created_at
                ) VALUES (
                  ${candidate.id}::uuid,
                  ${topRankedForLog.id}::uuid,
                  'legal_affiliation_override',
                  1,
                  'SOTTOVENTO_LEGAL_FLEET',
                  ${topRankedForLog.reliability_score ?? 65},
                  'SOTTOVENTO_LEGAL_FLEET prioritized over GENERAL_NETWORK_DRIVER',
                  NOW()
                )
              `.catch(() => {});
            }
          }

          // Pick top-ranked driver
          const topDriver = engineResult.ranked[0];
          if (!topDriver) continue; // No eligible driver found

          // ── BM20-H: Schedule conflict guard — prevent double-booking ─────────
          // Before creating dispatch_offer, verify the top-ranked driver has no
          // operationally active ride that overlaps this booking's pickup window.
          // Uses BM18 conflict-engine (already wired in fallback/reassign paths).
          // Blocking statuses (inside checkDriverAvailabilityForBooking):
          //   accepted | assigned | en_route | arrived | in_trip
          // Buffer rules: 45 min airport, 25 min standard (BM18_CONFIG)
          // If conflict detected: skip this driver, try next ranked candidate.
          // If all candidates conflict: leave booking in readyForDispatch for
          // the next polling cycle / manual dispatch — no ride is lost.
          let resolvedDriver = topDriver;
          {
            const ranked = engineResult.ranked;
            let conflictSkipCount = 0;
            for (const candidate_driver of ranked) {
              const availability = await checkDriverAvailabilityForBooking(
                sql,
                candidate_driver.id,
                candidate.id
              );
              if (availability.available) {
                resolvedDriver = candidate_driver;
                break;
              }
              // Log the skip for audit trail
              conflictSkipCount++;
              sql`
                INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
                VALUES ('booking', ${candidate.id}::uuid, 'bm20h_conflict_skip', 'system',
                  ${JSON.stringify({
                    skipped_driver_id: candidate_driver.id,
                    skipped_driver_code: candidate_driver.driver_code,
                    conflict_reason: availability.reason,
                    explanation: availability.explanation,
                    conflicting_booking_id: availability.conflicting_booking_id,
                    booking_id: candidate.id,
                    timestamp: new Date().toISOString(),
                  })}::jsonb)
              `.catch(() => {});
              if (conflictSkipCount >= ranked.length) {
                // All ranked candidates have a conflict — leave in readyForDispatch
                sql`
                  INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
                  VALUES ('booking', ${candidate.id}::uuid, 'bm20h_all_candidates_conflicted', 'system',
                    ${JSON.stringify({ skipped_count: conflictSkipCount, booking_id: candidate.id, timestamp: new Date().toISOString() })}::jsonb)
                `.catch(() => {});
                resolvedDriver = null as any;
              }
            }
          }
          if (!resolvedDriver) continue; // All candidates conflicted — leave in readyForDispatch
          // ── END BM20-H ────────────────────────────────────────────────────────

          // ── BM20-N6B: QR source driver conflict → purple pool pipeline ────────
          // If the source driver (captured_by QR) was skipped due to a schedule
          // conflict, the booking must enter the SAME purple fallback pipeline
          // used by driver-reject (dispatchToNetwork), NOT the inline offer path.
          // This ensures: is_fallback_offer=true, offer_round=next, ttl=30min,
          // source driver excluded, dispatch_status=offer_pending (not manual).
          //
          // FIX (BM20-QR-CONFLICT-V2): Detect specifically when the SOURCE DRIVER
          // was skipped — not just when any driver was skipped. The previous
          // condition (topDriver.id !== resolvedDriver.id) missed the case where
          // sourceDriverId is NOT the topDriver (e.g. ranking: Driver2 > Driver1)
          // but Driver1 (source) still has a conflict and must be excluded.
          // Correct check: resolvedDriver.id !== sourceDriverId
          const sourceDriverWasSkipped =
            sourceDriverId !== null &&
            resolvedDriver.id !== sourceDriverId;

          if (sourceDriverWasSkipped) {
            // Prepare booking for pool pipeline: status=ready_for_dispatch,
            // original_driver_id=sourceDriverId so dispatchToNetwork excludes them.
            await sql`
              UPDATE bookings
              SET
                status = 'ready_for_dispatch',
                dispatch_status = 'reassignment_needed',
                original_driver_id = ${sourceDriverId}::uuid,
                assigned_driver_id = NULL,
                updated_at = NOW()
              WHERE id = ${candidate.id}::uuid
                AND assigned_driver_id IS NULL
            `;
            // Log the QR-conflict fallback for audit trail
            sql`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES ('booking', ${candidate.id}::uuid, 'bm20n6b_qr_conflict_pool_fallback', 'system',
                ${JSON.stringify({
                  source_driver_id: sourceDriverId,
                  source_driver_code: candidate.captured_by_driver_code,
                  resolved_driver_id: resolvedDriver.id,
                  resolved_driver_code: resolvedDriver.driver_code,
                  booking_id: candidate.id,
                  timestamp: new Date().toISOString(),
                })}::jsonb)
            `.catch(() => {});
            // Enter the same purple pipeline as driver-reject
            await dispatchToNetwork(candidate.id, 1, sourceDriverId ?? undefined);
            // Update local state
            const idx2 = readyForDispatch.indexOf(candidate);
            if (idx2 !== -1) readyForDispatch.splice(idx2, 1);
            candidate.status = 'ready_for_dispatch';
            candidate.dispatch_status = 'offer_pending';
            candidate.auto_assigned = true;
            candidate.bm20n6b_pool_fallback = true;
            assigned.push(candidate);
            continue;
          }
          // ── END BM20-N6B ─────────────────────────────────────────────────────

          // Normal path: source driver available (or no source driver) — assign directly
          await sql`
            UPDATE bookings
            SET
              assigned_driver_id = ${resolvedDriver.id}::uuid,
              status = 'assigned',
              dispatch_status = 'offer_pending',
              updated_at = NOW()
            WHERE id = ${candidate.id}::uuid
              AND assigned_driver_id IS NULL
          `;
          // Create dispatch_offer record
          sql`
            INSERT INTO dispatch_offers (
              booking_id, driver_id, offer_round,
              is_source_offer, response, sent_at, expires_at
            ) VALUES (
              ${candidate.id}::uuid,
              ${resolvedDriver.id}::uuid,
              1,
              ${engineResult.source_driver_override},
              'pending',
              NOW(),
              NOW() + interval '24 hours'
            )
            ON CONFLICT DO NOTHING
          `.catch(() => {});

          // Move from readyForDispatch to assigned in this response
          const idx = readyForDispatch.indexOf(candidate);
          if (idx !== -1) readyForDispatch.splice(idx, 1);
          candidate.assigned_driver_id = resolvedDriver.id;
          candidate.status = 'assigned';
          candidate.dispatch_status = 'offer_pending';
          candidate.auto_assigned = true;
          candidate.dispatch_priority_rank = resolvedDriver.dispatch_priority_rank;
          candidate.dispatch_priority_score = resolvedDriver.dispatch_priority_score;
          candidate.priority_reason = resolvedDriver.priority_reason;
          candidate.source_driver_override = engineResult.source_driver_override;
          assigned.push(candidate);
        } catch {
          // Auto-assign failure must never block the dispatch response
        }
      }
    }

    // ── Cancel metrics (Bloque Maestro — Cancellation Metrics Sync) ──────────
    let cancelMetrics: any = null;
    try {
      const cancelCounts = await sql`
        SELECT
          COUNT(*) FILTER (
            WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
              AND cancelled_at >= NOW() - INTERVAL '24 hours'
          ) AS last_24h,
          COUNT(*) FILTER (
            WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
              AND cancelled_at >= DATE_TRUNC('day', NOW())
          ) AS today,
          COUNT(*) FILTER (
            WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
              AND cancelled_at >= DATE_TRUNC('week', NOW())
          ) AS this_week,
          COUNT(*) FILTER (
            WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
              AND cancelled_at >= DATE_TRUNC('month', NOW())
          ) AS this_month,
          COUNT(*) FILTER (
            WHERE status = 'cancelled' OR cancelled_at IS NOT NULL
          ) AS total,
          COUNT(*) FILTER (
            WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
              AND COALESCE(cancelled_by_type,
                CASE
                  WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
                  WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
                  WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
                  ELSE 'system'
                END, 'system') = 'client'
          ) AS by_client,
          COUNT(*) FILTER (
            WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
              AND COALESCE(cancelled_by_type,
                CASE
                  WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
                  WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
                  WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
                  ELSE 'system'
                END, 'system') = 'driver'
          ) AS by_driver,
          COUNT(*) FILTER (
            WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
              AND COALESCE(cancelled_by_type,
                CASE
                  WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
                  WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
                  WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
                  ELSE 'system'
                END, 'system') = 'admin'
          ) AS by_admin,
          COUNT(*) FILTER (
            WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
              AND COALESCE(cancelled_by_type,
                CASE
                  WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
                  WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
                  WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
                  ELSE 'system'
                END, 'system') = 'system'
          ) AS by_system
        FROM bookings
      `;
      const cc = cancelCounts[0];
      cancelMetrics = {
        counts: {
          last_24h:   Number(cc.last_24h ?? 0),
          today:      Number(cc.today ?? 0),
          this_week:  Number(cc.this_week ?? 0),
          this_month: Number(cc.this_month ?? 0),
          total:      Number(cc.total ?? 0),
        },
        breakdown: {
          by_client: Number(cc.by_client ?? 0),
          by_driver: Number(cc.by_driver ?? 0),
          by_admin:  Number(cc.by_admin ?? 0),
          by_system: Number(cc.by_system ?? 0),
        },
      };
    } catch { /* non-blocking */ }

    // BM12: Compute visibility guard audit summary
    const guardExcludedCount = assigned.filter((r: any) => r.visibility_guard_applied === 'EXCLUDED_CLOSED_CYCLE').length;
    const guardOverrideCount = assigned.filter((r: any) => r.visibility_guard_applied === 'OVERRIDE_ACTIVE').length;
    const dispatchQueueRides = [
      ...driverIssue,
      ...needsReview,
      ...readyForDispatch,
    ];

    // BM14: Tag all open-cycle rides with dispatch_operational=true
    // Rides in driverIssue, needsReview, readyForDispatch are always operational (open cycle)
    for (const r of [...driverIssue, ...needsReview, ...readyForDispatch]) {
      if ((r as any).dispatch_operational === undefined) {
        ;(r as any).dispatch_operational = true;
        ;(r as any).dispatch_mode = 'operational';
      }
    }
    // inProgress rides are live execution — not operational dispatch, not monitoring
    for (const r of inProgress) {
      if ((r as any).dispatch_operational === undefined) {
        ;(r as any).dispatch_operational = false;
        ;(r as any).dispatch_mode = 'live_execution';
      }
    }

    // BM14: Split assigned bucket into two explicit sub-buckets
    // assigned_operational: rides still in open dispatch cycle (offer_pending, reassignment_required)
    // assigned_monitoring:  rides with closed dispatch cycle (driver accepted, locked)
    const assignedOperational = assigned.filter((r: any) => (r as any).dispatch_operational !== false);
    const assignedMonitoring  = assigned.filter((r: any) => (r as any).dispatch_operational === false);

    return NextResponse.json({
      driverIssue,
      needsReview,
      readyForDispatch,
      // BM14: Keep 'assigned' for backward compatibility (full array)
      assigned,
      // BM14: New explicit sub-buckets for frontend separation
      assigned_operational: assignedOperational,
      assigned_monitoring:  assignedMonitoring,
      inProgress,
      completed,
      recentlyCancelled,
      cancelMetrics,
      // BM19: Overdue Incidents bucket — rides past pickup_at + 15min grace without live execution
      // Each item includes overdue_classification (6-state) and admin_actions[]
      overdue_incidents: overdueIncidents,
      // BM19: Server time as source of truth for the entire dispatch response
      server_now: new Date().toISOString(),
      server_timezone: 'America/New_York',
      total: rows.length,
      counts: {
        driverIssue: driverIssue.length,
        needsReview: needsReview.length,
        readyForDispatch: readyForDispatch.length,
        assigned: assigned.length,
        // BM14: explicit sub-counts
        assigned_operational: assignedOperational.length,
        assigned_monitoring:  assignedMonitoring.length,
        inProgress: inProgress.length,
        completed: completed.length,
        recentlyCancelled: recentlyCancelled.length,
        // BM17: overdue incidents count
        overdue_incidents: overdueIncidents.length,
      },
      // BM12 + BM14: Dispatch Queue Visibility State Guard audit fields
      dispatch_visibility_guard: {
        applied: true,
        admin_override_active: adminOverride,
        excluded_closed_cycle: guardExcludedCount,
        override_active_count: guardOverrideCount,
        dispatch_queue_open_count: dispatchQueueRides.length,
        assigned_operational_count: assignedOperational.length,
        assigned_monitoring_count:  assignedMonitoring.length,
        guard_version: 'BM14_v1',
        excluded_statuses: ['assigned', 'accepted', 'driver_confirmed', 'en_route', 'arrived', 'in_trip', 'completed', 'cancelled'],
        visible_dispatch_statuses: ['pending_dispatch', 'pool_offer', 'reassignment_required', 'offer_pending'],
      },
      awaitingSourceOwner: readyForDispatch.filter((r: any) => r.dispatch_status === "awaiting_source_owner"),
      awaitingSlnMember: readyForDispatch.filter((r: any) => r.dispatch_status === "awaiting_sln_member"),
      manualDispatchRequired: needsReview,
    });
  } catch (err: any) {
    try {
      const rows = await sql`
        SELECT
          b.id,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at, b.updated_at,
          COALESCE(b.service_type, '') AS service_type,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passengers, 1) AS passenger_count,
          0 AS luggage_count,
          COALESCE(b.notes, '') AS notes,
          'unknown' AS lead_source,
          '' AS captured_by_driver_code,
          'manual_admin' AS booking_origin,
          COALESCE(NULLIF(TRIM(c.full_name), ''), b.client_email) AS client_name,
          c.phone AS client_phone,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          NULL AS last_driver_action,
          NULL AS driver_issue_notes
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status NOT IN ('cancelled', 'archived')
        ORDER BY b.created_at DESC
        LIMIT 200
      `;

      const driverIssue: any[] = [];
      const needsReview: any[] = [];
      const readyForDispatch: any[] = [];
      const assigned: any[] = [];
      const inProgress: any[] = [];
      const completed: any[] = [];

      for (const r of rows) {
        const s = r.status ?? "";
        const ds = r.dispatch_status ?? "";
        if (ds === "driver_rejected" || ds === "needs_correction") driverIssue.push(r);
        else if (s === "completed") completed.push(r);
        else if (["en_route", "arrived", "in_trip", "in_progress"].includes(s)) inProgress.push(r);
        else if (["assigned", "driver_confirmed", "accepted"].includes(s)) assigned.push(r);
        else if (["ready_for_dispatch", "offered", "pending_dispatch"].includes(s)) readyForDispatch.push(r);
        else needsReview.push(r);
      }

      return NextResponse.json({
        driverIssue, needsReview, readyForDispatch, assigned, inProgress, completed,
        total: rows.length,
        counts: {
          driverIssue: driverIssue.length, needsReview: needsReview.length,
          readyForDispatch: readyForDispatch.length, assigned: assigned.length,
          inProgress: inProgress.length, completed: completed.length,
        },
      });
    } catch (err2: any) {
      return NextResponse.json({
        driverIssue: [], needsReview: [], readyForDispatch: [],
        assigned: [], inProgress: [], completed: [], total: 0,
        counts: { driverIssue: 0, needsReview: 0, readyForDispatch: 0, assigned: 0, inProgress: 0, completed: 0 },
        error: err2.message,
      }, { status: 200 });
    }
  }
}

/**
 * PATCH /api/admin/dispatch
 * Update dispatch_status and/or booking status.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { booking_id, dispatch_status, status, notes } = body;

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id required" }, { status: 400 });
    }

    const VALID_DISPATCH_STATUSES = [
      "not_required", "awaiting_source_owner", "awaiting_sln_member",
      "manual_dispatch_required", "needs_review", "needs_correction",
      "driver_rejected", "assigned", "expired", "cancelled",
      // Bloque Maestro 2 & 3 — guardrail / fallback statuses
      "reassignment_needed", "urgent_reassignment", "critical_driver_failure",
      "offer_pending", "fallback_dispatched", "fallback_accepted",
      // BM10 MASTER BLOCK — dispatch_state values (used as dispatch_status overrides)
      "ROUND_1_CAPTOR_PRIORITY", "ROUND_2_PREMIUM_PRIORITY", "ROUND_3_POOL_OPEN",
      "ADMIN_ATTENTION_REQUIRED", "pending_dispatch",
    ];

    const VALID_STATUSES = [
      "new", "needs_review", "ready_for_dispatch", "assigned", "driver_confirmed",
      "in_progress", "driver_issue", "completed", "archived", "cancelled",
    ];

    if (dispatch_status && !VALID_DISPATCH_STATUSES.includes(dispatch_status)) {
      return NextResponse.json({ error: `Invalid dispatch_status: ${dispatch_status}` }, { status: 400 });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    if (dispatch_status && status) {
      await sql`UPDATE bookings SET dispatch_status = ${dispatch_status}, status = ${status}, updated_at = NOW() WHERE id = ${booking_id}::uuid`;
    } else if (dispatch_status) {
      await sql`UPDATE bookings SET dispatch_status = ${dispatch_status}, updated_at = NOW() WHERE id = ${booking_id}::uuid`;
    } else if (status) {
      await sql`UPDATE bookings SET status = ${status}, updated_at = NOW() WHERE id = ${booking_id}::uuid`;
    }

    if (notes) {
      try {
        await sql`
          INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
          VALUES (${booking_id}::uuid, 'booking', 'admin_dispatch_update', ${notes}, NOW())
        `;
      } catch { /* audit_logs may not exist */ }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
