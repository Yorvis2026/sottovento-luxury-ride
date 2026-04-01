export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// GET /api/admin/reset-test-booking
// Resets the test booking 1515c939 to accepted/assigned status with future pickup_at
// Used for Driver Exit Flow validation testing
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const BOOKING_ID = "1515c939-d9f1-4479-80d7-f17454d8669b"
  const DRIVER_ID = "f2cb4bc6-1962-4b35-bd7d-3ff6f4e806c3"

  // Set pickup_at to 90 minutes from now (within operational window)
  const pickupAt = new Date(Date.now() + 90 * 60 * 1000).toISOString()

  const rows = await sql`
    UPDATE bookings
    SET
      status = 'accepted',
      dispatch_status = 'assigned',
      assigned_driver_id = ${DRIVER_ID}::uuid,
      pickup_at = ${pickupAt}::timestamptz,
      driver_exit_reason = NULL,
      driver_exit_comment = NULL,
      driver_exit_at = NULL,
      driver_exit_case = NULL,
      at_risk_flagged_at = NULL,
      updated_at = NOW()
    WHERE id = ${BOOKING_ID}::uuid
    RETURNING id, status, dispatch_status, pickup_at, assigned_driver_id,
              driver_exit_reason, driver_exit_case
  `

  return NextResponse.json({
    success: true,
    reset: rows[0] ?? null,
    message: "Booking reset to accepted/assigned with 90-min future pickup_at"
  })
}
