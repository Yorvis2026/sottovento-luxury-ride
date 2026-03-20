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
// Post-payment pipeline (per spec):
//   1. Verify Stripe signature
//   2. Set payment_status = paid
//   3. Set booking_status = pending_dispatch
//   4. Classify dispatch_status (3 buckets)
//   5. Enqueue booking into dispatch engine
//   6. Trigger notifications (client + admin)
//   7. Store audit logs for every step
// ============================================================

export const config = {
  api: { bodyParser: false },
}

// ── Audit log helper ──────────────────────────────────────────
async function auditLog(
  bookingId: string,
  action: string,
  data: Record<string, unknown>
) {
  try {
    await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, new_data)
      VALUES (
        'booking',
        ${bookingId}::uuid,
        ${action},
        'system',
        '00000000-0000-0000-0000-000000000000'::uuid,
        ${JSON.stringify({ ...data, timestamp: new Date().toISOString() })}::jsonb
      )
    `
  } catch { /* non-blocking */ }
}

// ── Dispatch log helper ───────────────────────────────────────
async function dispatchLog(
  bookingId: string,
  prevStatus: string | null,
  newStatus: string,
  reason: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS dispatch_log (
        id SERIAL PRIMARY KEY,
        booking_id TEXT NOT NULL,
        previous_dispatch_status TEXT,
        new_dispatch_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`
      INSERT INTO dispatch_log (booking_id, previous_dispatch_status, new_dispatch_status, reason, metadata)
      VALUES (${bookingId}, ${prevStatus}, ${newStatus}, ${reason}, ${JSON.stringify(metadata)}::jsonb)
    `
  } catch { /* non-blocking */ }
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err: any) {
      console.error("[stripe/webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
  } else {
    try {
      event = JSON.parse(rawBody) as Stripe.Event
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
  }

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
// STEP 1-7: handleCheckoutCompleted
// ============================================================
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {}
  const now = new Date().toISOString()

  // ── Extract metadata ──────────────────────────────────────
  const bookingId       = meta.booking_id || null
  const clientName      = meta.client_name || session.customer_details?.name || "Guest"
  const clientEmail     = meta.client_email || session.customer_email || session.customer_details?.email || null
  const clientPhone     = meta.client_phone || session.customer_details?.phone || null
  const pickupLocation  = meta.pickup_location || meta.pickup_zone || "TBD"
  const dropoffLocation = meta.dropoff_location || meta.dropoff_zone || "TBD"
  const pickupZone      = meta.pickup_zone || null
  const dropoffZone     = meta.dropoff_zone || null
  const pickupDate      = meta.pickup_date || null
  const pickupTime      = meta.pickup_time || null
  const vehicleType     = meta.vehicle_type || "SUV"
  const fare            = Number(meta.fare || (session.amount_total ? session.amount_total / 100 : 0))
  const sourceCode      = meta.source_code || null
  const flightNumber    = meta.flight_number || null
  const notes           = meta.notes || null
  const passengers      = meta.passengers ? Number(meta.passengers) : null
  const luggage         = meta.luggage || null
  const tripType        = meta.trip_type || "oneway"
  const stripeSessionId = session.id
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null
  const pickupAt        = pickupDate && pickupTime ? `${pickupDate}T${pickupTime}:00+00` : null

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
  let sourceDriverEligible = false

  if (sourceCode) {
    try {
      const driverRows = await sql`
        SELECT id, status FROM drivers
        WHERE driver_code = ${sourceCode.toUpperCase()}
        LIMIT 1
      `
      if (driverRows.length > 0) {
        sourceDriverId = driverRows[0].id
        sourceDriverEligible = driverRows[0].status === "active"
      }
    } catch { /* non-blocking */ }
  }

  // ── STEP 4: Classify dispatch_status ─────────────────────
  // Rules:
  //   - source_code present AND driver is active → awaiting_source_owner
  //   - source_code present BUT driver not eligible → awaiting_sln_member
  //   - no source_code → awaiting_sln_member
  //   - corporate / hourly / manual → manual_dispatch_required
  const serviceType = meta.service_type || "transfer"
  let dispatchStatus: string
  let dispatchReason: string

  if (serviceType === "corporate" || serviceType === "hourly") {
    dispatchStatus = "manual_dispatch_required"
    dispatchReason = `service_type=${serviceType}`
  } else if (sourceCode && sourceDriverId && sourceDriverEligible) {
    dispatchStatus = "awaiting_source_owner"
    dispatchReason = `source_code=${sourceCode}, driver_eligible=true`
  } else if (sourceCode && sourceDriverId && !sourceDriverEligible) {
    dispatchStatus = "awaiting_sln_member"
    dispatchReason = `source_code=${sourceCode}, driver_eligible=false → fallback`
  } else {
    dispatchStatus = "awaiting_sln_member"
    dispatchReason = "no_source_code"
  }

  // ── STEP 2+3: Finalize booking with correct states ────────
  // payment_status = paid
  // status (booking_status) = pending_dispatch
  // dispatch_status = classified above
  let finalBookingId = bookingId

  // Offer timer: 120s for source_owner, 60s for sln_member
  const offerTimeoutSecs = dispatchStatus === "awaiting_source_owner" ? 120 : 60
  const offerExpiresAt = new Date(Date.now() + offerTimeoutSecs * 1000).toISOString()

  try {
    if (bookingId) {
      await sql`
        UPDATE bookings
        SET
          payment_status = 'paid',
          status = 'pending_dispatch',
          dispatch_status = ${dispatchStatus},
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
          paid_at, stripe_session_id, stripe_payment_intent,
          offer_expires_at, offer_stage, offer_status,
          created_at, updated_at
        ) VALUES (
          'paid', 'pending_dispatch', ${dispatchStatus},
          ${pickupLocation}, ${dropoffLocation}, ${pickupZone}, ${dropoffZone},
          ${pickupAt ? pickupAt : null}::timestamptz,
          ${vehicleType}, ${fare},
          ${clientId}::uuid,
          ${clientEmail}, ${clientPhone},
          ${flightNumber}, ${notes}, ${sourceCode},
          ${sourceDriverId ? `${sourceDriverId}::uuid` : null},
          ${passengers}, ${luggage}, ${tripType},
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
    booking_status: "pending_dispatch",
    payment_status: "paid",
  })

  // ── STEP 9: Audit log — dispatch_status_assigned ──────────
  await auditLog(finalBookingId!, "dispatch_status_assigned", {
    dispatch_status: dispatchStatus,
    reason: dispatchReason,
    source_code: sourceCode,
    source_driver_id: sourceDriverId,
    source_driver_eligible: sourceDriverEligible,
  })

  await dispatchLog(
    finalBookingId!,
    "not_required",
    dispatchStatus,
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
        status = 'pending_dispatch',
        dispatch_status = CASE
          WHEN dispatch_status = 'not_required' OR dispatch_status = 'pending' THEN 'awaiting_sln_member'
          ELSE dispatch_status
        END,
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
          await auditLog(bookingId, "source_owner_offer_sent", {
            driver_id: sourceDriverId,
            driver_code: sourceCode,
            driver_phone: driver.phone,
            channel: "sms",
            expires_in_secs: offerTimeoutSecs,
          })
        } else {
          const errText = await twilioRes.text()
          await auditLog(bookingId, "source_owner_offer_sms_failed", {
            driver_id: sourceDriverId,
            error: errText,
          })
        }
      } catch (smsErr: any) {
        console.error("[webhook] SMS offer failed:", smsErr.message)
        await auditLog(bookingId, "source_owner_offer_sms_failed", {
          driver_id: sourceDriverId,
          error: smsErr.message,
        })
      }
    } else {
      // No SMS configured — log that offer was queued (driver will see it in driver panel)
      await auditLog(bookingId, "source_owner_offer_queued", {
        driver_id: sourceDriverId,
        driver_code: sourceCode,
        note: "SMS not configured — offer visible in driver panel",
        expires_in_secs: offerTimeoutSecs,
      })
    }

    // Send email offer to driver if email is available
    if (driver.email) {
      try {
        await resend.emails.send({
          from: "SLN Dispatch <bookings@sottoventoluxuryride.com>",
          to: driver.email,
          subject: `🚗 New Ride Offer — #${bookingId.slice(0, 8).toUpperCase()} | $${fare.toFixed(2)}`,
          html: `
            <div style="font-family: monospace; background: #0a0a0a; color: #e5e5e5; padding: 24px; max-width: 600px;">
              <h2 style="color: #C9A84C; margin: 0 0 16px;">NEW RIDE OFFER</h2>
              <p style="color: #aaa;">Hi ${driver.full_name ?? "Driver"},</p>
              <p style="color: #aaa;">You have a new ride offer. You have <strong style="color: #C9A84C;">${offerTimeoutSecs} seconds</strong> to accept.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="color: #666; padding: 6px 0;">Booking ID</td><td style="color: #fff;">#${bookingId.slice(0, 8).toUpperCase()}</td></tr>
                <tr><td style="color: #666; padding: 6px 0;">Pickup</td><td style="color: #fff;">${pickupLocation}</td></tr>
                <tr><td style="color: #666; padding: 6px 0;">Drop-off</td><td style="color: #fff;">${dropoffLocation}</td></tr>
                <tr><td style="color: #666; padding: 6px 0;">Date & Time</td><td style="color: #fff;">${pickupFormatted}</td></tr>
                <tr><td style="color: #666; padding: 6px 0;">Vehicle</td><td style="color: #fff;">${vehicleType}</td></tr>
                <tr><td style="color: #666; padding: 6px 0;">Fare</td><td style="color: #C9A84C; font-size: 18px; font-weight: bold;">$${fare.toFixed(2)}</td></tr>
              </table>
              <div style="margin-top: 20px;">
                <a href="https://sottoventoluxuryride.com/driver" style="background: #C9A84C; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View in Driver Panel</a>
              </div>
            </div>
          `,
        })
      } catch (emailErr: any) {
        console.error("[webhook] driver offer email failed:", emailErr.message)
      }
    }
  } catch (err: any) {
    console.error("[webhook] triggerSourceOwnerOffer failed:", err.message)
  }
}

