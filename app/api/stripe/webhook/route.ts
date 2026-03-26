import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"
import { lockCommission } from "@/lib/dispatch/commission-engine"
import { resolveLeadOrigin, lockLeadOrigin } from "@/lib/dispatch/lead-origin"

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

  // Determine initial booking status.
  // RULE: driver-captured bookings (tablet/QR) with payment confirmed are operationally valid.
  // They must NEVER be classified as needs_review if the following critical fields are present:
  //   payment_status = paid, captured_by_driver_code != null/public_site,
  //   pickup_location EXISTS, dropoff_location EXISTS, pickup_at EXISTS, vehicle_type EXISTS.
  // For driver-captured bookings, missing email or phone is acceptable — driver captured the lead.
  // For public_site bookings, all fields must be present for ready_for_dispatch.
  const capturedByRaw = (metadata.captured_by || metadata.source_code || '').trim().toUpperCase()
  const isDriverCaptured = !!(capturedByRaw && capturedByRaw !== 'PUBLIC_SITE')

  // Critical fields for public_site bookings (strict).
  // FIX: bookings pre-created via tablet use pickup_at stored in DB, not pickupDate/pickupTime in metadata.
  // Accept (pickupDate && pickupTime) OR pickup_at (derived below as pickupAt) as valid date evidence.
  // pickupAt is computed after this block, so we check the raw metadata values here directly.
  const hasPickupTime = !!(pickupDate && pickupTime) || !!(metadata.pickup_at)
  const hasRequiredFields = !!(clientName && clientPhone && clientEmail && pickupLocation && dropoffLocation && vehicleType && hasPickupTime)

  // Critical fields for driver-captured bookings (relaxed — driver already validated the lead)
  // pickup_at may be in DB already (pre-created booking path) even if pickupDate metadata is empty
  const hasDriverCapturedCriticalFields = !!(pickupLocation && dropoffLocation && vehicleType)

  // BYPASS: driver-captured + paid + critical fields present → offer_pending, never needs_review
  const isDriverCapturedBypass = isDriverCaptured && hasDriverCapturedCriticalFields

  const initialBookingStatus = isDriverCapturedBypass
    ? 'offer_pending'   // driver-captured: go straight to offer_pending
    : hasRequiredFields
      ? 'ready_for_dispatch'
      : 'needs_review'

  console.log('[webhook] booking classification:', JSON.stringify({
    isDriverCaptured,
    isDriverCapturedBypass,
    hasRequiredFields,
    hasPickupTime,
    hasDriverCapturedCriticalFields,
    initialBookingStatus,
    captured_by: capturedByRaw,
    pickup_date_meta: pickupDate || '(empty)',
    pickup_time_meta: pickupTime || '(empty)',
    pickup_at_meta: metadata.pickup_at || '(empty)',
  }))

  const now = new Date().toISOString()
  const offerTimeoutSecs = 120
  const offerExpiresAt = new Date(Date.now() + offerTimeoutSecs * 1000).toISOString()
  const pickupAt = pickupDate && pickupTime ? `${pickupDate}T${pickupTime}:00+00` : null

  let finalBookingId = bookingId

   // ── STEP 2: Finalize Booking in DB ────────────────────
  try {
    if (bookingId) {
      // AUDIT: read current booking state before update to detect blocking conditions
      let preUpdateStatus: string | null = null
      try {
        const [preState] = await sql`
          SELECT status, dispatch_status, payment_status, assigned_driver_id, captured_by_driver_code
          FROM bookings WHERE id = ${bookingId}::uuid LIMIT 1
        `
        preUpdateStatus = preState?.status ?? null
        console.log('[webhook] STEP2 pre-update state:', JSON.stringify({
          booking_id: bookingId,
          status: preState?.status,
          dispatch_status: preState?.dispatch_status,
          payment_status: preState?.payment_status,
          assigned_driver_id: preState?.assigned_driver_id,
          captured_by_driver_code: preState?.captured_by_driver_code,
        }))
      } catch { /* non-blocking */ }

      // FIXED: Expanded status condition to include 'new' and any pre-payment state.
      // Previously, if the booking was already in 'new' status (e.g., from a retry or
      // race condition), the UPDATE silently skipped and finalBookingId pointed to a
      // booking that was NOT updated with payment_status='paid'.
      // The auto-assign block then ran on an unfinalized booking.
      const updateResult = await sql`
        UPDATE bookings
        SET
          payment_status = 'paid',
          status = 'new',
          dispatch_status = ${initialBookingStatus},
          booking_origin = ${metadata.tablet_code ? 'tablet' : (metadata.booking_origin || 'website')},
          lead_source = ${metadata.tablet_code ? 'tablet' : (metadata.booking_origin || 'website')},
          captured_by_driver_code = ${metadata.captured_by || metadata.source_code || 'public_site'},
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
          AND status IN ('pending_payment', 'pending', 'pending_dispatch', 'new')
          AND payment_status != 'paid'
        RETURNING id, status, dispatch_status
      `

      if (updateResult.length === 0) {
        // Booking was NOT updated — either already paid (idempotent) or status mismatch
        // Read current state to determine which case
        const [currentState] = await sql`
          SELECT status, dispatch_status, payment_status, assigned_driver_id
          FROM bookings WHERE id = ${bookingId}::uuid LIMIT 1
        `
        console.log('[webhook] STEP2 UPDATE skipped — current state:', JSON.stringify({
          booking_id: bookingId,
          pre_status: preUpdateStatus,
          current_status: currentState?.status,
          current_dispatch: currentState?.dispatch_status,
          current_payment: currentState?.payment_status,
          current_assigned: currentState?.assigned_driver_id,
        }))
        if (currentState?.payment_status === 'paid') {
          // Already processed — idempotent, continue to auto-assign check
          console.log('[webhook] STEP2: booking already paid, proceeding to auto-assign check')
        } else {
          // Status mismatch — booking in unexpected state, log and continue
          console.warn('[webhook] STEP2 WARNING: booking not updated, unexpected status:', currentState?.status, 'for booking:', bookingId)
          await auditLog(bookingId, 'webhook_step2_skipped', {
            pre_status: preUpdateStatus,
            current_status: currentState?.status,
            current_payment: currentState?.payment_status,
            stripe_session: stripeSessionId,
          })
        }
      } else {
        console.log('[webhook] STEP2 SUCCESS: booking finalized:', JSON.stringify({
          booking_id: bookingId,
          new_status: updateResult[0]?.status,
          new_dispatch: updateResult[0]?.dispatch_status,
        }))
      }
    } else {
      const newBooking = await sql`
        INSERT INTO bookings (
          payment_status, status, dispatch_status,
          pickup_address, dropoff_address, pickup_zone, dropoff_zone, pickup_at,
          vehicle_type, total_price,
          client_id, client_email, client_phone_raw,
          flight_number, notes, source_code, source_driver_id,
          passengers, luggage, trip_type,
          booking_origin, lead_source, captured_by_driver_code,
          paid_at, stripe_session_id, stripe_payment_intent,
          offer_expires_at, offer_stage, offer_status,
          created_at, updated_at
        ) VALUES (
          'paid', 'new', ${initialBookingStatus},
          ${pickupLocation}, ${dropoffLocation}, ${pickupZone}, ${dropoffZone},
          ${pickupAt ? pickupAt : null}::timestamptz,
          ${vehicleType}, ${fare},
          ${clientId}::uuid,
          ${clientEmail}, ${clientPhone},
          ${flightNumber}, ${notes}, ${sourceCode},
          ${sourceDriverId ? `${sourceDriverId}::uuid` : null},
          ${passengers}, ${luggage}, ${tripType},
          ${metadata.tablet_code ? 'tablet' : (metadata.booking_origin || 'website')},
          ${metadata.tablet_code ? 'tablet' : (metadata.booking_origin || 'website')},
          ${metadata.captured_by || metadata.source_code || 'public_site'},
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

  // ── STEP 9b: Lock lead origin ─────────────────────────────
  // Resolve and persist commercial source at booking creation time (spec §4).
  // Non-blocking — failure must NOT block booking or payment.
  try {
    const origin = resolveLeadOrigin({
      ref_code: sourceCode ?? undefined,
      tablet_id: metadata.tablet_code ?? undefined,
      source_driver_id: sourceDriverId ?? undefined,
      booking_origin: metadata.booking_origin ?? undefined,
      captured_by: metadata.captured_by ?? undefined,
      utm_source: metadata.utm_source ?? undefined,
      utm_campaign: metadata.utm_campaign ?? undefined,
      utm_medium: metadata.utm_medium ?? undefined,
      landing_page: metadata.landing_page ?? undefined,
      extra_metadata: {
        stripe_session_id: stripeSessionId,
        client_email: clientEmail,
      },
    })
    await lockLeadOrigin(finalBookingId!, origin)
    console.log('[webhook] lead origin locked:', origin.source_type, origin.source_reference)
  } catch (originErr: any) {
    console.error('[webhook] lead origin lock failed (non-blocking):', originErr.message)
  }

  // ── STEP 9: Audit log — dispatch_status_assigned ──────────
  await auditLog(finalBookingId!, "dispatch_status_assigned", {
    dispatch_status: initialBookingStatus, // corrected: reflects actual written value
    reason: dispatchReason,
    source_code: sourceCode,
    source_driver_id: sourceDriverId,
    source_driver_eligible: sourceDriverEligible,
  })

  await dispatchLog(
    finalBookingId!,
    "not_required",
    initialBookingStatus, // corrected: reflects actual written value
    `payment_confirmed: ${dispatchReason}`,
    { stripe_session_id: stripeSessionId, fare, source_code: sourceCode }
  )

  // ── AUTO-ASSIGN: Capturing driver (tablet/QR bookings) ──────
  // Business rule: if booking was captured by a specific driver (tablet/QR/referral),
  // immediately assign it to that driver as an offer_pending without admin intervention.
  // Runs AFTER booking is finalized. Must NOT override an existing manual assignment.
  //
  // FIXED: Use TRIM + UPPER for case-insensitive, whitespace-safe matching.
  // FIXED: Removed pickupDate as a blocking gate — booking may have pickup_at in DB
  //        even if pickupDate metadata is empty (pre-created booking path).
  // FIXED: Fallback to reading captured_by_driver_code directly from DB to handle
  //        cases where metadata.captured_by was not forwarded correctly by frontend.
  const capturedByCode = (metadata.captured_by || metadata.source_code || '').trim()
  const capturedByCodeNormalized = capturedByCode.toUpperCase()

  // Determine if this booking has a valid capturing driver code
  // Also check the DB directly in case metadata was incomplete
  let resolvedCapturedByCode = capturedByCodeNormalized
  if (!resolvedCapturedByCode || resolvedCapturedByCode === 'PUBLIC_SITE') {
    // Fallback: read captured_by_driver_code from the DB record
    try {
      const [dbBooking] = await sql`
        SELECT captured_by_driver_code FROM bookings
        WHERE id = ${finalBookingId}::uuid LIMIT 1
      `
      const dbCode = (dbBooking?.captured_by_driver_code || '').trim().toUpperCase()
      if (dbCode && dbCode !== 'PUBLIC_SITE') {
        resolvedCapturedByCode = dbCode
        console.log('[webhook] auto-assign: resolved captured_by from DB:', resolvedCapturedByCode)
      }
    } catch { /* non-blocking */ }
  }

  // CRITICAL FIX: pickupLocation from metadata may be an empty string "" which evaluates
  // to false in JS, silently blocking auto-assign even when pickup_address is in the DB.
  // Solution: trim and check, then fall back to reading from the DB record if empty.
  let resolvedPickupLocation = (pickupLocation ?? '').trim()
  let resolvedDropoffLocation = (dropoffLocation ?? '').trim()

  if ((!resolvedPickupLocation || !resolvedDropoffLocation) && finalBookingId) {
    try {
      const [dbAddr] = await sql`
        SELECT pickup_address, dropoff_address FROM bookings
        WHERE id = ${finalBookingId}::uuid LIMIT 1
      `
      if (!resolvedPickupLocation && dbAddr?.pickup_address) {
        resolvedPickupLocation = (dbAddr.pickup_address ?? '').trim()
        console.log('[webhook] auto-assign: resolved pickup_address from DB:', resolvedPickupLocation)
      }
      if (!resolvedDropoffLocation && dbAddr?.dropoff_address) {
        resolvedDropoffLocation = (dbAddr.dropoff_address ?? '').trim()
        console.log('[webhook] auto-assign: resolved dropoff_address from DB:', resolvedDropoffLocation)
      }
    } catch { /* non-blocking */ }
  }

  if (
    finalBookingId &&
    resolvedCapturedByCode &&
    resolvedCapturedByCode !== 'PUBLIC_SITE' &&
    resolvedPickupLocation &&
    resolvedDropoffLocation
    // NOTE: pickupDate is NOT required here — pickup_at may already be in DB
    // NOTE: clientPhone is NOT required here — already validated in hasRequiredFields
  ) {
    console.log('[webhook] auto-assign: attempting for captured_by_code:', resolvedCapturedByCode, 'booking:', finalBookingId)
    try {
      const [capturingDriver] = await sql`
        SELECT id, full_name, driver_status FROM drivers
        WHERE UPPER(TRIM(driver_code)) = ${resolvedCapturedByCode}
        LIMIT 1
      `

      if (!capturingDriver) {
        console.warn('[webhook] auto-assign: driver not found for code:', resolvedCapturedByCode)
        await auditLog(finalBookingId!, 'auto_assign_driver_not_found', {
          captured_by_code: resolvedCapturedByCode,
          reason: 'no_driver_matching_code',
        })
      } else if (capturingDriver.driver_status !== 'active') {
        console.warn('[webhook] auto-assign: driver found but not active:', resolvedCapturedByCode, 'status:', capturingDriver.driver_status)
        await auditLog(finalBookingId!, 'auto_assign_driver_not_active', {
          captured_by_code: resolvedCapturedByCode,
          driver_id: capturingDriver.id,
          driver_status: capturingDriver.driver_status,
        })
      } else {
        // Driver found and active — proceed with atomic assignment
        // spec §3: set offered_driver_id = source_driver_id on initial offer
        const updateResult = await sql`
          UPDATE bookings
          SET
            assigned_driver_id = ${capturingDriver.id}::uuid,
            offered_driver_id  = ${capturingDriver.id}::uuid,
            status             = 'assigned',
            dispatch_status    = 'offer_pending',
            updated_at         = NOW()
          WHERE id = ${finalBookingId}::uuid
            AND assigned_driver_id IS NULL
          RETURNING id
        `

        if (updateResult.length === 0) {
          console.warn('[webhook] auto-assign: booking already assigned, skipping offer creation for', finalBookingId)
        } else {
          // Create dispatch_offer record so driver panel can show Accept/Reject
          await sql`
            INSERT INTO dispatch_offers (
              booking_id, driver_id, offer_round,
              is_source_offer, response, sent_at, expires_at
            ) VALUES (
              ${finalBookingId}::uuid,
              ${capturingDriver.id}::uuid,
              1,
              true,
              'pending',
              NOW(),
              NOW() + interval '15 minutes'  -- source-driver exclusive window
            )
            ON CONFLICT DO NOTHING
          `

          // ── Commission Engine v1.0: create pending commission row on payment ──
          // At this point executor is not yet known (offer pending).
          // lockCommission will be called again on accept (idempotent).
          // We create the row now so finance queries always have a record.
          try {
            await sql`
              INSERT INTO commissions (
                booking_id, source_driver_id,
                executor_pct, source_pct, platform_pct,
                total_amount, status
              ) VALUES (
                ${finalBookingId}::uuid,
                ${capturingDriver.id}::uuid,
                65, 15, 20,
                (SELECT total_price FROM bookings WHERE id = ${finalBookingId}::uuid LIMIT 1),
                'pending'
              )
              ON CONFLICT (booking_id) DO NOTHING
            `
          } catch (commErr: any) {
            // Non-blocking — commission row creation failure must not block booking
            console.error('[webhook] commission row creation failed:', commErr.message)
          }

          await auditLog(finalBookingId!, 'auto_assigned_capturing_driver', {
            driver_id: capturingDriver.id,
            driver_name: capturingDriver.full_name,
            captured_by_code: resolvedCapturedByCode,
            dispatch_status: 'offer_pending',
          })
          console.log('[webhook] auto-assign SUCCESS: driver', capturingDriver.full_name, '(', capturingDriver.id, ') assigned to booking', finalBookingId)
        }
      }
    } catch (autoAssignErr: any) {
      // Auto-assign failure must never block the booking confirmation
      console.error('[webhook] auto-assign capturing driver failed:', autoAssignErr.message)
      await auditLog(finalBookingId!, 'auto_assign_error', {
        captured_by_code: resolvedCapturedByCode,
        error: autoAssignErr.message,
      })
    }
  } else {
    console.log('[webhook] auto-assign: skipped —', JSON.stringify({
      reason: !resolvedCapturedByCode || resolvedCapturedByCode === 'PUBLIC_SITE'
        ? 'no_valid_captured_by_code'
        : !resolvedPickupLocation
          ? 'pickup_location_empty_after_db_fallback'
          : 'dropoff_location_empty_after_db_fallback',
      raw_captured_by: capturedByCode,
      resolved_captured_by: resolvedCapturedByCode,
      pickup_resolved: resolvedPickupLocation || '(empty)',
      dropoff_resolved: resolvedDropoffLocation || '(empty)',
      booking: finalBookingId,
    }))
  }

  // AUDIT: Read final booking state after auto-assign to confirm persistence
  // This log is the definitive check: if status/dispatch_status differ from expected,
  // it means something between STEP 2 and here overwrote the state.
  try {
    const [finalState] = await sql`
      SELECT status, dispatch_status, payment_status, assigned_driver_id, captured_by_driver_code
      FROM bookings WHERE id = ${finalBookingId}::uuid LIMIT 1
    `
    console.log('[webhook] FINAL STATE after auto-assign:', JSON.stringify({
      booking_id: finalBookingId,
      status: finalState?.status,
      dispatch_status: finalState?.dispatch_status,
      payment_status: finalState?.payment_status,
      assigned_driver_id: finalState?.assigned_driver_id,
      captured_by: finalState?.captured_by_driver_code,
    }))
    await auditLog(finalBookingId!, 'webhook_final_state', {
      status: finalState?.status,
      dispatch_status: finalState?.dispatch_status,
      payment_status: finalState?.payment_status,
      assigned_driver_id: finalState?.assigned_driver_id,
      captured_by: finalState?.captured_by_driver_code,
    })
  } catch { /* non-blocking */ }

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
        booking_origin = 'public_website', -- This is a fallback, usually metadata is present
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
