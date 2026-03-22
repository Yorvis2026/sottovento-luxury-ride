import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder")
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// POST /api/stripe/webhook
// ============================================================
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? "")
  } catch (err: any) {
    console.error(`[webhook] signature verification failed: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  console.log(`[webhook] received event: ${event.type}`)

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
      break
    default:
      console.log(`[webhook] unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

// ============================================================
// HANDLER: checkout.session.completed
// ============================================================
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {}
  const bookingId = metadata.booking_id
  const stripeSessionId = session.id
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : ""
  const clientEmail = session.customer_details?.email || metadata.client_email
  const clientName = session.customer_details?.name || metadata.client_name
  const clientPhone = session.customer_details?.phone || metadata.client_phone
  const fare = Number(metadata.fare || 0)

  // Extract other metadata
  const clientId = metadata.client_id
  const pickupLocation = metadata.pickup_location
  const dropoffLocation = metadata.dropoff_location
  const pickupZone = metadata.pickup_zone
  const dropoffZone = metadata.dropoff_zone
  const pickupDate = metadata.pickup_date
  const pickupTime = metadata.pickup_time
  const vehicleType = metadata.vehicle_type
  const tripType = metadata.trip_type || "oneway"
  const flightNumber = metadata.flight_number
  const notes = metadata.notes
  const sourceCode = metadata.source_code
  const sourceDriverId = metadata.source_driver_id
  const passengers = metadata.passengers ? Number(metadata.passengers) : 1
  const luggage = metadata.luggage

  // ── STEP 1: Determine Dispatch Strategy ───────────────────
  // Default: awaiting_sln_member (manual dispatch)
  let dispatchStatus = "awaiting_sln_member"
  let dispatchReason = "default_manual_dispatch"
  let sourceDriverEligible = false

  // If there's a source driver, they get first right of refusal (120s)
  if (sourceDriverId) {
    dispatchStatus = "awaiting_source_owner"
    dispatchReason = "source_driver_priority"
    sourceDriverEligible = true
  }

  const now = new Date().toISOString()
  const offerTimeoutSecs = 120
  const offerExpiresAt = new Date(Date.now() + offerTimeoutSecs * 1000).toISOString()
  const pickupAt = pickupDate && pickupTime ? `${pickupDate}T${pickupTime}:00+00` : null

  let finalBookingId = bookingId

  // ── STEP 2: Finalize Booking in DB ────────────────────────
  try {
    if (bookingId) {
      await sql`
        UPDATE bookings
        SET
          payment_status = 'paid',
          status = 'new',
          dispatch_status = 'needs_review',
          booking_origin = 'public_website',
          paid_at = ${now}::timestamptz,
          stripe_session_id = ${stripeSessionId},
          stripe_payment_intent = ${paymentIntentId},
          client_id = ${clientId}::uuid,
          client_email = ${clientEmail},
          client_phone_raw = ${clientPhone},
          flight_number = ${flightNumber},
          notes = ${notes},
          source_code = ${sourceCode},
          source_driver_id = ${sourceDriverId ? `${sourceDriverId}::uuid` : null},
          passengers = ${passengers},
          luggage = ${luggage},
          trip_type = ${tripType},
          offer_expires_at = ${offerExpiresAt}::timestamptz,
          offer_stage = ${dispatchStatus === "awaiting_source_owner" ? "source_owner" : "sln_member"},
          offer_status = 'pending',
          updated_at = NOW()
        WHERE id = ${bookingId}::uuid
          AND status IN ('pending_payment', 'pending', 'pending_dispatch')
      `
    } else {
      const newBooking = await sql`
        INSERT INTO bookings (
          payment_status, status, dispatch_status,
          pickup_address, dropoff_address, pickup_zone, dropoff_zone, pickup_at,
          vehicle_type, total_price,
          client_id, client_email, client_phone_raw,
          flight_number, notes, source_code, source_driver_id,
          passengers, luggage, trip_type,
          booking_origin,
          paid_at, stripe_session_id, stripe_payment_intent,
          offer_expires_at, offer_stage, offer_status,
          created_at, updated_at
        ) VALUES (
          'paid', 'new', 'needs_review',
          ${pickupLocation}, ${dropoffLocation}, ${pickupZone}, ${dropoffZone},
          ${pickupAt ? pickupAt : null}::timestamptz,
          ${vehicleType}, ${fare},
          ${clientId}::uuid,
          ${clientEmail}, ${clientPhone},
          ${flightNumber}, ${notes}, ${sourceCode},
          ${sourceDriverId ? `${sourceDriverId}::uuid` : null},
          ${passengers}, ${luggage}, ${tripType},
          'public_website',
          ${now}::timestamptz, ${stripeSessionId}, ${paymentIntentId},
          ${offerExpiresAt}::timestamptz,
          ${dispatchStatus === "awaiting_source_owner" ? "source_owner" : "sln_member"},
          'pending',
          NOW(), NOW()
        )
        RETURNING id
      `
      finalBookingId = newBooking[0].id
    }
  } catch (err: any) {
    console.error("[webhook] CRITICAL: booking finalization failed:", err.message)
    await auditLog(
      finalBookingId ?? "00000000-0000-0000-0000-000000000000",
      "payment_finalization_failed",
      { stripe_session_id: stripeSessionId, error: err.message, client_email: clientEmail, fare }
    )
    return
  }

  // ── STEP 9: Audit log — payment_confirmed ─────────────────
  await auditLog(finalBookingId!, "payment_confirmed", {
    stripe_session_id: stripeSessionId,
    payment_intent: paymentIntentId,
    amount: fare,
    client_email: clientEmail,
  })

  // ── STEP 9: Audit log — booking_persisted ─────────────────
  await auditLog(finalBookingId!, "booking_persisted", {
    booking_status: "new",
    payment_status: "paid",
  })

  // ── STEP 9: Audit log — dispatch_status_assigned ──────────
  await auditLog(finalBookingId!, "dispatch_status_assigned", {
    dispatch_status: "needs_review",
    reason: dispatchReason,
    source_code: sourceCode,
    source_driver_id: sourceDriverId,
    source_driver_eligible: sourceDriverEligible,
  })

  await dispatchLog(
    finalBookingId!,
    "not_required",
    "needs_review",
    `payment_confirmed: ${dispatchReason}`,
    { stripe_session_id: stripeSessionId, fare, source_code: sourceCode }
  )

  // ── STEP 5+7: Auto-dispatch — source-owner offer ──────────
  if (dispatchStatus === "awaiting_source_owner" && sourceDriverId) {
    await triggerSourceOwnerOffer({
      bookingId: finalBookingId!,
      sourceDriverId,
      sourceCode: sourceCode!,
      pickupLocation,
      dropoffLocation,
      pickupDate,
      pickupTime,
      vehicleType,
      fare,
      offerTimeoutSecs,
    })
  }

  // ── STEP 8: Notifications ─────────────────────────────────
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
    dispatchStatus,
    sourceCode,
  })
}

