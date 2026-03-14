import { NextRequest, NextResponse } from "next/server";
import type { SourceDriverSummary, DriverEarnings } from "@/lib/dispatch/types";

// ============================================================
// GET /api/dispatch/source-summary?driver_id=xxx
// Returns aggregated source driver metrics
// Mirrors the source_driver_summary DB view
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driver_id");

    if (!driverId) {
      return NextResponse.json({ error: "driver_id required" }, { status: 400 });
    }

    // In production: run the source_driver_summary view query
    // SELECT * FROM source_driver_summary WHERE driver_id = $1
    const summary = await db.getSourceDriverSummary(driverId);

    if (!summary) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("[dispatch/source-summary]", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// ============================================================
// GET /api/dispatch/earnings?driver_id=xxx&month=2026-03
// Returns split earnings: executor vs source
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { driver_id, month } = await req.json();

    if (!driver_id) {
      return NextResponse.json({ error: "driver_id required" }, { status: 400 });
    }

    const earnings = await db.getDriverEarnings(driver_id, month);

    return NextResponse.json(earnings);
  } catch (err: any) {
    console.error("[dispatch/earnings]", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// ============================================================
// DB adapter stub — replace with Supabase / Prisma / Drizzle
// ============================================================
const db = {
  getSourceDriverSummary: async (driverId: string): Promise<SourceDriverSummary | null> => {
    // SQL equivalent:
    // SELECT * FROM source_driver_summary WHERE driver_id = $1
    return {
      driver_id: driverId,
      driver_name: "Demo Driver",
      driver_code: "DRV001",
      driver_status: "active",
      total_clients_captured: 0,
      active_clients_captured: 0,
      repeat_bookings_count: 0,
      lifetime_source_earnings: 0,
      monthly_source_earnings: 0,
      pending_offers_count: 0,
    };
  },

  getDriverEarnings: async (
    driverId: string,
    month?: string
  ): Promise<DriverEarnings> => {
    // SQL equivalent:
    // SELECT
    //   SUM(CASE WHEN executor_driver_id = $1 THEN executor_amount ELSE 0 END) AS executor_earnings,
    //   COUNT(CASE WHEN executor_driver_id = $1 THEN 1 END) AS executor_rides,
    //   SUM(CASE WHEN source_driver_id = $1 THEN source_amount ELSE 0 END) AS source_earnings,
    //   COUNT(CASE WHEN source_driver_id = $1 THEN 1 END) AS source_rides
    // FROM commissions
    // WHERE status IN ('confirmed','paid')
    //   AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)
    const periodStart = month ? `${month}-01` : new Date().toISOString().slice(0, 7) + "-01";
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return {
      driver_id: driverId,
      period_start: periodStart,
      period_end: periodEnd.toISOString().slice(0, 10),
      executor_earnings: 0,
      executor_rides: 0,
      source_earnings: 0,
      source_rides: 0,
      total_earnings: 0,
    };
  },
};
