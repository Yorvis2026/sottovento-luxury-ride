import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder")
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// POST /api/create-checkout-session
//
// Creates a Stripe Checkout session and pre-creates a PENDING
// booking in the SLN database so the webhook can finalize it.
//
// Body:
//   price, vehicle, pickupZone, dropoffZone, tripType
//   name, email, phone, date, time, pickupLocation, dropoffLocation
//   flightNumber?, notes?, sourceCode?
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      price,
      vehicle,
      pickupZone,
      dropoffZone,
      tripType = "oneway",
      name,
      email,
      phone,
      date,
      time,
      pickupLocation,
      dropoffLocation,
      flightNumber,
      notes,
      sourceCode,
      passengers,
      luggage,
    } = body

    if (!price || !vehicle || !pickupZone || !dropoffZone) {
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 })
    }

    // ── 1. Pre-create a PENDING booking in the DB ─────────────
    // This ensures the booking exists before Stripe processes payment.
    // The webhook will update it to 'paid' on success.
    let bookingId: string | null = null
    let clientId: string | null = null

    try {
      // Ensure extra columns exist (idempotent)
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255),
          ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(255),
          ADD COLUMN IF NOT EXISTS client_email VARCHAR(255),
          ADD COLUMN IF NOT EXISTS client_phone_raw VARCHAR(50),
          ADD COLUMN IF NOT EXISTS flight_number VARCHAR(50),
          ADD COLUMN IF NOT EXISTS notes TEXT,
          ADD COLUMN IF NOT EXISTS source_code VARCHAR(50),
          ADD COLUMN IF NOT EXISTS passengers INTEGER,
          ADD COLUMN IF NOT EXISTS luggage VARCHAR(100),
          ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20),
          ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50)
      `
    } catch { /* columns may already exist */ }

    // Also ensure pickup_at allows NULL (in case schema has NOT NULL constraint)
    try {
      await sql`ALTER TABLE bookings ALTER COLUMN pickup_at DROP NOT NULL`
    } catch { /* may already be nullable */ }

    // Upsert client
    if (email) {
      try {
        const existingClient = await sql`
          SELECT id FROM clients WHERE email = ${email.toLowerCase()} LIMIT 1
        `
        if (existingClient.length > 0) {
          clientId = existingClient[0].id
          await sql`
            UPDATE clients
            SET full_name = COALESCE(${name ?? null}, full_name),
                phone = COALESCE(${phone ?? null}, phone),
                updated_at = NOW()
            WHERE id = ${clientId}::uuid
          `
        } else {
          const newClient = await sql`
            INSERT INTO clients (full_name, email, phone, created_at, updated_at)
            VALUES (${name ?? "Guest"}, ${email.toLowerCase()}, ${phone ?? null}, NOW(), NOW())
            RETURNING id
          `
          clientId = newClient[0].id
        }
      } catch { /* client upsert failure is non-blocking */ }
    }

    // Build pickup datetime
    const pickupAt = date && time ? `${date}T${time}:00+00` : null

    // Create pending booking
    try {
      const pickupAddr = pickupLocation || pickupZone
      const dropoffAddr = dropoffLocation || dropoffZone

      const newBooking = await sql`
        INSERT INTO bookings (
          status,
          dispatch_status,
          pickup_address,
          dropoff_address,
          pickup_at,
          vehicle_type,
          total_price,
          client_id,
          client_email,
          client_phone_raw,
          flight_number,
          notes,
          source_code,
          passengers,
          luggage,
          trip_type,
          created_at,
          updated_at
        ) VALUES (
          'pending_payment',
          'pending_payment',
          ${pickupAddr},
          ${dropoffAddr},
          ${pickupAt}::timestamptz,
          ${vehicle},
          ${price},
          ${clientId ? clientId + '::uuid' : null},
          ${email ?? null},
          ${phone ?? null},
          ${flightNumber ?? null},
          ${notes ?? null},
          ${sourceCode ?? null},
          ${passengers ? Number(passengers) : null},
          ${luggage ?? null},
          ${tripType},
          NOW(),
          NOW()
        )
        RETURNING id
      `
      bookingId = newBooking[0].id
    } catch (bookingErr: any) {
      console.error("[create-checkout-session] booking pre-create failed:", bookingErr?.message)
      // Continue to Stripe even if pre-create fails — webhook will handle it
    }

    // ── 2. Create Stripe Checkout session ────────────────────
    const pickupLabel = pickupLocation || pickupZone
    const dropoffLabel = dropoffLocation || dropoffZone

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Sottovento Luxury Ride — ${vehicle}`,
              description: `${pickupLabel} → ${dropoffLabel}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      // ── Full metadata for webhook finalization ──────────────
      metadata: {
        booking_id:       bookingId ?? "",
        client_id:        clientId ?? "",
        client_name:      name ?? "",
        client_email:     email ?? "",
        client_phone:     phone ?? "",
        pickup_zone:      pickupZone ?? "",
        dropoff_zone:     dropoffZone ?? "",
        pickup_location:  pickupLabel ?? "",
        dropoff_location: dropoffLabel ?? "",
        pickup_date:      date ?? "",
        pickup_time:      time ?? "",
        vehicle_type:     vehicle ?? "",
        trip_type:        tripType ?? "oneway",
        fare:             String(price),
        flight_number:    flightNumber ?? "",
        notes:            notes ?? "",
        source_code:      sourceCode ?? "",
        passengers:       String(passengers ?? ""),
        luggage:          luggage ?? "",
      },
      success_url: `https://sottoventoluxuryride.com/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: "https://sottoventoluxuryride.com",
    })

    // ── 3. Save stripe_session_id to the pre-created booking ─
    if (bookingId && session.id) {
      try {
        await sql`
          UPDATE bookings
          SET stripe_session_id = ${session.id},
              updated_at = NOW()
          WHERE id = ${bookingId}::uuid
        `
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({ url: session.url, booking_id: bookingId })
  } catch (error: any) {
    console.error("[create-checkout-session]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
