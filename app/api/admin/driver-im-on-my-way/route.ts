export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/admin/driver-im-on-my-way
// Driver confirms they are on their way to the pickup
// Clears SLA monitoring state and logs the event
// Body: { booking_id, driver_code }
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { booking_id, driver_code } = await req.json();
    if (!booking_id || !driver_code) {
      return NextResponse.json({ error: "booking_id and driver_code required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Verify the driver is assigned to this booking
    const [booking] = await sql`
      SELECT b.id, b.assigned_driver_id, b.sla_current_state, b.sla_protection_level,
             d.driver_code
      FROM bookings b
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE b.id = ${booking_id}::uuid
        AND d.driver_code = ${driver_code}
    `;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found or driver not assigned" }, { status: 404 });
    }

    // Update booking: driver confirmed on the way
    await sql`
      UPDATE bookings SET
        driver_im_on_my_way_at    = ${now}::timestamptz,
        sla_current_state         = NULL,
        sla_safe_at               = ${now}::timestamptz,
        sla_safe_by               = ${`driver:${driver_code}`},
        dispatcher_override_required = FALSE,
        updated_at                = NOW()
      WHERE id = ${booking_id}::uuid
    `;

    // Log the event
    try {
      await sql`
        INSERT INTO dispatch_event_log (
          booking_id, driver_id, event_type, trigger_reason, sla_level, event_data, created_at
        ) VALUES (
          ${booking_id}::uuid,
          ${booking.assigned_driver_id}::uuid,
          'driver_im_on_my_way',
          'driver_self_confirmed',
          ${booking.sla_protection_level ?? 'STANDARD'},
          ${JSON.stringify({ driver_code, timestamp: now, prev_sla_state: booking.sla_current_state })}::jsonb,
          NOW()
        )
      `;
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      booking_id,
      driver_code,
      confirmed_at: now,
      message: "Driver confirmed on the way. SLA monitoring cleared.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
