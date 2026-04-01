export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// Resets booking 1515c939 for fallback dispatch testing:
// - Sets pickup_at to 90 min from now
// - Clears assigned_driver_id (so original driver is not excluded from candidates)
// - Clears all fallback fields
export async function GET() {
  try {
    const BOOKING_ID = "1515c939-d9f1-4479-80d7-f17454d8669b"
    const pickupAt = new Date(Date.now() + 90 * 60 * 1000).toISOString()

    const rows = await sql`
      UPDATE bookings
      SET
        pickup_at = ${pickupAt}::timestamptz,
        assigned_driver_id = NULL,
        fallback_driver_id = NULL,
        fallback_assignment_time = NULL,
        fallback_response_time = NULL,
        fallback_pool_started_at = NULL,
        fallback_case_level = NULL,
        fallback_trigger_reason = NULL,
        fallback_declined_count = 0,
        updated_at = NOW()
      WHERE id = ${BOOKING_ID}::uuid
      RETURNING id, status, dispatch_status, assigned_driver_id, pickup_at
    `

    return NextResponse.json({
      success: true,
      updated: rows[0],
      message: `Booking ${BOOKING_ID} reset: pickup_at=${pickupAt}, assigned_driver_id cleared`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
