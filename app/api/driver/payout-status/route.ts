import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)
// ============================================================
// GET /api/driver/payout-status?code=YHV001
//
// Refreshes the real Stripe account status for a driver and
// updates the database accordingly.
//
// Stripe account statuses:
//   not_connected       → no stripe_account_id yet
//   pending_verification → account created, onboarding not complete
//   restricted          → account has requirements/restrictions
//   connected           → fully verified, payouts_enabled=true
//
// This endpoint:
// 1. Loads driver from DB
// 2. If stripe_account_id exists, fetches real account from Stripe
// 3. Evaluates charges_enabled + payouts_enabled + requirements
// 4. Updates drivers table: stripe_account_status, payout_onboarding_status,
//    payouts_enabled, stripe_bank_last4, stripe_bank_name, stripe_bank_type
// 5. Returns current status
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
      SELECT
        id,
        driver_code,
        full_name,
        email,
        COALESCE(stripe_account_id,          NULL)            AS stripe_account_id,
        COALESCE(stripe_account_status,      'not_connected') AS stripe_account_status,
        COALESCE(payout_onboarding_status,   'not_started')   AS payout_onboarding_status,
        COALESCE(payouts_enabled,            FALSE)           AS payouts_enabled,
        COALESCE(stripe_bank_last4,          NULL)            AS stripe_bank_last4,
        COALESCE(stripe_bank_name,           NULL)            AS stripe_bank_name,
        COALESCE(stripe_bank_type,           NULL)            AS stripe_bank_type,
        COALESCE(payout_method,              'not_set')       AS payout_method
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    const driver = rows[0]
    const stripeAccountId = driver.stripe_account_id as string | null

    // ── No Stripe account yet ────────────────────────────────
    if (!stripeAccountId) {
      return NextResponse.json({
        driver_code:              code.toUpperCase(),
        stripe_account_id:        null,
        stripe_account_status:    "not_connected",
        payout_onboarding_status: "not_started",
        payouts_enabled:          false,
        bank_last4:               null,
        bank_name:                null,
        bank_type:                null,
        payout_method:            driver.payout_method,
        onboarding_url:           `/api/driver/stripe-onboard?code=${code.toUpperCase()}`,
        refreshed_from_stripe:    false,
        message:                  "No Stripe account connected. Use onboarding_url to start.",
      })
    }

    // ── Fetch real account from Stripe ───────────────────────
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      // Return DB state without refreshing from Stripe
      return NextResponse.json({
        driver_code:              code.toUpperCase(),
        stripe_account_id:        stripeAccountId,
        stripe_account_status:    driver.stripe_account_status,
        payout_onboarding_status: driver.payout_onboarding_status,
        payouts_enabled:          driver.payouts_enabled,
        bank_last4:               driver.stripe_bank_last4,
        bank_name:                driver.stripe_bank_name,
        bank_type:                driver.stripe_bank_type,
        payout_method:            driver.payout_method,
        refreshed_from_stripe:    false,
        warning:                  "STRIPE_SECRET_KEY not configured — showing cached DB state",
      })
    }

    const accountRes = await fetch(`https://api.stripe.com/v1/accounts/${stripeAccountId}`, {
      headers: {
        Authorization: `Bearer ${stripeKey}`,
      },
    })

    if (!accountRes.ok) {
      const errBody = await accountRes.json()
      console.error("[payout-status] Stripe account fetch error:", errBody)
      // Return DB state on Stripe error
      return NextResponse.json({
        driver_code:              code.toUpperCase(),
        stripe_account_id:        stripeAccountId,
        stripe_account_status:    driver.stripe_account_status,
        payout_onboarding_status: driver.payout_onboarding_status,
        payouts_enabled:          driver.payouts_enabled,
        bank_last4:               driver.stripe_bank_last4,
        bank_name:                driver.stripe_bank_name,
        bank_type:                driver.stripe_bank_type,
        payout_method:            driver.payout_method,
        refreshed_from_stripe:    false,
        stripe_error:             errBody,
      }, { status: 200 }) // 200 to avoid breaking UI
    }

    const account = await accountRes.json()

    // ── Evaluate Stripe account state ────────────────────────
    const chargesEnabled  = account.charges_enabled  === true
    const payoutsEnabled  = account.payouts_enabled  === true
    const detailsSubmitted = account.details_submitted === true
    const requirements    = account.requirements ?? {}
    const hasCurrentlyDue = (requirements.currently_due ?? []).length > 0
    const hasEventuallyDue = (requirements.eventually_due ?? []).length > 0
    const hasPastDue      = (requirements.past_due ?? []).length > 0
    const disabled        = account.disabled_reason ?? null

    // ── Determine canonical status ───────────────────────────
    let stripeAccountStatus: string
    let payoutOnboardingStatus: string
    let payoutsEnabledFinal: boolean

    if (payoutsEnabled && chargesEnabled && !hasCurrentlyDue && !hasPastDue) {
      stripeAccountStatus    = "connected"
      payoutOnboardingStatus = "complete"
      payoutsEnabledFinal    = true
    } else if (disabled || hasPastDue) {
      stripeAccountStatus    = "restricted"
      payoutOnboardingStatus = "suspended"
      payoutsEnabledFinal    = false
    } else if (detailsSubmitted && (hasCurrentlyDue || hasEventuallyDue)) {
      stripeAccountStatus    = "restricted"
      payoutOnboardingStatus = "pending"
      payoutsEnabledFinal    = false
    } else if (detailsSubmitted) {
      stripeAccountStatus    = "pending_verification"
      payoutOnboardingStatus = "pending"
      payoutsEnabledFinal    = false
    } else {
      stripeAccountStatus    = "pending_verification"
      payoutOnboardingStatus = "not_started"
      payoutsEnabledFinal    = false
    }

    // ── Extract bank info from external_accounts ─────────────
    let bankLast4: string | null = null
    let bankName:  string | null = null
    let bankType:  string | null = null
    let payoutMethodType = "not_set"

    const externalAccounts = account.external_accounts?.data ?? []
    if (externalAccounts.length > 0) {
      const primary = externalAccounts[0]
      bankLast4 = primary.last4 ?? null
      bankName  = primary.bank_name ?? primary.brand ?? null
      if (primary.object === "bank_account") {
        bankType = "bank_account"
        payoutMethodType = "stripe"
      } else if (primary.object === "card") {
        bankType = "debit_card"
        payoutMethodType = "stripe"
      }
    }

    // ── Update database ──────────────────────────────────────
    await sql`
      UPDATE drivers
      SET
        stripe_account_status    = ${stripeAccountStatus},
        payout_onboarding_status = ${payoutOnboardingStatus},
        payouts_enabled          = ${payoutsEnabledFinal},
        stripe_bank_last4        = ${bankLast4},
        stripe_bank_name         = ${bankName},
        stripe_bank_type         = ${bankType},
        payout_method            = ${payoutMethodType},
        updated_at               = NOW()
      WHERE id = ${driver.id}
    `

    // ── Build response ───────────────────────────────────────
    const response: Record<string, unknown> = {
      driver_code:              code.toUpperCase(),
      stripe_account_id:        stripeAccountId,
      stripe_account_status:    stripeAccountStatus,
      payout_onboarding_status: payoutOnboardingStatus,
      payouts_enabled:          payoutsEnabledFinal,
      bank_last4:               bankLast4,
      bank_name:                bankName,
      bank_type:                bankType,
      payout_method:            payoutMethodType,
      refreshed_from_stripe:    true,
      details_submitted:        detailsSubmitted,
      charges_enabled:          chargesEnabled,
      payouts_enabled_stripe:   payoutsEnabled,
    }

    // If onboarding incomplete, provide a new Account Link
    if (!payoutsEnabledFinal && stripeAccountId) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.sottoventoluxuryride.com"
      const returnUrl  = `${baseUrl}/driver/${code.toUpperCase()}/earnings?stripe=success`
      const refreshUrl = `${baseUrl}/driver/${code.toUpperCase()}/earnings?stripe=refresh`
      try {
        const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            account:     stripeAccountId,
            refresh_url: refreshUrl,
            return_url:  returnUrl,
            type:        "account_onboarding",
          }),
        })
        if (linkRes.ok) {
          const link = await linkRes.json()
          response.resume_onboarding_url = link.url
        }
      } catch { /* ignore — account link generation is best-effort */ }
    }

    if (hasPastDue || hasCurrentlyDue) {
      response.requirements_due = {
        past_due:       requirements.past_due ?? [],
        currently_due:  requirements.currently_due ?? [],
        eventually_due: requirements.eventually_due ?? [],
        disabled_reason: disabled,
      }
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error("[payout-status] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
