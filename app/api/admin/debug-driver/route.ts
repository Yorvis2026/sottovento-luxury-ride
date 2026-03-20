import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET(req: NextRequest) {
  try {
    // Get driver ID for YHV001
    const drivers = await sql`
      SELECT id, driver_code FROM drivers WHERE driver_code = 'YHV001' LIMIT 1
    `;
    const driver = drivers[0];
    if (!driver) return NextResponse.json({ error: "Driver not found" });

    // Check all bookings for this driver
    const booking = await sql`
      SELECT 
        id, status, dispatch_status, assigned_driver_id, pickup_at,
        (pickup_at >= NOW() - INTERVAL '4 hours') AS pickup_condition,
        NOW() AS current_time
      FROM bookings
      WHERE assigned_driver_id = ${driver.id}
      LIMIT 5
    `;

    // Try the exact query from driver/me
    const assigned = await sql`
      SELECT id, status, pickup_at
      FROM bookings
      WHERE assigned_driver_id = ${driver.id}
        AND status IN ('accepted', 'assigned', 'en_route', 'arrived', 'in_trip')
        AND (
          pickup_at >= NOW() - INTERVAL '4 hours'
          OR pickup_at IS NULL
          OR status IN ('en_route', 'arrived', 'in_trip')
        )
      LIMIT 5
    `;

    return NextResponse.json({
      driver_id: driver.id,
      driver_code: driver.driver_code,
      all_bookings_for_driver: booking,
      assigned_ride_query_result: assigned,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
