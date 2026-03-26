// ============================================================
// GET /api/admin/migrate-weekly-payout
//
// SLN Weekly Payout System v1.0 — DB Migration
// Idempotent: safe to run multiple times
//
// Changes:
//
// 1. drivers table — payout onboarding fields:
//    payout_method              TEXT  (stripe | bank_wire | zelle | check | other)
//    payout_onboarding_status   TEXT  (not_started | pending | complete | suspended)
//    payouts_enabled            BOOLEAN
//    last_payout_date           TIMESTAMPTZ
//    payout_notes               TEXT  (admin review notes)
//
// 2. driver_earnings_ledger — lifecycle status upgrade:
//    ledger_status CHECK extended to include 'unpaid' | 'pending_payout'
//    (existing: pending | posted | paid | voided | adjusted)
//    New canonical flow: unpaid → pending_payout → paid → reconciled
//    payout_batch_id already exists (TEXT) — will be typed as UUID ref
//
// 3. payout_batches table (new):
//    Represents one weekly payout run for one driver
//    id, driver_id, week_start, week_end, total_amount,
//    earnings_count, status, payment_method, reference, notes,
//    created_by_admin_id, executed_at, reconciled_at
//
// 4. Indexes for performance + idempotency
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: Array<{ step: string; status: string; detail?: string }> = [];

  // ── Step 1: Add payout onboarding fields to drivers ──────
  const driverPayoutCols = [
    { col: "payout_method",            def: "TEXT DEFAULT 'not_set'" },
    { col: "payout_onboarding_status", def: "TEXT DEFAULT 'not_started'" },
    { col: "payouts_enabled",          def: "BOOLEAN NOT NULL DEFAULT FALSE" },
    { col: "last_payout_date",         def: "TIMESTAMPTZ" },
    { col: "payout_notes",             def: "TEXT" },
  ];
  for (const { col, def } of driverPayoutCols) {
    try {
      await sql.unsafe(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ${col} ${def}`);
      steps.push({ step: `drivers.${col}`, status: "ok" });
    } catch (e: any) {
      steps.push({ step: `drivers.${col}`, status: "error", detail: e?.message });
    }
  }

  // ── Step 2: Add payout_batch_uuid to driver_earnings_ledger ──
  // The existing payout_batch_id is TEXT — add a proper UUID FK column
  try {
    await sql`
      ALTER TABLE driver_earnings_ledger
        ADD COLUMN IF NOT EXISTS payout_batch_uuid UUID
    `;
    steps.push({ step: "ledger.payout_batch_uuid", status: "ok" });
  } catch (e: any) {
    steps.push({ step: "ledger.payout_batch_uuid", status: "error", detail: e?.message });
  }

  // ── Step 3: Create payout_batches table ──────────────────
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS payout_batches (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        -- Driver
        driver_id           UUID NOT NULL REFERENCES drivers(id),
        -- Week range
        week_start          TIMESTAMPTZ NOT NULL,
        week_end            TIMESTAMPTZ NOT NULL,
        -- Amounts
        total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
        earnings_count      INT NOT NULL DEFAULT 0,
        currency            TEXT NOT NULL DEFAULT 'USD',
        -- Status lifecycle
        -- draft | pending_payout | paid | reconciled | cancelled
        status              TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','pending_payout','paid','reconciled','cancelled')),
        -- Payment info
        payment_method      TEXT,
        -- stripe | bank_wire | zelle | check | other
        external_reference  TEXT,
        -- Stripe payout ID, wire ref, etc.
        notes               TEXT,
        -- Admin tracking
        created_by_admin_id TEXT,
        executed_at         TIMESTAMPTZ,
        reconciled_at       TIMESTAMPTZ,
        cancelled_at        TIMESTAMPTZ,
        -- Timestamps
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    steps.push({ step: "create_payout_batches", status: "ok" });
  } catch (e: any) {
    steps.push({ step: "create_payout_batches", status: "error", detail: e?.message });
  }

  // ── Step 4: Unique constraint — one batch per driver per week ──
  try {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_batch_driver_week
        ON payout_batches (driver_id, week_start)
        WHERE status NOT IN ('cancelled')
    `;
    steps.push({ step: "uq_payout_batch_driver_week", status: "ok" });
  } catch (e: any) {
    if (e?.message?.includes("already exists")) {
      steps.push({ step: "uq_payout_batch_driver_week", status: "already_exists" });
    } else {
      steps.push({ step: "uq_payout_batch_driver_week", status: "error", detail: e?.message });
    }
  }

  // ── Step 5: Index on payout_batches.driver_id ────────────
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_payout_batches_driver
        ON payout_batches (driver_id)
    `;
    steps.push({ step: "idx_payout_batches_driver", status: "ok" });
  } catch (e: any) {
    steps.push({ step: "idx_payout_batches_driver", status: "error", detail: e?.message });
  }

  // ── Step 6: Index on payout_batches.status ───────────────
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_payout_batches_status
        ON payout_batches (status)
    `;
    steps.push({ step: "idx_payout_batches_status", status: "ok" });
  } catch (e: any) {
    steps.push({ step: "idx_payout_batches_status", status: "error", detail: e?.message });
  }

  // ── Step 7: Index on ledger.payout_batch_uuid ────────────
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ledger_payout_batch_uuid
        ON driver_earnings_ledger (payout_batch_uuid)
        WHERE payout_batch_uuid IS NOT NULL
    `;
    steps.push({ step: "idx_ledger_payout_batch_uuid", status: "ok" });
  } catch (e: any) {
    steps.push({ step: "idx_ledger_payout_batch_uuid", status: "error", detail: e?.message });
  }

  // ── Step 8: Add FK from ledger to payout_batches ─────────
  try {
    await sql`
      ALTER TABLE driver_earnings_ledger
        ADD CONSTRAINT fk_ledger_payout_batch
        FOREIGN KEY (payout_batch_uuid)
        REFERENCES payout_batches(id)
    `;
    steps.push({ step: "fk_ledger_payout_batch", status: "ok" });
  } catch (e: any) {
    if (e?.message?.includes("already exists")) {
      steps.push({ step: "fk_ledger_payout_batch", status: "already_exists" });
    } else {
      steps.push({ step: "fk_ledger_payout_batch", status: "error", detail: e?.message });
    }
  }

  // ── Step 9: Update ledger_status CHECK constraint to include new statuses ──
  // Drop old constraint and recreate with full lifecycle: unpaid | pending | posted | pending_payout | paid | reconciled | voided | adjusted
  try {
    await sql`
      ALTER TABLE driver_earnings_ledger
        DROP CONSTRAINT IF EXISTS driver_earnings_ledger_ledger_status_check
    `;
    await sql`
      ALTER TABLE driver_earnings_ledger
        ADD CONSTRAINT driver_earnings_ledger_ledger_status_check
        CHECK (ledger_status IN ('unpaid','pending','posted','pending_payout','paid','reconciled','voided','adjusted'))
    `;
    steps.push({ step: "update_ledger_status_check", status: "ok" });
  } catch (e: any) {
    steps.push({ step: "update_ledger_status_check", status: "error", detail: e?.message });
  }

  // ── Step 10: Update existing 'posted' ledger rows to 'unpaid' ──
  // New earnings should start as 'unpaid'. Existing 'posted' rows
  // are semantically unpaid — migrate them to the new status.
  try {
    const updated = await sql`
      UPDATE driver_earnings_ledger
      SET ledger_status = 'unpaid', updated_at = NOW()
      WHERE ledger_status = 'posted'
        AND payout_batch_uuid IS NULL
        AND earning_role IN ('source_driver', 'executor_driver')
    `;
    steps.push({ step: "migrate_posted_to_unpaid", status: "ok", detail: `${updated.length ?? 0} rows updated` });
  } catch (e: any) {
    steps.push({ step: "migrate_posted_to_unpaid", status: "error", detail: e?.message });
  }

  // ── Verify final state ────────────────────────────────────
  const errors = steps.filter(s => s.status === "error");

  // Count payout_batches table
  let batchTableExists = false;
  try {
    const r = await sql`SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_name = 'payout_batches'`;
    batchTableExists = Number(r[0]?.cnt ?? 0) > 0;
  } catch { /* ignore */ }

  // Count driver payout columns
  let driverColsCount = 0;
  try {
    const r = await sql`
      SELECT COUNT(*) AS cnt FROM information_schema.columns
      WHERE table_name = 'drivers'
        AND column_name IN ('payout_method','payout_onboarding_status','payouts_enabled','last_payout_date','payout_notes')
    `;
    driverColsCount = Number(r[0]?.cnt ?? 0);
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: errors.length === 0,
    steps,
    errors: errors.length > 0 ? errors : undefined,
    summary: {
      payout_batches_table: batchTableExists,
      driver_payout_cols: driverColsCount,
      driver_payout_cols_expected: 5,
    },
  });
}
