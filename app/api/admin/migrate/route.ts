import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// POST /api/admin/migrate — Run DB migrations for dispatch_status
// This is idempotent — safe to run multiple times
export async function POST() {
  const results: string[] = [];

  try {
    // 1. Add dispatch_status column if it doesn't exist
    await sql`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS dispatch_status TEXT NOT NULL DEFAULT 'not_required'
    `;
    results.push("✅ Added dispatch_status column");

    // 2. Migrate existing bookings: map old status → dispatch_status
    // new → awaiting_source_owner (needs dispatch)
    await sql`
      UPDATE bookings
      SET dispatch_status = 'awaiting_source_owner'
      WHERE status IN ('new', 'offered')
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Migrated new/offered → awaiting_source_owner");

    // accepted → assigned
    await sql`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status = 'accepted'
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Migrated accepted → assigned");

    // in_progress → assigned
    await sql`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status = 'in_progress'
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Migrated in_progress → assigned");

    // completed → assigned (dispatch done)
    await sql`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status = 'completed'
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Migrated completed → assigned");

    // cancelled → cancelled
    await sql`
      UPDATE bookings
      SET dispatch_status = 'cancelled'
      WHERE status = 'cancelled'
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Migrated cancelled → cancelled");

    // 3. Verify counts
    const counts = await sql`
      SELECT dispatch_status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status
      ORDER BY dispatch_status
    `;
    results.push(`📊 Dispatch status distribution: ${JSON.stringify(counts)}`);

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}

// GET /api/admin/migrate — Check migration status
export async function GET() {
  try {
    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position
    `;
    const hasDispatchStatus = columns.some((c: any) => c.column_name === "dispatch_status");

    const counts = hasDispatchStatus ? await sql`
      SELECT dispatch_status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status
      ORDER BY dispatch_status
    ` : [];

    return NextResponse.json({
      hasDispatchStatus,
      columns: columns.map((c: any) => c.column_name),
      dispatchStatusCounts: counts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
