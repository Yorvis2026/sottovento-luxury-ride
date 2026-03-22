import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// GET /api/driver/stripe-onboard?code=YHV001
//
// Creates or retrieves a Stripe Connect Express account for the
// driver and returns an Account Link URL for onboarding.
//
// Flow:
//  1. Check if driver already has stripe_account_id
//  2. If not: create Stripe Express account
//  3. Store stripe_account_id in drivers table
//  4. Generate Account Link (onboarding URL)
//  5. Redirect driver to Stripe onboarding
//
// Security: Only the driver with the matching code can access
// this endpoint. No admin override.
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 })
    }

    // ── Load driver ──────────────────────────────────────────
    const rows = await sql`
      SELECT id, driver_code, full_name, email, stripe_account_id
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    const driver = rows[0]
    const stripeKey = process.env.STRIPE_SECRET_KEY

    if (!stripeKey) {
      // Stripe not configured — return informational response
      return NextResponse.json({
        error: "Stripe not configured",
        message: "Stripe Connect is not yet configured for this environment. Please contact support.",
      }, { status: 503 })
    }

    // ── Stripe Connect Express account creation/retrieval ────
    let stripeAccountId = driver.stripe_account_id as string | null

    if (!stripeAccountId) {
      // Create new Express account
      const createRes = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          type: "express",
          country: "US",
          email: (driver.email as string) ?? "",
          "capabilities[transfers][requested]": "true",
          "capabilities[card_payments][requested]": "true",
          "business_type": "individual",
          "metadata[driver_code]": driver.driver_code as string,
          "metadata[driver_id]": driver.id as string,
        }),
      })

      if (!createRes.ok) {
        const errBody = await createRes.json()
        console.error("[stripe-onboard] create account error:", errBody)
        return NextResponse.json({
          error: "Failed to create Stripe account",
          details: errBody,
        }, { status: 500 })
      }

      const account = await createRes.json()
      stripeAccountId = account.id as string

      // Store in database
      await sql`
        UPDATE drivers
        SET
          stripe_account_id     = ${stripeAccountId},
          stripe_account_status = 'pending_verification',
          updated_at            = NOW()
        WHERE id = ${driver.id}
      `
    }

    // ── Generate Account Link (onboarding URL) ───────────────
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.sottoventoluxuryride.com"
    const returnUrl  = `${baseUrl}/driver/${code.toUpperCase()}/earnings?stripe=success`
    const refreshUrl = `${baseUrl}/driver/${code.toUpperCase()}/earnings?stripe=refresh`

    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        account: stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      }),
    })

    if (!linkRes.ok) {
      const errBody = await linkRes.json()
      console.error("[stripe-onboard] account link error:", errBody)
      return NextResponse.json({
        error: "Failed to generate onboarding link",
        details: errBody,
      }, { status: 500 })
    }

    const link = await linkRes.json()

    // Redirect to Stripe onboarding
    return NextResponse.redirect(link.url as string)
  } catch (err) {
    console.error("[stripe-onboard] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ============================================================
// GET /api/driver/stripe-onboard/update?code=YHV001
// Returns an Account Link for updating payout method (not onboarding)
// Used by the "Actualizar método de pago" button
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 })
    }

    const rows = await sql`
      SELECT id, driver_code, stripe_account_id
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    const driver = rows[0]
    const stripeAccountId = driver.stripe_account_id as string | null
    const stripeKey = process.env.STRIPE_SECRET_KEY

    if (!stripeAccountId) {
      // Not connected — redirect to onboarding
      return NextResponse.json({
        redirect: `/api/driver/stripe-onboard?code=${code.toUpperCase()}`,
      })
    }

    if (!stripeKey) {
      return NextResponse.json({
        error: "Stripe not configured",
      }, { status: 503 })
    }

    // Generate login link for existing Express account
    const loginRes = await fetch(
      `https://api.stripe.com/v1/accounts/${stripeAccountId}/login_links`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    )

    if (!loginRes.ok) {
      const errBody = await loginRes.json()
      return NextResponse.json({
        error: "Failed to generate Stripe login link",
        details: errBody,
      }, { status: 500 })
    }

    const loginLink = await loginRes.json()
    return NextResponse.json({ url: loginLink.url })
  } catch (err) {
    console.error("[stripe-onboard POST] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
