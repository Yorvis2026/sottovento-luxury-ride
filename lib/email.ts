import { Resend } from "resend"

// Lazy initialization — avoids build-time crash when RESEND_API_KEY is not set
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — emails will be skipped")
    return null
  }
  return new Resend(key)
}

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "Sottovento Luxury Ride <noreply@sottoventoluxuryride.com>"
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "contact@sottoventoluxuryride.com"

// ─────────────────────────────────────────────────────────────
// LEAD / GET QUOTE — notifies admin when a lead is captured
// ─────────────────────────────────────────────────────────────
export async function sendLeadNotification(opts: {
  name?: string
  phone?: string
  email?: string
  driverCode?: string
  tabletCode?: string
  package?: string
  destination?: string
  pickupDate?: string
  pickupTime?: string
}) {
  const resend = getResend()
  if (!resend) return

  const subject = opts.destination
    ? `New Quote Request — ${opts.destination} — Sottovento`
    : `New Lead — Sottovento Luxury Ride`

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <p style="color:#b8960c;letter-spacing:0.3em;text-transform:uppercase;font-size:11px;margin:0;">Sottovento Luxury Ride</p>
        <h1 style="font-size:24px;font-weight:300;margin:8px 0;color:#fff;">New Quote Request</h1>
        ${opts.destination ? `<p style="color:#b8960c;font-size:16px;margin:4px 0;font-weight:600;">${opts.destination}</p>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${opts.name ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;width:140px;">Name</td><td style="padding:8px 0;color:#fff;font-size:14px;">${opts.name}</td></tr>` : ""}
        ${opts.phone ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Phone</td><td style="padding:8px 0;color:#fff;font-size:14px;"><a href="tel:${opts.phone}" style="color:#b8960c;">${opts.phone}</a></td></tr>` : ""}
        ${opts.email ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Email</td><td style="padding:8px 0;color:#fff;font-size:14px;"><a href="mailto:${opts.email}" style="color:#b8960c;">${opts.email}</a></td></tr>` : ""}
        ${opts.pickupDate ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Date</td><td style="padding:8px 0;color:#b8960c;font-size:14px;font-weight:600;">${opts.pickupDate}</td></tr>` : ""}
        ${opts.pickupTime ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Time</td><td style="padding:8px 0;color:#b8960c;font-size:14px;font-weight:600;">${opts.pickupTime}</td></tr>` : ""}
        ${opts.package ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Package</td><td style="padding:8px 0;color:#b8960c;font-size:14px;">${opts.package}</td></tr>` : ""}
        ${opts.driverCode ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Driver Code</td><td style="padding:8px 0;color:#fff;font-size:14px;">${opts.driverCode}</td></tr>` : ""}
        ${opts.tabletCode ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Tablet Code</td><td style="padding:8px 0;color:#fff;font-size:14px;">${opts.tabletCode}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#888;font-size:13px;">Received</td><td style="padding:8px 0;color:#fff;font-size:14px;">${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</td></tr>
      </table>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #222;text-align:center;">
        <a href="https://www.sottoventoluxuryride.com/admin" style="display:inline-block;padding:12px 24px;background:#b8960c;color:#000;text-decoration:none;border-radius:6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">View in Admin Panel</a>
      </div>
    </div>
  `

  const toList = [ADMIN_EMAIL]

  try {
    await resend.emails.send({
      from: FROM,
      to: toList,
      subject,
      html,
    })
  } catch (err) {
    console.error("[email] sendLeadNotification failed:", err)
  }
}

// ─────────────────────────────────────────────────────────────
// BOOKING CONFIRMATION — sends to admin + optional client
// ─────────────────────────────────────────────────────────────
export async function sendBookingConfirmation(opts: {
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  pickupAddress?: string
  dropoffAddress?: string
  pickupAt?: string
  passengers?: number
  totalPrice?: number
  bookingId?: string
  driverCode?: string
}) {
  const resend = getResend()
  if (!resend) return

  const subject = `Booking Confirmed — Sottovento Luxury Ride`
  const pickupFormatted = opts.pickupAt
    ? new Date(opts.pickupAt).toLocaleString("en-US", {
        timeZone: "America/New_York",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "TBD"

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <p style="color:#b8960c;letter-spacing:0.3em;text-transform:uppercase;font-size:11px;margin:0;">Sottovento Luxury Ride</p>
        <h1 style="font-size:24px;font-weight:300;margin:8px 0;color:#fff;">Booking Confirmed</h1>
        ${opts.bookingId ? `<p style="color:#555;font-size:12px;margin:4px 0;">Ref: ${opts.bookingId.slice(0, 8).toUpperCase()}</p>` : ""}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${opts.clientName ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;width:140px;">Passenger</td><td style="padding:8px 0;color:#fff;font-size:14px;">${opts.clientName}</td></tr>` : ""}
        ${opts.clientPhone ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Phone</td><td style="padding:8px 0;color:#fff;font-size:14px;">${opts.clientPhone}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#888;font-size:13px;">Pickup Time</td><td style="padding:8px 0;color:#b8960c;font-size:14px;font-weight:600;">${pickupFormatted}</td></tr>
        ${opts.pickupAddress ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Pickup</td><td style="padding:8px 0;color:#fff;font-size:14px;">${opts.pickupAddress}</td></tr>` : ""}
        ${opts.dropoffAddress ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Drop-off</td><td style="padding:8px 0;color:#fff;font-size:14px;">${opts.dropoffAddress}</td></tr>` : ""}
        ${opts.passengers ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Passengers</td><td style="padding:8px 0;color:#fff;font-size:14px;">${opts.passengers}</td></tr>` : ""}
        ${opts.totalPrice ? `<tr><td style="padding:8px 0;color:#888;font-size:13px;">Total</td><td style="padding:8px 0;color:#b8960c;font-size:16px;font-weight:600;">$${opts.totalPrice.toFixed(2)}</td></tr>` : ""}
      </table>
      <div style="margin-top:24px;padding:16px;background:#111;border-radius:8px;border-left:3px solid #b8960c;">
        <p style="margin:0;color:#888;font-size:12px;">Questions? Contact us at <a href="mailto:contact@sottoventoluxuryride.com" style="color:#b8960c;">contact@sottoventoluxuryride.com</a></p>
      </div>
    </div>
  `

  const toList: string[] = [ADMIN_EMAIL]
  if (opts.clientEmail) toList.push(opts.clientEmail)

  try {
    await resend.emails.send({
      from: FROM,
      to: toList,
      subject,
      html,
    })
  } catch (err) {
    console.error("[email] sendBookingConfirmation failed:", err)
  }
}

// ─────────────────────────────────────────────────────────────
// CROWN MOMENT PHOTO — sends photo to client email
// ─────────────────────────────────────────────────────────────
export async function sendCrownMomentPhoto(opts: {
  toEmail: string
  photoBase64: string
  frameName: string
}) {
  const resend = getResend()
  if (!resend) return { success: false, error: "Email service not configured" }

  const subject = `Your Crown Moment — Sottovento Luxury Ride`
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <p style="color:#b8960c;letter-spacing:0.3em;text-transform:uppercase;font-size:11px;margin:0;">Sottovento Luxury Ride</p>
        <h1 style="font-size:28px;font-weight:300;margin:8px 0;color:#fff;">Your Crown Moment</h1>
        <p style="color:#555;font-size:13px;margin:4px 0;">${opts.frameName}</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <img src="cid:crown-moment-photo" alt="Your Crown Moment" style="max-width:100%;border-radius:8px;border:2px solid #b8960c;" />
      </div>
      <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #222;">
        <p style="color:#555;font-size:12px;margin:0;">Thank you for riding with Sottovento Luxury Ride</p>
        <p style="color:#555;font-size:12px;margin:4px 0;"><a href="https://www.sottoventoluxuryride.com" style="color:#b8960c;">sottoventoluxuryride.com</a></p>
      </div>
    </div>
  `

  // Convert base64 data URL to buffer
  const base64Data = opts.photoBase64.replace(/^data:image\/\w+;base64,/, "")
  const imageBuffer = Buffer.from(base64Data, "base64")

  try {
    await resend.emails.send({
      from: FROM,
      to: [opts.toEmail],
      subject,
      html,
      attachments: [
        {
          filename: "sottovento-crown-moment.jpg",
          content: imageBuffer,
        },
      ],
    })
    return { success: true }
  } catch (err) {
    console.error("[email] sendCrownMomentPhoto failed:", err)
    return { success: false, error: String(err) }
  }
}
