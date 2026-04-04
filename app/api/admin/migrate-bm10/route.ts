export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/admin/migrate-bm10
//
// BM10 MASTER BLOCK — Dispatch State Model Migration
//
// Adds the following to the database:
//
// bookings table:
//   - dispatch_state TEXT   (ROUND_1_CAPTOR_PRIORITY | ROUND_2_PREMIUM_PRIORITY |
//                            ROUND_3_POOL_OPEN | ADMIN_ATTENTION_REQUIRED |
//                            ASSIGNED | IN_PROGRESS | COMPLETED | EXPIRED_UNFULFILLED | NEW)
//   - dispatch_round INT    (current round number: 1, 2, 3)
//   - manual_dispatch_required BOOLEAN
//   - last_expired_driver_id UUID  (driver who last timed out, for exclusion)
//
// dispatch_offers table:
//   - round_number INT      (alias for offer_round, for clarity)
//
// driver_offer_history table (NEW):
//   - id UUID
//   - booking_id UUID
//   - driver_id UUID
//   - round_number INT
//   - offer_status TEXT  (offer_received | offer_expired | offer_declined | offer_accepted)
//   - sent_at TIMESTAMPTZ
//   - expired_at TIMESTAMPTZ
//   - responded_at TIMESTAMPTZ
//   - created_at TIMESTAMPTZ
//
// Safe to run multiple times — all operations use IF NOT EXISTS.
// ============================================================

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key") || "";
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const steps: string[] = [];
  const errors: string[] = [];

  // ── 1. Add dispatch_state to bookings ────────────────────────────────────
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispatch_state TEXT DEFAULT 'NEW'`;
    steps.push("✅ bookings.dispatch_state added");
  } catch (e: any) { errors.push(`❌ dispatch_state: ${e.message}`); }

  // ── 2. Add dispatch_round to bookings ────────────────────────────────────
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispatch_round INTEGER DEFAULT 1`;
    steps.push("✅ bookings.dispatch_round added");
  } catch (e: any) { errors.push(`❌ dispatch_round: ${e.message}`); }

  // ── 3. Add manual_dispatch_required to bookings ──────────────────────────
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS manual_dispatch_required BOOLEAN DEFAULT FALSE`;
    steps.push("✅ bookings.manual_dispatch_required added");
  } catch (e: any) { errors.push(`❌ manual_dispatch_required: ${e.message}`); }

  // ── 4. Add last_expired_driver_id to bookings ────────────────────────────
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_expired_driver_id UUID`;
    steps.push("✅ bookings.last_expired_driver_id added");
  } catch (e: any) { errors.push(`❌ last_expired_driver_id: ${e.message}`); }

  // ── 5. Add round_number alias to dispatch_offers ─────────────────────────
  try {
    await sql`ALTER TABLE dispatch_offers ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1`;
    steps.push("✅ dispatch_offers.round_number added");
  } catch (e: any) { errors.push(`❌ dispatch_offers.round_number: ${e.message}`); }

  // ── 6. Create driver_offer_history table ─────────────────────────────────
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS driver_offer_history (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id   UUID NOT NULL,
        driver_id    UUID NOT NULL,
        driver_code  TEXT,
        round_number INTEGER NOT NULL DEFAULT 1,
        offer_status TEXT NOT NULL,
        -- offer_status: offer_received | offer_expired | offer_declined | offer_accepted | offer_superseded
        sent_at      TIMESTAMPTZ,
        expired_at   TIMESTAMPTZ,
        responded_at TIMESTAMPTZ,
        notes        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    steps.push("✅ driver_offer_history table created");
  } catch (e: any) { errors.push(`❌ driver_offer_history: ${e.message}`); }

  // ── 7. Indexes on driver_offer_history ───────────────────────────────────
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_doh_booking_id ON driver_offer_history(booking_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_doh_driver_id  ON driver_offer_history(driver_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_doh_created_at ON driver_offer_history(created_at DESC)`;
    steps.push("✅ driver_offer_history indexes created");
  } catch (e: any) { errors.push(`❌ driver_offer_history indexes: ${e.message}`); }

  // ── 8. Index on bookings.dispatch_state ──────────────────────────────────
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_dispatch_state ON bookings(dispatch_state)`;
    steps.push("✅ idx_bookings_dispatch_state created");
  } catch (e: any) { errors.push(`❌ idx_bookings_dispatch_state: ${e.message}`); }

  // ── 9. Backfill dispatch_state from existing dispatch_status ─────────────
  try {
    // Map existing dispatch_status values to the new dispatch_state model
    await sql`
      UPDATE bookings SET dispatch_state = 'ASSIGNED'
      WHERE dispatch_state = 'NEW'
        AND (
          dispatch_status IN ('offer_pending', 'offer_accepted', 'reassigned', 'assigned')
          OR status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_trip', 'driver_confirmed')
        )
        AND assigned_driver_id IS NOT NULL
    `;
    await sql`
      UPDATE bookings SET dispatch_state = 'IN_PROGRESS'
      WHERE dispatch_state = 'NEW'
        AND status IN ('en_route', 'arrived', 'in_trip', 'in_progress')
    `;
    await sql`
      UPDATE bookings SET dispatch_state = 'COMPLETED'
      WHERE dispatch_state = 'NEW'
        AND status = 'completed'
    `;
    await sql`
      UPDATE bookings SET dispatch_state = 'ROUND_1_CAPTOR_PRIORITY'
      WHERE dispatch_state = 'NEW'
        AND dispatch_status = 'offer_pending'
        AND assigned_driver_id IS NULL
    `;
    await sql`
      UPDATE bookings SET dispatch_state = 'ADMIN_ATTENTION_REQUIRED'
      WHERE dispatch_state = 'NEW'
        AND dispatch_status IN ('manual_dispatch_required', 'critical_driver_failure', 'pending_dispatch')
    `;
    await sql`
      UPDATE bookings SET dispatch_state = 'ROUND_2_PREMIUM_PRIORITY'
      WHERE dispatch_state = 'NEW'
        AND dispatch_status IN ('reassignment_needed', 'urgent_reassignment', 'fallback_dispatched')
    `;
    steps.push("✅ dispatch_state backfill completed");
  } catch (e: any) { errors.push(`❌ dispatch_state backfill: ${e.message}`); }

  // ── 10. Backfill driver_offer_history from existing dispatch_offers ───────
  try {
    await sql`
      INSERT INTO driver_offer_history (
        booking_id, driver_id, driver_code, round_number,
        offer_status, sent_at, expired_at, responded_at, created_at
      )
      SELECT
        dof.booking_id,
        dof.driver_id,
        d.driver_code,
        COALESCE(dof.offer_round, 1),
        CASE
          WHEN dof.response = 'accepted'  THEN 'offer_accepted'
          WHEN dof.response = 'declined'  THEN 'offer_declined'
          WHEN dof.response = 'timeout'   THEN 'offer_expired'
          WHEN dof.response = 'superseded' THEN 'offer_superseded'
          ELSE 'offer_received'
        END,
        dof.sent_at,
        CASE WHEN dof.response = 'timeout' THEN dof.responded_at ELSE NULL END,
        CASE WHEN dof.response IN ('accepted','declined') THEN dof.responded_at ELSE NULL END,
        dof.created_at
      FROM dispatch_offers dof
      LEFT JOIN drivers d ON d.id = dof.driver_id
      WHERE NOT EXISTS (
        SELECT 1 FROM driver_offer_history doh
        WHERE doh.booking_id = dof.booking_id
          AND doh.driver_id  = dof.driver_id
          AND doh.round_number = COALESCE(dof.offer_round, 1)
      )
    `;
    steps.push("✅ driver_offer_history backfill from dispatch_offers completed");
  } catch (e: any) { errors.push(`❌ driver_offer_history backfill: ${e.message}`); }

  return NextResponse.json({
    ok: errors.length === 0,
    steps,
    errors,
    summary: `${steps.length} steps OK, ${errors.length} errors`,
  });
}
