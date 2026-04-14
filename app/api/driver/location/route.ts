export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/driver/location
//
// SLN Driver GPS Heartbeat — SLN-ETA-FEASIBILITY-01
//                          + SLN-GPS-TRACE-01
//
// Persists the driver's current GPS coordinates to:
//   1. drivers.last_known_lat/lng/last_location_at
//      → used by ride-monitor for ETA feasibility evaluation
//   2. driver_route_trace (INSERT when booking is active)
//      → used for route replay, audit, and future analytics
//
// Called by: Driver Panel every 30 seconds (when GPS available)
//
// Body:
//   {
//     driver_code: string,
//     lat: number,
//     lng: number,
//     speed_kmh?: number | null,
//     heading?: number | null,
//     accuracy_m?: number | null
//   }
//
// Response: { ok: true, trace_inserted?: boolean } or { error: string }
// ============================================================

// Booking statuses that qualify for route trace persistence.
// These represent all states where the driver is actively working
// on a booking and their movement is operationally relevant.
const TRACE_ELIGIBLE_STATUSES = [
  "assigned",
  "accepted",
  "en_route",
  "arrived",
  "in_trip",
  // Legacy / extended status aliases used in some booking pipelines
  "en_route_to_pickup",
  "arrived_waiting",
  "trip_started",
  "trip_in_progress",
];

// Minimum gap between trace inserts for the same booking.
// Prevents duplicate rows when the heartbeat fires faster than 60s
// (e.g. if the client retries or the interval drifts).
const TRACE_MIN_INTERVAL_SECONDS = 60;

