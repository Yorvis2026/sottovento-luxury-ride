// ============================================================
// GET /api/driver/earnings/summary?code=YHV001
//
// SLN Driver Earnings Dashboard API v1.0 — Summary
//
// Returns top-level summary cards for the logged-in driver.
// Source of truth: driver_earnings_ledger
// Excludes: earning_role = 'platform' (never exposed to drivers)
// Security: driver can only see their own data (resolved via code)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    // ── Resolve driver identity securely ─────────────────────
    const driverRows = await sql`
      SELECT id, driver_code, full_name
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `;
    if (driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const driver = driverRows[0];
    const driverId: string = driver.id;

    // ── Summary aggregation from ledger ──────────────────────
    // Excludes platform rows. Excludes voided rows from lifetime total.
    const [summary] = await sql`
      SELECT
        -- Unpaid balance (posted, not yet paid)
        COALESCE(SUM(CASE WHEN ledger_status = 'posted'  THEN amount_earned ELSE 0 END), 0) AS unpaid_balance,
        -- Paid balance
        COALESCE(SUM(CASE WHEN ledger_status = 'paid'    THEN amount_earned ELSE 0 END), 0) AS paid_balance,
        -- Lifetime (exclude voided)
        COALESCE(SUM(CASE WHEN ledger_status NOT IN ('voided') THEN amount_earned ELSE 0 END), 0) AS total_lifetime_earnings,
        -- Current month
        COALESCE(SUM(CASE
          WHEN DATE_TRUNC('month', posted_at) = DATE_TRUNC('month', NOW())
           AND ledger_status NOT IN ('voided')
          THEN amount_earned ELSE 0 END), 0) AS current_month_earnings,
        -- Previous month
        COALESCE(SUM(CASE
          WHEN DATE_TRUNC('month', posted_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
           AND ledger_status NOT IN ('voided')
          THEN amount_earned ELSE 0 END), 0) AS previous_month_earnings,
        -- Row counts
        COUNT(CASE WHEN ledger_status = 'posted' THEN 1 END) AS total_posted_rows,
        COUNT(CASE WHEN ledger_status = 'paid'   THEN 1 END) AS total_paid_rows,
        -- Currency (take first non-null)
        MIN(currency) AS currency
      FROM driver_earnings_ledger
      WHERE driver_id = ${driverId}::uuid
        AND earning_role IN ('source_driver', 'executor_driver')
    `;

    return NextResponse.json({
      driver_id:               driverId,
      driver_code:             driver.driver_code,
      driver_name:             driver.full_name,
      currency:                summary?.currency ?? "USD",
      unpaid_balance:          Number(summary?.unpaid_balance          ?? 0),
      paid_balance:            Number(summary?.paid_balance            ?? 0),
      total_lifetime_earnings: Number(summary?.total_lifetime_earnings ?? 0),
      current_month_earnings:  Number(summary?.current_month_earnings  ?? 0),
      previous_month_earnings: Number(summary?.previous_month_earnings ?? 0),
      total_posted_rows:       Number(summary?.total_posted_rows       ?? 0),
      total_paid_rows:         Number(summary?.total_paid_rows         ?? 0),
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[driver/earnings/summary] error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
