import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// ─────────────────────────────────────────────────────────────────────────────
// /api/admin/migrate-dispatch-event-log
// BM5 Migration — Creates the dispatch_event_log table
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const results: string[] = []

  try {
    // Create dispatch_event_log table
    await sql`
      CREATE TABLE IF NOT EXISTS dispatch_event_log (
        id                     SERIAL PRIMARY KEY,
        booking_id             INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        driver_id              INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        event_type             VARCHAR(64) NOT NULL,
        priority_level         INTEGER,
        legal_affiliation_type VARCHAR(64),
        reliability_score      NUMERIC(5,2),
        partner_dispatch_mode  VARCHAR(64),
        fallback_rank          INTEGER,
        notes                  TEXT,
        event_data             JSONB,
        created_at             TIMESTAMPTZ DEFAULT NOW()
      )
    `
    results.push("✅ dispatch_event_log table created (or already exists)")

    // Create index on event_type for fast filtering
    await sql`
      CREATE INDEX IF NOT EXISTS idx_dispatch_event_log_event_type
      ON dispatch_event_log(event_type)
    `
    results.push("✅ Index on event_type created")

    // Create index on booking_id for fast lookup
    await sql`
      CREATE INDEX IF NOT EXISTS idx_dispatch_event_log_booking_id
      ON dispatch_event_log(booking_id)
    `
    results.push("✅ Index on booking_id created")

    // Create index on driver_id for fast lookup
    await sql`
      CREATE INDEX IF NOT EXISTS idx_dispatch_event_log_driver_id
      ON dispatch_event_log(driver_id)
    `
    results.push("✅ Index on driver_id created")

    // Create index on created_at for time-based queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_dispatch_event_log_created_at
      ON dispatch_event_log(created_at DESC)
    `
    results.push("✅ Index on created_at created")

    return NextResponse.json({
      success: true,
      message: "BM5 dispatch_event_log migration completed",
      results,
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      results,
    }, { status: 500 })
  }
}
