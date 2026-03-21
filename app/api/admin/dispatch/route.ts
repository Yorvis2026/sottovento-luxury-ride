import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/dispatch — 6-bucket operational dispatch view
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        b.id,
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
        b.service_type,
        b.flight_number,
        b.passengers,
        c.full_name AS client_name,
        c.phone AS client_phone,
        d.full_name AS driver_name,
        d.driver_code AS driver_code,
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
        ) AS last_driver_action
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE b.status NOT IN ('cancelled')
        AND (
          b.status IN ('new', 'offered', 'pending_dispatch', 'accepted', 'assigned', 'en_route', 'arrived', 'in_trip')
          OR (b.status = 'completed' AND b.updated_at > NOW() - INTERVAL '24 hours')
          OR b.dispatch_status IN ('driver_rejected', 'needs_correction', 'needs_review')
        )
      ORDER BY
        CASE
          WHEN b.dispatch_status IN ('driver_rejected', 'needs_correction') THEN 1
          WHEN b.dispatch_status = 'needs_review' THEN 2
          WHEN b.status IN ('en_route', 'arrived', 'in_trip') THEN 3
          WHEN b.dispatch_status = 'assigned' OR b.status IN ('accepted', 'assigned') THEN 4
          WHEN b.dispatch_status IN ('awaiting_source_owner', 'awaiting_sln_member', 'manual_dispatch_required') THEN 5
          ELSE 6
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
      const s = r.status;
      const ds = r.dispatch_status;
      const hasDriverIssue =
        ds === "driver_rejected" || ds === "needs_correction" ||
        r.last_driver_action === "driver_rejected_incomplete_ride" ||
        r.last_driver_action === "driver_reported_incomplete" ||
        r.last_driver_action === "driver_requested_correction";

      if (hasDriverIssue) {
        driverIssue.push(r);
      } else if (s === "completed") {
        completed.push(r);
      } else if (["en_route", "arrived", "in_trip"].includes(s)) {
        inProgress.push(r);
      } else if (ds === "assigned" || ["accepted", "assigned"].includes(s)) {
        assigned.push(r);
      } else if (ds === "needs_review" || ds === "manual_dispatch_required") {
        needsReview.push(r);
      } else if (
        ["awaiting_source_owner", "awaiting_sln_member"].includes(ds ?? "") ||
        ["new", "offered", "pending_dispatch"].includes(s)
      ) {
        readyForDispatch.push(r);
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
      // Legacy compatibility
      awaitingSourceOwner: readyForDispatch.filter((r: any) => r.dispatch_status === "awaiting_source_owner"),
      awaitingSlnMember: readyForDispatch.filter((r: any) => r.dispatch_status === "awaiting_sln_member"),
      manualDispatchRequired: needsReview,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/dispatch — Update dispatch_status and/or status for a booking
export async function PATCH(req: NextRequest) {
  try {
    const { booking_id, dispatch_status, status } = await req.json();
    if (!booking_id) {
      return NextResponse.json({ error: "booking_id required" }, { status: 400 });
    }

    const validDispatchStatuses = [
      "not_required", "awaiting_source_owner", "awaiting_sln_member",
      "manual_dispatch_required", "needs_review", "needs_correction",
      "driver_rejected", "assigned", "expired", "cancelled",
    ];

    if (dispatch_status && !validDispatchStatuses.includes(dispatch_status)) {
      return NextResponse.json({ error: `Invalid dispatch_status: ${dispatch_status}` }, { status: 400 });
    }

    if (dispatch_status) {
      await sql`UPDATE bookings SET dispatch_status = ${dispatch_status}, updated_at = NOW() WHERE id = ${booking_id}::uuid`;
    }
    if (status) {
      await sql`UPDATE bookings SET status = ${status}, updated_at = NOW() WHERE id = ${booking_id}::uuid`;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
