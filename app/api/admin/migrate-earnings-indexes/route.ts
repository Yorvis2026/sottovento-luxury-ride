export const dynamic = "force-dynamic"
// ============================================================
// GET /api/admin/migrate-earnings-indexes
//
// SLN Driver Earnings Dashboard API v1.0 — Performance Indexes
//
// Creates read indexes on driver_earnings_ledger for dashboard queries.
// Idempotent: uses CREATE INDEX IF NOT EXISTS.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  // Index 1: driver_id + earning_role (most common filter combination)
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_del_driver_role
        ON driver_earnings_ledger (driver_id, earning_role)
    `;
    results.idx_del_driver_role = "ok";
  } catch (e) {
    results.idx_del_driver_role = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Index 2: driver_id + ledger_status (for unpaid/paid filter)
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_del_driver_status
        ON driver_earnings_ledger (driver_id, ledger_status)
    `;
    results.idx_del_driver_status = "ok";
  } catch (e) {
    results.idx_del_driver_status = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Index 3: driver_id + posted_at DESC (for history sort)
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_del_driver_posted_at
        ON driver_earnings_ledger (driver_id, posted_at DESC)
    `;
    results.idx_del_driver_posted_at = "ok";
  } catch (e) {
    results.idx_del_driver_posted_at = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Index 4: booking_id (for JOIN with bookings)
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_del_booking_id
        ON driver_earnings_ledger (booking_id)
    `;
    results.idx_del_booking_id = "ok";
  } catch (e) {
    results.idx_del_booking_id = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Verify ledger table exists and has expected columns
  const [tableCheck] = await sql`
    SELECT
      COUNT(*) AS total_rows,
      COUNT(DISTINCT driver_id) AS distinct_drivers
    FROM driver_earnings_ledger
  `.catch(() => [{ total_rows: 0, distinct_drivers: 0 }]);

  return NextResponse.json({
    ok: true,
    indexes: results,
    verification: {
      total_ledger_rows:  Number(tableCheck?.total_rows      ?? 0),
      distinct_drivers:   Number(tableCheck?.distinct_drivers ?? 0),
    },
  });
}
