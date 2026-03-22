import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// GET /api/driver/payout-info?code=YHV001
//
// Returns payout method info, balance summary, and payout history
// for the driver earnings page.
//
// Payout method: from drivers.stripe_account_id (if connected)
//   - If connected: fetch masked bank/card info from Stripe
//   - If not connected: return status = "not_connected"
//
// Balance:
//   - available = commissions with status = 'confirmed' (approved, not yet paid)
//   - pending   = commissions with status = 'pending'   (awaiting confirmation)
//   - paid      = commissions with status = 'paid'      (already disbursed)
//
// Payout history: last 10 payout batches (commissions grouped by paid_at date)
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
        stripe_account_id,
        stripe_account_status,
        stripe_bank_last4,
        stripe_bank_type,
        stripe_bank_name
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    const driver = rows[0]

    // ── Payout method info ───────────────────────────────────
    // Phase 1: Use locally stored masked data from drivers table
    // Phase 2: Live fetch from Stripe Connect API
    let payoutMethod: {
      status: "connected" | "not_connected" | "pending_verification"
      type: string | null
      last4: string | null
      bank_name: string | null
      verified: boolean
      stripe_account_id: string | null
      onboarding_url: string | null
    }

    const stripeAccountId = driver.stripe_account_id as string | null

    if (stripeAccountId) {
      // Stripe account connected — use cached masked data
      payoutMethod = {
        status: (driver.stripe_account_status as "connected" | "pending_verification") ?? "connected",
        type: (driver.stripe_bank_type as string) ?? "bank_account",
        last4: (driver.stripe_bank_last4 as string) ?? null,
        bank_name: (driver.stripe_bank_name as string) ?? null,
        verified: driver.stripe_account_status === "connected",
        stripe_account_id: stripeAccountId,
        onboarding_url: null,
      }
    } else {
      // No Stripe account — generate onboarding link
      payoutMethod = {
        status: "not_connected",
        type: null,
        last4: null,
        bank_name: null,
        verified: false,
        stripe_account_id: null,
        onboarding_url: `/api/driver/stripe-onboard?code=${code.toUpperCase()}`,
      }
    }

    // ── Balance summary ──────────────────────────────────────
    // Executor commissions
    const [executorBalance] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN executor_amount ELSE 0 END), 0) AS available,
        COALESCE(SUM(CASE WHEN status = 'pending'   THEN executor_amount ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'paid'      THEN executor_amount ELSE 0 END), 0) AS paid_total
      FROM commissions
      WHERE executor_driver_id = ${driver.id}
    `

    // Source commissions
    const [sourceBalance] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN source_amount ELSE 0 END), 0) AS available,
        COALESCE(SUM(CASE WHEN status = 'pending'   THEN source_amount ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'paid'      THEN source_amount ELSE 0 END), 0) AS paid_total
      FROM commissions
      WHERE source_driver_id = ${driver.id}
    `

    const balance = {
      available: Number(executorBalance?.available ?? 0) + Number(sourceBalance?.available ?? 0),
      pending: Number(executorBalance?.pending ?? 0) + Number(sourceBalance?.pending ?? 0),
      paid_total: Number(executorBalance?.paid_total ?? 0) + Number(sourceBalance?.paid_total ?? 0),
      // Platform payout frequency — controlled by platform, not driver
      payout_frequency: "Weekly",
      next_payout_day: getNextPayoutDay(),
    }

    // ── Payout history ───────────────────────────────────────
    // Group paid commissions by paid_at date (each date = one payout batch)
    const payoutRows = await sql`
      SELECT
        DATE(paid_at)                                                    AS payout_date,
        COALESCE(SUM(executor_amount) FILTER (WHERE executor_driver_id = ${driver.id}), 0) +
        COALESCE(SUM(source_amount)   FILTER (WHERE source_driver_id   = ${driver.id}), 0) AS amount,
        'paid'                                                           AS status,
        COUNT(*)                                                         AS ride_count
      FROM commissions
      WHERE (executor_driver_id = ${driver.id} OR source_driver_id = ${driver.id})
        AND status = 'paid'
        AND paid_at IS NOT NULL
      GROUP BY DATE(paid_at)
      ORDER BY payout_date DESC
      LIMIT 10
    `

    const payoutHistory = payoutRows.map((row) => ({
      date: row.payout_date,
      amount: Number(row.amount),
      status: row.status as string,
      ride_count: Number(row.ride_count),
    }))

    // ── Earnings breakdown (last 30 rides with commission) ───
    const earningsRows = await sql`
      SELECT
        c.id,
        c.created_at                                                      AS date,
        b.pickup_address,
        b.dropoff_address,
        b.total_price                                                     AS booking_total,
        CASE
          WHEN c.executor_driver_id = ${driver.id} AND c.source_driver_id = ${driver.id}
            THEN 'both'
          WHEN c.executor_driver_id = ${driver.id}
            THEN 'executor'
          ELSE 'source'
        END                                                               AS role,
        CASE
          WHEN c.executor_driver_id = ${driver.id} AND c.source_driver_id = ${driver.id}
            THEN COALESCE(c.executor_amount, 0) + COALESCE(c.source_amount, 0)
          WHEN c.executor_driver_id = ${driver.id}
            THEN COALESCE(c.executor_amount, 0)
          ELSE COALESCE(c.source_amount, 0)
        END                                                               AS my_amount,
        CASE
          WHEN c.executor_driver_id = ${driver.id} AND c.source_driver_id = ${driver.id}
            THEN c.executor_pct + c.source_pct
          WHEN c.executor_driver_id = ${driver.id}
            THEN c.executor_pct
          ELSE c.source_pct
        END                                                               AS my_pct,
        c.status                                                          AS commission_status,
        cl.full_name                                                      AS client_name,
        b.vehicle_type,
        b.pickup_at
      FROM commissions c
      JOIN bookings b ON b.id = c.booking_id
      LEFT JOIN clients cl ON cl.id = b.client_id
      WHERE c.executor_driver_id = ${driver.id}
         OR c.source_driver_id   = ${driver.id}
      ORDER BY c.created_at DESC
      LIMIT 30
    `

    const earningsHistory = earningsRows.map((row) => ({
      id: row.id as string,
      date: row.date,
      pickup_at: row.pickup_at,
      client_name: (row.client_name as string) ?? "Client",
      route: buildRoute(row.pickup_address as string, row.dropoff_address as string),
      booking_total: Number(row.booking_total),
      my_amount: Number(row.my_amount),
      my_pct: Number(row.my_pct),
      role: row.role as "executor" | "source" | "both",
      status: row.commission_status as string,
      vehicle_type: row.vehicle_type as string,
    }))

    return NextResponse.json({
      driver: {
        id: driver.id,
        driver_code: driver.driver_code,
        full_name: driver.full_name,
      },
      payout_method: payoutMethod,
      balance,
      payout_history: payoutHistory,
      earnings_history: earningsHistory,
    })
  } catch (err) {
    console.error("[payout-info] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── Helpers ──────────────────────────────────────────────────

function getNextPayoutDay(): string {
  // Platform pays weekly on Fridays
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
  const nextFriday = new Date(today)
  nextFriday.setDate(today.getDate() + daysUntilFriday)
  return nextFriday.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

function buildRoute(pickup: string, dropoff: string): string {
  if (!pickup && !dropoff) return "Route not specified"
  const p = pickup ? pickup.split(",")[0].trim() : "?"
  const d = dropoff ? dropoff.split(",")[0].trim() : "?"
  return `${p} → ${d}`
}
