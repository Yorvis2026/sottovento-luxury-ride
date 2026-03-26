import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/admin/migrate-commission-engine
//
// One-time idempotent migration for SLN Commission Engine v1.0
//
// Adds to bookings:
//   commission_model          TEXT
//   commission_platform_pct   NUMERIC(5,2)
//   commission_source_pct     NUMERIC(5,2)
//   commission_executor_pct   NUMERIC(5,2)
//   commission_locked_at      TIMESTAMPTZ
//
// Adds to commissions:
//   commission_model          TEXT
//   override_reason           TEXT
//   override_timestamp        TIMESTAMPTZ
//   override_admin_id         UUID
//
// Creates snapshot table:
//   booking_financial_attribution_snapshot
//
// Safe to run multiple times — ADD COLUMN IF NOT EXISTS is idempotent.
// ============================================================

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET(req: NextRequest) {
  const results: any = { steps: [] };

  try {
    // ── Step 1: Add commission fields to bookings ─────────────
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_model TEXT`;
    results.steps.push({ step: "bookings.commission_model", status: "ok" });

    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_platform_pct NUMERIC(5,2)`;
    results.steps.push({ step: "bookings.commission_platform_pct", status: "ok" });

    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_source_pct NUMERIC(5,2)`;
    results.steps.push({ step: "bookings.commission_source_pct", status: "ok" });

    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_executor_pct NUMERIC(5,2)`;
    results.steps.push({ step: "bookings.commission_executor_pct", status: "ok" });

    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_locked_at TIMESTAMPTZ`;
    results.steps.push({ step: "bookings.commission_locked_at", status: "ok" });

    // ── Step 2: Add commission_model to commissions table ─────
    await sql`ALTER TABLE commissions ADD COLUMN IF NOT EXISTS commission_model TEXT`;
    results.steps.push({ step: "commissions.commission_model", status: "ok" });

    // ── Step 3: Add override fields to commissions table ──────
    await sql`ALTER TABLE commissions ADD COLUMN IF NOT EXISTS override_reason TEXT`;
    results.steps.push({ step: "commissions.override_reason", status: "ok" });

    await sql`ALTER TABLE commissions ADD COLUMN IF NOT EXISTS override_timestamp TIMESTAMPTZ`;
    results.steps.push({ step: "commissions.override_timestamp", status: "ok" });

    await sql`ALTER TABLE commissions ADD COLUMN IF NOT EXISTS override_admin_id UUID`;
    results.steps.push({ step: "commissions.override_admin_id", status: "ok" });

    // ── Step 4: Create snapshot table ─────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS booking_financial_attribution_snapshot (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id            UUID NOT NULL REFERENCES bookings(id),
        source_driver_id      UUID,
        executor_driver_id    UUID,
        commission_model      TEXT NOT NULL,
        commission_platform_pct NUMERIC(5,2) NOT NULL,
        commission_source_pct   NUMERIC(5,2) NOT NULL,
        commission_executor_pct NUMERIC(5,2) NOT NULL,
        total_booking_amount  NUMERIC(10,2),
        platform_amount       NUMERIC(10,2),
        source_amount         NUMERIC(10,2),
        executor_amount       NUMERIC(10,2),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_snapshot_booking UNIQUE (booking_id)
      )
    `;
    results.steps.push({ step: "create_snapshot_table", status: "ok" });

    // ── Step 5: Verify final state ────────────────────────────
    const bookingCols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bookings'
        AND column_name IN (
          'commission_model', 'commission_platform_pct',
          'commission_source_pct', 'commission_executor_pct',
          'commission_locked_at'
        )
      ORDER BY column_name
    `;
    results.bookings_commission_fields = bookingCols.map((c: any) => c.column_name);
    results.all_booking_fields_present = results.bookings_commission_fields.length === 5;

    const snapshotExists = await sql`
      SELECT COUNT(*) AS cnt
      FROM information_schema.tables
      WHERE table_name = 'booking_financial_attribution_snapshot'
    `;
    results.snapshot_table_exists = Number(snapshotExists[0]?.cnt ?? 0) > 0;

    results.ok = results.all_booking_fields_present && results.snapshot_table_exists;

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[migrate-commission-engine]", err);
    return NextResponse.json(
      { ok: false, error: err?.message, steps: results.steps },
      { status: 500 }
    );
  }
}
