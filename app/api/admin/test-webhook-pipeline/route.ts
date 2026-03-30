export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/admin/test-webhook-pipeline
 *
 * Simulates the post-payment pipeline for a specific booking.
 * ONLY for testing — requires admin auth header.
 *
 * Body: { booking_id: string }
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-key")
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { booking_id } = await req.json()
  if (!booking_id) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 })
  }

  const steps: string[] = []

  try {
    // Get booking
    const rows = await sql`
      SELECT b.*, c.full_name AS client_name
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      WHERE b.id = ${booking_id}::uuid
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = rows[0]
    steps.push(`Found booking: ${booking.id?.slice(0, 8)} | status=${booking.status} | dispatch=${booking.dispatch_status}`)

    // Classify dispatch_status
    let dispatchStatus = "awaiting_sln_member"
    let dispatchReason = "no_source_code"

    if (booking.source_code && booking.source_driver_id) {
      const driverRows = await sql`SELECT id, status FROM drivers WHERE id = ${booking.source_driver_id}::uuid LIMIT 1`
      if (driverRows.length > 0 && driverRows[0].status === "active") {
        dispatchStatus = "awaiting_source_owner"
        dispatchReason = `source_code=${booking.source_code}, driver_active=true`
      } else {
        dispatchReason = `source_code=${booking.source_code}, driver_not_active → fallback`
      }
    }

    steps.push(`Dispatch classification: ${dispatchStatus} (${dispatchReason})`)

    const offerTimeoutSecs = dispatchStatus === "awaiting_source_owner" ? 120 : 60
    const offerExpiresAt = new Date(Date.now() + offerTimeoutSecs * 1000).toISOString()

    // Update booking
    await sql`
      UPDATE bookings
      SET
        payment_status = 'paid',
        status = 'pending_dispatch',
        dispatch_status = ${dispatchStatus},
        paid_at = NOW(),
        offer_expires_at = ${offerExpiresAt}::timestamptz,
        offer_stage = ${dispatchStatus === "awaiting_source_owner" ? "source_owner" : "sln_member"},
        offer_status = 'pending',
        updated_at = NOW()
      WHERE id = ${booking_id}::uuid
    `
    steps.push(`Booking updated: payment_status=paid, status=pending_dispatch, dispatch_status=${dispatchStatus}`)

    // Send admin email
    try {
      await resend.emails.send({
        from: "SLN System <bookings@sottoventoluxuryride.com>",
        to: "contact@sottoventoluxuryride.com",
        subject: `TEST PIPELINE — Booking #${booking_id.slice(0, 8).toUpperCase()} | ${dispatchStatus}`,
        html: `
          <div style="font-family: monospace; background: #0a0a0a; color: #e5e5e5; padding: 24px; max-width: 600px;">
            <h2 style="color: #C9A84C;">TEST PIPELINE SIMULATION</h2>
            <p style="color: #aaa;">This is a test of the post-payment dispatch pipeline.</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="color: #666; padding: 6px 0;">Booking ID</td><td style="color: #fff;">${booking_id}</td></tr>
              <tr><td style="color: #666; padding: 6px 0;">Dispatch Status</td><td style="color: #C9A84C;">${dispatchStatus}</td></tr>
              <tr><td style="color: #666; padding: 6px 0;">Reason</td><td style="color: #fff;">${dispatchReason}</td></tr>
              <tr><td style="color: #666; padding: 6px 0;">Offer Expires</td><td style="color: #fff;">${offerExpiresAt}</td></tr>
            </table>
            <p style="color: #555; margin-top: 16px; font-size: 12px;">Steps: ${steps.join(" | ")}</p>
          </div>
        `,
      })
      steps.push("Admin email sent to contact@sottoventoluxuryride.com")
    } catch (emailErr: any) {
      steps.push(`Admin email failed: ${emailErr.message}`)
    }

    // Verify final state
    const finalRows = await sql`
      SELECT id, status, dispatch_status, payment_status, offer_expires_at, offer_stage
      FROM bookings WHERE id = ${booking_id}::uuid
    `
    const final = finalRows[0]
    steps.push(`Final state: status=${final.status} | dispatch=${final.dispatch_status} | payment=${final.payment_status}`)

    return NextResponse.json({
      success: true,
      steps,
      final_state: final,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, steps }, { status: 500 })
  }
}
