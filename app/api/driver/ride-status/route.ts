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
  assigned:  ["en_route", "cancelled"],
  en_route:  ["arrived", "cancelled"],
  arrived:   ["in_trip", "no_show", "cancelled"],
  in_trip:   ["completed", "cancelled"],
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

    // ── Load booking ─────────────────────────────────────────
    const bookingRows = await sql`
      SELECT id, status, assigned_driver_id, source_driver_id,
             total_price, pickup_address, dropoff_address,
             pickup_at, vehicle_type, client_id
      FROM bookings
      WHERE id = ${booking_id}
      LIMIT 1
    `;

    if (bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingRows[0];

    // ── Authorization ────────────────────────────────────────
    if (booking.assigned_driver_id !== driver_id) {
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
    if (new_status === "en_route") {
      await sql`
        UPDATE bookings
        SET status = 'en_route',
            dispatch_status = 'en_route',
            en_route_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}
      `;
    } else if (new_status === "arrived") {
      await sql`
        UPDATE bookings
        SET status = 'arrived',
            dispatch_status = 'arrived',
            arrived_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}
      `;
    } else if (new_status === "in_trip") {
      await sql`
        UPDATE bookings
        SET status = 'in_trip',
            dispatch_status = 'in_trip',
            trip_started_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}
      `;
    } else if (new_status === "completed") {
      await sql`
        UPDATE bookings
        SET status = 'completed',
            dispatch_status = 'completed',
            completed_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}
      `;
    } else if (new_status === "cancelled") {
      await sql`
        UPDATE bookings
        SET status = 'cancelled',
            dispatch_status = 'cancelled',
            cancelled_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}
      `;
    } else if (new_status === "no_show") {
      await sql`
        UPDATE bookings
        SET status = 'no_show',
            dispatch_status = 'no_show',
            no_show_at = ${now}::timestamptz,
            updated_at = NOW()
        WHERE id = ${booking_id}
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
          })}::jsonb
        )
      `;
    } catch {
      // Audit log failure should not block the status update
    }

    // ── On COMPLETED: confirm commissions + partner earnings ──
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

      // 2. Create partner earnings if booking has a ref_code
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
    let timeline = [];
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
