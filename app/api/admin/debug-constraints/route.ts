export const dynamic = "force-dynamic"
// GET /api/admin/debug-constraints
// Diagnoses unique constraints on commissions and snapshot tables
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // Check unique constraints on commissions
  try {
    const constraints = await sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name IN ('commissions', 'booking_financial_attribution_snapshot')
        AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
      ORDER BY tc.table_name, tc.constraint_name
    `;
    results.constraints = constraints;
  } catch (e: any) {
    results.constraints_error = e.message;
  }

  // Check if snapshot table exists
  try {
    const snap = await sql`
      SELECT COUNT(*) AS cnt FROM information_schema.tables
      WHERE table_name = 'booking_financial_attribution_snapshot'
    `;
    results.snapshot_exists = Number(snap[0]?.cnt ?? 0) > 0;
  } catch (e: any) {
    results.snapshot_error = e.message;
  }

  // Try a test INSERT into commissions with ON CONFLICT to see if it works
  try {
    // First create a temp booking
    const [tb] = await sql`
      INSERT INTO bookings (status, pickup_address, dropoff_address, vehicle_type, total_price, trip_type)
      VALUES ('test_constraint', 'A', 'B', 'sedan', 1, 'oneway')
      RETURNING id
    `;
    // Try INSERT with ON CONFLICT
    await sql`
      INSERT INTO commissions (booking_id, total_amount, status)
      VALUES (${tb.id}::uuid, 1, 'test')
      ON CONFLICT (booking_id) DO UPDATE SET total_amount = EXCLUDED.total_amount
    `;
    results.commissions_on_conflict_test = "ok";
    // Cleanup
    await sql`DELETE FROM commissions WHERE booking_id = ${tb.id}::uuid`;
    await sql`DELETE FROM bookings WHERE id = ${tb.id}::uuid`;
  } catch (e: any) {
    results.commissions_on_conflict_error = e.message;
  }

  // Try INSERT into snapshot with ON CONFLICT
  try {
    const [tb2] = await sql`
      INSERT INTO bookings (status, pickup_address, dropoff_address, vehicle_type, total_price, trip_type)
      VALUES ('test_constraint2', 'A', 'B', 'sedan', 1, 'oneway')
      RETURNING id
    `;
    await sql`
      INSERT INTO booking_financial_attribution_snapshot
        (booking_id, commission_model, commission_platform_pct, commission_source_pct, commission_executor_pct)
      VALUES (${tb2.id}::uuid, 'test', 20, 15, 65)
      ON CONFLICT (booking_id) DO NOTHING
    `;
    results.snapshot_on_conflict_test = "ok";
    await sql`DELETE FROM booking_financial_attribution_snapshot WHERE booking_id = ${tb2.id}::uuid`;
    await sql`DELETE FROM bookings WHERE id = ${tb2.id}::uuid`;
  } catch (e: any) {
    results.snapshot_on_conflict_error = e.message;
  }

  return NextResponse.json(results);
}
