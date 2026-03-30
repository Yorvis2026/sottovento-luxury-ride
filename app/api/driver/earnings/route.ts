export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "")

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const driverCode = searchParams.get("driver_code")
  if (!driverCode) return NextResponse.json({ error: "driver_code required" }, { status: 400 })

  // ── Resolve driver ──────────────────────────────────────────────────────────
  const driverRows = await sql`
    SELECT id, full_name, driver_code FROM drivers WHERE driver_code = ${driverCode} LIMIT 1
  `
  if (!driverRows.length) return NextResponse.json({ error: "Driver not found" }, { status: 404 })
  const driver = driverRows[0]
  const driverId = driver.id

  // ── Date boundaries ─────────────────────────────────────────────────────────
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
  const endOfLastWeek = new Date(startOfWeek)

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // ── Earnings aggregates ─────────────────────────────────────────────────────
  // Executor earnings (driver ran the ride)
  const execRows = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN c.created_at >= ${startOfWeek.toISOString()} THEN c.executor_amount ELSE 0 END), 0)   AS week_exec,
      COALESCE(SUM(CASE WHEN c.created_at >= ${startOfMonth.toISOString()} THEN c.executor_amount ELSE 0 END), 0)  AS month_exec,
      COALESCE(SUM(c.executor_amount), 0)                                                                           AS total_exec,
      COALESCE(SUM(CASE WHEN c.created_at >= ${startOfLastWeek.toISOString()} AND c.created_at < ${endOfLastWeek.toISOString()} THEN c.executor_amount ELSE 0 END), 0) AS last_week_exec,
      COALESCE(SUM(CASE WHEN c.created_at >= ${startOfLastMonth.toISOString()} AND c.created_at < ${endOfLastMonth.toISOString()} THEN c.executor_amount ELSE 0 END), 0) AS last_month_exec
    FROM commissions c
    WHERE c.executor_driver_id = ${driverId}
      AND c.status != 'disputed'
  `

  // Source earnings (driver captured the client)
  const sourceRows = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN c.created_at >= ${startOfWeek.toISOString()} THEN c.source_amount ELSE 0 END), 0)   AS week_source,
      COALESCE(SUM(CASE WHEN c.created_at >= ${startOfMonth.toISOString()} THEN c.source_amount ELSE 0 END), 0)  AS month_source,
      COALESCE(SUM(c.source_amount), 0)                                                                           AS total_source,
      COALESCE(SUM(CASE WHEN c.created_at >= ${startOfLastWeek.toISOString()} AND c.created_at < ${endOfLastWeek.toISOString()} THEN c.source_amount ELSE 0 END), 0) AS last_week_source,
      COALESCE(SUM(CASE WHEN c.created_at >= ${startOfLastMonth.toISOString()} AND c.created_at < ${endOfLastMonth.toISOString()} THEN c.source_amount ELSE 0 END), 0) AS last_month_source
    FROM commissions c
    WHERE c.source_driver_id = ${driverId}
      AND c.status != 'disputed'
  `

  const exec = execRows[0]
  const src = sourceRows[0]

  const weekEarnings    = Number(exec.week_exec)    + Number(src.week_source)
  const monthEarnings   = Number(exec.month_exec)   + Number(src.month_source)
  const totalEarnings   = Number(exec.total_exec)   + Number(src.total_source)
  const lastWeekTotal   = Number(exec.last_week_exec)   + Number(src.last_week_source)
  const lastMonthTotal  = Number(exec.last_month_exec)  + Number(src.last_month_source)

  // % comparisons
  const vsLastWeek  = lastWeekTotal  > 0 ? ((weekEarnings  - lastWeekTotal)  / lastWeekTotal  * 100) : null
  const vsLastMonth = lastMonthTotal > 0 ? ((monthEarnings - lastMonthTotal) / lastMonthTotal * 100) : null

  // ── Earnings source breakdown ───────────────────────────────────────────────
  // Captured clients (source earnings)
  const capturedClientsRows = await sql`
    SELECT COUNT(DISTINCT cl.id) AS count, COALESCE(SUM(c.source_amount), 0) AS revenue
    FROM commissions c
    JOIN bookings b ON b.id = c.booking_id
    JOIN clients cl ON cl.id = b.client_id
    WHERE c.source_driver_id = ${driverId}
      AND c.status != 'disputed'
  `
  const capturedCount   = Number(capturedClientsRows[0]?.count ?? 0)
  const capturedRevenue = Number(capturedClientsRows[0]?.revenue ?? 0)

  // SLN network assignments (executor, not source)
  const slnNetworkRows = await sql`
    SELECT COALESCE(SUM(c.executor_amount), 0) AS amount
    FROM commissions c
    JOIN bookings b ON b.id = c.booking_id
    WHERE c.executor_driver_id = ${driverId}
      AND b.source_code IS NULL
      AND c.status != 'disputed'
  `
  const slnNetworkEarnings = Number(slnNetworkRows[0]?.amount ?? 0)

  // Admin/dispatcher assignments (executor, with manual dispatch)
  const adminDispatchRows = await sql`
    SELECT COALESCE(SUM(c.executor_amount), 0) AS amount
    FROM commissions c
    JOIN bookings b ON b.id = c.booking_id
    WHERE c.executor_driver_id = ${driverId}
      AND b.dispatch_status = 'manual_dispatch_required'
      AND c.status != 'disputed'
  `
  const adminDispatchEarnings = Number(adminDispatchRows[0]?.amount ?? 0)

  // ── Monthly chart data (last 6 months) ─────────────────────────────────────
  const monthlyRows = await sql`
    SELECT
      DATE_TRUNC('month', c.created_at) AS month,
      COALESCE(SUM(CASE WHEN c.executor_driver_id = ${driverId} THEN c.executor_amount ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN c.source_driver_id   = ${driverId} THEN c.source_amount   ELSE 0 END), 0) AS earnings
    FROM commissions c
    WHERE (c.executor_driver_id = ${driverId} OR c.source_driver_id = ${driverId})
      AND c.created_at >= NOW() - INTERVAL '6 months'
      AND c.status != 'disputed'
    GROUP BY DATE_TRUNC('month', c.created_at)
    ORDER BY month ASC
  `
  const monthlyChart = monthlyRows.map((r: { month: string; earnings: string }) => ({
    month: new Date(r.month).toLocaleDateString("en-US", { month: "short" }),
    earnings: Number(r.earnings),
  }))

  // ── Best week / best month ──────────────────────────────────────────────────
  const bestWeekRows = await sql`
    SELECT MAX(weekly_total) AS best_week FROM (
      SELECT DATE_TRUNC('week', c.created_at) AS wk,
        SUM(CASE WHEN c.executor_driver_id = ${driverId} THEN c.executor_amount ELSE 0 END) +
        SUM(CASE WHEN c.source_driver_id   = ${driverId} THEN c.source_amount   ELSE 0 END) AS weekly_total
      FROM commissions c
      WHERE (c.executor_driver_id = ${driverId} OR c.source_driver_id = ${driverId})
        AND c.status != 'disputed'
      GROUP BY wk
    ) sub
  `
  const bestMonthRows = await sql`
    SELECT MAX(monthly_total) AS best_month FROM (
      SELECT DATE_TRUNC('month', c.created_at) AS mo,
        SUM(CASE WHEN c.executor_driver_id = ${driverId} THEN c.executor_amount ELSE 0 END) +
        SUM(CASE WHEN c.source_driver_id   = ${driverId} THEN c.source_amount   ELSE 0 END) AS monthly_total
      FROM commissions c
      WHERE (c.executor_driver_id = ${driverId} OR c.source_driver_id = ${driverId})
        AND c.status != 'disputed'
      GROUP BY mo
    ) sub
  `
  const bestWeek  = Number(bestWeekRows[0]?.best_week  ?? 0)
  const bestMonth = Number(bestMonthRows[0]?.best_month ?? 0)

  // ── Payout dashboard ────────────────────────────────────────────────────────
  const payoutRows = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN c.status = 'pending' AND (c.executor_driver_id = ${driverId} OR c.source_driver_id = ${driverId})
        THEN (CASE WHEN c.executor_driver_id = ${driverId} THEN c.executor_amount ELSE 0 END) +
             (CASE WHEN c.source_driver_id   = ${driverId} THEN c.source_amount   ELSE 0 END)
        ELSE 0 END), 0) AS pending_balance,
      COALESCE(SUM(CASE WHEN c.status = 'confirmed' AND (c.executor_driver_id = ${driverId} OR c.source_driver_id = ${driverId})
        THEN (CASE WHEN c.executor_driver_id = ${driverId} THEN c.executor_amount ELSE 0 END) +
             (CASE WHEN c.source_driver_id   = ${driverId} THEN c.source_amount   ELSE 0 END)
        ELSE 0 END), 0) AS available_balance
    FROM commissions c
  `
  const pendingBalance   = Number(payoutRows[0]?.pending_balance   ?? 0)
  const availableBalance = Number(payoutRows[0]?.available_balance ?? 0)

  // ── Per-ride earnings detail (last 30 completed rides) ─────────────────────
  const rideDetailRows = await sql`
    SELECT
      b.id AS booking_id,
      b.pickup_location,
      b.dropoff_location,
      b.pickup_datetime,
      b.total_price,
      b.vehicle_type,
      cl.full_name AS client_name,
      c.executor_amount,
      c.source_amount,
      c.platform_amount,
      c.status AS payout_status,
      c.executor_driver_id,
      c.source_driver_id,
      c.created_at AS commission_date
    FROM commissions c
    JOIN bookings b ON b.id = c.booking_id
    LEFT JOIN clients cl ON cl.id = b.client_id
    WHERE (c.executor_driver_id = ${driverId} OR c.source_driver_id = ${driverId})
    ORDER BY c.created_at DESC
    LIMIT 30
  `
  const rideDetail = rideDetailRows.map((r: {
    booking_id: string; pickup_location: string; dropoff_location: string;
    pickup_datetime: string | null; total_price: string; vehicle_type: string;
    client_name: string | null; executor_amount: string | null; source_amount: string | null;
    platform_amount: string | null; payout_status: string; executor_driver_id: string | null;
    source_driver_id: string | null; commission_date: string;
  }) => {
    const isExecutor = r.executor_driver_id === driverId
    const isSource   = r.source_driver_id   === driverId
    const driverNet  = (isExecutor ? Number(r.executor_amount ?? 0) : 0)
                     + (isSource   ? Number(r.source_amount   ?? 0) : 0)
    return {
      booking_id:      r.booking_id,
      pickup_location: r.pickup_location,
      dropoff_location: r.dropoff_location,
      pickup_datetime: r.pickup_datetime,
      total_fare:      Number(r.total_price),
      vehicle_type:    r.vehicle_type,
      client_name:     r.client_name,
      sln_commission:  Number(r.platform_amount ?? 0),
      driver_net:      driverNet,
      role:            isExecutor && isSource ? "both" : isExecutor ? "executor" : "source",
      payout_status:   r.payout_status,
      date:            r.commission_date,
    }
  })

  // ── Payout history (paid commissions) ──────────────────────────────────────
  const payoutHistoryRows = await sql`
    SELECT
      c.paid_at,
      SUM(
        (CASE WHEN c.executor_driver_id = ${driverId} THEN COALESCE(c.executor_amount, 0) ELSE 0 END) +
        (CASE WHEN c.source_driver_id   = ${driverId} THEN COALESCE(c.source_amount,   0) ELSE 0 END)
      ) AS amount,
      c.status
    FROM commissions c
    WHERE (c.executor_driver_id = ${driverId} OR c.source_driver_id = ${driverId})
      AND c.status IN ('paid', 'confirmed')
    GROUP BY c.paid_at, c.status
    ORDER BY c.paid_at DESC NULLS LAST
    LIMIT 10
  `
  const payoutHistory = payoutHistoryRows.map((r: { paid_at: string | null; amount: string; status: string }) => ({
    date:   r.paid_at ? new Date(r.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
    amount: Number(r.amount),
    status: r.status,
  }))

  return NextResponse.json({
    driver_name:    driver.full_name,
    driver_code:    driver.driver_code,
    // Layer A — Quick summary
    week_earnings:   weekEarnings,
    month_earnings:  monthEarnings,
    total_earnings:  totalEarnings,
    // Layer B — Period comparison
    vs_last_week:    vsLastWeek,
    vs_last_month:   vsLastMonth,
    // Layer C — Source breakdown
    source_breakdown: {
      captured_clients: capturedRevenue,
      sln_network:      slnNetworkEarnings,
      admin_dispatch:   adminDispatchEarnings,
    },
    // Layer D — Monthly chart
    monthly_chart: monthlyChart,
    // Layer E — Captured client impact
    captured_clients_count:   capturedCount,
    captured_clients_revenue: capturedRevenue,
    // Layer F — Payout dashboard
    available_balance: availableBalance,
    pending_balance:   pendingBalance,
    // Layer G — Psychological engagement
    best_week:  bestWeek,
    best_month: bestMonth,
    // Layer H — Per-ride detail
    ride_detail: rideDetail,
    // Layer I — Payout history
    payout_history: payoutHistory,
    // Stripe Connect placeholder
    stripe_connect: {
      connected: false,
      payout_method: null,
      next_payout_date: null,
      payout_schedule: "weekly",
    },
  })
}
