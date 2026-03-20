import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder")
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)
const resend = new Resend(process.env.RESEND_API_KEY)

// ============================================================
// POST /api/stripe/webhook
//
// Handles Stripe webhook events:
//   - checkout.session.completed  → finalize booking + notify
//   - payment_intent.succeeded    → backup handler
//
// IMPORTANT: This endpoint must be registered in Stripe Dashboard
// Webhook URL: https://sottoventoluxuryride.com/api/stripe/webhook
// Events: checkout.session.completed, payment_intent.succeeded
// ============================================================

// Disable body parsing — Stripe requires raw body for signature verification
export const config = {
  api: { bodyParser: false },
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  // ── Verify Stripe signature ───────────────────────────────
  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err: any) {
      console.error("[stripe/webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
  } else {
    // No secret configured — parse without verification (dev only)
    try {
      event = JSON.parse(rawBody) as Stripe.Event
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
  }

  // ── Route events ──────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    await handleCheckoutCompleted(session)
  } else if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent
    await handlePaymentIntentSucceeded(pi)
  }

  return NextResponse.json({ received: true })
}

// ============================================================
// MAIN HANDLER: checkout.session.completed
// ============================================================
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {}
  const now = new Date().toISOString()

  const bookingId       = meta.booking_id || null
  const clientName      = meta.client_name || session.customer_details?.name || "Guest"
  const clientEmail     = meta.client_email || session.customer_email || session.customer_details?.email || null
  const clientPhone     = meta.client_phone || session.customer_details?.phone || null
  const pickupLocation  = meta.pickup_location || meta.pickup_zone || "TBD"
  const dropoffLocation = meta.dropoff_location || meta.dropoff_zone || "TBD"
  const pickupDate      = meta.pickup_date || null
  const pickupTime      = meta.pickup_time || null
  const vehicleType     = meta.vehicle_type || "Sedan"
  const fare            = Number(meta.fare || (session.amount_total ? session.amount_total / 100 : 0))
  const sourceCode      = meta.source_code || null
  const flightNumber    = meta.flight_number || null
  const notes           = meta.notes || null
  const passengers      = meta.passengers ? Number(meta.passengers) : null
  const luggage         = meta.luggage || null
  const tripType        = meta.trip_type || "oneway"
  const stripeSessionId = session.id
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null

  const pickupAt = pickupDate && pickupTime ? `${pickupDate}T${pickupTime}:00+00` : null

  // ── Ensure schema columns exist ───────────────────────────
  try {
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
        ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20)
    `
  } catch { /* columns may already exist */ }

  // ── Upsert client ─────────────────────────────────────────
  let clientId: string | null = meta.client_id || null

  if (!clientId && clientEmail) {
    try {
      const existing = await sql`
        SELECT id FROM clients WHERE email = ${clientEmail.toLowerCase()} LIMIT 1
      `
      if (existing.length > 0) {
        clientId = existing[0].id
        await sql`
          UPDATE clients
          SET full_name = COALESCE(${clientName}, full_name),
              phone = COALESCE(${clientPhone}, phone),
              updated_at = NOW()
          WHERE id = ${clientId}::uuid
        `
      } else {
        const newClient = await sql`
          INSERT INTO clients (full_name, email, phone, created_at, updated_at)
          VALUES (${clientName}, ${clientEmail.toLowerCase()}, ${clientPhone}, NOW(), NOW())
          RETURNING id
        `
        clientId = newClient[0].id
      }
    } catch (err: any) {
      console.error("[webhook] client upsert failed:", err.message)
    }
  }

  // ── Resolve source_driver_id from source_code ─────────────
  let sourceDriverId: string | null = null
  if (sourceCode) {
    try {
      const driverRows = await sql`
        SELECT id FROM drivers WHERE driver_code = ${sourceCode.toUpperCase()} LIMIT 1
      `
      if (driverRows.length > 0) sourceDriverId = driverRows[0].id
    } catch { /* non-blocking */ }
  }

  // ── Finalize booking ──────────────────────────────────────
  let finalBookingId = bookingId

  try {
    if (bookingId) {
      // Update the pre-created pending booking
      await sql`
        UPDATE bookings
        SET status = 'pending',
            dispatch_status = 'pending',
            paid_at = ${now}::timestamptz,
            stripe_session_id = ${stripeSessionId},
            stripe_payment_intent = ${paymentIntentId},
            client_id = ${clientId ? clientId + '::uuid' : null},
            client_email = ${clientEmail},
            client_phone_raw = ${clientPhone},
            flight_number = ${flightNumber},
            notes = ${notes},
            source_code = ${sourceCode},
            source_driver_id = ${sourceDriverId ? sourceDriverId + '::uuid' : null},
            passengers = ${passengers},
            luggage = ${luggage},
            trip_type = ${tripType},
            updated_at = NOW()
        WHERE id = ${bookingId}::uuid
          AND status IN ('pending_payment', 'pending')
      `
    } else {
      // No pre-created booking — create it now from webhook data
      const newBooking = await sql`
        INSERT INTO bookings (
          status, dispatch_status,
          pickup_address, dropoff_address, pickup_at,
          vehicle_type, total_price,
          client_id, client_email, client_phone_raw,
          flight_number, notes, source_code, source_driver_id,
          passengers, luggage, trip_type,
          paid_at, stripe_session_id, stripe_payment_intent,
          created_at, updated_at
        ) VALUES (
          'pending', 'pending',
          ${pickupLocation}, ${dropoffLocation},
          ${pickupAt ? pickupAt : null}::timestamptz,
          ${vehicleType}, ${fare},
          ${clientId ? clientId + '::uuid' : null},
          ${clientEmail}, ${clientPhone},
          ${flightNumber}, ${notes}, ${sourceCode},
          ${sourceDriverId ? sourceDriverId + '::uuid' : null},
          ${passengers}, ${luggage}, ${tripType},
          ${now}::timestamptz, ${stripeSessionId}, ${paymentIntentId},
          NOW(), NOW()
        )
        RETURNING id
      `
      finalBookingId = newBooking[0].id
    }
  } catch (err: any) {
    console.error("[webhook] CRITICAL: booking finalization failed:", err.message)
    // Write critical error log
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, new_data)
        VALUES (
          'booking',
          ${finalBookingId ?? '00000000-0000-0000-0000-000000000000'}::uuid,
          'payment_finalization_failed',
          'system',
          '00000000-0000-0000-0000-000000000000'::uuid,
          ${JSON.stringify({ stripe_session_id: stripeSessionId, error: err.message, client_email: clientEmail, fare, timestamp: now })}::jsonb
        )
      `
    } catch { /* audit log failure */ }
    return
  }

  // ── Audit log: payment confirmed ──────────────────────────
  try {
    await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, new_data)
      VALUES (
        'booking',
        ${finalBookingId ?? '00000000-0000-0000-0000-000000000000'}::uuid,
        'payment_confirmed',
        'system',
        '00000000-0000-0000-0000-000000000000'::uuid,
        ${JSON.stringify({ stripe_session_id: stripeSessionId, payment_intent: paymentIntentId, amount: fare, client_email: clientEmail, timestamp: now })}::jsonb
      )
    `
  } catch { /* non-blocking */ }

  // ── Notifications ─────────────────────────────────────────
  await sendNotifications({
    bookingId: finalBookingId!,
    clientName,
    clientEmail,
    clientPhone,
    pickupLocation,
    dropoffLocation,
    pickupDate,
    pickupTime,
    vehicleType,
    fare,
    flightNumber,
    notes,
  })
}

// ============================================================
// BACKUP HANDLER: payment_intent.succeeded
// ============================================================
async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  // Check if there's a booking with this payment_intent that's still pending_payment
  try {
    const rows = await sql`
      SELECT id, status FROM bookings
      WHERE stripe_payment_intent = ${pi.id}
        AND status = 'pending_payment'
      LIMIT 1
    `
    if (rows.length > 0) {
      await sql`
        UPDATE bookings
        SET status = 'pending',
            dispatch_status = 'pending',
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = ${rows[0].id}::uuid
      `
      console.log("[webhook] payment_intent.succeeded: updated booking", rows[0].id)
    }
  } catch (err: any) {
    console.error("[webhook] payment_intent.succeeded handler failed:", err.message)
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================
async function sendNotifications(data: {
  bookingId: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  pickupLocation: string
  dropoffLocation: string
  pickupDate: string | null
  pickupTime: string | null
  vehicleType: string
  fare: number
  flightNumber: string | null
  notes: string | null
}) {
  const {
    bookingId, clientName, clientEmail, clientPhone,
    pickupLocation, dropoffLocation, pickupDate, pickupTime,
    vehicleType, fare, flightNumber, notes,
  } = data

  const pickupFormatted = pickupDate && pickupTime
    ? `${pickupDate} at ${pickupTime}`
    : pickupDate || "To be confirmed"

  const bookingRef = bookingId.slice(0, 8).toUpperCase()

  // ── Client confirmation email ─────────────────────────────
  if (clientEmail) {
    try {
      await resend.emails.send({
        from: "Sottovento Luxury Ride <bookings@sottoventoluxuryride.com>",
        to: clientEmail,
        subject: `Booking Confirmed — Ref #${bookingRef}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px 32px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #C9A84C; font-size: 24px; font-weight: 300; letter-spacing: 4px; margin: 0;">SOTTOVENTO</h1>
              <p style="color: #888; font-size: 12px; letter-spacing: 2px; margin: 4px 0 0;">LUXURY RIDE</p>
            </div>

            <div style="border: 1px solid #C9A84C33; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <h2 style="color: #C9A84C; font-size: 18px; font-weight: 400; margin: 0 0 20px;">Booking Confirmed</h2>
              <p style="color: #aaa; margin: 0 0 16px;">Dear ${clientName},</p>
              <p style="color: #aaa; margin: 0 0 24px;">Your reservation has been confirmed and payment received. Here are your ride details:</p>

              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 10px 0; color: #666; font-size: 13px;">Booking Reference</td>
                  <td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">#${bookingRef}</td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 10px 0; color: #666; font-size: 13px;">Pickup</td>
                  <td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">${pickupLocation}</td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 10px 0; color: #666; font-size: 13px;">Drop-off</td>
                  <td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">${dropoffLocation}</td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 10px 0; color: #666; font-size: 13px;">Date & Time</td>
                  <td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">${pickupFormatted}</td>
                </tr>
                <tr style="border-bottom: 1px solid #222;">
                  <td style="padding: 10px 0; color: #666; font-size: 13px;">Vehicle</td>
                  <td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">${vehicleType}</td>
                </tr>
                ${flightNumber ? `<tr style="border-bottom: 1px solid #222;"><td style="padding: 10px 0; color: #666; font-size: 13px;">Flight #</td><td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">${flightNumber}</td></tr>` : ""}
                <tr>
                  <td style="padding: 10px 0; color: #666; font-size: 13px;">Total Paid</td>
                  <td style="padding: 10px 0; color: #C9A84C; font-size: 18px; font-weight: bold; text-align: right;">$${fare.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            ${notes ? `<div style="border: 1px solid #333; border-radius: 8px; padding: 16px; margin-bottom: 24px;"><p style="color: #666; font-size: 12px; margin: 0 0 4px;">Special Instructions</p><p style="color: #aaa; font-size: 14px; margin: 0;">${notes}</p></div>` : ""}

            <div style="text-align: center; margin-top: 32px;">
              <p style="color: #555; font-size: 13px;">Questions? Contact us</p>
              <p style="margin: 4px 0;"><a href="tel:+14073830647" style="color: #C9A84C; text-decoration: none;">+1 (407) 383-0647</a></p>
              <p style="margin: 4px 0;"><a href="mailto:contact@sottoventoluxuryride.com" style="color: #C9A84C; text-decoration: none;">contact@sottoventoluxuryride.com</a></p>
            </div>
          </div>
        `,
      })
    } catch (err: any) {
      console.error("[webhook] client email failed:", err.message)
    }
  }

  // ── Admin alert email ─────────────────────────────────────
  try {
    await resend.emails.send({
      from: "SLN System <bookings@sottoventoluxuryride.com>",
      to: "contact@sottoventoluxuryride.com",
      subject: `🔔 NEW PAID BOOKING — ${clientName} | ${pickupLocation} → ${dropoffLocation} | $${fare}`,
      html: `
        <div style="font-family: monospace; background: #0a0a0a; color: #e5e5e5; padding: 24px; max-width: 600px;">
          <h2 style="color: #C9A84C; margin: 0 0 20px;">NEW PAID BOOKING</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #666; padding: 6px 0;">Booking ID</td><td style="color: #fff; padding: 6px 0;">${bookingId}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Client</td><td style="color: #fff; padding: 6px 0;">${clientName}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Email</td><td style="color: #fff; padding: 6px 0;">${clientEmail ?? "N/A"}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Phone</td><td style="color: #fff; padding: 6px 0;">${clientPhone ?? "N/A"}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Pickup</td><td style="color: #fff; padding: 6px 0;">${pickupLocation}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Drop-off</td><td style="color: #fff; padding: 6px 0;">${dropoffLocation}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Date & Time</td><td style="color: #fff; padding: 6px 0;">${pickupFormatted}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Vehicle</td><td style="color: #fff; padding: 6px 0;">${vehicleType}</td></tr>
            ${flightNumber ? `<tr><td style="color: #666; padding: 6px 0;">Flight #</td><td style="color: #fff; padding: 6px 0;">${flightNumber}</td></tr>` : ""}
            ${notes ? `<tr><td style="color: #666; padding: 6px 0;">Notes</td><td style="color: #fff; padding: 6px 0;">${notes}</td></tr>` : ""}
            <tr><td style="color: #666; padding: 6px 0;">FARE</td><td style="color: #C9A84C; font-size: 18px; font-weight: bold; padding: 6px 0;">$${fare.toFixed(2)}</td></tr>
          </table>
          <div style="margin-top: 20px;">
            <a href="https://sottoventoluxuryride.com/admin" style="background: #C9A84C; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View in Admin Panel</a>
          </div>
        </div>
      `,
    })
  } catch (err: any) {
    console.error("[webhook] admin alert email failed:", err.message)
  }
}
