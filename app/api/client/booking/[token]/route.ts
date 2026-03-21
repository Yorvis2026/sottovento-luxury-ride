import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// GET /api/client/booking/:token
// Public endpoint — no auth required
// Returns only public-safe data for the client tracking page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Next.js 15+ requires awaiting params
  const { token } = await params

  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  try {
    // Ensure tracking_token column exists (defensive migration)
    await sql`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64) UNIQUE
    `

    // Fetch booking by tracking token — join with driver and company
    const rows = await sql`
      SELECT
        b.id                  AS booking_id,
        b.status,
        b.pickup_address      AS pickup,
        b.dropoff_address     AS dropoff,
        b.pickup_at           AS pickup_time,
        b.vehicle_type,
        b.service_type,
        b.total_price         AS fare,
        b.currency,
        -- Driver info (public-safe only)
        d.full_name           AS driver_name,
        d.phone               AS driver_phone,
        d.driver_code,
        -- Vehicle from booking
        b.vehicle_type        AS vehicle,
        -- Company / branding
        c.name                AS company_name,
        c.display_brand_name,
        -- ETA fields (from ride status timestamps)
        b.en_route_at,
        b.arrived_at,
        b.trip_started_at,
        b.completed_at
      FROM bookings b
      LEFT JOIN drivers d ON d.id = b.assigned_driver_id
      LEFT JOIN companies c ON c.id = b.company_id
      WHERE b.tracking_token = ${token}
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const row = rows[0]

    // Calculate ETA in minutes based on en_route_at (rough estimate: 15 min from dispatch)
    let eta: number | null = null
    if (row.en_route_at && (row.status === "en_route" || row.status === "assigned")) {
      const enRouteTime = new Date(row.en_route_at).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - enRouteTime) / 60000) // minutes elapsed
      const estimatedTotal = 15 // 15 min average ETA
      eta = Math.max(1, estimatedTotal - elapsed)
    }

    // Build public-safe response
    const response = {
      booking_id: row.booking_id,
      status: row.status,
      pickup: row.pickup,
      dropoff: row.dropoff,
      pickup_time: row.pickup_time,
      vehicle: row.vehicle,
      service_type: row.service_type,
      fare: row.fare,
      currency: row.currency || "USD",
      driver: row.driver_name
        ? {
            name: row.driver_name,
            phone: row.driver_phone,
            vehicle: row.vehicle,
            driver_code: row.driver_code,
          }
        : null,
      eta,
      company_name: row.company_name || "Sottovento Luxury Ride",
      branding: {
        display_brand_name:
          row.display_brand_name || "Sottovento Luxury Ride",
      },
      // Timestamps for UI
      en_route_at: row.en_route_at,
      arrived_at: row.arrived_at,
      trip_started_at: row.trip_started_at,
      completed_at: row.completed_at,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Tracking API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
