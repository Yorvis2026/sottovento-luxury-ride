import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/driver/driver-exit
//
// Post-Accept Driver Exit / Recovery Logic
// Bloque Maestro 1 — Magnus 1.6
//
// This is NOT a normal ride cancellation.
// This is a controlled operational exit after ACCEPT.
//
// Time-based decision logic:
//   CASE A: > 45 min to pickup  → driver_issue → reassignment_needed → fallback pool
//   CASE B: 15–45 min to pickup → driver_issue → urgent_reassignment → admin priority
//   CASE C: < 15 min OR delay   → driver_issue → critical_driver_failure → admin direct
//
// EXIT_REASONS:
//   vehicle_breakdown | personal_emergency | wont_arrive_on_time
//   accepted_by_mistake | client_unreachable | other
// ============================================================

const EXIT_REASONS = [
  "vehicle_breakdown",
  "personal_emergency",
  "wont_arrive_on_time",
  "accepted_by_mistake",
  "client_unreachable",
  "other",
] as const;

type ExitReason = (typeof EXIT_REASONS)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      booking_id,
      driver_code,
      exit_reason,
      exit_comment,
    }: {
      booking_id: string;
      driver_code: string;
      exit_reason: ExitReason;
      exit_comment?: string;
    } = body;

    // ── Validate inputs ───────────────────────────────────────
    if (!booking_id || !driver_code || !exit_reason) {
      return NextResponse.json(
        { error: "booking_id, driver_code, and exit_reason are required" },
        { status: 400 }
      );
    }

    if (!EXIT_REASONS.includes(exit_reason)) {
      return NextResponse.json(
        { error: `Invalid exit_reason. Must be one of: ${EXIT_REASONS.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Ensure required columns exist (idempotent migration) ──
    try {
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS driver_exit_reason    TEXT,
          ADD COLUMN IF NOT EXISTS driver_exit_comment   TEXT,
          ADD COLUMN IF NOT EXISTS driver_exit_at        TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS driver_exit_prev_status TEXT,
          ADD COLUMN IF NOT EXISTS driver_exit_prev_dispatch_status TEXT,
          ADD COLUMN IF NOT EXISTS driver_exit_case      TEXT
      `;
    } catch { /* columns already exist */ }

    // ── Load driver ───────────────────────────────────────────
    const driverRows = await sql`
      SELECT id, driver_code, full_name, availability_status
      FROM drivers
      WHERE driver_code = ${driver_code.toUpperCase()}
      LIMIT 1
    `;
    if (driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const driver = driverRows[0];

    // ── Load booking ──────────────────────────────────────────
    const bookingRows = await sql`
      SELECT
        id, status, dispatch_status, assigned_driver_id,
        pickup_at, pickup_address, dropoff_address,
        total_price, client_id
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `;
    if (bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const booking = bookingRows[0];

    // ── Authorization: driver must be the assigned driver ─────
    const assignedId = String(booking.assigned_driver_id ?? "");
    const driverId   = String(driver.id ?? "");
    if (assignedId !== driverId) {
      return NextResponse.json(
        { error: "Not authorized: you are not the assigned driver for this booking" },
        { status: 403 }
      );
    }

    // ── State guard: only allow exit in eligible states ───────
    const eligibleStatuses = ["accepted", "assigned", "en_route"];
    if (!eligibleStatuses.includes(booking.status)) {
      return NextResponse.json(
        {
          error: `Cannot exit from status '${booking.status}'. Exit is only allowed in: ${eligibleStatuses.join(", ")}`,
          current_status: booking.status,
        },
        { status: 409 }
      );
    }

    // ── Special guard: en_route only allowed if NOT yet arrived ─
    // (arrived/in_trip are blocked by the eligibleStatuses check above)

    // ── Time-based decision logic ─────────────────────────────
    const nowMs = Date.now();
    const pickupMs = booking.pickup_at ? new Date(booking.pickup_at).getTime() : null;
    const minutesToPickup = pickupMs !== null ? (pickupMs - nowMs) / 60000 : null;

    // Determine exit case
    let exitCase: "A" | "B" | "C";
    let newDispatchStatus: string;
    let adminPriority: "normal" | "urgent" | "critical";

    if (minutesToPickup === null || minutesToPickup < 0) {
      // Already past pickup time (delay) → CRITICAL
      exitCase = "C";
      newDispatchStatus = "critical_driver_failure";
      adminPriority = "critical";
    } else if (minutesToPickup < 15) {
      // < 15 min → CRITICAL
      exitCase = "C";
      newDispatchStatus = "critical_driver_failure";
      adminPriority = "critical";
    } else if (minutesToPickup <= 45) {
      // 15–45 min → URGENT
      exitCase = "B";
      newDispatchStatus = "urgent_reassignment";
      adminPriority = "urgent";
    } else {
      // > 45 min → NORMAL REASSIGNMENT
      exitCase = "A";
      newDispatchStatus = "reassignment_needed";
      adminPriority = "normal";
    }

    const nowIso = new Date().toISOString();
    const prevStatus = booking.status;
    const prevDispatchStatus = booking.dispatch_status;

    // ── Bloque Maestro — Cancellation Metrics Sync: cancel_stage for driver-exit ────────────────────────────────────────────
    const cancelStage = prevStatus === 'en_route' ? 'en_route'
      : prevStatus === 'arrived' ? 'arrived'
      : 'post_accept_pre_dispatch';

    // ── Update booking ────────────────────────────────────────────
    await sql`
      UPDATE bookings
      SET
        status                           = 'driver_issue',
        dispatch_status                  = ${newDispatchStatus},
        driver_exit_reason               = ${exit_reason},
        driver_exit_comment              = ${exit_comment ?? null},
        driver_exit_at                   = ${nowIso}::timestamptz,
        driver_exit_prev_status          = ${prevStatus},
        driver_exit_prev_dispatch_status = ${prevDispatchStatus},
        driver_exit_case                 = ${exitCase},
        cancelled_by_type                = 'driver',
        cancelled_by_id                  = ${driver.id}::uuid,
        cancel_stage                     = ${cancelStage},
        affects_driver_metrics           = TRUE,
        affects_payout                   = FALSE,
        cancelled_at                     = ${nowIso}::timestamptz,
        updated_at                       = NOW()
      WHERE id = ${booking_id}::uuid
    `;  // ── Update driver availability ────────────────────────────
    // Case A: driver is free → back to available
    // Case B/C: driver may need to be retained → available but flagged
    // In all cases: remove busy since they're no longer executing
    try {
      await sql`
        UPDATE drivers
        SET availability_status = 'available', updated_at = NOW()
        WHERE id = ${driver.id}::uuid
      `;
    } catch { /* non-blocking */ }

    // ── Write audit log ───────────────────────────────────────
    const auditData = {
      exit_reason,
      exit_comment:        exit_comment ?? null,
      exit_case:           exitCase,
      new_dispatch_status: newDispatchStatus,
      admin_priority:      adminPriority,
      prev_status:         prevStatus,
      prev_dispatch_status: prevDispatchStatus,
      minutes_to_pickup:   minutesToPickup !== null ? Math.round(minutesToPickup) : null,
      pickup_at:           booking.pickup_at,
      timestamp:           nowIso,
      driver_code,
      driver_id:           driver.id,
    };

    try {
      await sql`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, actor_id, new_data
        ) VALUES (
          'booking',
          ${booking_id}::uuid,
          'driver_reported_exit',
          'driver',
          ${driver.id}::uuid,
          ${JSON.stringify(auditData)}::jsonb
        )
      `;
    } catch { /* non-blocking */ }

    // ── Case A: trigger fallback pool dispatch ────────────────
    // For Case A (> 45 min), release to fallback pool automatically.
    // We do this by clearing assigned_driver_id so the booking is
    // available for the next dispatch cycle.
    if (exitCase === "A") {
      try {
        await sql`
          UPDATE bookings
          SET
            assigned_driver_id = NULL,
            dispatch_status    = 'reassignment_needed',
            updated_at         = NOW()
          WHERE id = ${booking_id}::uuid
        `;
      } catch { /* non-blocking */ }
    }

    // ── Response ──────────────────────────────────────────────
    return NextResponse.json({
      success:             true,
      booking_id,
      exit_case:           exitCase,
      new_booking_status:  "driver_issue",
      new_dispatch_status: newDispatchStatus,
      admin_priority:      adminPriority,
      minutes_to_pickup:   minutesToPickup !== null ? Math.round(minutesToPickup) : null,
      driver_availability: "available",
      message: exitCase === "A"
        ? "Booking released to fallback pool. Admin notified."
        : exitCase === "B"
        ? "Urgent reassignment triggered. Admin has priority control."
        : "Critical driver failure. Admin has direct control. No auto-pool.",
    });

  } catch (err: any) {
    console.error("[driver/driver-exit]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