// ============================================================
// BACKUP HANDLER: payment_intent.succeeded
// ============================================================
async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  try {
    const rows = await sql`
      SELECT id, status, dispatch_status, source_code, source_driver_id
      FROM bookings
      WHERE stripe_payment_intent = ${pi.id}
        AND status IN ('pending_payment', 'pending')
      LIMIT 1
    `
    if (rows.length === 0) return

    const booking = rows[0]
    const offerExpiresAt = new Date(Date.now() + 60_000).toISOString()

    await sql`
      UPDATE bookings
      SET
        payment_status = 'paid',
        status = 'new',
        dispatch_status = 'needs_review',
        booking_origin = 'public_website',
        paid_at = NOW(),
        offer_expires_at = ${offerExpiresAt}::timestamptz,
        offer_status = 'pending',
        updated_at = NOW()
      WHERE id = ${booking.id}::uuid
    `

    await auditLog(booking.id, "payment_confirmed_via_intent", {
      payment_intent: pi.id,
      previous_status: booking.status,
    })

    console.log("[webhook] payment_intent.succeeded: updated booking", booking.id)
  } catch (err: any) {
    console.error("[webhook] payment_intent.succeeded handler failed:", err.message)
  }
}

// ============================================================
// AUTO-DISPATCH: Source-Owner Offer (120s timer)
// ============================================================
async function triggerSourceOwnerOffer(params: {
  bookingId: string
  sourceDriverId: string
  sourceCode: string
  pickupLocation: string
  dropoffLocation: string
  pickupDate: string | null
  pickupTime: string | null
  vehicleType: string
  fare: number
  offerTimeoutSecs: number
}) {
  const {
    bookingId, sourceDriverId, sourceCode,
    pickupLocation, dropoffLocation, pickupDate, pickupTime,
    vehicleType, fare, offerTimeoutSecs,
  } = params

  try {
    // Get driver details for notification
    const driverRows = await sql`
      SELECT id, full_name, phone, email FROM drivers WHERE id = ${sourceDriverId}::uuid LIMIT 1
    `
    if (driverRows.length === 0) return

    const driver = driverRows[0]
    const pickupFormatted = pickupDate && pickupTime
      ? `${pickupDate} at ${pickupTime}`
      : pickupDate || "To be confirmed"

    // Send SMS to source driver if Twilio is configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && driver.phone) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
        const smsBody = [
          `🚗 SLN OFFER — Booking #${bookingId.slice(0, 8).toUpperCase()}`,
          `Pickup: ${pickupLocation}`,
          `Drop-off: ${dropoffLocation}`,
          `Date: ${pickupFormatted}`,
          `Vehicle: ${vehicleType}`,
          `Fare: $${fare.toFixed(2)}`,
          `⏱ You have ${offerTimeoutSecs}s to accept.`,
          `Reply YES to accept or NO to decline.`,
        ].join("\n")

        const formData = new URLSearchParams({
          From: process.env.TWILIO_PHONE_NUMBER ?? "",
          To: driver.phone,
          Body: smsBody,
        })

        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        })

        if (twilioRes.ok) {
          console.log("[webhook] SMS offer sent to driver", driver.phone)
        }
      } catch (smsErr: any) {
        console.error("[webhook] SMS notification failed:", smsErr.message)
      }
    }
  } catch (err: any) {
    console.error("[webhook] triggerSourceOwnerOffer failed:", err.message)
  }
}

// ============================================================
// NOTIFICATIONS: Client & Admin
// ============================================================
async function sendNotifications(params: any) {
  // Placeholder for notification logic (Email, Push, etc.)
  console.log("[webhook] notifications triggered for booking", params.bookingId)
}

// ============================================================
// LOGGING UTILS
// ============================================================
async function auditLog(entityId: string, action: string, metadata: any) {
  try {
    await sql`
      INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
      VALUES (${entityId}::uuid, 'booking', ${action}, ${JSON.stringify(metadata)}, NOW())
    `
  } catch { /* audit_logs may not exist */ }
}

async function dispatchLog(bookingId: string, from: string, to: string, reason: string, metadata: any) {
  try {
    await sql`
      INSERT INTO dispatch_logs (booking_id, from_status, to_status, reason, metadata, created_at)
      VALUES (${bookingId}::uuid, ${from}, ${to}, ${reason}, ${JSON.stringify(metadata)}, NOW())
    `
  } catch { /* dispatch_logs may not exist */ }
}
