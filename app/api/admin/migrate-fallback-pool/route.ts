import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL_UNPOOLED as string);

// POST /api/admin/migrate-fallback-pool
// Bloque Maestro 3 — Fallback Pool Routing Engine
// Adds: fallback columns to bookings, fallback_assignment_log table, dispatch_event_log table
export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // ── 1. Add fallback columns to bookings ──────────────────────────────
    const bookingCols = [
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMPTZ`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_driver_id UUID`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_case_level TEXT`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_trigger_reason TEXT`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_assignment_time TIMESTAMPTZ`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_response_time INTERVAL`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS original_driver_id UUID`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_pool_started_at TIMESTAMPTZ`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_offer_count INTEGER DEFAULT 0`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_declined_count INTEGER DEFAULT 0`,
    ];

    for (const stmt of bookingCols) {
      await sql.query(stmt);
      results.push(`OK: ${stmt.slice(0, 60)}...`);
    }

    // ── 2. Add fallback offer columns to dispatch_offers ─────────────────
    const offerCols = [
      `ALTER TABLE dispatch_offers ADD COLUMN IF NOT EXISTS is_fallback_offer BOOLEAN DEFAULT false`,
      `ALTER TABLE dispatch_offers ADD COLUMN IF NOT EXISTS fallback_case_level TEXT`,
      `ALTER TABLE dispatch_offers ADD COLUMN IF NOT EXISTS fallback_priority_level TEXT`,
      `ALTER TABLE dispatch_offers ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ`,
      `ALTER TABLE dispatch_offers ADD COLUMN IF NOT EXISTS timeout_at TIMESTAMPTZ`,
    ];

    for (const stmt of offerCols) {
      await sql.query(stmt);
      results.push(`OK: ${stmt.slice(0, 60)}...`);
    }

    // ── 3. Create fallback_assignment_log table ───────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS fallback_assignment_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL,
        original_driver_id UUID,
        fallback_driver_id UUID,
        fallback_trigger_reason TEXT,
        fallback_case_level TEXT,
        fallback_assignment_time TIMESTAMPTZ,
        fallback_response_time INTERVAL,
        offers_sent INTEGER DEFAULT 0,
        offers_declined INTEGER DEFAULT 0,
        offers_timeout INTEGER DEFAULT 0,
        final_status TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    results.push('OK: CREATE TABLE fallback_assignment_log');

    // ── 4. Create dispatch_event_log table ────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS dispatch_event_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL,
        driver_id UUID,
        event_type TEXT NOT NULL,
        event_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    results.push('OK: CREATE TABLE dispatch_event_log');

    // ── 5. Create indexes ─────────────────────────────────────────────────
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_fallback_log_booking ON fallback_assignment_log(booking_id)`,
      `CREATE INDEX IF NOT EXISTS idx_dispatch_event_booking ON dispatch_event_log(booking_id)`,
      `CREATE INDEX IF NOT EXISTS idx_dispatch_event_type ON dispatch_event_log(event_type)`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_fallback_case ON bookings(fallback_case_level) WHERE fallback_case_level IS NOT NULL`,
    ];

    for (const stmt of indexes) {
      await sql.query(stmt);
      results.push(`OK: ${stmt.slice(0, 60)}...`);
    }

    return NextResponse.json({
      ok: true,
      migration: 'bloque3_fallback_pool',
      steps_completed: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message,
      results,
    }, { status: 500 });
  }
}
