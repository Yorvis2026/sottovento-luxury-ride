export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// POST /api/driver/send-sms
// body: { booking_id, driver_id, message_type: "arrived" | "custom", custom_message?: string }
//
// SMS is sent via Twilio if TWILIO_* env vars are configured.
// If not configured, the API returns success but logs the message only.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { booking_id, driver_id, message_type, custom_message } = body

    if (!booking_id || !driver_id) {
      return NextResponse.json({ error: "booking_id and driver_id are required" }, { status: 400 })
    }

    // Get booking + passenger phone
    const bookingRows = await sql`
      SELECT b.id, b.status, b.client_phone, b.pickup_address, b.client_name,
             d.full_name as driver_name
      FROM bookings b
      JOIN drivers d ON d.id = ${driver_id}
      WHERE b.id = ${booking_id}
      LIMIT 1
    `

    if (!bookingRows || bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookingRows[0]
    const phone = booking.client_phone

    if (!phone) {
      return NextResponse.json({ error: "No phone number for passenger" }, { status: 400 })
    }

    // Build message
    let message = custom_message ?? ""
    if (message_type === "arrived") {
      message = `Hi ${booking.client_name ?? "there"}, your Sottovento driver ${booking.driver_name} has arrived at your pickup location. Please come out when ready.`
    } else if (message_type === "en_route") {
      message = `Hi ${booking.client_name ?? "there"}, your Sottovento driver ${booking.driver_name} is on the way to pick you up.`
    } else if (message_type === "custom" && !custom_message) {
      return NextResponse.json({ error: "custom_message required for type=custom" }, { status: 400 })
    }

    // Try Twilio if configured
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER

    let smsSent = false
    let smsError: string | null = null

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
        const formData = new URLSearchParams({
          To: phone,
          From: twilioFrom,
          Body: message,
        })
        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        })
        const twilioData = await twilioRes.json()
        if (twilioData.sid) {
          smsSent = true
        } else {
          smsError = twilioData.message ?? "Twilio error"
        }
      } catch (e: unknown) {
        smsError = e instanceof Error ? e.message : "Twilio fetch error"
      }
    } else {
      // No Twilio configured — log only (dev mode)
      console.log(`[SMS] To: ${phone} | Message: ${message}`)
      smsSent = true // treat as success in dev
    }

    // Log to audit_logs
    try {
      await sql`
        INSERT INTO audit_logs (booking_id, action, actor_id, actor_type, notes, created_at)
        VALUES (
          ${booking_id},
          'sms_sent',
          ${driver_id},
          'driver',
          ${`type=${message_type} | sent=${smsSent} | to=${phone.slice(0, 6)}*** | msg=${message.slice(0, 80)}`},
          NOW()
        )
      `
    } catch {
      // audit log failure is non-critical
    }

    if (!smsSent && smsError) {
      return NextResponse.json({ error: smsError }, { status: 500 })
    }

    return NextResponse.json({ success: true, sent: smsSent, phone: phone.slice(0, 6) + "***" })
  } catch (err: unknown) {
    console.error("[send-sms] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
