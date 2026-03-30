export const dynamic = "force-dynamic"
// ============================================================
// GET /api/admin/migrate-earnings-ledger
// Driver Earnings Ledger System SLN v1.0 — DB Migration
// Idempotent: safe to run multiple times
// ============================================================
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

export const runtime = "edge";

export async function GET() {
  const errors: string[] = [];
  const results: Record<string, string> = {};

  // ── 1. Create driver_earnings_ledger table ────────────────
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS driver_earnings_ledger (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id          UUID NOT NULL,
        earning_role        TEXT NOT NULL CHECK (earning_role IN ('source_driver','executor_driver','platform')),
        driver_id           UUID,
        gross_booking_amount NUMERIC(12,2) NOT NULL,
        commission_model    TEXT NOT NULL,
        pct_applied         NUMERIC(5,2) NOT NULL,
        amount_earned       NUMERIC(12,2) NOT NULL,
        currency            TEXT NOT NULL DEFAULT 'USD',
        ledger_status       TEXT NOT NULL DEFAULT 'posted'
                              CHECK (ledger_status IN ('pending','posted','paid','voided','adjusted')),
        source_driver_id    UUID,
        executor_driver_id  UUID,
        source_type         TEXT,
        source_reference    TEXT,
        posted_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_out_at         TIMESTAMPTZ,
        payout_batch_id     TEXT,
        notes               TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    results.create_ledger_table = "ok";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`create_ledger_table: ${msg}`);
    results.create_ledger_table = "error";
  }

  // ── 2. Unique constraint: one row per booking+role+driver ─
  // For platform rows (driver_id IS NULL) we use COALESCE with a sentinel UUID
  try {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_booking_role_driver
        ON driver_earnings_ledger (
          booking_id,
          earning_role,
          COALESCE(driver_id, '00000000-0000-0000-0000-000000000000'::uuid)
        )
    `;
    results.create_unique_index = "ok";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`create_unique_index: ${msg}`);
    results.create_unique_index = "error";
  }

  // ── 3. Add ledger_posted_at to bookings ───────────────────
  try {
    await sql`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS ledger_posted_at TIMESTAMPTZ
    `;
    results.add_ledger_posted_at = "ok";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`add_ledger_posted_at: ${msg}`);
    results.add_ledger_posted_at = "error";
  }

  // ── 4. Create driver_unpaid_balances view ─────────────────
  try {
    await sql`
      CREATE OR REPLACE VIEW driver_unpaid_balances AS
        SELECT
          driver_id,
          COUNT(*)                          AS unpaid_bookings,
          SUM(amount_earned)                AS unpaid_balance,
          MIN(currency)                     AS currency,
          MIN(posted_at)                    AS oldest_unpaid_at,
          MAX(posted_at)                    AS newest_unpaid_at
        FROM driver_earnings_ledger
        WHERE
          ledger_status = 'posted'
          AND earning_role IN ('source_driver','executor_driver')
          AND driver_id IS NOT NULL
        GROUP BY driver_id
    `;
    results.create_unpaid_balances_view = "ok";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`create_unpaid_balances_view: ${msg}`);
    results.create_unpaid_balances_view = "error";
  }

  // ── 5. Verify ─────────────────────────────────────────────
  let ledger_table_exists = false;
  let unique_index_exists = false;
  let ledger_posted_at_exists = false;
  let view_exists = false;
  let existing_rows = 0;

  try {
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'driver_earnings_ledger'
      ) AS exists
    `;
    ledger_table_exists = tableCheck[0]?.exists === true;

    const idxCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'uq_ledger_booking_role_driver'
      ) AS exists
    `;
    unique_index_exists = idxCheck[0]?.exists === true;

    const colCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'ledger_posted_at'
      ) AS exists
    `;
    ledger_posted_at_exists = colCheck[0]?.exists === true;

    const viewCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'driver_unpaid_balances'
      ) AS exists
    `;
    view_exists = viewCheck[0]?.exists === true;

    if (ledger_table_exists) {
      const rowCount = await sql`SELECT COUNT(*) AS cnt FROM driver_earnings_ledger`;
      existing_rows = Number(rowCount[0]?.cnt ?? 0);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`verification: ${msg}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    results,
    verification: {
      ledger_table_exists,
      unique_index_exists,
      ledger_posted_at_in_bookings: ledger_posted_at_exists,
      driver_unpaid_balances_view: view_exists,
      existing_ledger_rows: existing_rows,
    },
    errors: errors.length > 0 ? errors : undefined,
  });
}
