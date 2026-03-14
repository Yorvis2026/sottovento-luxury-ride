import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import type { SourceDriverSummary, DriverEarnings } from "@/lib/dispatch/types";

const sql = neon(process.env.DATABASE_URL!);

// ============================================================
// GET /api/dispatch/source-summary?driver_id=xxx
// Returns aggregated source driver metrics from the DB view
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driver_id");

    if (!driverId) {
      return NextResponse.json({ error: "driver_id required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM source_driver_summary
      WHERE driver_id = ${driverId}::uuid
      LIMIT 1
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const summary: SourceDriverSummary = {
      driver_id: rows[0].driver_id,
      driver_name: rows[0].driver_name,
      driver_code: rows[0].driver_code,
      driver_status: rows[0].driver_status,
      total_clients_captured: Number(rows[0].total_clients_captured),
      active_clients_captured: Number(rows[0].active_clients_captured),
      repeat_bookings_count: Number(rows[0].repeat_bookings_count),
      lifetime_source_earnings: Number(rows[0].lifetime_source_earnings),
      monthly_source_earnings: Number(rows[0].monthly_source_earnings),
      pending_offers_count: Number(rows[0].pending_offers_count),
    };

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("[dispatch/source-summary]", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// ============================================================
// POST /api/dispatch/source-summary
// Returns split earnings: executor vs source for a given month
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { driver_id, month } = await req.json();

    if (!driver_id) {
      return NextResponse.json({ error: "driver_id required" }, { status: 400 });
    }

    const periodStart = month
      ? `${month}-01`
      : new Date().toISOString().slice(0, 7) + "-01";

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const periodEndStr = periodEnd.toISOString().slice(0, 10);

    const rows = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN executor_driver_id = ${driver_id}::uuid
                         THEN executor_amount ELSE 0 END), 0) AS executor_earnings,
        COUNT(CASE WHEN executor_driver_id = ${driver_id}::uuid THEN 1 END) AS executor_rides,
        COALESCE(SUM(CASE WHEN source_driver_id = ${driver_id}::uuid
                         THEN source_amount ELSE 0 END), 0) AS source_earnings,
        COUNT(CASE WHEN source_driver_id = ${driver_id}::uuid THEN 1 END) AS source_rides
      FROM commissions
      WHERE status IN ('confirmed', 'paid')
        AND created_at >= ${periodStart}::date
        AND created_at < ${periodEndStr}::date
    `;

    const r = rows[0];
    const executorEarnings = Number(r?.executor_earnings ?? 0);
    const sourceEarnings = Number(r?.source_earnings ?? 0);

    const earnings: DriverEarnings = {
      driver_id,
      period_start: periodStart,
      period_end: periodEndStr,
      executor_earnings: executorEarnings,
      executor_rides: Number(r?.executor_rides ?? 0),
      source_earnings: sourceEarnings,
      source_rides: Number(r?.source_rides ?? 0),
      total_earnings: executorEarnings + sourceEarnings,
    };

    return NextResponse.json(earnings);
  } catch (err: any) {
    console.error("[dispatch/earnings]", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
