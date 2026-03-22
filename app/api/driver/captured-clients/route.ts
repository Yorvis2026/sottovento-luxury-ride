import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// ============================================================
// GET /api/driver/captured-clients?driver_code=YHV001
// Returns all clients attributed (source_driver_id) to this driver
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const driverCode = searchParams.get("driver_code")?.toUpperCase()

    if (!driverCode) {
      return NextResponse.json({ error: "driver_code required" }, { status: 400 })
    }

    // Resolve driver_id from driver_code
    const driverRows = await sql`
      SELECT id, full_name, driver_code
      FROM drivers
      WHERE driver_code = ${driverCode}
      LIMIT 1
    `
    if (!driverRows[0]) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }
    const driverId = driverRows[0].id

    // Fetch all clients attributed to this driver
    const clients = await sql`
      SELECT
        c.id,
        c.full_name,
        c.phone,
        c.email,
        c.source_type,
        c.total_bookings,
        c.first_booking_at,
        c.last_booking_at,
        c.created_at,
        COALESCE(
          (
            SELECT SUM(b.total_price)
            FROM bookings b
            WHERE b.client_id = c.id
              AND b.status NOT IN ('cancelled', 'archived')
          ), 0
        ) AS total_revenue
      FROM clients c
      WHERE c.source_driver_id = ${driverId}
      ORDER BY c.last_booking_at DESC NULLS LAST, c.created_at DESC
    `

    return NextResponse.json({
      driver_code: driverCode,
      driver_name: driverRows[0].full_name,
      total_clients: clients.length,
      clients: clients.map((c) => ({
        id: c.id,
        full_name: c.full_name ?? "Unknown",
        phone: c.phone ?? null,
        email: c.email ?? null,
        source_type: c.source_type ?? "direct",
        total_bookings: Number(c.total_bookings ?? 0),
        total_revenue: Number(c.total_revenue ?? 0),
        first_booking_at: c.first_booking_at ?? null,
        last_booking_at: c.last_booking_at ?? null,
        created_at: c.created_at,
      })),
    })
  } catch (err: any) {
    console.error("[driver/captured-clients]", err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
