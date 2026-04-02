/**
 * BM9 — Flight Suggestion Engine Migration
 * POST /api/admin/migrate-bm9
 *
 * Adds flight autocomplete tracking fields to the bookings table.
 */

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  const errors: string[] = [];

  async function runMigration(label: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push(`✅ ${label}`);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("already exists") || msg.includes("duplicate column")) {
        results.push(`⏭ ${label} (already exists)`);
      } else {
        errors.push(`❌ ${label}: ${msg}`);
      }
    }
  }

  // ── Bookings table: BM9 flight autocomplete tracking fields ──
  await runMigration("flight_selection_mode VARCHAR(20)", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_selection_mode VARCHAR(20) DEFAULT 'manual'`;
  });

  await runMigration("flight_suggestion_provider VARCHAR(50)", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_suggestion_provider VARCHAR(50)`;
  });

  await runMigration("flight_suggestion_selected_at TIMESTAMPTZ", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_suggestion_selected_at TIMESTAMPTZ`;
  });

  await runMigration("flight_carrier_name VARCHAR(100)", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_carrier_name VARCHAR(100)`;
  });

  await runMigration("flight_origin_airport VARCHAR(10)", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_origin_airport VARCHAR(10)`;
  });

  await runMigration("flight_destination_airport VARCHAR(10)", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_destination_airport VARCHAR(10)`;
  });

  await runMigration("flight_scheduled_arrival_at TIMESTAMPTZ", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_scheduled_arrival_at TIMESTAMPTZ`;
  });

  await runMigration("flight_estimated_arrival_at TIMESTAMPTZ", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_estimated_arrival_at TIMESTAMPTZ`;
  });

  await runMigration("flight_suggestion_terminal VARCHAR(10)", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_suggestion_terminal VARCHAR(10)`;
  });

  // ── dispatch_event_log: BM9 analytics events ──
  // These are logged as event_type values, no schema change needed.
  // Events: flight_autocomplete_opened, flight_autocomplete_result_clicked,
  //         flight_manual_entry_used, flight_autocomplete_no_results

  // ── Index for flight_selection_mode queries ──
  await runMigration("idx_bookings_flight_selection_mode", async () => {
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_flight_selection_mode ON bookings(flight_selection_mode)`;
  });

  await runMigration("idx_bookings_flight_destination_airport", async () => {
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_flight_destination_airport ON bookings(flight_destination_airport)`;
  });

  // Verify columns were added
  const colCheck = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'bookings'
      AND column_name IN (
        'flight_selection_mode', 'flight_suggestion_provider',
        'flight_suggestion_selected_at', 'flight_carrier_name',
        'flight_origin_airport', 'flight_destination_airport',
        'flight_scheduled_arrival_at', 'flight_estimated_arrival_at',
        'flight_suggestion_terminal'
      )
    ORDER BY column_name
  `;

  return NextResponse.json({
    ok: errors.length === 0,
    migration: "BM9 — Flight Suggestion Engine",
    results,
    errors,
    columns_verified: colCheck.rows ?? colCheck,
    timestamp: new Date().toISOString(),
  });
}
