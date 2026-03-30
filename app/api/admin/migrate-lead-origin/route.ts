export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/admin/migrate-lead-origin
//
// Idempotent DB migration for Lead Origin Tracking Engine v1.0
//
// Adds to bookings:
//   source_reference      TEXT
//   source_tablet_id      TEXT
//   source_campaign_id    TEXT
//   source_channel        TEXT
//   source_metadata       JSONB
//   source_locked_at      TIMESTAMPTZ
//
// Updates SourceType values in existing rows (backfill):
//   booking_origin='tablet'  → source_type='tablet'
//   captured_by != 'public_site' → source_type='driver_direct'
//   else → source_type='direct_web'
//
// Creates:
//   lead_origin_snapshots  (audit table, spec §19)
//
// Also adds to bookings for admin override audit trail:
//   source_override_reason      TEXT
//   source_override_timestamp   TIMESTAMPTZ
//   source_override_admin_id    UUID
// ============================================================

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

type StepResult = { step: string; status: string; detail?: string };

async function runStep(
  steps: StepResult[],
  name: string,
  fn: () => Promise<void>
) {
  try {
    await fn();
    steps.push({ step: name, status: "ok" });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    // Ignore "already exists" errors — idempotent
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate column") ||
      msg.includes("DuplicateColumn")
    ) {
      steps.push({ step: name, status: "already_exists" });
    } else {
      steps.push({ step: name, status: "error", detail: msg });
    }
  }
}

export async function GET(_req: NextRequest) {
  const steps: StepResult[] = [];

  // ── 1. Add missing columns to bookings ──────────────────
  await runStep(steps, "bookings.source_reference", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_reference TEXT`
  );
  await runStep(steps, "bookings.source_tablet_id", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_tablet_id TEXT`
  );
  await runStep(steps, "bookings.source_campaign_id", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_campaign_id TEXT`
  );
  await runStep(steps, "bookings.source_channel", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_channel TEXT`
  );
  await runStep(steps, "bookings.source_metadata", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_metadata JSONB`
  );
  await runStep(steps, "bookings.source_locked_at", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_locked_at TIMESTAMPTZ`
  );

  // ── 2. Add admin override audit fields ───────────────────
  await runStep(steps, "bookings.source_override_reason", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_override_reason TEXT`
  );
  await runStep(steps, "bookings.source_override_timestamp", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_override_timestamp TIMESTAMPTZ`
  );
  await runStep(steps, "bookings.source_override_admin_id", () =>
    sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_override_admin_id UUID`
  );

  // ── 3. Create lead_origin_snapshots table ────────────────
  await runStep(steps, "create_lead_origin_snapshots", () =>
    sql`
      CREATE TABLE IF NOT EXISTS lead_origin_snapshots (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        source_type       TEXT NOT NULL,
        source_driver_id  UUID,
        source_reference  TEXT,
        source_tablet_id  TEXT,
        source_campaign_id TEXT,
        source_channel    TEXT,
        source_metadata   JSONB,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(booking_id)
      )
    `
  );

  // ── 4. Backfill source_reference for existing bookings ───
  // Use source_code as source_reference if source_reference is null
  await runStep(steps, "backfill_source_reference", () =>
    sql`
      UPDATE bookings
      SET source_reference = COALESCE(source_code, 'UNKNOWN')
      WHERE source_reference IS NULL
        AND source_locked_at IS NULL
    `
  );

  // ── 5. Backfill source_channel for existing bookings ─────
  await runStep(steps, "backfill_source_channel", () =>
    sql`
      UPDATE bookings
      SET source_channel = CASE
        WHEN booking_origin = 'tablet' THEN 'tablet'
        WHEN source_type IN ('qr', 'referral') THEN 'referral'
        WHEN source_driver_id IS NOT NULL THEN 'referral'
        ELSE 'website'
      END
      WHERE source_channel IS NULL
        AND source_locked_at IS NULL
    `
  );

  // ── 6. Backfill source_type to new spec values ───────────
  // Map old values to new spec values
  await runStep(steps, "backfill_source_type_driver_direct", () =>
    sql`
      UPDATE bookings
      SET source_type = 'driver_direct'
      WHERE source_type IN ('referral', 'qr')
        AND source_driver_id IS NOT NULL
        AND source_locked_at IS NULL
    `
  );
  await runStep(steps, "backfill_source_type_tablet", () =>
    sql`
      UPDATE bookings
      SET source_type = 'tablet'
      WHERE booking_origin = 'tablet'
        AND source_locked_at IS NULL
    `
  );
  await runStep(steps, "backfill_source_type_direct_web", () =>
    sql`
      UPDATE bookings
      SET source_type = 'direct_web'
      WHERE source_type IN ('direct', 'booking', NULL)
        AND source_driver_id IS NULL
        AND booking_origin != 'tablet'
        AND source_locked_at IS NULL
    `
  );

  // ── 7. Lock existing bookings that have source_driver_id ─
  await runStep(steps, "lock_existing_sourced_bookings", () =>
    sql`
      UPDATE bookings
      SET source_locked_at = created_at
      WHERE source_locked_at IS NULL
        AND (source_driver_id IS NOT NULL OR source_type IS NOT NULL)
    `
  );

  // ── 8. Verify final state ────────────────────────────────
  const [colCheck] = await sql`
    SELECT COUNT(*) AS cnt
    FROM information_schema.columns
    WHERE table_name = 'bookings'
      AND column_name IN (
        'source_reference', 'source_tablet_id', 'source_campaign_id',
        'source_channel', 'source_metadata', 'source_locked_at',
        'source_override_reason', 'source_override_timestamp', 'source_override_admin_id'
      )
  `;

  const [snapshotCheck] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'lead_origin_snapshots'
    ) AS exists
  `;

  const [backfillStats] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE source_locked_at IS NOT NULL) AS locked,
      COUNT(*) FILTER (WHERE source_locked_at IS NULL) AS unlocked,
      COUNT(*) FILTER (WHERE source_reference IS NOT NULL) AS has_reference,
      COUNT(*) FILTER (WHERE source_channel IS NOT NULL) AS has_channel,
      COUNT(*) FILTER (WHERE source_type IS NOT NULL) AS has_type
    FROM bookings
  `;

  const errors = steps.filter((s) => s.status === "error");

  return NextResponse.json({
    ok: errors.length === 0,
    steps,
    errors: errors.length > 0 ? errors : undefined,
    verification: {
      new_columns_present: Number(colCheck.cnt) === 9,
      new_columns_count: Number(colCheck.cnt),
      lead_origin_snapshots_exists: snapshotCheck.exists,
      backfill: {
        locked: Number(backfillStats.locked),
        unlocked: Number(backfillStats.unlocked),
        has_reference: Number(backfillStats.has_reference),
        has_channel: Number(backfillStats.has_channel),
        has_type: Number(backfillStats.has_type),
      },
    },
  });
}
