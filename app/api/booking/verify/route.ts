import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { neon } from "@neondatabase/serverless"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder")
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// GET /api/booking/verify?session_id=cs_xxx
//
// Called by the confirmation page to verify the booking was
// persisted after Stripe payment.
//
// Returns:
//   { verified: true, booking: {...} }
//   { verified: false, reason: "..." }
// ============================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("session_id")

  if (!sessionId) {
    return NextResponse.json({ verified: false, reason: "No session_id provided" }, { status: 400 })
  }

  try {
    // ── 1. Verify with Stripe that payment actually succeeded ─
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      return NextResponse.json({
        verified: false,
        reason: `Payment not completed. Status: ${session.payment_status}`,
      })
    }

    // ── 2. Check if booking was persisted in DB ───────────────
    // Try by stripe_session_id first
    let bookingRows = await sql`
      SELECT
        id, status, pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        client_email, client_phone_raw, paid_at,
        stripe_session_id
      FROM bookings
      WHERE stripe_session_id = ${sessionId}
      LIMIT 1
    `.catch(() => [])

    // If not found by session_id, try by booking_id from metadata
    if (bookingRows.length === 0 && session.metadata?.booking_id) {
      bookingRows = await sql`
        SELECT
          id, status, pickup_address, dropoff_address,
          pickup_at, vehicle_type, total_price,
          client_email, client_phone_raw, paid_at,
          stripe_session_id
        FROM bookings
        WHERE id = ${session.metadata.booking_id}::uuid
        LIMIT 1
      `.catch(() => [])
    }

    if (bookingRows.length === 0) {
      // Webhook hasn't fired yet — return Stripe data as fallback
      const meta = session.metadata ?? {}
      return NextResponse.json({
        verified: true,
        source: "stripe_fallback",
        booking: {
          booking_id: meta.booking_id || null,
          client_name: meta.client_name || session.customer_details?.name || "Guest",
          client_email: meta.client_email || session.customer_email || null,
          pickup_location: meta.pickup_location || meta.pickup_zone || "TBD",
          dropoff_location: meta.dropoff_location || meta.dropoff_zone || "TBD",
          pickup_date: meta.pickup_date || null,
          pickup_time: meta.pickup_time || null,
          vehicle_type: meta.vehicle_type || "Sedan",
          fare: Number(meta.fare || (session.amount_total ? session.amount_total / 100 : 0)),
          status: "pending",
          paid: true,
        },
      })
    }

    const b = bookingRows[0]
    return NextResponse.json({
      verified: true,
      source: "database",
      booking: {
        booking_id: b.id,
        client_email: b.client_email,
        pickup_location: b.pickup_address,
        dropoff_location: b.dropoff_address,
        pickup_datetime: b.pickup_at,
        vehicle_type: b.vehicle_type,
        fare: Number(b.total_price),
        status: b.status,
        paid_at: b.paid_at,
        paid: true,
      },
    })
  } catch (err: any) {
    console.error("[booking/verify]", err.message)
    return NextResponse.json({ verified: false, reason: err.message }, { status: 500 })
  }
}
