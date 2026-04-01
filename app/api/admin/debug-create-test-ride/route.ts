export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// POST /api/admin/debug-create-test-ride
// Creates a test booking assigned to a driver for Driver Exit Flow validation
// Body: { driver_code: "YHV001", hours_from_now?: number }
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { driver_code = "YHV001", hours_from_now = 1 } = body

    // Find driver
    const driverRows = await sql`
      SELECT id, driver_code, full_name FROM drivers
      WHERE driver_code = ${driver_code.toUpperCase()}
      LIMIT 1
    `
    if (driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }
    const driver = driverRows[0]

    // Upsert test client
    const testEmail = "testclient-driverflow@sottoventoluxuryride.com"
    let clientId: string
    const existingClient = await sql`
      SELECT id FROM clients WHERE email = ${testEmail} LIMIT 1
    `
    if (existingClient.length > 0) {
      clientId = existingClient[0].id
    } else {
      const newClient = await sql`
        INSERT INTO clients (full_name, email, phone, created_at, updated_at)
        VALUES ('Test Client (Driver Flow)', ${testEmail}, '+14073830647', NOW(), NOW())
        RETURNING id
      `
      clientId = newClient[0].id
    }

    // Calculate pickup_at
    const pickupAt = new Date(Date.now() + hours_from_now * 60 * 60 * 1000).toISOString()

    // Create test booking assigned to driver
    const newBooking = await sql`
      INSERT INTO bookings (
        status,
        dispatch_status,
        assigned_driver_id,
        pickup_address,
        dropoff_address,
        pickup_at,
        vehicle_type,
        total_price,
        client_id,
        passengers,
        luggage,
        notes,
        trip_type,
        created_at,
        updated_at
      ) VALUES (
        'accepted',
        'assigned',
        ${driver.id}::uuid,
        'MCO Airport Terminal B',
        'Ritz-Carlton Orlando Grande Lakes',
        ${pickupAt}::timestamptz,
        'Luxury Sedan',
        185,
        ${clientId}::uuid,
        2,
        1,
        'TEST BOOKING - Driver Exit Flow Validation. Flight: AA2847',
        'oneway',
        NOW(),
        NOW()
      )
      RETURNING id, status, dispatch_status, pickup_at, assigned_driver_id
    `

    return NextResponse.json({
      success: true,
      booking: newBooking[0],
      driver: { id: driver.id, code: driver.driver_code, name: driver.full_name },
      client_id: clientId,
      message: `Test booking created for ${driver.driver_code} with pickup in ${hours_from_now}h`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/admin/debug-create-test-ride?booking_id=xxx
// Cleans up test bookings
export async function DELETE(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const bookingId = searchParams.get("booking_id")

  if (!bookingId) {
    // Clean up all test bookings
    const deleted = await sql`
      DELETE FROM bookings
      WHERE notes LIKE 'TEST BOOKING - Driver Exit Flow%'
      RETURNING id
    `
    return NextResponse.json({ deleted: deleted.map((r: any) => r.id) })
  }

  await sql`DELETE FROM bookings WHERE id = ${bookingId}::uuid`
  return NextResponse.json({ deleted: bookingId })
}
