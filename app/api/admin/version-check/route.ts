export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// GET /api/admin/version-check
// Returns current deployment version info and runs the exact assigned_ride query
export async function GET(req: NextRequest) {
  const DRIVER_ID = "f2cb4bc6-1962-4b35-bd7d-3ff6f4e806c3"
  const BOOKING_ID = "3f3bad18-c920-467a-9296-d1d1cff7fad0"

  // Run the EXACT query from driver/me (7-day window version)
  const assignedRows = await sql`
    SELECT
      id AS booking_id,
      status,
      dispatch_status,
      pickup_at,
      assigned_driver_id
    FROM bookings
    WHERE assigned_driver_id = ${DRIVER_ID}::uuid
      AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
      AND (dispatch_status IS NULL OR dispatch_status NOT IN ('completed', 'cancelled', 'archived', 'no_show'))
      AND (
        status = 'offer_pending'
        OR dispatch_status = 'offer_pending'
        OR status IN ('en_route', 'arrived', 'in_trip')
        OR (
          status = 'accepted'
          AND dispatch_status NOT IN ('offer_pending', 'completed', 'cancelled')
          AND (
            pickup_at IS NULL
            OR (
              pickup_at >= NOW() - INTERVAL '7 days'
              AND pickup_at <= NOW() + INTERVAL '120 minutes'
            )
          )
        )
        OR (
          status = 'assigned'
          AND dispatch_status NOT IN ('offer_pending', 'completed', 'cancelled')
          AND (
            pickup_at IS NULL
            OR (
              pickup_at >= NOW() - INTERVAL '7 days'
              AND pickup_at <= NOW() + INTERVAL '120 minutes'
            )
          )
        )
      )
    ORDER BY pickup_at ASC
    LIMIT 1
  `

  // Also check the booking directly
  const directCheck = await sql`
    SELECT id, status, dispatch_status, pickup_at, assigned_driver_id,
           NOW() AS server_now,
           pickup_at - NOW() AS time_until_pickup,
           NOW() - INTERVAL '7 days' AS seven_days_ago,
           NOW() + INTERVAL '120 minutes' AS two_hours_from_now
    FROM bookings
    WHERE id = ${BOOKING_ID}::uuid
  `

  return NextResponse.json({
    version: "7-day-window-fix-v2",
    deployed_at: new Date().toISOString(),
    assigned_ride_query_result: assignedRows,
    direct_booking_check: directCheck,
    query_conditions: {
      driver_id: DRIVER_ID,
      booking_id: BOOKING_ID,
      window: "7 days past to 120 minutes future"
    }
  })
}
