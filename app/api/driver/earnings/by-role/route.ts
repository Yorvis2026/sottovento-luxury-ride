// ============================================================
// GET /api/driver/earnings/by-role?code=YHV001
//
// SLN Driver Earnings Dashboard API v1.0 — By Role
//
// Returns earnings breakdown by earning_role for the logged-in driver.
// Source of truth: driver_earnings_ledger
// Excludes: earning_role = 'platform' (never exposed to drivers)
//
// Query params:
//   code — driver code (required)
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

    // ── By-role aggregation ───────────────────────────────────
    const rows = await sql`
      SELECT
        earning_role,
        COALESCE(SUM(CASE WHEN ledger_status NOT IN ('voided') THEN amount_earned ELSE 0 END), 0) AS total_earnings,
        COALESCE(SUM(CASE WHEN ledger_status = 'posted'        THEN amount_earned ELSE 0 END), 0) AS unpaid_total,
        COALESCE(SUM(CASE WHEN ledger_status = 'paid'          THEN amount_earned ELSE 0 END), 0) AS paid_total,
        COUNT(DISTINCT CASE WHEN ledger_status NOT IN ('voided') THEN booking_id END) AS bookings_count
      FROM driver_earnings_ledger
      WHERE driver_id = ${driverId}::uuid
        AND earning_role IN ('source_driver', 'executor_driver')
      GROUP BY earning_role
    `;

    // ── Build zero-safe response ──────────────────────────────
    const byRole: Record<string, { total: number; unpaid: number; paid: number; count: number }> = {
      source_driver:   { total: 0, unpaid: 0, paid: 0, count: 0 },
      executor_driver: { total: 0, unpaid: 0, paid: 0, count: 0 },
    };

    for (const r of rows as Array<Record<string, unknown>>) {
      const role = r.earning_role as string;
      if (role === "source_driver" || role === "executor_driver") {
        byRole[role] = {
          total:  Number(r.total_earnings ?? 0),
          unpaid: Number(r.unpaid_total   ?? 0),
          paid:   Number(r.paid_total     ?? 0),
          count:  Number(r.bookings_count ?? 0),
        };
      }
    }

    return NextResponse.json({
      driver_id:   driverId,
      driver_code: driver.driver_code,
      // Source driver breakdown
      source_driver_total:           byRole.source_driver.total,
      source_driver_unpaid:          byRole.source_driver.unpaid,
      source_driver_paid:            byRole.source_driver.paid,
      source_driver_bookings_count:  byRole.source_driver.count,
      // Executor driver breakdown
      executor_driver_total:          byRole.executor_driver.total,
      executor_driver_unpaid:         byRole.executor_driver.unpaid,
      executor_driver_paid:           byRole.executor_driver.paid,
      executor_driver_bookings_count: byRole.executor_driver.count,
      // Combined
      combined_total:   byRole.source_driver.total + byRole.executor_driver.total,
      combined_unpaid:  byRole.source_driver.unpaid + byRole.executor_driver.unpaid,
      combined_paid:    byRole.source_driver.paid + byRole.executor_driver.paid,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[driver/earnings/by-role] error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
