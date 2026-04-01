export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/admin/migrate-bm6
// BM6: SLA Protection + Smart Reassignment Engine
// Adds SLA fields to bookings and dispatch_offers tables
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: string[] = [];
  const errors: string[] = [];

  // ── STEP 1: Add SLA fields to bookings ─────────────────────
  try {
    await sql`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS sla_protection_level         TEXT        DEFAULT 'STANDARD',
        ADD COLUMN IF NOT EXISTS sla_flagged_at               TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS sla_last_evaluation_at       TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS sla_trigger_reason           TEXT,
        ADD COLUMN IF NOT EXISTS sla_trigger_source           TEXT        DEFAULT 'system',
        ADD COLUMN IF NOT EXISTS sla_current_state            TEXT,
        ADD COLUMN IF NOT EXISTS reassignment_count           INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS rescue_reassignment_started_at   TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rescue_reassignment_completed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS dispatcher_override_required BOOLEAN     DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS sla_safe_at                  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS sla_safe_by                  TEXT,
        ADD COLUMN IF NOT EXISTS driver_im_on_my_way_at       TIMESTAMPTZ
    `;
    steps.push("✅ bookings: SLA fields added");
  } catch (e: any) {
    errors.push(`bookings SLA fields: ${e.message}`);
  }

  // ── STEP 2: Add rescue fields to dispatch_offers ────────────
  try {
    await sql`
      ALTER TABLE dispatch_offers
        ADD COLUMN IF NOT EXISTS is_rescue_offer         BOOLEAN     DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS rescue_priority_level   TEXT,
        ADD COLUMN IF NOT EXISTS rescue_deadline_at      TIMESTAMPTZ
    `;
    steps.push("✅ dispatch_offers: rescue fields added");
  } catch (e: any) {
    errors.push(`dispatch_offers rescue fields: ${e.message}`);
  }

  // ── STEP 3: Add SLA events to dispatch_event_log ────────────
  try {
    await sql`
      ALTER TABLE dispatch_event_log
        ADD COLUMN IF NOT EXISTS sla_level         TEXT,
        ADD COLUMN IF NOT EXISTS minutes_to_pickup NUMERIC
    `;
    steps.push("✅ dispatch_event_log: SLA fields added");
  } catch (e: any) {
    errors.push(`dispatch_event_log SLA fields: ${e.message}`);
  }

  // ── STEP 4: Create index for SLA queue queries ───────────────
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_bookings_sla_state
        ON bookings (sla_current_state, pickup_at)
        WHERE sla_current_state IS NOT NULL
    `;
    steps.push("✅ index idx_bookings_sla_state created");
  } catch (e: any) {
    errors.push(`index sla_state: ${e.message}`);
  }

  // ── STEP 5: Set initial sla_protection_level for existing bookings ──
  try {
    // Airport pickups → PRIORITY
    await sql`
      UPDATE bookings
      SET sla_protection_level = 'PRIORITY'
      WHERE sla_protection_level = 'STANDARD'
        AND (
          LOWER(pickup_zone) LIKE '%airport%'
          OR LOWER(pickup_zone) LIKE '%mco%'
          OR LOWER(pickup_address) LIKE '%airport%'
          OR service_location_type = 'airport'
          OR trip_type = 'airport'
        )
        AND status NOT IN ('completed', 'cancelled')
    `;
    steps.push("✅ existing airport bookings set to PRIORITY");
  } catch (e: any) {
    errors.push(`initial SLA level: ${e.message}`);
  }

  return NextResponse.json({
    success: errors.length === 0,
    steps,
    errors,
    timestamp: new Date().toISOString(),
  });
}