// ============================================================
// NOTIFICATIONS: Client + Admin
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
  dispatchStatus: string
  sourceCode: string | null
}) {
  const {
    bookingId, clientName, clientEmail, clientPhone,
    pickupLocation, dropoffLocation, pickupDate, pickupTime,
    vehicleType, fare, flightNumber, notes,
    dispatchStatus, sourceCode,
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

      await auditLog(bookingId, "client_email_sent", { to: clientEmail })
    } catch (err: any) {
      console.error("[webhook] client email failed:", err.message)
      await auditLog(bookingId, "client_email_failed", { to: clientEmail, error: err.message })
    }
  }

  // ── Admin alert email ─────────────────────────────────────
  const dispatchBadge: Record<string, string> = {
    awaiting_source_owner: "🟡 SOURCE OWNER",
    awaiting_sln_member: "🟠 SLN MEMBER",
    manual_dispatch_required: "🔴 MANUAL",
  }

  try {
    await resend.emails.send({
      from: "SLN System <bookings@sottoventoluxuryride.com>",
      to: "contact@sottoventoluxuryride.com",
      subject: `🔔 NEW PAID BOOKING — ${clientName} | ${pickupLocation} → ${dropoffLocation} | $${fare}`,
      html: `
        <div style="font-family: monospace; background: #0a0a0a; color: #e5e5e5; padding: 24px; max-width: 600px;">
          <h2 style="color: #C9A84C; margin: 0 0 8px;">NEW PAID BOOKING</h2>
          <p style="color: #888; margin: 0 0 20px;">Dispatch: <strong style="color: #fff;">${dispatchBadge[dispatchStatus] ?? dispatchStatus}</strong>${sourceCode ? ` | Source: <strong style="color: #C9A84C;">${sourceCode}</strong>` : ""}</p>
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
          <div style="margin-top: 20px; display: flex; gap: 12px;">
            <a href="https://sottoventoluxuryride.com/admin" style="background: #C9A84C; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View in Admin</a>
            <a href="https://sottoventoluxuryride.com/admin/dispatch" style="background: #333; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Open Dispatch</a>
          </div>
        </div>
      `,
    })

    await auditLog(bookingId, "admin_email_sent", { to: "contact@sottoventoluxuryride.com" })
  } catch (err: any) {
    console.error("[webhook] admin alert email failed:", err.message)
    await auditLog(bookingId, "admin_email_failed", { error: err.message })
  }
}
