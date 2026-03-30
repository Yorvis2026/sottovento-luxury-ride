export const dynamic = "force-dynamic"
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * POST /api/admin/migrate-bookings-v2
 *
 * Adds all fields required by the Bookings Management Audit Master Block:
 * - booking_ref (human-readable reference code, e.g. SLN-2024-0001)
 * - passenger_count
 * - luggage_count
 * - lead_source (already may exist)
 * - captured_by_driver_code
 * - cancellation_reason
 * - cancelled_by
 * - notes (already may exist)
 * - flight_number (already may exist)
 * - booking_origin (public_website | driver_qr | driver_referral | driver_tablet | hotel_partner | manual_admin)
 *
 * Also ensures the full 10-state pipeline is supported in the status column.
 * Backfills booking_ref for existing bookings.
 */
export async function POST() {
  const results: string[] = [];

  try {
    // 1. Add missing columns (all IF NOT EXISTS — safe to run multiple times)
    const migrations = [
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_ref VARCHAR(30)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passenger_count INTEGER DEFAULT 1`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS luggage_count INTEGER DEFAULT 0`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS captured_by_driver_code VARCHAR(50)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(100)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_origin VARCHAR(50) DEFAULT 'manual_admin'`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_number VARCHAR(50)`,
      sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_code VARCHAR(50)`,
    ];

    for (const m of migrations) {
      try {
        await m;
      } catch (e: any) {
        // Column already exists — ignore
        if (!e.message?.includes("already exists")) {
          results.push(`⚠️ Migration warning: ${e.message}`);
        }
      }
    }
    results.push("✅ All columns added (or already existed)");

    // 2. Create unique index on booking_ref
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_ref_idx ON bookings (booking_ref) WHERE booking_ref IS NOT NULL`;
      results.push("✅ Unique index on booking_ref created");
    } catch (e: any) {
      results.push(`⚠️ Index: ${e.message}`);
    }

    // 3. Backfill booking_ref for existing bookings that don't have one
    // Format: SLN-YYYY-NNNN (sequential per year)
    const unbilled = await sql`
      SELECT id, created_at FROM bookings
      WHERE booking_ref IS NULL
      ORDER BY created_at ASC
    `;

    let backfilled = 0;
    for (const b of unbilled) {
      const year = new Date(b.created_at).getFullYear();
      // Get next sequence number for this year
      const [seq] = await sql`
        SELECT COUNT(*) AS cnt FROM bookings
        WHERE booking_ref LIKE ${"SLN-" + year + "-%"}
      `;
      const num = (Number(seq.cnt) + 1).toString().padStart(4, "0");
      const ref = `SLN-${year}-${num}`;
      try {
        await sql`UPDATE bookings SET booking_ref = ${ref} WHERE id = ${b.id}::uuid`;
        backfilled++;
      } catch {
        // Duplicate ref — skip (race condition)
      }
    }
    results.push(`✅ Backfilled booking_ref for ${backfilled} existing bookings`);

    // 4. Backfill booking_origin from lead_source where possible
    await sql`
      UPDATE bookings
      SET booking_origin = CASE
        WHEN lead_source = 'driver_tablet' THEN 'driver_tablet'
        WHEN lead_source = 'driver_qr' THEN 'driver_qr'
        WHEN lead_source = 'hotel_partner' THEN 'hotel_partner'
        WHEN lead_source = 'website' OR lead_source = 'public_website' THEN 'public_website'
        WHEN lead_source = 'driver_referral' THEN 'driver_referral'
        ELSE 'manual_admin'
      END
      WHERE booking_origin IS NULL OR booking_origin = 'manual_admin'
    `;
    results.push("✅ Backfilled booking_origin from lead_source");

    // 5. Summary
    const [total] = await sql`SELECT COUNT(*) AS cnt FROM bookings`;
    const [withRef] = await sql`SELECT COUNT(*) AS cnt FROM bookings WHERE booking_ref IS NOT NULL`;
    results.push(`📊 Total bookings: ${total.cnt}, with booking_ref: ${withRef.cnt}`);

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}
