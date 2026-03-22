import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// GET /api/driver/payout-info?code=YHV001
//
// Returns payout method info, balance summary, and payout history.
// Robust: works even if Stripe columns don't exist yet in drivers table.
// Auto-migrates Stripe columns on first call if missing.
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 })
    }

    // ── Ensure Stripe columns exist (idempotent migration) ───
    try {
      await sql`
        ALTER TABLE drivers
          ADD COLUMN IF NOT EXISTS stripe_account_id     TEXT,
          ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected',
          ADD COLUMN IF NOT EXISTS stripe_bank_last4     TEXT,
          ADD COLUMN IF NOT EXISTS stripe_bank_type      TEXT,
          ADD COLUMN IF NOT EXISTS stripe_bank_name      TEXT
      `
    } catch {
      // Columns may already exist — ignore error
    }

    // ── Load driver (only base columns, always safe) ─────────
    const rows = await sql`
      SELECT
        id,
        driver_code,
        full_name,
        COALESCE(stripe_account_id,     NULL) AS stripe_account_id,
        COALESCE(stripe_account_status, 'not_connected') AS stripe_account_status,
        COALESCE(stripe_bank_last4,     NULL) AS stripe_bank_last4,
        COALESCE(stripe_bank_type,      NULL) AS stripe_bank_type,
        COALESCE(stripe_bank_name,      NULL) AS stripe_bank_name
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 })
    }

    const driver = rows[0]

    // ── Payout method info ───────────────────────────────────
    const stripeAccountId = driver.stripe_account_id as string | null
    const stripeStatus = (driver.stripe_account_status as string) ?? "not_connected"

    const payoutMethod = {
      status: stripeAccountId
        ? (stripeStatus as "connected" | "pending_verification")
        : ("not_connected" as const),
      type: (driver.stripe_bank_type as string | null) ?? null,
      last4: (driver.stripe_bank_last4 as string | null) ?? null,
      bank_name: (driver.stripe_bank_name as string | null) ?? null,
      verified: stripeStatus === "connected",
      stripe_account_id: stripeAccountId,
      onboarding_url: stripeAccountId
        ? null
        : `/api/driver/stripe-onboard?code=${code.toUpperCase()}`,
    }

    // ── Balance summary ──────────────────────────────────────
    // Check if commissions table exists before querying
    let executorBalance = { available: 0, pending: 0, paid_total: 0 }
    let sourceBalance   = { available: 0, pending: 0, paid_total: 0 }

    try {
      const [eb] = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN executor_amount ELSE 0 END), 0) AS available,
          COALESCE(SUM(CASE WHEN status = 'pending'   THEN executor_amount ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN status = 'paid'      THEN executor_amount ELSE 0 END), 0) AS paid_total
        FROM commissions
        WHERE executor_driver_id = ${driver.id}
      `
      executorBalance = {
        available:  Number(eb?.available  ?? 0),
        pending:    Number(eb?.pending    ?? 0),
        paid_total: Number(eb?.paid_total ?? 0),
      }
    } catch { /* commissions table may be empty */ }

    try {
      const [sb] = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN source_amount ELSE 0 END), 0) AS available,
          COALESCE(SUM(CASE WHEN status = 'pending'   THEN source_amount ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN status = 'paid'      THEN source_amount ELSE 0 END), 0) AS paid_total
        FROM commissions
        WHERE source_driver_id = ${driver.id}
      `
      sourceBalance = {
        available:  Number(sb?.available  ?? 0),
        pending:    Number(sb?.pending    ?? 0),
        paid_total: Number(sb?.paid_total ?? 0),
      }
    } catch { /* ignore */ }

    const balance = {
      available:       executorBalance.available  + sourceBalance.available,
      pending:         executorBalance.pending    + sourceBalance.pending,
      paid_total:      executorBalance.paid_total + sourceBalance.paid_total,
      payout_frequency: "Weekly",
      next_payout_day:  getNextPayoutDay(),
    }

    // ── Payout history ───────────────────────────────────────
    let payoutHistory: Array<{
      date: unknown
      amount: number
      status: string
      ride_count: number
    }> = []

    try {
      const payoutRows = await sql`
        SELECT
          DATE(paid_at) AS payout_date,
          COALESCE(SUM(executor_amount) FILTER (WHERE executor_driver_id = ${driver.id}), 0) +
          COALESCE(SUM(source_amount)   FILTER (WHERE source_driver_id   = ${driver.id}), 0) AS amount,
          'paid' AS status,
          COUNT(*) AS ride_count
        FROM commissions
        WHERE (executor_driver_id = ${driver.id} OR source_driver_id = ${driver.id})
          AND status = 'paid'
          AND paid_at IS NOT NULL
        GROUP BY DATE(paid_at)
        ORDER BY payout_date DESC
        LIMIT 10
      `
      payoutHistory = payoutRows.map((row) => ({
        date:       row.payout_date,
        amount:     Number(row.amount),
        status:     row.status as string,
        ride_count: Number(row.ride_count),
      }))
    } catch { /* no commissions yet */ }

    // ── Earnings history (last 30 rides with commission) ─────
    let earningsHistory: Array<{
      id: string
      date: unknown
      pickup_at: unknown
      client_name: string
      route: string
      booking_total: number
      my_amount: number
      my_pct: number
      role: "executor" | "source" | "both"
      status: string
      vehicle_type: string
    }> = []

    try {
      const earningsRows = await sql`
        SELECT
          c.id,
          c.created_at AS date,
          b.pickup_address,
          b.dropoff_address,
          b.total_price AS booking_total,
          CASE
            WHEN c.executor_driver_id = ${driver.id} AND c.source_driver_id = ${driver.id}
              THEN 'both'
            WHEN c.executor_driver_id = ${driver.id}
              THEN 'executor'
            ELSE 'source'
          END AS role,
          CASE
            WHEN c.executor_driver_id = ${driver.id} AND c.source_driver_id = ${driver.id}
              THEN COALESCE(c.executor_amount, 0) + COALESCE(c.source_amount, 0)
            WHEN c.executor_driver_id = ${driver.id}
              THEN COALESCE(c.executor_amount, 0)
            ELSE COALESCE(c.source_amount, 0)
          END AS my_amount,
          CASE
            WHEN c.executor_driver_id = ${driver.id} AND c.source_driver_id = ${driver.id}
              THEN c.executor_pct + c.source_pct
            WHEN c.executor_driver_id = ${driver.id}
              THEN c.executor_pct
            ELSE c.source_pct
          END AS my_pct,
          c.status AS commission_status,
          cl.full_name AS client_name,
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
      earningsHistory = earningsRows.map((row) => ({
        id:            row.id as string,
        date:          row.date,
        pickup_at:     row.pickup_at,
        client_name:   (row.client_name as string) ?? "Client",
        route:         buildRoute(row.pickup_address as string, row.dropoff_address as string),
        booking_total: Number(row.booking_total),
        my_amount:     Number(row.my_amount),
        my_pct:        Number(row.my_pct),
        role:          row.role as "executor" | "source" | "both",
        status:        row.commission_status as string,
        vehicle_type:  row.vehicle_type as string,
      }))
    } catch { /* no commissions yet */ }

    return NextResponse.json({
      driver: {
        id:          driver.id,
        driver_code: driver.driver_code,
        full_name:   driver.full_name,
      },
      payout_method:    payoutMethod,
      balance,
      payout_history:   payoutHistory,
      earnings_history: earningsHistory,
    })
  } catch (err) {
    console.error("[payout-info] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── Helpers ──────────────────────────────────────────────────

function getNextPayoutDay(): string {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
  const nextFriday = new Date(today)
  nextFriday.setDate(today.getDate() + daysUntilFriday)
  return nextFriday.toLocaleDateString("en-US", {
    weekday: "long",
    month:   "short",
    day:     "numeric",
  })
}

function buildRoute(pickup: string, dropoff: string): string {
  if (!pickup && !dropoff) return "Route not specified"
  const p = pickup  ? pickup.split(",")[0].trim()  : "?"
  const d = dropoff ? dropoff.split(",")[0].trim() : "?"
  return `${p} → ${d}`
}
