export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_EMAIL = "contact@sottoventoluxuryride.com"
const FROM_EMAIL  = "SLN System <bookings@sottoventoluxuryride.com>"

// ============================================================
// POST /api/driver/report
// Driver-side recovery actions for incomplete ride data.
//
// Body:
//   booking_id  : string (UUID)
//   driver_code : string
//   action      : "report_incomplete" | "request_correction" | "return_to_dispatch" | "reject_ride"
//   missing_fields?: string[]   (optional, for report_incomplete)
//   note?       : string        (optional, driver note)
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { booking_id, driver_code, action, missing_fields, note } = body

    if (!booking_id || !driver_code || !action) {
      return NextResponse.json({ error: "booking_id, driver_code, and action are required" }, { status: 400 })
    }

    // ── Fetch booking + driver ──────────────────────────────
    const bookingRows = await sql`
      SELECT
        b.id, b.status, b.dispatch_status, b.pickup_at, b.pickup_address,
        b.dropoff_address, b.vehicle_type, b.total_price, b.assigned_driver_id,
        c.full_name AS client_name, c.phone AS client_phone,
        d.full_name AS driver_name, d.driver_code AS d_code
      FROM bookings b
      LEFT JOIN clients c ON c.id = b.client_id
      LEFT JOIN drivers d ON d.id = b.assigned_driver_id
      WHERE b.id = ${booking_id}::uuid
      LIMIT 1
    `
    if (bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }
    const booking = bookingRows[0]

    // Verify driver owns this booking
    if ((booking.d_code ?? "").toUpperCase() !== driver_code.toUpperCase()) {
      return NextResponse.json({ error: "Driver not authorized for this booking" }, { status: 403 })
    }

    const bookingRef = booking_id.slice(0, 8).toUpperCase()
    const driverName = booking.driver_name ?? driver_code
    const missingList = (missing_fields ?? []).join(", ") || "unspecified"
    const driverNote  = note ? `<br><strong>Driver note:</strong> ${note}` : ""

    // ── Handle each action ──────────────────────────────────

    if (action === "return_to_dispatch") {
      // Transition: accepted/assigned → pending_dispatch
      const currentStatus = booking.status
      if (!["accepted", "assigned"].includes(currentStatus)) {
        return NextResponse.json({ error: `Cannot return to dispatch from status: ${currentStatus}` }, { status: 422 })
      }

      await sql`
        UPDATE bookings
        SET
          status            = 'pending_dispatch',
          dispatch_status   = 'manual_dispatch_required',
          assigned_driver_id = NULL,
          updated_at        = NOW()
        WHERE id = ${booking_id}::uuid
      `

      // Audit log
      try {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES ('booking', ${booking_id}::uuid, 'driver_returned_to_dispatch',
            ${JSON.stringify({ driver_code, previous_status: currentStatus, reason: note ?? "incomplete_data" })}::jsonb,
            NOW())
        `
      } catch { /* non-blocking */ }

      // Notify admin
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `⚠️ Ride Returned to Dispatch — Booking #${bookingRef}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 24px; border-radius: 12px;">
              <h2 style="color: #C8A96A; margin-top: 0;">Ride Returned to Dispatch</h2>
              <p>Driver <strong>${driverName}</strong> (${driver_code}) has returned booking <strong>#${bookingRef}</strong> to manual dispatch.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Booking ID</td><td style="padding: 6px 0;">${booking_id}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Previous Status</td><td style="padding: 6px 0;">${currentStatus}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">New Status</td><td style="padding: 6px 0; color: #f59e0b;">pending_dispatch / manual_dispatch_required</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Route</td><td style="padding: 6px 0;">${booking.pickup_address ?? "?"} → ${booking.dropoff_address ?? "?"}</td></tr>
              </table>
              ${driverNote ? `<p style="color: #fca5a5;">${driverNote}</p>` : ""}
              <p style="color: #f59e0b; font-weight: bold;">Action required: Reassign this ride from the Dispatch panel.</p>
            </div>
          `,
        })
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true, action, new_status: "pending_dispatch" })
    }

    if (action === "report_incomplete") {
      // Release driver assignment + move to Driver Issue bucket
      await sql`
        UPDATE bookings
        SET
          dispatch_status    = 'needs_correction',
          assigned_driver_id = NULL,
          updated_at         = NOW()
        WHERE id = ${booking_id}::uuid
      `
      // Audit log
      try {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES ('booking', ${booking_id}::uuid, 'driver_reported_incomplete',
            ${JSON.stringify({ driver_code, missing_fields: missing_fields ?? [], note })}::jsonb,
            NOW())
        `
      } catch { /* non-blocking */ }

      // Notify admin
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `🚨 Incomplete Booking Data Reported — #${bookingRef}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 24px; border-radius: 12px;">
              <h2 style="color: #ef4444; margin-top: 0;">Incomplete Booking Data Reported</h2>
              <p>Driver <strong>${driverName}</strong> (${driver_code}) has reported that booking <strong>#${bookingRef}</strong> is missing required data.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Booking ID</td><td style="padding: 6px 0;">${booking_id}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Missing Fields</td><td style="padding: 6px 0; color: #fca5a5;"><strong>${missingList}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Client</td><td style="padding: 6px 0;">${booking.client_name ?? "?"} · ${booking.client_phone ?? "?"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Route</td><td style="padding: 6px 0;">${booking.pickup_address ?? "?"} → ${booking.dropoff_address ?? "?"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Pickup Time</td><td style="padding: 6px 0;">${booking.pickup_at ?? "MISSING"}</td></tr>
              </table>
              ${driverNote ? `<p style="color: #fca5a5;">${driverNote}</p>` : ""}
              <p style="color: #ef4444; font-weight: bold;">Action required: Edit the booking in the admin panel and re-assign the driver.</p>
            </div>
          `,
        })
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true, action, notified: true })
    }

    if (action === "request_correction") {
      // Release driver assignment + move to Driver Issue bucket
      await sql`
        UPDATE bookings
        SET
          dispatch_status    = 'needs_correction',
          assigned_driver_id = NULL,
          updated_at         = NOW()
        WHERE id = ${booking_id}::uuid
      `
      // Audit log
      try {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES ('booking', ${booking_id}::uuid, 'driver_requested_correction',
            ${JSON.stringify({ driver_code, note })}::jsonb,
            NOW())
        `
      } catch { /* non-blocking */ }

      // Notify admin
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `✏️ Booking Correction Requested — #${bookingRef}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 24px; border-radius: 12px;">
              <h2 style="color: #f59e0b; margin-top: 0;">Booking Correction Requested</h2>
              <p>Driver <strong>${driverName}</strong> (${driver_code}) is requesting a correction for booking <strong>#${bookingRef}</strong> before they can proceed.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Booking ID</td><td style="padding: 6px 0;">${booking_id}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Current Status</td><td style="padding: 6px 0;">${booking.status}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Client</td><td style="padding: 6px 0;">${booking.client_name ?? "?"} · ${booking.client_phone ?? "?"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Route</td><td style="padding: 6px 0;">${booking.pickup_address ?? "?"} → ${booking.dropoff_address ?? "?"}</td></tr>
              </table>
              ${driverNote ? `<p style="color: #fbbf24;">${driverNote}</p>` : ""}
              <p style="color: #f59e0b; font-weight: bold;">Action required: Edit the booking and notify the driver when corrected.</p>
            </div>
          `,
        })
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true, action, notified: true })
    }

    if (action === "reject_ride") {
      // Only allowed if critical data is missing
      const criticalMissing = !booking.pickup_at || !booking.pickup_address || !booking.client_phone
      if (!criticalMissing) {
        return NextResponse.json({ error: "Reject is only allowed when critical data (pickup_time, pickup_address, passenger_phone) is missing" }, { status: 422 })
      }

      await sql`
        UPDATE bookings
        SET
          status            = 'pending_dispatch',
          dispatch_status   = 'driver_rejected',
          assigned_driver_id = NULL,
          updated_at        = NOW()
        WHERE id = ${booking_id}::uuid
      `

      // Audit log
      try {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES ('booking', ${booking_id}::uuid, 'driver_rejected_incomplete_ride',
            ${JSON.stringify({ driver_code, missing_fields: missing_fields ?? [], note })}::jsonb,
            NOW())
        `
      } catch { /* non-blocking */ }

      // Notify admin
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `🚫 Ride Rejected by Driver — Incomplete Data — #${bookingRef}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 24px; border-radius: 12px;">
              <h2 style="color: #ef4444; margin-top: 0;">Ride Rejected — Incomplete Data</h2>
              <p>Driver <strong>${driverName}</strong> (${driver_code}) has rejected booking <strong>#${bookingRef}</strong> due to missing critical data.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Booking ID</td><td style="padding: 6px 0;">${booking_id}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Missing Fields</td><td style="padding: 6px 0; color: #fca5a5;"><strong>${missingList}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">New Status</td><td style="padding: 6px 0; color: #f59e0b;">pending_dispatch / manual_dispatch_required</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Route</td><td style="padding: 6px 0;">${booking.pickup_address ?? "?"} → ${booking.dropoff_address ?? "?"}</td></tr>
              </table>
              ${driverNote ? `<p style="color: #fca5a5;">${driverNote}</p>` : ""}
              <p style="color: #ef4444; font-weight: bold;">URGENT: Complete the booking data and reassign immediately.</p>
            </div>
          `,
        })
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true, action, new_status: "pending_dispatch" })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })

  } catch (err: any) {
    console.error("[driver/report]", err)
    return NextResponse.json({ error: "Internal server error", detail: err?.message }, { status: 500 })
  }
}
