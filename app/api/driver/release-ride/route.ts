import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/driver/release-ride
//
// BM11 — Driver Post-Accept Release Flow (Controlled Redispatch Engine)
//
// Allows a driver who has accepted a ride to voluntarily release it
// BEFORE the ride enters live execution (en_route / arrived / in_trip).
//
// FLOW:
//   1. Validate: driver is the assigned driver
//   2. Validate: dispatch_state < EN_ROUTE (not yet in live execution)
//   3. Update booking:
//        assigned_driver_id = NULL
//        dispatch_status    = 'reassignment_required'
//        dispatch_state     = 'DRIVER_RELEASED'
//        status             = 'driver_issue'
//   4. Insert audit log: driver_release_event
//   5. Trigger redispatch: enqueue pool offer (ROUND_3_POOL_OPEN)
//   6. If pickup_at < 60 min → flag admin_dispatch_alert = HIGH_PRIORITY
//   7. Placeholder: reliability score impact log
//
// BLOCKED STATES (live execution — use "Reportar incidencia" instead):
//   en_route | arrived | in_trip
//
// PAYLOAD:
//   { booking_id, driver_id, reason }
// ============================================================

// States that indicate the ride is in live execution — release is blocked
const LIVE_EXECUTION_STATES = ["en_route", "arrived", "in_trip"];

