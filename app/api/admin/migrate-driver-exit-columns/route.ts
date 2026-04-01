export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// GET /api/admin/migrate-driver-exit-columns
// Adds driver_exit_* and at_risk_flagged_at columns to bookings table
// This is idempotent - safe to run multiple times
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, any> = {}

  // Add driver_exit_reason column
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_exit_reason TEXT`
    results.driver_exit_reason = "added"
  } catch (err: any) {
    results.driver_exit_reason_error = err.message
  }

  // Add driver_exit_comment column
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_exit_comment TEXT`
    results.driver_exit_comment = "added"
  } catch (err: any) {
    results.driver_exit_comment_error = err.message
  }

  // Add driver_exit_at column
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_exit_at TIMESTAMPTZ`
    results.driver_exit_at = "added"
  } catch (err: any) {
    results.driver_exit_at_error = err.message
  }

  // Add driver_exit_case column (A/B/C)
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_exit_case TEXT`
    results.driver_exit_case = "added"
  } catch (err: any) {
    results.driver_exit_case_error = err.message
  }

  // Add at_risk_flagged_at column
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS at_risk_flagged_at TIMESTAMPTZ`
    results.at_risk_flagged_at = "added"
  } catch (err: any) {
    results.at_risk_flagged_at_error = err.message
  }

  // Verify columns exist
  try {
    const cols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'bookings'
        AND column_name IN ('driver_exit_reason', 'driver_exit_comment', 'driver_exit_at', 'driver_exit_case', 'at_risk_flagged_at')
      ORDER BY column_name
    `
    results.verified_columns = cols.map((c: any) => c.column_name)
  } catch (err: any) {
    results.verify_error = err.message
  }

  return NextResponse.json({
    success: true,
    migration: "driver-exit-columns",
    results
  })
}
