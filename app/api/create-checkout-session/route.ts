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
//   flightNumber?, notes?, sourceCode?, passengers?, luggage?
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
      bookingOrigin,
      capturedBy,
    } = body

    // ── serverBookingValidation() — Capa 2: server-side pre-checkout validation ──
    const validationErrors: string[] = []
    if (!price)            validationErrors.push("fare_total")
    if (!vehicle)          validationErrors.push("vehicle_type")
    if (!pickupZone)       validationErrors.push("pickup_zone")
    if (!dropoffZone)      validationErrors.push("dropoff_zone")
    if (!pickupLocation?.trim())  validationErrors.push("pickup_address")
    if (!dropoffLocation?.trim()) validationErrors.push("dropoff_address")
    if (!date)             validationErrors.push("pickup_date")
    if (!time)             validationErrors.push("pickup_time")
    if (!name?.trim())     validationErrors.push("client_name")
    if (!phone?.trim())    validationErrors.push("client_phone")
    if (!email?.trim())    validationErrors.push("client_email")
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: "booking_validation_failed",
        missing_fields: validationErrors,
        message: `Booking incomplete. Missing required fields: ${validationErrors.join(", ")}`
      }, { status: 400 })
    }

    // ── 1. Pre-create a PENDING booking in the DB ─────────────
    let bookingId: string | null = null
    let clientId: string | null = null
    let sourceDriverId: string | null = null
    const preCreateErrors: string[] = []

    // Step A: Ensure extra columns exist (run each separately to avoid partial failure)
    const alterStatements = [
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(255)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_phone_raw VARCHAR(50)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_number VARCHAR(50)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_code VARCHAR(50)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passengers INTEGER`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS luggage VARCHAR(100)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_zone VARCHAR(50)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_zone VARCHAR(50)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS readiness_status VARCHAR(30) DEFAULT 'ready'`,
    ]

    for (const stmt of alterStatements) {
      try { await stmt } catch { /* column may already exist */ }
    }

    // Also ensure pickup_at allows NULL
    try {
      await sql`ALTER TABLE bookings ALTER COLUMN pickup_at DROP NOT NULL`
    } catch { /* may already be nullable */ }

    // Step B: Upsert client
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
      } catch (err: any) {
        preCreateErrors.push(`client_upsert: ${err.message}`)
        console.error("[create-checkout-session] client upsert failed:", err.message)
      }
    }

    // Step C: Resolve source_driver_id from sourceCode
    if (sourceCode) {
      try {
        const driverRows = await sql`
          SELECT id, status FROM drivers
          WHERE driver_code = ${sourceCode.toUpperCase()}
          LIMIT 1
        `
        if (driverRows.length > 0) {
          sourceDriverId = driverRows[0].id
        }
      } catch (err: any) {
        preCreateErrors.push(`source_driver_lookup: ${err.message}`)
        console.error("[create-checkout-session] source driver lookup failed:", err.message)
      }
    }

    // Build pickup datetime
    const pickupAt = date && time ? `${date}T${time}:00+00` : null

    // Step D: Create pending booking with all fields including zones and source_driver_id
    try {
      const pickupAddr = pickupLocation || pickupZone
      const dropoffAddr = dropoffLocation || dropoffZone

      const newBooking = await sql`
        INSERT INTO bookings (
          status,
          dispatch_status,
          readiness_status,
          pickup_address,
          dropoff_address,
          pickup_zone,
          dropoff_zone,
          pickup_at,
          vehicle_type,
          total_price,
          client_id,
          client_email,
          client_phone_raw,
          flight_number,
          notes,
          source_code,
          source_driver_id,
          passengers,
          luggage,
          trip_type,
          booking_origin,
          captured_by_driver_code,
          created_at,
          updated_at
        ) VALUES (
          'pending_payment',
          'pending_payment',
          'ready',
          ${pickupAddr},
          ${dropoffAddr},
          ${pickupZone ?? null},
          ${dropoffZone ?? null},
          ${pickupAt}::timestamptz,
          ${vehicle},
          ${price},
          ${clientId}::uuid,
          ${email ?? null},
          ${phone ?? null},
          ${flightNumber ?? null},
          ${notes ?? null},
          ${sourceCode ?? null},
          ${sourceDriverId}::uuid,
          ${passengers ? Number(passengers) : null},
          ${luggage ?? null},
          ${tripType},
          ${bookingOrigin ?? 'website'},
          ${capturedBy ?? 'public_site'},
          NOW(),
          NOW()
        )
        RETURNING id
      `
      bookingId = newBooking[0].id
    } catch (bookingErr: any) {
      preCreateErrors.push(`booking_insert: ${bookingErr?.message}`)
      console.error("[create-checkout-session] booking pre-create failed:", bookingErr?.message)
      // Continue to Stripe even if pre-create fails — webhook will handle it
    }

    // ── 2. Create Stripe Checkout session ────────────────────
    const pickupLabel = pickupLocation || pickupZone
    const dropoffLabel = dropoffLocation || dropoffZone

    // FIX: Explicitly include captured_by_driver_code so the webhook
    // can classify driver-captured bookings as offer_pending without
    // relying on the DB fallback. Also force booking_origin='tablet'
    // when the booking was captured by a specific driver (not public_site).
    const isDriverCapturedSession = !!(capturedBy && capturedBy !== 'public_site' && capturedBy !== 'PUBLIC_SITE')

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
        booking_id:              bookingId ?? "",
        client_id:               clientId ?? "",
        client_name:             name ?? "",
        client_email:            email ?? "",
        client_phone:            phone ?? "",
        pickup_zone:             pickupZone ?? "",
        dropoff_zone:            dropoffZone ?? "",
        pickup_location:         pickupLabel ?? "",
        dropoff_location:        dropoffLabel ?? "",
        pickup_date:             date ?? "",
        pickup_time:             time ?? "",
        vehicle_type:            vehicle ?? "",
        trip_type:               tripType ?? "oneway",
        fare:                    String(price),
        flight_number:           flightNumber ?? "",
        notes:                   notes ?? "",
        source_code:             sourceCode ?? "",
        source_driver_id:        sourceDriverId ?? "",
        passengers:              String(passengers ?? ""),
        luggage:                 luggage ?? "",
        // Driver-capture fields — used by webhook for auto-assign classification
        captured_by:             capturedBy ?? "public_site",
        captured_by_driver_code: isDriverCapturedSession ? (capturedBy ?? "") : "",
        booking_origin:          isDriverCapturedSession ? "tablet" : (bookingOrigin ?? "website"),
        tablet_code:             isDriverCapturedSession ? (capturedBy ?? "") : "",
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

    return NextResponse.json({
      url: session.url,
      booking_id: bookingId,
      source_driver_resolved: !!sourceDriverId,
      ...(preCreateErrors.length > 0 ? { pre_create_errors: preCreateErrors } : {}),
    })
  } catch (error: any) {
    console.error("[create-checkout-session]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
