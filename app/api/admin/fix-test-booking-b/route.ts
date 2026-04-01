export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// Updates booking 1515c939 pickup_at to 90 minutes from now for testing
export async function GET() {
  try {
    const BOOKING_ID = "1515c939-d9f1-4479-80d7-f17454d8669b"
    const pickupAt = new Date(Date.now() + 90 * 60 * 1000).toISOString()

    const rows = await sql`
      UPDATE bookings
      SET
        pickup_at = ${pickupAt}::timestamptz,
        updated_at = NOW()
      WHERE id = ${BOOKING_ID}::uuid
      RETURNING id, status, dispatch_status, assigned_driver_id, pickup_at
    `

    return NextResponse.json({
      success: true,
      updated: rows[0],
      message: `Booking ${BOOKING_ID} updated: pickup_at set to ${pickupAt}`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
