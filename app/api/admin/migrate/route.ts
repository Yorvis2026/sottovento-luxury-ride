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

    // 2. First, let's see what status values actually exist in the DB
    const existingStatuses = await sql`
      SELECT DISTINCT status, COUNT(*) as count
      FROM bookings
      GROUP BY status
      ORDER BY status
    `;
    results.push(`📊 Existing status values: ${JSON.stringify(existingStatuses)}`);

    // 3. RULE: Any booking that is NOT completed/cancelled/assigned needs dispatch
    //    This covers ALL possible "pending" status values regardless of naming
    //    (new, pending, offered, quote_sent, awaiting_payment, confirmed, etc.)

    // Step A: Mark completed/cancelled bookings first
    await sql`
      UPDATE bookings
      SET dispatch_status = 'cancelled'
      WHERE status IN ('cancelled', 'rejected', 'expired')
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Mapped cancelled/rejected/expired → dispatch cancelled");

    await sql`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status IN ('accepted', 'in_progress', 'completed', 'assigned')
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Mapped accepted/in_progress/completed → dispatch assigned");

    // Step B: ALL remaining bookings with dispatch_status = 'not_required'
    //         are SLN bookings that need assignment → manual_dispatch_required
    //         This is the catch-all for any status value we haven't explicitly mapped
    const reclassified = await sql`
      UPDATE bookings
      SET dispatch_status = 'manual_dispatch_required'
      WHERE dispatch_status = 'not_required'
      RETURNING id, status, dispatch_status
    `;
    results.push(`✅ Reclassified ${reclassified.length} remaining bookings → manual_dispatch_required`);
    if (reclassified.length > 0) {
      results.push(`📋 Reclassified bookings: ${JSON.stringify(reclassified.map((r: any) => ({ id: r.id.slice(0, 8), status: r.status })))}`);
    }

    // Step C: For bookings with status 'new' or 'offered', use awaiting_source_owner
    //         (more specific than manual_dispatch_required)
    await sql`
      UPDATE bookings
      SET dispatch_status = 'awaiting_source_owner'
      WHERE status IN ('new', 'offered', 'pending', 'quote_sent')
        AND dispatch_status = 'manual_dispatch_required'
    `;
    results.push("✅ Refined new/offered/pending/quote_sent → awaiting_source_owner");

    // 4. Verify final distribution
    const counts = await sql`
      SELECT dispatch_status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status
      ORDER BY dispatch_status
    `;
    results.push(`📊 Final dispatch_status distribution: ${JSON.stringify(counts)}`);

    // 5. Verify no SLN bookings remain as not_required
    const remaining = await sql`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE dispatch_status = 'not_required'
    `;
    const remainingCount = Number(remaining[0]?.count ?? 0);
    if (remainingCount === 0) {
      results.push("✅ CONSISTENCY CHECK PASSED: No bookings left with dispatch_status = not_required");
    } else {
      results.push(`⚠️ WARNING: ${remainingCount} bookings still have dispatch_status = not_required — check manually`);
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}

// GET /api/admin/migrate — Check migration status and current distribution
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
      SELECT dispatch_status, status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status, status
      ORDER BY dispatch_status, status
    ` : [];

    const notRequired = hasDispatchStatus ? await sql`
      SELECT id, status, dispatch_status, client_name, pickup_at
      FROM bookings
      WHERE dispatch_status = 'not_required'
      ORDER BY created_at DESC
    ` : [];

    return NextResponse.json({
      hasDispatchStatus,
      columns: columns.map((c: any) => c.column_name),
      dispatchStatusCounts: counts,
      notRequiredBookings: notRequired,
      consistencyIssue: notRequired.length > 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
