export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * GET /api/admin/migrate-revenue-persistence
 *
 * BM-SLN-REVENUE-PERSISTENCE-01
 * Adds 4 columns to bookings table for captador revenue persistence.
 *
 * Sections:
 *   1 — captured_by_driver_id UUID NULL
 *   2 — execution_driver_id UUID NULL
 *   3 — fallback_execution_flag BOOLEAN DEFAULT FALSE
 *   4 — revenue_split_snapshot JSONB NULL
 */
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: string[] = [];
  const errors: string[] = [];

  // Section 1: captured_by_driver_id
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS captured_by_driver_id UUID NULL`;
    steps.push("✅ bookings.captured_by_driver_id added (UUID NULL)");
  } catch (e: any) {
    errors.push(`❌ captured_by_driver_id: ${e?.message}`);
  }

  // Section 2: execution_driver_id
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS execution_driver_id UUID NULL`;
    steps.push("✅ bookings.execution_driver_id added (UUID NULL)");
  } catch (e: any) {
    errors.push(`❌ execution_driver_id: ${e?.message}`);
  }

  // Section 3: fallback_execution_flag
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fallback_execution_flag BOOLEAN NOT NULL DEFAULT FALSE`;
    steps.push("✅ bookings.fallback_execution_flag added (BOOLEAN DEFAULT FALSE)");
  } catch (e: any) {
    errors.push(`❌ fallback_execution_flag: ${e?.message}`);
  }

  // Section 4: revenue_split_snapshot
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS revenue_split_snapshot JSONB NULL`;
    steps.push("✅ bookings.revenue_split_snapshot added (JSONB NULL)");
  } catch (e: any) {
    errors.push(`❌ revenue_split_snapshot: ${e?.message}`);
  }

  // Verify columns exist
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'bookings'
      AND column_name IN (
        'captured_by_driver_id',
        'execution_driver_id',
        'fallback_execution_flag',
        'revenue_split_snapshot'
      )
    ORDER BY column_name
  `;

  return NextResponse.json({
    success: errors.length === 0,
    steps,
    errors,
    columns_verified: cols,
    bm_version: "BM-SLN-REVENUE-PERSISTENCE-01",
  });
}
