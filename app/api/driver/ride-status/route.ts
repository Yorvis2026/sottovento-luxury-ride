import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/driver/ride-status
//
// Handles ride flow state transitions for SLN drivers.
//
// Valid transitions:
//   assigned   → en_route
//   en_route   → arrived
//   arrived    → in_trip
//   in_trip    → completed
//   any        → cancelled
//   arrived    → no_show
//
// Body:
//   { booking_id, driver_id, new_status }
//
// Side effects:
//   - Updates bookings.status
//   - Sets the corresponding timestamp column
//   - Logs to audit_logs
//   - On completed: triggers commission confirmation
// ============================================================

const VALID_TRANSITIONS: Record<string, string[]> = {
  offer_pending:         ["accepted", "cancelled"],  // driver must accept before ride becomes active
  accepted:              ["en_route", "cancelled"],  // legacy: admin-assigned or accepted rides
  assigned:              ["en_route", "cancelled"],  // legacy: direct assignment without offer stage
  // BM23: new canonical status after accept offer
  assigned_not_started:  ["en_route", "cancelled"],  // driver confirmed, not yet started
  en_route:              ["arrived", "cancelled"],
  arrived:               ["in_trip", "no_show", "cancelled"],
  in_trip:               ["completed", "cancelled"],
};

const STATUS_TIMESTAMP_COLUMN: Record<string, string> = {
  en_route:  "en_route_at",
  arrived:   "arrived_at",
  in_trip:   "trip_started_at",
  completed: "completed_at",
  cancelled: "cancelled_at",
  no_show:   "no_show_at",
};

const AUDIT_EVENT: Record<string, string> = {
  en_route:  "driver_en_route",
  arrived:   "driver_arrived",
  in_trip:   "ride_started",
  completed: "ride_completed",
  cancelled: "ride_cancelled",
  no_show:   "no_show",
};

// ── Haversine distance (meters) ─────────────────────────────
// Returns the great-circle distance between two GPS coordinates.
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Venue type radius map ───────────────────────────────────
// Pickup types that require an extended radius (300 m).
const EXTENDED_RADIUS_TYPES = new Set([
  "airport", "large_venue", "hotel_complex", "cruise_port", "convention_center"
]);

