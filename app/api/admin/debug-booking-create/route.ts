export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// GET /api/admin/debug-booking-create
// Diagnoses the booking pre-creation issue
export async function GET(req: NextRequest) {
  const results: Record<string, any> = {}

  // 1. Check columns in bookings table
  try {
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position
    `
    results.columns = cols
  } catch (err: any) {
    results.columns_error = err.message
  }

  // 2. Try to insert a test booking
  try {
    const test = await sql`
      INSERT INTO bookings (
        status, dispatch_status,
        pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        trip_type, created_at, updated_at
      ) VALUES (
        'pending_payment', 'pending_payment',
        'MCO Airport', 'Oviedo',
        '2026-03-25T14:00:00+00'::timestamptz,
        'sedan', 95,
        'oneway', NOW(), NOW()
      )
      RETURNING id
    `
    results.test_insert = { success: true, id: test[0].id }

    // Clean up test booking
    await sql`DELETE FROM bookings WHERE id = ${test[0].id}::uuid`
    results.cleanup = "done"
  } catch (err: any) {
    results.test_insert_error = err.message
  }

  // 3. Try with NULL pickup_at
  try {
    const test2 = await sql`
      INSERT INTO bookings (
        status, dispatch_status,
        pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        trip_type, created_at, updated_at
      ) VALUES (
        'pending_payment', 'pending_payment',
        'MCO Airport', 'Oviedo',
        NULL,
        'sedan', 95,
        'oneway', NOW(), NOW()
      )
      RETURNING id
    `
    results.test_null_pickup = { success: true, id: test2[0].id }
    await sql`DELETE FROM bookings WHERE id = ${test2[0].id}::uuid`
  } catch (err: any) {
    results.test_null_pickup_error = err.message
  }

  // 4. Try with client_email column
  try {
    const test3 = await sql`
      INSERT INTO bookings (
        status, dispatch_status,
        pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        client_email, client_phone_raw,
        trip_type, created_at, updated_at
      ) VALUES (
        'pending_payment', 'pending_payment',
        'MCO Airport', 'Oviedo',
        '2026-03-25T14:00:00+00'::timestamptz,
        'sedan', 95,
        'test@test.com', '+14073830647',
        'oneway', NOW(), NOW()
      )
      RETURNING id
    `
    results.test_with_email = { success: true, id: test3[0].id }
    await sql`DELETE FROM bookings WHERE id = ${test3[0].id}::uuid`
  } catch (err: any) {
    results.test_with_email_error = err.message
  }

  // 5. Try full client upsert + booking insert (like create-checkout-session does)
  try {
    const email = 'debugtest@test.com'
    const name = 'Debug Test'
    const phone = '+14073830647'

    let clientId: string | null = null
    const existingClient = await sql`
      SELECT id FROM clients WHERE email = ${email.toLowerCase()} LIMIT 1
    `
    if (existingClient.length > 0) {
      clientId = existingClient[0].id
    } else {
      const newClient = await sql`
        INSERT INTO clients (full_name, email, phone, created_at, updated_at)
        VALUES (${name}, ${email.toLowerCase()}, ${phone}, NOW(), NOW())
        RETURNING id
      `
      clientId = newClient[0].id
    }
    results.client_upsert = { success: true, clientId }

    // Now try the full booking insert
    const newBooking = await sql`
      INSERT INTO bookings (
        status, dispatch_status,
        pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        client_id, client_email, client_phone_raw,
        trip_type, created_at, updated_at
      ) VALUES (
        'pending_payment', 'pending_payment',
        'MCO Airport', 'Oviedo',
        '2026-03-25T14:00:00+00'::timestamptz,
        'sedan', 95,
        ${clientId}::uuid,
        ${email}, ${phone},
        'oneway', NOW(), NOW()
      )
      RETURNING id
    `
    results.full_booking_insert = { success: true, id: newBooking[0].id }
    await sql`DELETE FROM bookings WHERE id = ${newBooking[0].id}::uuid`
    await sql`DELETE FROM clients WHERE id = ${clientId}::uuid`
  } catch (err: any) {
    results.full_flow_error = err.message
  }

  return NextResponse.json(results)
}
