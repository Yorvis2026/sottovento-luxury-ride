import { NextRequest, NextResponse } from "next/server"

// ============================================================
// POST /api/qr/track
//
// Records a QR code scan event for analytics.
// Called client-side when a user lands on the booking page
// with a QR attribution parameter.
//
// Body:
//   qr_code      — the QR code identifier
//   channel      — source channel
//   ref          — driver/tablet/partner code
//   landing_page — full URL where the scan landed
//   user_agent   — browser user agent
//   timestamp    — ISO timestamp
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      qr_code,
      channel,
      ref,
      landing_page,
      user_agent,
      timestamp,
    } = body

    if (!channel) {
      return NextResponse.json(
        { error: "Missing required field: channel" },
        { status: 400 }
      )
    }

    // Log to console for now — in production this would write to
    // a qr_scan_events table in the database
    console.log("[QR Track]", {
      qr_code: qr_code || null,
      channel,
      ref: ref || null,
      landing_page: landing_page?.substring(0, 500) || null,
      user_agent: user_agent?.substring(0, 200) || null,
      timestamp: timestamp || new Date().toISOString(),
      ip: req.headers.get("x-forwarded-for") || "unknown",
    })

    // TODO: When qr_scan_events table is available, insert here:
    // await sql`
    //   INSERT INTO qr_scan_events (
    //     qr_code, channel, ref, landing_page, user_agent, scanned_at, ip_address
    //   ) VALUES (
    //     ${qr_code}, ${channel}, ${ref}, ${landing_page},
    //     ${user_agent}, NOW(), ${ip}
    //   )
    // `

    return NextResponse.json({
      tracked: true,
      channel,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[QR Track] Error:", message)
    // Non-blocking — always return 200 to avoid breaking the booking flow
    return NextResponse.json({ tracked: false, error: message })
  }
}