function getArrivalRadiusMeters(pickupType: string | null): number {
  return EXTENDED_RADIUS_TYPES.has(pickupType ?? "") ? 300 : 150;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { booking_id, driver_id, new_status } = body;

    if (!booking_id || !driver_id || !new_status) {
      return NextResponse.json(
        { error: "Missing required fields: booking_id, driver_id, new_status" },
        { status: 400 }
      );
    }

    // ── Load booking (extended: includes pickup coordinates and venue type) ─
    const bookingRows = await sql`
      SELECT id::text, status, assigned_driver_id::text, source_driver_id::text,
             total_price, pickup_address, dropoff_address,
             pickup_at, vehicle_type, client_id::text, ref_code
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `;

    if (bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingRows[0];

    // ── Authorization ────────────────────────────────────────
    // Normalize both to lowercase strings to avoid UUID object vs string mismatch (Neon returns UUID as string)
    const normalizedAssignedId = String(booking.assigned_driver_id ?? "").toLowerCase().trim();
    const normalizedDriverId = String(driver_id ?? "").toLowerCase().trim();
    if (!normalizedAssignedId || normalizedAssignedId !== normalizedDriverId) {
      return NextResponse.json({ error: "Unauthorized: not assigned driver" }, { status: 403 });
    }

    const currentStatus = booking.status;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(new_status)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${currentStatus} → ${new_status}`,
          allowed_transitions: allowed,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const tsColumn = STATUS_TIMESTAMP_COLUMN[new_status];
    const override_type = body.override_type ?? null;
    const gps_lat = body.gps_lat != null ? Number(body.gps_lat) : null;
    const gps_lng = body.gps_lng != null ? Number(body.gps_lng) : null;

    // ── Arrival Geo-Validation ───────────────────────────────
    // SLN-ARRIVAL-GEO-VALIDATION-01
    // Enforced only on the en_route → arrived transition.
    // Requires gps_lat + gps_lng in the request body.
    // Pickup coordinates must exist in the booking record.
    // Override: override_type = 'gps_bypass' skips the distance check
    // but writes an explicit audit log entry.
    if (new_status === "arrived") {
      // Ensure telemetry + coordinate columns exist (idempotent migration)
      try {
        await sql`
          ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS pickup_lat                        DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS pickup_lng                        DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS pickup_type                       VARCHAR(50),
            ADD COLUMN IF NOT EXISTS attempted_arrived_lat            DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS attempted_arrived_lng            DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS attempted_arrived_distance_meters DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS arrived_validation_passed        BOOLEAN,
            ADD COLUMN IF NOT EXISTS arrived_override_type            VARCHAR(50)
        `;
      } catch { /* columns may already exist */ }

      // Re-read pickup coordinates now that columns are guaranteed to exist
      let pickupLat: number | null = null;
      let pickupLng: number | null = null;
      let pickupType: string | null = null;
      try {
        const coordRows = await sql`
          SELECT pickup_lat, pickup_lng, pickup_type
          FROM bookings
          WHERE id = ${booking_id}::uuid
          LIMIT 1
        `;
        if (coordRows.length > 0) {
          pickupLat  = coordRows[0].pickup_lat  != null ? Number(coordRows[0].pickup_lat)  : null;
          pickupLng  = coordRows[0].pickup_lng  != null ? Number(coordRows[0].pickup_lng)  : null;
          pickupType = coordRows[0].pickup_type ?? null;
        }
      } catch { /* coordinate read failure — graceful degradation */ }
      const hasDriverGps   = gps_lat != null && gps_lng != null && !isNaN(gps_lat) && !isNaN(gps_lng);
      const hasPickupCoords = pickupLat != null && pickupLng != null && !isNaN(pickupLat) && !isNaN(pickupLng);

      let distanceMeters: number | null = null;
      let validationPassed = true; // default: pass if we can't compute (graceful degradation)

      if (hasDriverGps && hasPickupCoords) {
        distanceMeters = haversineMeters(gps_lat!, gps_lng!, pickupLat!, pickupLng!);
        const allowedRadius = getArrivalRadiusMeters(pickupType);

        if (distanceMeters > allowedRadius) {
          // Driver is outside the allowed radius
          if (override_type === "gps_bypass") {
            // Override accepted — log and continue
            validationPassed = true;
            try {
              await sql`
                INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, new_data)
                VALUES (
                  'booking',
                  ${booking_id}::uuid,
                  'arrived_geo_bypass',
                  'driver',
                  ${driver_id}::uuid,
                  ${JSON.stringify({
                    override_type: "gps_bypass",
                    driver_lat: gps_lat,
                    driver_lng: gps_lng,
                    pickup_lat: pickupLat,
                    pickup_lng: pickupLng,
                    distance_meters: Math.round(distanceMeters),
                    allowed_radius_meters: allowedRadius,
                    pickup_type: pickupType,
                    timestamp: now,
                  })}::jsonb
                )
              `;
            } catch { /* audit log failure is non-blocking */ }
          } else {
            // Reject the transition
            validationPassed = false;

            // Persist telemetry even on rejection
            try {
              await sql`
                UPDATE bookings
                SET attempted_arrived_lat             = ${gps_lat},
                    attempted_arrived_lng             = ${gps_lng},
                    attempted_arrived_distance_meters = ${Math.round(distanceMeters)},
                    arrived_validation_passed         = FALSE,
                    arrived_override_type             = ${override_type},
                    updated_at                        = NOW()
                WHERE id = ${booking_id}::uuid
              `;
            } catch { /* telemetry failure is non-blocking */ }

            // Audit log for rejected attempt
            try {
              await sql`
                INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, new_data)
                VALUES (
                  'booking',
                  ${booking_id}::uuid,
                  'arrived_geo_rejected',
                  'driver',
                  ${driver_id}::uuid,
                  ${JSON.stringify({
                    driver_lat: gps_lat,
                    driver_lng: gps_lng,
                    pickup_lat: pickupLat,
                    pickup_lng: pickupLng,
                    distance_meters: Math.round(distanceMeters),
                    allowed_radius_meters: allowedRadius,
                    pickup_type: pickupType,
                    timestamp: now,
                  })}::jsonb
                )
              `;
            } catch { /* audit log failure is non-blocking */ }

            return NextResponse.json(
              {
                error: "Arrival rejected: driver is outside pickup radius",
                code: "GEO_VALIDATION_FAILED",
                distance_meters: Math.round(distanceMeters),
                allowed_radius_meters: allowedRadius,
                pickup_type: pickupType,
                hint: "Move closer to the pickup location, or use override_type: 'gps_bypass' if authorized.",
              },
              { status: 422 }
            );
          }
        } else {
          validationPassed = true;
        }
      }
      // If GPS data is missing (driver or pickup), validation passes silently (graceful degradation).
      // This preserves backward compatibility with clients that don't send GPS.

      // Persist telemetry for all arrived transitions (pass or bypass)
      if (hasDriverGps) {
        try {
          await sql`
            UPDATE bookings
            SET attempted_arrived_lat             = ${gps_lat},
                attempted_arrived_lng             = ${gps_lng},
                attempted_arrived_distance_meters = ${distanceMeters != null ? Math.round(distanceMeters) : null},
                arrived_validation_passed         = ${validationPassed},
                arrived_override_type             = ${override_type},
                updated_at                        = NOW()
            WHERE id = ${booking_id}::uuid
          `;
        } catch { /* telemetry failure is non-blocking */ }
      }
    }
    // ── End Arrival Geo-Validation ───────────────────────────

    // ── Update booking status + timestamp ────────────────────
    // We use ADD COLUMN IF NOT EXISTS to safely add missing columns
    // before updating, since the schema may not have them yet.
    try {
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS en_route_at    TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS arrived_at     TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS trip_started_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS no_show_at     TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50)
      `;
    } catch {
      // Columns may already exist — safe to ignore
    }

    // Dynamic update using raw SQL with the correct column
    if (new_status === "accepted") {
      // Driver accepted the offer: transition from offer_pending → accepted
      // SLN Spec Fix: dispatch_status should be 'assigned' when accepted
      await sql`
        UPDATE bookings
        SET status = 'accepted',
            dispatch_status = 'assigned',
            updated_at = NOW()
        WHERE id = ${booking_id}::uuid
      `;
    } else if (new_status === "en_route") {
      await sql`
        UPDATE bookings
        SET status = 'en_route',
            dispatch_status = 'en_route',
            en_route_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}::uuid
      `;
      // BM23-FIX-B: When driver starts the ride (en_route), set driver=in_trip.
      // This is the ONLY moment the driver transitions to 'in_trip' status.
      // Respect manual offline switch: do NOT change if driver is 'offline'.
      try {
        await sql`
          UPDATE drivers
          SET availability_status = 'in_trip', updated_at = NOW()
          WHERE id = ${driver_id}::uuid
            AND availability_status != 'offline'
        `;
      } catch { /* non-blocking */ }
    } else if (new_status === "arrived") {
      await sql`
        UPDATE bookings
        SET status = 'arrived',
            dispatch_status = 'arrived',
            arrived_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}::uuid
      `;
    } else if (new_status === "in_trip") {
      await sql`
        UPDATE bookings
        SET status = 'in_trip',
            dispatch_status = 'in_trip',
            trip_started_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}::uuid
      `;
    } else if (new_status === "completed") {
      await sql`
        UPDATE bookings
        SET status = 'completed',
            dispatch_status = 'completed',
            completed_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}::uuid
      `;
    } else if (new_status === "cancelled") {
      // BM23-FIX-B: Determine cancel actor and stage.
      // If booking was 'assigned_not_started' (driver confirmed but not started),
      // this is a 'before-start' cancel by driver — must trigger automatic redispatch.
      // If booking was 'in_trip' or later, this is a different flow (handled separately).
      const cancelActor = body.cancel_actor ?? 'driver'; // 'driver' | 'admin'
      const wasBeforeStart = ['assigned_not_started', 'accepted', 'assigned'].includes(currentStatus);

      if (cancelActor === 'admin') {
        // Admin cancel: terminal, no redispatch
        await sql`
          UPDATE bookings
          SET status = 'cancelled',
              dispatch_status = 'cancelled',
              cancelled_at = ${now}::timestamptz,
              cancelled_by_type = 'admin',
              cancel_stage = 'assigned',
              updated_at = NOW()
          WHERE id = ${booking_id}::uuid
        `;
      } else if (wasBeforeStart) {
        // Driver cancel before start: redispatch to pool
        // BM23 RULE: do NOT modify availability_status (preserve manual offline switch)
        await sql`
          UPDATE bookings
          SET status = 'ready_for_dispatch',
              dispatch_status = 'reassignment_needed',
              assigned_driver_id = NULL,
              cancelled_at = ${now}::timestamptz,
              cancelled_by_type = 'driver',
              cancel_stage = 'assigned',
              updated_at = NOW()
          WHERE id = ${booking_id}::uuid
        `;
        // Trigger automatic redispatch (next round, exclude cancelling driver)
        try {
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000');
          await fetch(`${baseUrl}/api/dispatch/respond-offer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_id: booking_id,
              driver_id: driver_id,
              response: 'declined',
              _internal_redispatch: true,
            }),
          });
        } catch { /* non-blocking: redispatch failure should not block cancel response */ }
      } else {
        // In-trip or later cancel: standard terminal cancel
        await sql`
          UPDATE bookings
          SET status = 'cancelled',
              dispatch_status = 'cancelled',
              cancelled_at = ${now}::timestamptz,
              cancelled_by_type = 'driver',
              cancel_stage = 'in_progress',
              updated_at = NOW()
          WHERE id = ${booking_id}::uuid
        `;
      }
    } else if (new_status === "no_show") {
      await sql`
        UPDATE bookings
        SET status = 'no_show',
            dispatch_status = 'no_show',
            no_show_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}::uuid
      `;
    }

    // ── Timeline log ─────────────────────────────────────────
    const auditEvent = AUDIT_EVENT[new_status] ?? new_status;
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, new_data)
        VALUES (
          'booking',
          ${booking_id}::uuid,
          ${auditEvent},
          'driver',
          ${driver_id}::uuid,
          ${JSON.stringify({
            previous_status: currentStatus,
            new_status,
            timestamp: now,
            override_type,
            gps_lat,
            gps_lng,
          })}::jsonb
        )
      `;
    } catch {
      // Audit log failure should not block the status update
    }

    // ── On COMPLETED: confirm commissions + partner earnings + driver stats ──
    if (new_status === "completed") {
      // 1. Confirm existing commissions
      try {
        await sql`
          UPDATE commissions
          SET status = 'confirmed',
              updated_at = NOW()
          WHERE booking_id = ${booking_id}::uuid
            AND status = 'pending'
        `;
      } catch {
        // Commission update failure is non-blocking
      }

      // 2. Update driver earnings stats (total_earned, month_earned, rides_completed)
      try {
        const fareAmount = Number(booking.total_price ?? 0);
        if (fareAmount > 0 && booking.assigned_driver_id) {
          // Ensure columns exist
          await sql`
            ALTER TABLE drivers
              ADD COLUMN IF NOT EXISTS total_earned NUMERIC(10,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS month_earned NUMERIC(10,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS rides_completed INTEGER DEFAULT 0
          `;
          await sql`
            UPDATE drivers
            SET total_earned = COALESCE(total_earned, 0) + ${fareAmount},
                month_earned = COALESCE(month_earned, 0) + ${fareAmount},
                rides_completed = COALESCE(rides_completed, 0) + 1,
                updated_at = NOW()
            WHERE id = ${booking.assigned_driver_id}::uuid
          `;
        }
      } catch {
        // Driver stats update failure is non-blocking
      }

      // 3. Provisional Scoring Engine hook — auto-trigger on completed ride
      if (booking.assigned_driver_id) {
        try {
          // Determine if ride was on time (pickup_at within 5 min of scheduled)
          const pickupAtMs   = booking.pickup_at ? new Date(booking.pickup_at).getTime() : null;
          const completedMs  = Date.now();
          const isOnTime     = pickupAtMs ? Math.abs(completedMs - pickupAtMs) <= 5 * 60 * 1000 : false;
          const scoreEvent   = isOnTime ? "completed_ride_on_time" : "high_acceptance_behavior";

          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000");

          await fetch(`${baseUrl}/api/admin/drivers/provisional-score`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              driver_id:  booking.assigned_driver_id,
              event_type: scoreEvent,
              booking_id: booking_id,
              notes:      `Auto-triggered on ride completion. on_time=${isOnTime}`,
            }),
          });
        } catch {
          // Scoring hook failure is non-blocking — never interrupt ride completion
        }
      }

      // 4. Create partner earnings if booking has a ref_code
      try {
        const bookingRows = await sql`
          SELECT id, total_price, ref_code FROM bookings WHERE id = ${booking_id}::uuid
        `;
        const booking = bookingRows[0];
        if (booking?.ref_code) {
          const partnerRows = await sql`
            SELECT id, commission_rate FROM partners
            WHERE ref_code = ${booking.ref_code.toUpperCase()}
              AND status = 'active'
          `;
          if (partnerRows.length > 0) {
            const partner = partnerRows[0];
            const grossAmount = Number(booking.total_price ?? 0);
            const commissionRate = Number(partner.commission_rate ?? 0.10);
            const commissionAmount = grossAmount * commissionRate;
            // Check if earning already exists
            const existing = await sql`
              SELECT id FROM partner_earnings WHERE booking_id = ${booking_id}::uuid
            `;
            if (existing.length === 0 && commissionAmount > 0) {
              await sql`
                INSERT INTO partner_earnings
                  (partner_id, booking_id, gross_amount, commission_rate, commission_amount, status)
                VALUES
                  (${partner.id}::uuid, ${booking_id}::uuid, ${grossAmount}, ${commissionRate}, ${commissionAmount}, 'pending')
              `;
            }
          }
        }
      } catch {
        // Partner earnings failure is non-blocking
      }
    }

    // ── Availability Engine: update driver availability on terminal states ──
    // BM23-FIX-B: Differentiated reset logic:
    //   completed / no_show → driver goes back to 'available' (ride fully done)
    //   cancelled from in_trip → driver goes back to 'available' (was executing, now free)
    //   cancelled from assigned_not_started → do NOT touch availability_status
    //     (BM23 RULE: before-start cancel must NOT force available/offline — preserve manual switch)
    if (new_status === "completed" || new_status === "no_show") {
      try {
        await sql`
          UPDATE drivers
          SET availability_status = 'available', updated_at = NOW()
          WHERE id = ${driver_id}::uuid
            AND availability_status != 'offline'
        `;
      } catch { /* non-blocking */ }
    } else if (new_status === "cancelled") {
      const wasInTrip = ['in_trip', 'en_route', 'arrived'].includes(currentStatus);
      if (wasInTrip) {
        // Was actively executing — reset to available
        try {
          await sql`
            UPDATE drivers
            SET availability_status = 'available', updated_at = NOW()
            WHERE id = ${driver_id}::uuid
              AND availability_status != 'offline'
          `;
        } catch { /* non-blocking */ }
      }
      // else: before-start cancel — do NOT touch availability_status (BM23 rule)
    }

    return NextResponse.json({
      success: true,
      booking_id,
      previous_status: currentStatus,
      new_status,
      timestamp: now,
    });
  } catch (err: any) {
    console.error("[driver/ride-status]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}

// ============================================================
// GET /api/driver/ride-status?booking_id=xxx
// Returns current ride status and timeline for a booking
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const booking_id = searchParams.get("booking_id");

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        b.id,
        b.status,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at,
        b.vehicle_type,
        b.total_price,
        b.client_id,
        b.assigned_driver_id,
        b.en_route_at,
        b.arrived_at,
        b.trip_started_at,
        b.completed_at,
        b.cancelled_at,
        b.no_show_at
      FROM bookings b
      WHERE b.id = ${booking_id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get timeline events
    let timeline: Record<string, unknown>[] = [];
    try {
      timeline = await sql`
        SELECT action, new_data, created_at
        FROM audit_logs
        WHERE entity_id = ${booking_id}::uuid
          AND entity_type = 'booking'
        ORDER BY created_at ASC
      `;
    } catch {}

    return NextResponse.json({ booking: rows[0], timeline });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
