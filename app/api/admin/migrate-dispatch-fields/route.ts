import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/admin/migrate-dispatch-fields
// One-time idempotent migration: adds SLN Dispatch Engine v1.0
// spec fields to the bookings table.
//
// Fields added (if not already present):
//   - offered_driver_id  UUID
//   - accepted_driver_id UUID
//   - executor_driver_id UUID
//
// Fields already confirmed present (no-op):
//   - dispatch_status    TEXT
//   - offer_expires_at   TIMESTAMPTZ
//
// Safe to run multiple times — ADD COLUMN IF NOT EXISTS is idempotent.
// ============================================================

export async function GET(req: NextRequest) {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const results: any = { steps: [] };

  try {
    // ── Step 1: Add missing columns ──────────────────────────
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offered_driver_id UUID`;
    results.steps.push({ step: "add_offered_driver_id", status: "ok" });

    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_driver_id UUID`;
    results.steps.push({ step: "add_accepted_driver_id", status: "ok" });

    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS executor_driver_id UUID`;
    results.steps.push({ step: "add_executor_driver_id", status: "ok" });

    // ── Step 2: Backfill accepted/executor from assigned_driver_id ──
    const backfillAccepted = await sql`
      UPDATE bookings
      SET
        accepted_driver_id = assigned_driver_id,
        executor_driver_id = assigned_driver_id
      WHERE status IN ('accepted', 'en_route', 'arrived', 'in_trip', 'completed')
        AND assigned_driver_id IS NOT NULL
        AND accepted_driver_id IS NULL
      RETURNING id
    `;
    results.steps.push({
      step: "backfill_accepted_executor",
      status: "ok",
      rows_updated: backfillAccepted.length,
    });

    // ── Step 3: Backfill offered_driver_id from assigned_driver_id ──
    const backfillOffered1 = await sql`
      UPDATE bookings
      SET offered_driver_id = assigned_driver_id
      WHERE dispatch_status IN ('offer_pending', 'offer_accepted')
        AND assigned_driver_id IS NOT NULL
        AND offered_driver_id IS NULL
      RETURNING id
    `;
    results.steps.push({
      step: "backfill_offered_from_assigned",
      status: "ok",
      rows_updated: backfillOffered1.length,
    });

    // ── Step 4: Backfill offered_driver_id from source_driver_id ──
    const backfillOffered2 = await sql`
      UPDATE bookings
      SET offered_driver_id = source_driver_id
      WHERE dispatch_status = 'offer_pending'
        AND source_driver_id IS NOT NULL
        AND offered_driver_id IS NULL
      RETURNING id
    `;
    results.steps.push({
      step: "backfill_offered_from_source",
      status: "ok",
      rows_updated: backfillOffered2.length,
    });

    // ── Step 5: Verify final column list ─────────────────────
    const cols = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'bookings'
        AND column_name IN (
          'offered_driver_id', 'accepted_driver_id', 'executor_driver_id',
          'dispatch_status', 'offer_expires_at'
        )
      ORDER BY column_name
    `;
    results.spec_fields_present = cols.map((c: any) => c.column_name);
    results.all_spec_fields_present = results.spec_fields_present.length === 5;
    results.ok = true;

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[migrate-dispatch-fields]", err);
    return NextResponse.json(
      { ok: false, error: err?.message, steps: results.steps },
      { status: 500 }
    );
  }
}
