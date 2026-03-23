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

    for (const r of rows) {
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

      // ── CRITICAL fields: missing any → needs_review ────────────────────
      // clientPhone, pickupLocation, dropoffLocation, pickupDate/Time, vehicleType,
      // booking_origin, captured_by, payment_status == paid
      const missingCritical: string[] = [];
      if (!r.client_phone)                                       missingCritical.push("tel. cliente");
      if (!r.pickup_address && !r.pickup_zone)                   missingCritical.push("pickup");
      if (!r.dropoff_address && !r.dropoff_zone)                 missingCritical.push("dropoff");
      if (!r.pickup_at)                                          missingCritical.push("fecha/hora");
      if (!r.vehicle_type)                                       missingCritical.push("vehículo");
      if (!r.booking_origin || r.booking_origin === "unknown")   missingCritical.push("booking_origin");
      if (!r.captured_by_driver_code)                            missingCritical.push("captured_by");
      if (r.payment_status !== "paid")                           missingCritical.push("pago pendiente");

      // ── OPTIONAL fields: missing any → booking_flag only, no dispatch change ──
      const missingOptional: string[] = [];
      if (!r.client_email)                                       missingOptional.push("email");
      if (!r.flight_number)                                      missingOptional.push("vuelo");
      if (!r.luggage_count && r.luggage_count !== 0)             missingOptional.push("equipaje");
      if (!r.passenger_count || r.passenger_count <= 0)         missingOptional.push("pasajeros");
      if (!r.notes)                                              missingOptional.push("notas");

      // Attach computed flags to the row object for UI consumption
      (r as any).missing_critical = missingCritical;
      (r as any).missing_optional = missingOptional;
      (r as any).missing_optional_info = missingOptional.length > 0;

      if (hasDriverIssue) {
        driverIssue.push(r);
      } else if (s === "completed") {
        completed.push(r);
      } else if (s === "in_progress" || ["en_route", "arrived", "in_trip"].includes(s)) {
        inProgress.push(r);
      } else if (s === "assigned" || s === "driver_confirmed" || s === "accepted") {
        assigned.push(r);
      } else if (s === "ready_for_dispatch" || s === "offered" || s === "pending_dispatch") {
        readyForDispatch.push(r);
      } else if (s === "needs_review") {
        needsReview.push(r);
      } else if (s === "new") {
        // New bookings: classify based on CRITICAL fields only
        if (missingCritical.length > 0) {
          needsReview.push(r);
        } else {
          readyForDispatch.push(r);
        }
      } else {
        needsReview.push(r);
      }
    }

    return NextResponse.json({
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
