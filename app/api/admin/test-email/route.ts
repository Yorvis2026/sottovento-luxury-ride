export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

// Lazy initialization — avoids build-time failure when RESEND_API_KEY is not set
function getResend() {
  return new Resend(process.env.RESEND_API_KEY || 're_placeholder_build_only')
}

/**
 * POST /api/admin/test-email
 *
 * Diagnoses Resend email delivery.
 * Body: { to?: string }
 * Header: x-admin-key: SLN_ADMIN_2026
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-key")
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const to = body.to || "contact@sottoventoluxuryride.com"

  const diagnostics: Record<string, unknown> = {
    resend_api_key_present: !!process.env.RESEND_API_KEY,
    resend_api_key_prefix: process.env.RESEND_API_KEY?.slice(0, 8) ?? "NOT_SET",
    from_domain: "sottoventoluxuryride.com",
    to_address: to,
    timestamp: new Date().toISOString(),
  }

  // Test 1: Send to the exact "to" address
  const resend = getResend()
  try {
    const result = await resend.emails.send({
      from: "SLN Test <bookings@sottoventoluxuryride.com>",
      to,
      subject: `[SLN EMAIL TEST] ${new Date().toISOString()}`,
      html: `
        <div style="font-family: monospace; background: #0a0a0a; color: #e5e5e5; padding: 24px;">
          <h2 style="color: #C9A84C;">SLN Email Delivery Test</h2>
          <p>If you receive this email, Resend is configured correctly.</p>
          <p style="color: #666;">Sent at: ${new Date().toISOString()}</p>
          <p style="color: #666;">From: bookings@sottoventoluxuryride.com</p>
          <p style="color: #666;">To: ${to}</p>
        </div>
      `,
    })
    diagnostics.send_result = result
    diagnostics.send_success = !result.error
    diagnostics.email_id = result.data?.id ?? null
    diagnostics.send_error = result.error ?? null
  } catch (err: any) {
    diagnostics.send_success = false
    diagnostics.send_exception = err.message
    diagnostics.send_error_name = err.name
    diagnostics.send_error_status = err.statusCode
  }

  // Test 2: Try with onboarding@resend.dev as fallback (always works)
  try {
    const fallbackResult = await getResend().emails.send({
      from: "onboarding@resend.dev",
      to,
      subject: `[SLN FALLBACK TEST] ${new Date().toISOString()}`,
      html: `<p>Fallback test from onboarding@resend.dev</p>`,
    })
    diagnostics.fallback_send_success = !fallbackResult.error
    diagnostics.fallback_email_id = fallbackResult.data?.id ?? null
    diagnostics.fallback_error = fallbackResult.error ?? null
  } catch (err: any) {
    diagnostics.fallback_send_success = false
    diagnostics.fallback_exception = err.message
  }

  return NextResponse.json(diagnostics)
}

// GET — Check Resend API key and domain status
export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key")
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    resend_api_key_present: !!process.env.RESEND_API_KEY,
    resend_api_key_prefix: process.env.RESEND_API_KEY?.slice(0, 8) ?? "NOT_SET",
    resend_api_key_length: process.env.RESEND_API_KEY?.length ?? 0,
    from_domain: "sottoventoluxuryride.com",
    note: "POST to this endpoint to send a test email",
  })
}
