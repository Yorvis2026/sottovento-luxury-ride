export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// GET /api/admin/fix-test-booking
// Updates booking 3f3bad18 pickup_at to 1 hour from now for testing
// Also ensures status=accepted, dispatch_status=assigned, assigned_driver_id=YHV001
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const BOOKING_ID = "3f3bad18-c920-467a-9296-d1d1cff7fad0"
  const DRIVER_ID = "f2cb4bc6-1962-4b35-bd7d-3ff6f4e806c3"

  // Set pickup_at to 1 hour from now
  const pickupAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const result = await sql`
    UPDATE bookings
    SET
      status = 'accepted',
      dispatch_status = 'assigned',
      assigned_driver_id = ${DRIVER_ID}::uuid,
      pickup_at = ${pickupAt}::timestamptz,
      updated_at = NOW()
    WHERE id = ${BOOKING_ID}::uuid
    RETURNING id, status, dispatch_status, assigned_driver_id, pickup_at
  `

  return NextResponse.json({
    success: true,
    updated: result[0],
    message: `Booking ${BOOKING_ID} updated: pickup_at set to ${pickupAt}`
  })
}
