export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/client/passenger-cancel
//
// BM-CANCEL-SCHEMA-SLN-03 — Canonical passenger terminal cancellation
//
// Produces:
//   booking_status  = 'cancelled_by_passenger'   (TERMINAL — never redispatchable)
//   dispatch_status = NULL
//   assigned_driver_id = NULL
//
// Can be called by:
//   - Passenger directly (future client portal)
//   - Driver reporting passenger-requested cancel (reported_by = 'driver')
//   - Admin on behalf of passenger (reported_by = 'admin')
//
// Body:
//   {
//     booking_id:     string,
//     reported_by:    'passenger' | 'driver' | 'admin',
//     reported_by_id: string (driver_id or admin_id, optional for passenger),
//     cancel_reason:  string,
//     cancel_note?:   string,
//   }
//
// IMPORTANT:
//   This endpoint is TERMINAL. Once called, the booking cannot be redispatched.
//   Use /api/admin/soft-cancel if you want to return the booking to the pool.
// ============================================================

const TERMINAL_STATES = [
  'completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin', 'archived', 'no_show'
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      booking_id,
      reported_by,
      reported_by_id,
      cancel_reason,
      cancel_note,
    } = body as {
      booking_id: string;
      reported_by: 'passenger' | 'driver' | 'admin';
      reported_by_id?: string;
      cancel_reason: string;
      cancel_note?: string;
    };

    if (!booking_id || !reported_by || !cancel_reason) {
      return NextResponse.json(
        { error: "Missing required fields: booking_id, reported_by, cancel_reason" },
        { status: 400 }
      );
    }

    // Load booking
    const bookingRows = await sql`
      SELECT id, status, dispatch_status, assigned_driver_id
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `;

    if (bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingRows[0];

    // Guard: cannot cancel a terminal booking
    if (TERMINAL_STATES.includes(booking.status)) {
      return NextResponse.json(
        {
          error: `Booking is already in a terminal state: ${booking.status}`,
          current_status: booking.status,
        },
        { status: 409 }
      );
    }

    // Apply terminal cancel
    await sql`
      UPDATE bookings
      SET
        status             = 'cancelled_by_passenger',
        dispatch_status    = NULL,
        assigned_driver_id = NULL,
        cancelled_at       = NOW(),
        cancelled_by       = ${reported_by},
        cancelled_by_type  = ${reported_by},
        cancel_reason      = ${cancel_reason},
        cancel_reason_text = ${cancel_note ?? cancel_reason},
        updated_at         = NOW()
      WHERE id = ${booking_id}::uuid
        AND status NOT IN (${TERMINAL_STATES.join("','")})
    `;

    // Audit log
    try {
      await sql`
        INSERT INTO audit_logs (
          booking_id, event_type, actor_type, actor_id, event_data, created_at
        ) VALUES (
          ${booking_id}::uuid,
          'passenger_cancel',
          ${reported_by},
          ${reported_by_id ?? null}::uuid,
          ${JSON.stringify({
            cancel_reason,
            cancel_note: cancel_note ?? null,
            previous_status: booking.status,
            previous_dispatch_status: booking.dispatch_status,
            new_status: 'cancelled_by_passenger',
            terminal: true,
            redispatchable: false,
          })}::jsonb,
          NOW()
        )
      `;
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      booking_id,
      new_status: 'cancelled_by_passenger',
      dispatch_status: null,
      terminal: true,
      redispatchable: false,
      cancel_reason,
      reported_by,
    });

  } catch (err: any) {
    console.error("[passenger-cancel] error:", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
