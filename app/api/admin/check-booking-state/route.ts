export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// GET /api/admin/check-booking-state
// Returns the full state of the two test bookings for Driver Exit Flow validation
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await sql`
    SELECT
      id,
      status,
      dispatch_status,
      pickup_at,
      assigned_driver_id,
      driver_exit_reason,
      driver_exit_comment,
      driver_exit_at,
      driver_exit_case,
      at_risk_flagged_at,
      updated_at
    FROM bookings
    WHERE id IN (
      '1515c939-d9f1-4479-80d7-f17454d8669b'::uuid,
      '3f3bad18-c920-467a-9296-d1d1cff7fad0'::uuid
    )
    ORDER BY updated_at DESC
  `

  return NextResponse.json({
    server_now: new Date().toISOString(),
    bookings: rows
  })
}
