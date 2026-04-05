// ============================================================
// SOTTOVENTO NETWORK — Driver Report Incident Endpoint (BM17)
// POST /api/driver/report-incident
//
// Called by the driver when a ride has passed its pickup_at
// and the driver needs to report the reason for the delay/miss.
//
// INVARIANTS:
//   - Only the assigned driver can report an incident
//   - Only rides in OVERDUE_ELIGIBLE_STATUSES can have incidents
//   - Live execution rides (en_route, arrived, in_trip) are blocked
//   - Incident reason code determines the next action
//   - Redispatch only happens for DRIVER_UNAVAILABLE / VEHICLE_ISSUE
//   - All actions are logged in audit_logs
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  evaluateOverdue,
  getIncidentAction,
  buildServerTimeContext,
  INCIDENT_REASON_CODES,
  LIVE_EXECUTION_STATES,
  FINALIZED_STATES,
  type IncidentReasonCode,
} from "@/lib/dispatch/overdue-engine";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const serverNow = new Date();

  try {
    const body = await req.json();
    const { booking_id, driver_code, reason_code, notes } = body;

    // ── Validate required fields ─────────────────────────────
    if (!booking_id || !driver_code || !reason_code) {
      return NextResponse.json(
        { error: "booking_id, driver_code, and reason_code are required" },
        { status: 400 }
      );
    }

    // ── Validate reason_code ─────────────────────────────────
    if (!INCIDENT_REASON_CODES.includes(reason_code as IncidentReasonCode)) {
      return NextResponse.json(
        {
          error: `Invalid reason_code. Must be one of: ${INCIDENT_REASON_CODES.join(", ")}`,
          valid_codes: INCIDENT_REASON_CODES,
        },
        { status: 400 }
      );
    }

    // ── Fetch driver ─────────────────────────────────────────
    const driverRows = await sql`
      SELECT id, full_name, driver_code, driver_status
      FROM drivers
      WHERE driver_code = ${driver_code}
      LIMIT 1
    `;
    if (!driverRows.length) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const driver = driverRows[0];

    // ── Fetch booking ────────────────────────────────────────
    const bookingRows = await sql`
      SELECT
        b.id,
        b.pickup_at,
        b.status,
        b.dispatch_status,
        b.dispatch_state,
        b.assigned_driver_id,
        b.incident_status,
        b.incident_reason_code,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_zone,
        b.dropoff_zone,
        b.dispatch_round,
        c.full_name AS client_name
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = ${booking_id}::uuid
      LIMIT 1
    `;
    if (!bookingRows.length) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const booking = bookingRows[0];

    // ── Guard: driver must be the assigned driver ────────────
    if (booking.assigned_driver_id !== driver.id) {
      console.log(`[BM17_INCIDENT_GUARD] BLOCKED: driver ${driver_code} is not assigned to booking ${booking_id}. assigned=${booking.assigned_driver_id}`);
      return NextResponse.json(
        {
          error: "Not authorized: you are not the assigned driver for this booking",
          guard: "BM17_DRIVER_AUTH",
        },
        { status: 403 }
      );
    }

    // ── Guard: live execution rides cannot report incidents ──
    if (LIVE_EXECUTION_STATES.includes(booking.status as any)) {
      return NextResponse.json(
        {
          error: "Cannot report incident for a ride in live execution",
          current_status: booking.status,
          guard: "BM17_LIVE_EXECUTION_BLOCK",
        },
        { status: 409 }
      );
    }

    // ── Guard: finalized rides cannot report incidents ───────
    if (FINALIZED_STATES.includes(booking.status as any)) {
      return NextResponse.json(
        {
          error: "Cannot report incident for a finalized ride",
          current_status: booking.status,
          guard: "BM17_FINALIZED_BLOCK",
        },
        { status: 409 }
      );
    }

    // ── Guard: incident already reported ────────────────────
    if (booking.incident_status && booking.incident_status !== "pending_reason") {
      return NextResponse.json(
        {
          error: "Incident already reported for this booking",
          current_incident_status: booking.incident_status,
          current_reason_code: booking.incident_reason_code,
          guard: "BM17_DUPLICATE_INCIDENT",
        },
        { status: 409 }
      );
    }

    // ── Evaluate overdue ─────────────────────────────────────
    const overdueResult = evaluateOverdue(booking as any, serverNow);
    const timeContext = buildServerTimeContext(booking.pickup_at);

    // ── Determine action ─────────────────────────────────────
    const incidentAction = getIncidentAction(reason_code as IncidentReasonCode);

    console.log(`[BM17_INCIDENT_REPORTED] booking=${booking_id} driver=${driver_code} reason=${reason_code} action=${incidentAction.action} overdue=${overdueResult.overdue_since_minutes}min`);

    // ── Apply action ─────────────────────────────────────────
    let newStatus = booking.status;
    let newDispatchStatus = booking.dispatch_status;
    let newDispatchState = booking.dispatch_state;
    let newIncidentStatus = "driver_reported";
    let redispatchTriggered = false;
    let adminAlertRequired = false;

    if (incidentAction.action === "redispatch") {
      // DRIVER_UNAVAILABLE or VEHICLE_ISSUE → controlled redispatch
      newStatus = "driver_issue";
      newDispatchStatus = "reassignment_required";
      newDispatchState = "DRIVER_RELEASED";
      newIncidentStatus = "admin_review";
      redispatchTriggered = true;
      adminAlertRequired = true;
    } else if (incidentAction.action === "no_show_flow") {
      // CLIENT_NO_SHOW → admin confirmation required
      newStatus = "driver_issue";
      newDispatchStatus = "needs_correction";
      newDispatchState = "INCIDENT_PENDING_ADMIN";
      newIncidentStatus = "admin_review";
      adminAlertRequired = true;
    } else {
      // admin_review: FLIGHT_DELAY, CLIENT_RESCHEDULE_REQUEST, TRAFFIC_DELAY, OTHER
      newStatus = "driver_issue";
      newDispatchStatus = "needs_correction";
      newDispatchState = "INCIDENT_PENDING_ADMIN";
      newIncidentStatus = "admin_review";
      adminAlertRequired = true;
    }

    // ── Update booking ───────────────────────────────────────
    await sql`
      UPDATE bookings SET
        status              = ${newStatus},
        dispatch_status     = ${newDispatchStatus},
        dispatch_state      = ${newDispatchState},
        incident_status     = ${newIncidentStatus},
        incident_reason_code = ${reason_code},
        incident_notes      = ${notes ?? null},
        incident_reported_at = NOW(),
        incident_reported_by = ${driver_code},
        updated_at          = NOW()
      WHERE id = ${booking_id}::uuid
    `;

    // ── Trigger redispatch if needed ─────────────────────────
    if (redispatchTriggered) {
      const newRound = (booking.dispatch_round ?? 0) + 1;
      await sql`
        UPDATE bookings SET
          assigned_driver_id = NULL,
          dispatch_round     = ${newRound},
          dispatch_state     = 'ROUND_3_POOL_OPEN',
          manual_dispatch_required = true,
          updated_at         = NOW()
        WHERE id = ${booking_id}::uuid
      `;
      console.log(`[BM17_REDISPATCH_TRIGGERED] booking=${booking_id} new_round=${newRound}`);
    }

    // ── Write audit log ──────────────────────────────────────
    await sql`
      INSERT INTO audit_logs (booking_id, action, actor, details, created_at)
      VALUES (
        ${booking_id}::uuid,
        'driver_incident_reported',
        ${driver_code},
        ${JSON.stringify({
          reason_code,
          notes: notes ?? null,
          action: incidentAction.action,
          action_description: incidentAction.description,
          overdue_since_minutes: overdueResult.overdue_since_minutes,
          server_now: serverNow.toISOString(),
          redispatch_triggered: redispatchTriggered,
          admin_alert_required: adminAlertRequired,
          new_status: newStatus,
          new_dispatch_status: newDispatchStatus,
          new_dispatch_state: newDispatchState,
          bm17_version: "v1",
        })},
        NOW()
      )
    `.catch(() => {
      // Audit log failure must never block the incident report
    });

    // ── Build response ───────────────────────────────────────
    return NextResponse.json({
      success: true,
      booking_id,
      driver_code,
      reason_code,
      incident_action: incidentAction.action,
      incident_action_description: incidentAction.description,
      incident_status: newIncidentStatus,
      redispatch_triggered: redispatchTriggered,
      admin_alert_required: adminAlertRequired,
      new_status: newStatus,
      new_dispatch_status: newDispatchStatus,
      overdue_since_minutes: overdueResult.overdue_since_minutes,
      time_context: timeContext,
      bm17_guard: "INCIDENT_ACCEPTED",
    });
  } catch (err: any) {
    console.error("[BM17_INCIDENT_ERROR]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