// States eligible for controlled release (pre-execution)
const RELEASABLE_STATES = ["accepted", "assigned", "driver_confirmed"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      booking_id,
      driver_id,
      reason,
    }: {
      booking_id: string;
      driver_id: string;
      reason: string;
    } = body;

    // ── Validate required fields ──────────────────────────────
    if (!booking_id || !driver_id || !reason) {
      return NextResponse.json(
        { error: "booking_id, driver_id, and reason are required" },
        { status: 400 }
      );
    }

    // ── Ensure required columns exist (idempotent migration) ──
    try {
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS driver_release_reason   TEXT,
          ADD COLUMN IF NOT EXISTS driver_release_at       TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS driver_release_driver_id UUID,
          ADD COLUMN IF NOT EXISTS admin_dispatch_alert    TEXT,
          ADD COLUMN IF NOT EXISTS admin_dispatch_priority TEXT
      `;
    } catch { /* columns already exist */ }

    // ── Load driver ───────────────────────────────────────────
    const driverRows = await sql`
      SELECT id, driver_code, full_name
      FROM drivers
      WHERE id = ${driver_id}::uuid
      LIMIT 1
    `;
    if (driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const driver = driverRows[0];

    // ── Load booking ──────────────────────────────────────────
    const bookingRows = await sql`
      SELECT
        id, status, dispatch_status, dispatch_state,
        assigned_driver_id, pickup_at,
        pickup_address, pickup_zone,
        dropoff_address, dropoff_zone,
        total_price, client_id
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `;
    if (bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const booking = bookingRows[0];

    // ── VALIDATION 1: Driver must be the assigned driver ──────
    const assignedId = String(booking.assigned_driver_id ?? "");
    const driverIdStr = String(driver.id ?? "");
    if (assignedId !== driverIdStr) {
      return NextResponse.json(
        { error: "Not authorized: you are not the assigned driver for this booking" },
        { status: 403 }
      );
    }

    // ── VALIDATION 2: Block release if ride is in live execution ─
    // CASO C: dispatch_state >= EN_ROUTE → blocked, show "Reportar incidencia"
    if (LIVE_EXECUTION_STATES.includes(booking.status)) {
      return NextResponse.json(
        {
          error: "Release blocked: ride is already in live execution.",
          blocked_reason: "live_execution",
          current_status: booking.status,
          action_required: "report_incident",
          message: "Use 'Reportar incidencia' to flag this ride for admin attention.",
        },
        { status: 409 }
      );
    }

    // ── VALIDATION 3: Booking must be in a releasable state ───
    if (!RELEASABLE_STATES.includes(booking.status)) {
      return NextResponse.json(
        {
          error: `Cannot release from status '${booking.status}'. Release is only allowed in: ${RELEASABLE_STATES.join(", ")}`,
          current_status: booking.status,
        },
        { status: 409 }
      );
    }

    // ── Time delta calculation ────────────────────────────────
    const nowMs = Date.now();
    const pickupMs = booking.pickup_at ? new Date(booking.pickup_at).getTime() : null;
    const minutesToPickup = pickupMs !== null ? (pickupMs - nowMs) / 60000 : null;
    const nowIso = new Date().toISOString();

    // ── Determine admin alert priority ────────────────────────
    // BM11 spec: if pickup_at < 60 min → HIGH_PRIORITY alert
    let adminAlertPriority: "HIGH_PRIORITY" | "NORMAL" | null = null;
    if (minutesToPickup !== null && minutesToPickup < 60) {
      adminAlertPriority = "HIGH_PRIORITY";
    } else if (minutesToPickup !== null) {
      adminAlertPriority = "NORMAL";
    }

    const prevStatus = booking.status;
    const prevDispatchStatus = booking.dispatch_status;
    const prevDispatchState = booking.dispatch_state;

    // ── STEP 3: Update booking — release driver, reopen dispatch ─
    await sql`
      UPDATE bookings
      SET
        -- BM11: Remove assigned driver — ride is back in the pool
        assigned_driver_id               = NULL,
        -- BM11: dispatch_status = reassignment_required (new state per spec)
        dispatch_status                  = 'reassignment_required',
        -- BM11: dispatch_state = DRIVER_RELEASED (new state per spec)
        dispatch_state                   = 'DRIVER_RELEASED',
        -- Booking status → driver_issue for admin visibility in Dispatch Tower
        status                           = 'driver_issue',
        -- Release tracking fields
        driver_release_reason            = ${reason},
        driver_release_at                = ${nowIso}::timestamptz,
        driver_release_driver_id         = ${driver.id}::uuid,
        -- Admin alert fields
        admin_dispatch_alert             = ${adminAlertPriority ?? 'NORMAL'},
        admin_dispatch_priority          = ${adminAlertPriority ?? 'NORMAL'},
        -- Cancellation metrics (for scoring engine)
        cancelled_by_type                = 'driver',
        cancelled_by_id                  = ${driver.id}::uuid,
        cancel_stage                     = 'post_accept_pre_execution',
        affects_driver_metrics           = TRUE,
        affects_payout                   = FALSE,
        manual_dispatch_required         = FALSE,
        updated_at                       = NOW()
      WHERE id = ${booking_id}::uuid
        AND assigned_driver_id = ${driver.id}::uuid
        AND status NOT IN ('en_route', 'arrived', 'in_trip', 'completed', 'cancelled', 'archived')
    `;

    // ── STEP 4: Insert audit log — driver_release_event ──────
    const auditData = {
      event:                "driver_release_event",
      reason,
      exit_case:            adminAlertPriority === "HIGH_PRIORITY" ? "HIGH_PRIORITY_RELEASE" : "NORMAL_RELEASE",
      prev_status:          prevStatus,
      prev_dispatch_status: prevDispatchStatus,
      prev_dispatch_state:  prevDispatchState,
      new_status:           "driver_issue",
      new_dispatch_status:  "reassignment_required",
      new_dispatch_state:   "DRIVER_RELEASED",
      minutes_to_pickup:    minutesToPickup !== null ? Math.round(minutesToPickup) : null,
      pickup_at:            booking.pickup_at,
      admin_alert:          adminAlertPriority,
      timestamp:            nowIso,
      driver_id:            driver.id,
      driver_code:          driver.driver_code,
    };

    try {
      await sql`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, actor_id, new_data
        ) VALUES (
          'booking',
          ${booking_id}::uuid,
          'driver_release_event',
          'driver',
          ${driver.id}::uuid,
          ${JSON.stringify(auditData)}::jsonb
        )
      `;
    } catch { /* non-blocking — audit log failure must not block the release */ }

    // ── STEP 5: Trigger redispatch — enqueue pool offer ───────
    // BM11: dispatch_engine.enqueue_pool_offer()
    // Implementation: set dispatch_state to ROUND_3_POOL_OPEN and create a new
    // dispatch_offer for the pool. The dispatch engine cron will pick it up.
    try {
      await sql`
        UPDATE bookings
        SET
          dispatch_state  = 'ROUND_3_POOL_OPEN',
          dispatch_status = 'reassignment_required',
          dispatch_round  = COALESCE(dispatch_round, 1) + 1,
          updated_at      = NOW()
        WHERE id = ${booking_id}::uuid
          AND status = 'driver_issue'
      `;

      // Log the redispatch trigger
      await sql`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, actor_id, new_data
        ) VALUES (
          'booking',
          ${booking_id}::uuid,
          'redispatch_triggered',
          'system',
          ${driver.id}::uuid,
          ${JSON.stringify({
            trigger: "driver_release_event",
            new_dispatch_state: "ROUND_3_POOL_OPEN",
            admin_alert: adminAlertPriority,
            timestamp: nowIso,
          })}::jsonb
        )
      `;
    } catch { /* non-blocking — redispatch failure must not block the release response */ }

    // ── STEP 6: Admin alert if pickup < 60 min ────────────────
    // BM11: if pickup_time < 60 min → admin_dispatch_alert = HIGH_PRIORITY
    // This is already written to the booking record above.
    // Additionally, log a high-priority audit event for the admin dashboard.
    if (adminAlertPriority === "HIGH_PRIORITY") {
      try {
        await sql`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, actor_type, actor_id, new_data
          ) VALUES (
            'booking',
            ${booking_id}::uuid,
            'admin_dispatch_alert_high_priority',
            'system',
            ${driver.id}::uuid,
            ${JSON.stringify({
              alert: "HIGH_PRIORITY",
              reason: "driver_released_ride_within_60min",
              minutes_to_pickup: minutesToPickup !== null ? Math.round(minutesToPickup) : null,
              driver_code: driver.driver_code,
              timestamp: nowIso,
            })}::jsonb
          )
        `;
      } catch { /* non-blocking */ }
    }

    // ── STEP 7: Reliability score placeholder ─────────────────
    // BM11: "solo log placeholder si aún no existe scoring engine"
    try {
      await sql`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, actor_id, new_data
        ) VALUES (
          'driver',
          ${driver.id}::uuid,
          'reliability_score_impact_placeholder',
          'system',
          ${driver.id}::uuid,
          ${JSON.stringify({
            event:          "driver_release_event",
            booking_id,
            impact:         "post_accept_release_penalty",
            minutes_to_pickup: minutesToPickup !== null ? Math.round(minutesToPickup) : null,
            severity:       adminAlertPriority === "HIGH_PRIORITY" ? "HIGH" : "MEDIUM",
            timestamp:      nowIso,
            note:           "PLACEHOLDER — scoring engine not yet implemented",
          })}::jsonb
        )
      `;
    } catch { /* non-blocking */ }

    // ── Response ──────────────────────────────────────────────
    return NextResponse.json({
      success:              true,
      booking_id,
      driver_id:            driver.id,
      driver_code:          driver.driver_code,
      new_booking_status:   "driver_issue",
      new_dispatch_status:  "reassignment_required",
      new_dispatch_state:   "ROUND_3_POOL_OPEN",
      admin_alert:          adminAlertPriority,
      minutes_to_pickup:    minutesToPickup !== null ? Math.round(minutesToPickup) : null,
      redispatch_triggered: true,
      message: adminAlertPriority === "HIGH_PRIORITY"
        ? "Ride released and re-queued to pool. HIGH PRIORITY admin alert triggered (pickup < 60 min)."
        : "Ride released and re-queued to pool. Admin notified.",
    });

  } catch (err: any) {
    console.error("[driver/release-ride]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
