import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const driverCode = req.nextUrl.searchParams.get('code') || 'YHV001'
  
  try {
    const sql = neon(process.env.DATABASE_URL!)
    
    // Step 1: Get driver ID
    const [driver] = await sql`
      SELECT id, driver_code, availability_status FROM drivers WHERE driver_code = ${driverCode} LIMIT 1
    `
    if (!driver) return NextResponse.json({ error: 'driver not found' })
    
    // Step 2: Raw query for assigned_ride - exact same as driver/me
    const assignedRides = await sql`
      SELECT 
        b.id as booking_id,
        b.status,
        b.dispatch_status,
        b.pickup_at,
        b.assigned_driver_id,
        b.pickup_address,
        b.dropoff_address
      FROM bookings b
      WHERE b.assigned_driver_id = ${driver.id}
      AND b.status NOT IN ('completed', 'cancelled', 'archived', 'no_show', 'pending', 'pending_dispatch')
      AND (
        (
          b.status = 'accepted'
          AND b.dispatch_status NOT IN ('offer_pending', 'completed', 'cancelled')
          AND (
            b.pickup_at IS NULL
            OR (
              b.pickup_at >= NOW() - INTERVAL '24 hours'
              AND b.pickup_at <= NOW() + INTERVAL '120 minutes'
            )
          )
        )
        OR (
          b.status = 'assigned'
          AND b.dispatch_status NOT IN ('offer_pending', 'completed', 'cancelled')
          AND (
            b.pickup_at IS NULL
            OR (
              b.pickup_at >= NOW() - INTERVAL '24 hours'
              AND b.pickup_at <= NOW() + INTERVAL '120 minutes'
            )
          )
        )
        OR b.status IN ('en_route', 'arrived', 'in_trip')
      )
      ORDER BY b.pickup_at ASC NULLS LAST
      LIMIT 1
    `
    
    // Step 3: All bookings for driver
    const allBookings = await sql`
      SELECT id, status, dispatch_status, pickup_at, assigned_driver_id
      FROM bookings
      WHERE assigned_driver_id = ${driver.id}
      ORDER BY created_at DESC
      LIMIT 10
    `
    
    // Step 4: Direct check for booking 3f3bad18
    const directCheck = await sql`
      SELECT id, status, dispatch_status, pickup_at, assigned_driver_id::text as assigned_driver_id_text
      FROM bookings
      WHERE id = '3f3bad18-c920-467a-9296-d1d1cff7fad0'
      LIMIT 1
    `
    
    return NextResponse.json({
      driver: { id: driver.id, code: driver.driver_code, availability: driver.availability_status },
      assigned_ride_query_result: assignedRides,
      direct_check_3f3bad18: directCheck,
      driver_id_matches: directCheck.length > 0 ? directCheck[0].assigned_driver_id_text === String(driver.id) : false,
      all_driver_bookings: allBookings.map(b => ({
        id: String(b.id).substring(0, 8),
        status: b.status,
        dispatch_status: b.dispatch_status,
        pickup_at: b.pickup_at,
      }))
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message })
  }
}
