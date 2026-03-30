import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { resolveLeadOrigin } from "@/lib/dispatch/lead-origin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder")
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// POST /api/checkout
//
// SLN-aware Stripe Checkout session creator.
// Accepts the booking metadata from the booking form and:
//   1. Resolves the lead origin (SLN attribution engine)
//   2. Pre-creates a PENDING booking in the DB
//   3. Creates a Stripe Checkout session with full metadata
//   4. Returns the Stripe redirect URL
//
// Body:
//   amount       — total fare in USD
//   name, email, phone — client info
//   metadata     — full booking + attribution metadata object
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, name, email, phone, metadata = {} } = body

    // ── Validate required fields ──────────────────────────────
    const errors: string[] = []
    if (!amount)              errors.push("amount")
    if (!name?.trim())        errors.push("client_name")
    if (!email?.trim())       errors.push("client_email")
    if (!phone?.trim())       errors.push("client_phone")
    if (!metadata.pickup_address?.trim())  errors.push("pickup_address")
    if (!metadata.dropoff_address?.trim()) errors.push("dropoff_address")
    if (!metadata.pickup_zone_selected)    errors.push("pickup_zone")
    if (!metadata.dropoff_zone_selected)   errors.push("dropoff_zone")
    if (!metadata.date)       errors.push("pickup_date")
    if (!metadata.time)       errors.push("pickup_time")
    if (!metadata.vehicle)    errors.push("vehicle_type")

    if (errors.length > 0) {
      return NextResponse.json({
        error: "booking_validation_failed",
        missing_fields: errors,
        message: `Missing required fields: ${errors.join(", ")}`,
      }, { status: 400 })
    }

    // ── Resolve SLN lead origin ───────────────────────────────
    const origin = resolveLeadOrigin({
      ref_code:         metadata.ref || metadata.source_ref || null,
      tablet_id:        metadata.tablet || metadata.source_tablet || null,
      qr_code:          metadata.qr || metadata.source_qr || null,
      campaign_id:      metadata.campaign || metadata.source_campaign || null,
      partner_ref:      metadata.partner || metadata.source_partner || null,
      utm_source:       metadata.utm_source || null,
      utm_campaign:     metadata.utm_campaign || null,
      utm_medium:       metadata.utm_medium || null,
      landing_page:     metadata.attribution_landing_page || null,
      booking_origin:   metadata.booking_origin || "website",
      captured_by:      metadata.captured_by || "public_site",
    })

    // ── Pre-create booking in DB ──────────────────────────────
    let bookingId: string | null = null
    let clientId: string | null = null
    let sourceDriverId: string | null = null
    const preCreateErrors: string[] = []

    try {
      // Ensure schema columns exist
      await Promise.allSettled([
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(255)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_phone_raw VARCHAR(50)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_number VARCHAR(50)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_type VARCHAR(50)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_reference VARCHAR(100)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_channel VARCHAR(50)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_tablet_id VARCHAR(100)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_campaign_id VARCHAR(100)`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_metadata JSONB`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_locked_at TIMESTAMPTZ`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_lat DOUBLE PRECISION`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_lng DOUBLE PRECISION`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS route_distance_miles DOUBLE PRECISION`,
        sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS route_duration_text VARCHAR(50)`,
      ])
    } catch { /* non-blocking */ }

    try {
      // Resolve or create client
      const clientEmail = email?.trim()
      const clientPhone = phone?.trim()

      const existingClients = await sql`
        SELECT id FROM clients
        WHERE email = ${clientEmail}
        LIMIT 1
      `
      if (existingClients.length > 0) {
        clientId = existingClients[0].id
      } else {
        const newClient = await sql`
          INSERT INTO clients (full_name, email, phone, created_at, updated_at)
          VALUES (${name?.trim()}, ${clientEmail}, ${clientPhone}, NOW(), NOW())
          RETURNING id
        `
        clientId = newClient[0].id
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      preCreateErrors.push(`client_upsert: ${msg}`)
    }

    // Resolve source driver ID from ref/driver code
    if (origin.source_type === "driver_direct" && origin.source_reference) {
      try {
        const drivers = await sql`
          SELECT id FROM drivers
          WHERE driver_code = ${origin.source_reference.toUpperCase()}
          LIMIT 1
        `
        if (drivers.length > 0) {
          sourceDriverId = drivers[0].id
        }
      } catch { /* non-blocking */ }
    }

    // Pre-create booking
    try {
      const pickupAt = `${metadata.date}T${metadata.time}:00`
      const newBooking = await sql`
        INSERT INTO bookings (
          status, payment_status, dispatch_status,
          pickup_address, dropoff_address,
          pickup_zone, dropoff_zone,
          pickup_at, vehicle_type, total_price,
          client_id, client_email, client_phone_raw,
          flight_number, notes,
          source_code, source_driver_id,
          passengers, luggage, trip_type,
          booking_origin, captured_by_driver_code,
          source_type, source_reference, source_channel,
          source_tablet_id, source_campaign_id, source_metadata,
          pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
          route_distance_miles, route_duration_text,
          created_at, updated_at
        ) VALUES (
          'pending_payment', 'pending_payment', 'ready',
          ${metadata.pickup_address},
          ${metadata.dropoff_address},
          ${metadata.pickup_zone_selected ?? null},
          ${metadata.dropoff_zone_selected ?? null},
          ${pickupAt}::timestamptz,
          ${metadata.vehicle ?? null},
          ${Number(amount)},
          ${clientId ? `${clientId}::uuid` : null},
          ${email ?? null},
          ${phone ?? null},
          ${metadata.flight_number ?? null},
          ${metadata.notes ?? null},
          ${origin.source_reference ?? null},
          ${sourceDriverId ? `${sourceDriverId}::uuid` : null},
          ${metadata.passengers ? Number(metadata.passengers) : null},
          ${metadata.luggage ?? null},
          ${metadata.trip_type ?? "oneway"},
          ${origin.source_channel === "tablet" ? "tablet" : "website"},
          ${origin.source_type === "driver_direct" ? origin.source_reference : null},
          ${origin.source_type},
          ${origin.source_reference},
          ${origin.source_channel},
          ${origin.source_tablet_id ?? null},
          ${origin.source_campaign_id ?? null},
          ${JSON.stringify(origin.source_metadata)}::jsonb,
          ${metadata.pickup_lat ? Number(metadata.pickup_lat) : null},
          ${metadata.pickup_lng ? Number(metadata.pickup_lng) : null},
          ${metadata.dropoff_lat ? Number(metadata.dropoff_lat) : null},
          ${metadata.dropoff_lng ? Number(metadata.dropoff_lng) : null},
          ${metadata.route_distance_miles ? Number(metadata.route_distance_miles) : null},
          ${metadata.route_duration_text ?? null},
          NOW(), NOW()
        )
        RETURNING id
      `
      bookingId = newBooking[0].id
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      preCreateErrors.push(`booking_insert: ${msg}`)
    }

    // ── Create Stripe Checkout session ────────────────────────
    const pickupLabel = metadata.pickup_address || metadata.pickup_zone_selected
    const dropoffLabel = metadata.dropoff_address || metadata.dropoff_zone_selected

    const isDriverCaptured = !!(
      (metadata.ref || metadata.captured_by) &&
      metadata.captured_by !== "public_site"
    )

    // Build Stripe metadata (max 50 keys, 500 chars each)
    const stripeMetadata: Record<string, string> = {
      booking_id:              bookingId ?? "",
      client_id:               clientId ?? "",
      client_name:             name ?? "",
      client_email:            email ?? "",
      client_phone:            phone ?? "",
      // Route
      pickup_zone:             metadata.pickup_zone_selected ?? "",
      dropoff_zone:            metadata.dropoff_zone_selected ?? "",
      pickup_address:          (metadata.pickup_address ?? "").substring(0, 500),
      dropoff_address:         (metadata.dropoff_address ?? "").substring(0, 500),
      pickup_lat:              metadata.pickup_lat ?? "",
      pickup_lng:              metadata.pickup_lng ?? "",
      dropoff_lat:             metadata.dropoff_lat ?? "",
      dropoff_lng:             metadata.dropoff_lng ?? "",
      route_distance_miles:    metadata.route_distance_miles ?? "",
      route_duration_text:     metadata.route_duration_text ?? "",
      // Booking details
      pickup_date:             metadata.date ?? "",
      pickup_time:             metadata.time ?? "",
      vehicle_type:            metadata.vehicle ?? "",
      trip_type:               metadata.trip_type ?? "oneway",
      fare:                    String(amount),
      flight_number:           metadata.flight_number ?? "",
      notes:                   (metadata.notes ?? "").substring(0, 500),
      passengers:              String(metadata.passengers ?? ""),
      luggage:                 metadata.luggage ?? "",
      // SLN Attribution
      source_type:             origin.source_type,
      source_reference:        origin.source_reference,
      source_channel:          origin.source_channel,
      source_ref:              metadata.ref || metadata.source_ref || "",
      source_tablet:           metadata.tablet || metadata.source_tablet || "",
      source_qr:               metadata.qr || metadata.source_qr || "",
      source_partner:          metadata.partner || metadata.source_partner || "",
      source_campaign:         metadata.campaign || metadata.source_campaign || "",
      utm_source:              metadata.utm_source || "",
      utm_medium:              metadata.utm_medium || "",
      utm_campaign:            metadata.utm_campaign || "",
      attribution_landing_page: (metadata.attribution_landing_page ?? "").substring(0, 500),
      attribution_captured_at: metadata.attribution_captured_at ?? "",
      // Legacy fields (backward compat with existing webhook)
      captured_by:             metadata.captured_by || origin.source_reference || "public_site",
      captured_by_driver_code: isDriverCaptured ? (metadata.ref || metadata.captured_by || "") : "",
      booking_origin:          isDriverCaptured ? "tablet" : (metadata.booking_origin ?? "website"),
      tablet_code:             metadata.tablet || "",
      // Booking presets
      booking_package:         metadata.package || metadata.booking_package || "",
      booking_service:         metadata.service || metadata.booking_service || "",
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Sottovento Luxury Ride — ${metadata.vehicle ?? ""}`,
              description: `${pickupLabel} → ${dropoffLabel}`,
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: stripeMetadata,
      success_url: `https://sottoventoluxuryride.com/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: "https://sottoventoluxuryride.com",
    })

    // Save stripe_session_id to booking
    if (bookingId && session.id) {
      try {
        await sql`
          UPDATE bookings
          SET stripe_session_id = ${session.id}, updated_at = NOW()
          WHERE id = ${bookingId}::uuid
        `
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      url: session.url,
      booking_id: bookingId,
      source_type: origin.source_type,
      source_channel: origin.source_channel,
      source_reference: origin.source_reference,
      ...(preCreateErrors.length > 0 ? { pre_create_errors: preCreateErrors } : {}),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[/api/checkout]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