// Upcoming ride window: persist trace for rides within 2 hours of pickup
// even if status is still "accepted" or "assigned".
const UPCOMING_WINDOW_MINUTES = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driver_code, lat, lng, speed_kmh, heading, accuracy_m } = body;

    if (!driver_code || lat == null || lng == null) {
      return NextResponse.json(
        { error: "driver_code, lat, and lng are required" },
        { status: 400 }
      );
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { error: "lat and lng must be valid numbers" },
        { status: 400 }
      );
    }

    // Optional telemetry fields — null when not provided
    const speedKmh  = speed_kmh  != null && !isNaN(Number(speed_kmh))  ? Number(speed_kmh)  : null;
    const headingDeg = heading   != null && !isNaN(Number(heading))     ? Number(heading)    : null;
    const accuracyM = accuracy_m != null && !isNaN(Number(accuracy_m)) ? Number(accuracy_m) : null;

    // ── [SLN-ETA-FEASIBILITY-01] Ensure location columns exist ─────────────
    try {
      await sql`
        ALTER TABLE drivers
          ADD COLUMN IF NOT EXISTS last_known_lat    DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS last_known_lng    DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS last_location_at  TIMESTAMPTZ
      `;
    } catch { /* columns may already exist */ }

    // ── Update driver's last known location ─────────────────────────────────
    const result = await sql`
      UPDATE drivers
      SET last_known_lat   = ${latNum},
          last_known_lng   = ${lngNum},
          last_location_at = NOW()
      WHERE driver_code = ${driver_code.toUpperCase()}
        AND driver_status = 'active'
      RETURNING id, driver_code, last_known_lat, last_known_lng, last_location_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Driver not found or not active" },
        { status: 404 }
      );
    }

    const driver = result[0];

    // ── [SLN-GPS-TRACE-01] Route Trace Persistence ──────────────────────────
    // Non-blocking: trace failures must never affect the heartbeat response.
    let trace_inserted = false;

    try {
      // Step 1: Auto-migrate driver_route_trace table (idempotent)
      await sql`
        CREATE TABLE IF NOT EXISTS driver_route_trace (
          id            BIGSERIAL PRIMARY KEY,
          booking_id    BIGINT        NOT NULL,
          driver_code   TEXT          NOT NULL,
          lat           DOUBLE PRECISION NOT NULL,
          lng           DOUBLE PRECISION NOT NULL,
          recorded_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
          speed_kmh     DOUBLE PRECISION NULL,
          heading       DOUBLE PRECISION NULL,
          accuracy_m    DOUBLE PRECISION NULL,
          source        TEXT          NOT NULL DEFAULT 'heartbeat'
        )
      `;

      // Step 2: Ensure indexes exist (idempotent — CREATE INDEX IF NOT EXISTS)
      await sql`
        CREATE INDEX IF NOT EXISTS idx_driver_route_trace_booking_id
          ON driver_route_trace (booking_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_driver_route_trace_driver_code
          ON driver_route_trace (driver_code)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_driver_route_trace_recorded_at
          ON driver_route_trace (recorded_at)
      `;

      // Step 3: Find active booking for this driver that qualifies for trace
      //
      // Eligibility criteria:
      //   A) Status is in TRACE_ELIGIBLE_STATUSES (live execution states), OR
      //   B) Status is 'accepted'/'assigned' AND pickup_at is within 2 hours
      //      (upcoming ride entering operational window)
      //
      // Only one booking is expected to be active at a time per driver.
      // If multiple exist (edge case), we take the most recent.
      const activeBookings = await sql`
        SELECT id AS booking_id, status, pickup_at
        FROM bookings
        WHERE assigned_driver_id = ${driver.id}::uuid
          AND (
            -- Live execution states: always trace
            status = ANY(${TRACE_ELIGIBLE_STATUSES}::text[])
            OR
            -- Upcoming within 2h window: trace to capture pre-trip movement
            (
              status IN ('accepted', 'assigned')
              AND pickup_at IS NOT NULL
              AND pickup_at <= NOW() + (${UPCOMING_WINDOW_MINUTES} || ' minutes')::interval
              AND pickup_at > NOW() - INTERVAL '30 minutes'
            )
          )
          AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
        ORDER BY
          -- Prioritize live execution states over upcoming
          CASE
            WHEN status IN ('en_route', 'arrived', 'in_trip',
                            'en_route_to_pickup', 'arrived_waiting',
                            'trip_started', 'trip_in_progress') THEN 0
            ELSE 1
          END ASC,
          pickup_at ASC
        LIMIT 1
      `;

      if (activeBookings.length > 0) {
        const booking = activeBookings[0];

        // Step 4: Frequency control — check last trace for this booking
        // Skip if a trace was already inserted within TRACE_MIN_INTERVAL_SECONDS
        const lastTrace = await sql`
          SELECT recorded_at
          FROM driver_route_trace
          WHERE booking_id = ${booking.booking_id}
          ORDER BY recorded_at DESC
          LIMIT 1
        `;

        let shouldInsert = true;
        if (lastTrace.length > 0) {
          const lastAt = new Date(lastTrace[0].recorded_at).getTime();
          const nowMs  = Date.now();
          const gapSeconds = (nowMs - lastAt) / 1000;
          if (gapSeconds < TRACE_MIN_INTERVAL_SECONDS) {
            shouldInsert = false; // Too soon — skip silently
          }
        }

        // Step 5: Insert trace point
        if (shouldInsert) {
          await sql`
            INSERT INTO driver_route_trace
              (booking_id, driver_code, lat, lng, speed_kmh, heading, accuracy_m, source)
            VALUES
              (
                ${booking.booking_id},
                ${driver_code.toUpperCase()},
                ${latNum},
                ${lngNum},
                ${speedKmh},
                ${headingDeg},
                ${accuracyM},
                'heartbeat'
              )
          `;
          trace_inserted = true;

          console.log('[SLN-GPS-TRACE-01]', JSON.stringify({
            booking_id: booking.booking_id,
            driver_code: driver_code.toUpperCase(),
            status: booking.status,
            lat: latNum,
            lng: lngNum,
            speed_kmh: speedKmh,
            heading: headingDeg,
            accuracy_m: accuracyM,
            ts: new Date().toISOString(),
          }));
        }
      }
      // If no active booking found: skip trace silently (no error)

    } catch (traceErr: any) {
      // Trace failure is non-blocking — heartbeat still succeeds
      console.error("[SLN-GPS-TRACE-01] trace insert failed:", traceErr?.message ?? traceErr);
    }

    return NextResponse.json({ ok: true, trace_inserted });

  } catch (err: any) {
    console.error("[driver/location]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
