import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
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
export async function GET() {
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
        b.payment_status,
        b.assigned_driver_id,
        b.created_at,
        b.updated_at,
        COALESCE(b.service_type, '') AS service_type,
        COALESCE(b.flight_number, '') AS flight_number,
        COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
        COALESCE(b.luggage_count, b.luggage, 0) AS luggage_count,
        COALESCE(b.notes, '') AS notes,
        COALESCE(b.lead_source, 'unknown') AS lead_source,
        COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
        COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
        c.full_name AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        d.full_name AS driver_name,
        d.driver_code AS driver_code,
        d.phone AS driver_phone,
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
          SELECT al.notes FROM audit_logs al
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
      WHERE (
        b.status NOT IN ('cancelled', 'archived')
        OR (b.status = 'completed' AND b.updated_at > NOW() - INTERVAL '24 hours')
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
      // ── FASE 6: Overdue flag ────────────────────────────────────────────────
      // is_overdue: pickup_at has passed but ride is not yet in_trip/completed
      // overdue_minutes: how many minutes past pickup_at
      const pickupAt = r.pickup_at ? new Date(r.pickup_at).getTime() : null
      const nowMs = Date.now()
      const overdueMs = pickupAt ? nowMs - pickupAt : 0
      const overdueMin = overdueMs > 0 ? Math.floor(overdueMs / 60000) : 0
      const isOverdueStatus = ["accepted", "assigned", "en_route", "arrived", "offer_pending"].includes(r.status ?? "")
      const isOverdue = isOverdueStatus && overdueMin > 0
      ;(r as any).is_overdue = isOverdue
      ;(r as any).overdue_minutes = isOverdue ? overdueMin : 0
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

      if (hasDriverIssue) {
        driverIssue.push(r);
      } else if (s === "completed") {
        completed.push(r);
      } else if (s === "in_progress" || ["en_route", "arrived", "in_trip"].includes(s)) {
        inProgress.push(r);
      } else if (s === "assigned" || s === "driver_confirmed" || s === "accepted" || s === "offer_pending") {
        // offer_pending: driver has been assigned but hasn't confirmed yet
        assigned.push(r);
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

    // ── AUTO-ASSIGN to capturing driver ────────────────────────────────────
    // Business rule: if a booking is ready_for_dispatch AND has captured_by_driver_code
    // AND has no assigned_driver_id yet → auto-assign to that driver.
    // This runs after classification so it does not block the response.
    // Bookings auto-assigned here will appear in the 'assigned' bucket on next load.
    const autoAssignCandidates = readyForDispatch.filter(
      (r: any) => r.captured_by_driver_code && !r.assigned_driver_id
    );
    if (autoAssignCandidates.length > 0) {
      for (const candidate of autoAssignCandidates) {
        try {
          // Look up driver by driver_code
          const [driverRow] = await sql`
            SELECT id FROM drivers
            WHERE UPPER(driver_code) = UPPER(${candidate.captured_by_driver_code})
              AND driver_status = 'active'
            LIMIT 1
          `;
          if (driverRow?.id) {
            // Atomic update: assign driver + transition to offer_pending
            // FIXED: use dispatch_status='offer_pending' so the ride appears
            // in the driver panel as an offer requiring Accept/Reject.
            await sql`
              UPDATE bookings
              SET
                assigned_driver_id = ${driverRow.id}::uuid,
                status = 'assigned',
                dispatch_status = 'offer_pending',
                updated_at = NOW()
              WHERE id = ${candidate.id}::uuid
                AND assigned_driver_id IS NULL
            `;
            // Also create a dispatch_offer record for the driver panel
            try {
              await sql`
                INSERT INTO dispatch_offers (
                  booking_id, driver_id, offer_round,
                  is_source_offer, response, sent_at, expires_at
                ) VALUES (
                  ${candidate.id}::uuid,
                  ${driverRow.id}::uuid,
                  1,
                  true,
                  'pending',
                  NOW(),
                  NOW() + interval '24 hours'
                )
                ON CONFLICT DO NOTHING
              `;
            } catch { /* non-blocking */ }
            // Move from readyForDispatch to assigned in this response
            const idx = readyForDispatch.indexOf(candidate);
            if (idx !== -1) readyForDispatch.splice(idx, 1);
            candidate.assigned_driver_id = driverRow.id;
            candidate.status = 'assigned';
            candidate.dispatch_status = 'offer_pending';
            candidate.auto_assigned = true;
            assigned.push(candidate);
          }
        } catch {
          // Auto-assign failure must never block the dispatch response
        }
      }
    }

    return NextResponse.json({
      _v: "90322dc",  // dispatch version marker — remove after verification
      driverIssue,
      needsReview,
      readyForDispatch,
      assigned,
      inProgress,
      completed,
      total: rows.length,
      counts: {
        driverIssue: driverIssue.length,
        needsReview: needsReview.length,
        readyForDispatch: readyForDispatch.length,
        assigned: assigned.length,
        inProgress: inProgress.length,
        completed: completed.length,
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
          c.full_name AS client_name,
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
