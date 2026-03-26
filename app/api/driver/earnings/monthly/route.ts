// ============================================================
// GET /api/driver/earnings/monthly?code=YHV001
//
// SLN Driver Earnings Dashboard API v1.0 — Monthly
//
// Returns monthly grouped earnings for the logged-in driver.
// Source of truth: driver_earnings_ledger
// Excludes: earning_role = 'platform'
//
// Query params:
//   code    — driver code (required)
//   months  — number of months to return (default: 12, max: 36)
//   from    — ISO date override start
//   to      — ISO date override end
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

    // ── Parse query params ────────────────────────────────────
    const months   = Math.min(36, Math.max(1, parseInt(searchParams.get("months") ?? "12", 10)));
    const fromDate = searchParams.get("from") ?? null;
    const toDate   = searchParams.get("to")   ?? null;

    // ── Monthly aggregation ───────────────────────────────────
    const rows = await sql`
      SELECT
        EXTRACT(YEAR  FROM posted_at)::int AS year,
        EXTRACT(MONTH FROM posted_at)::int AS month,
        COALESCE(SUM(CASE WHEN ledger_status = 'posted'  THEN amount_earned ELSE 0 END), 0) AS posted_total,
        COALESCE(SUM(CASE WHEN ledger_status = 'paid'    THEN amount_earned ELSE 0 END), 0) AS paid_total,
        COALESCE(SUM(CASE WHEN ledger_status NOT IN ('voided') THEN amount_earned ELSE 0 END), 0) AS total_earnings,
        COUNT(DISTINCT booking_id) AS bookings_count
      FROM driver_earnings_ledger
      WHERE driver_id = ${driverId}::uuid
        AND earning_role IN ('source_driver', 'executor_driver')
        AND ledger_status NOT IN ('voided')
        AND (
          (${fromDate}::text IS NOT NULL AND posted_at >= ${fromDate}::timestamptz)
          OR
          (${fromDate}::text IS NULL AND posted_at >= NOW() - (${months} || ' months')::interval)
        )
        AND (${toDate}::text IS NULL OR posted_at <= ${toDate}::timestamptz)
      GROUP BY year, month
      ORDER BY year DESC, month DESC
    `;

    const monthly = rows.map((r: Record<string, unknown>) => ({
      year:           Number(r.year),
      month:          Number(r.month),
      posted_total:   Number(r.posted_total   ?? 0),
      paid_total:     Number(r.paid_total     ?? 0),
      total_earnings: Number(r.total_earnings ?? 0),
      bookings_count: Number(r.bookings_count ?? 0),
    }));

    return NextResponse.json({
      driver_id:   driverId,
      driver_code: driver.driver_code,
      months_requested: months,
      from: fromDate,
      to:   toDate,
      monthly,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[driver/earnings/monthly] error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
