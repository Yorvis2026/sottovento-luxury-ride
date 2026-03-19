import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * POST /api/admin/reclassify
 *
 * Emergency fix: reclassify ALL bookings where dispatch_status = 'not_required'
 * but the booking is still active (not completed/cancelled/assigned).
 *
 * BUSINESS RULE:
 * - not_required is ONLY valid for: assigned, completed, cancelled
 * - Any other booking status means the booking still needs dispatch attention
 *
 * This endpoint is idempotent — safe to run multiple times.
 */
export async function POST() {
  const results: string[] = [];

  try {
    // Step 1: Show current state
    const before = await sql`
      SELECT id, status, dispatch_status, client_name, pickup_at
      FROM bookings
      ORDER BY created_at DESC
    `;
    results.push(`📊 Total bookings: ${before.length}`);
    results.push(`📋 Current state: ${JSON.stringify(before.map((b: any) => ({
      id: b.id?.slice(0, 8),
      status: b.status,
      dispatch_status: b.dispatch_status,
    })))}`);

    // Step 2: Reclassify bookings that are DONE — these are the only ones where not_required is valid
    await sql`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status IN ('accepted', 'in_progress', 'assigned')
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Mapped accepted/in_progress → dispatch: assigned");

    await sql`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status = 'completed'
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Mapped completed → dispatch: assigned");

    await sql`
      UPDATE bookings
      SET dispatch_status = 'cancelled'
      WHERE status IN ('cancelled', 'rejected', 'expired')
        AND dispatch_status = 'not_required'
    `;
    results.push("✅ Mapped cancelled/rejected/expired → dispatch: cancelled");

    // Step 3: CATCH-ALL — any booking still with not_required needs manual dispatch
    // This covers ALL remaining status values: new, pending, confirmed, quote_sent, etc.
    const catchAll = await sql`
      UPDATE bookings
      SET dispatch_status = 'manual_dispatch_required'
      WHERE dispatch_status = 'not_required'
      RETURNING id, status, dispatch_status
    `;
    results.push(`✅ Catch-all: ${catchAll.length} bookings → manual_dispatch_required`);
    if (catchAll.length > 0) {
      results.push(`📋 Reclassified: ${JSON.stringify(catchAll.map((b: any) => ({
        id: b.id?.slice(0, 8),
        status: b.status,
        new_dispatch: b.dispatch_status,
      })))}`);
    }

    // Step 4: Refine — new/pending/quote_sent → awaiting_source_owner (more specific)
    await sql`
      UPDATE bookings
      SET dispatch_status = 'awaiting_source_owner'
      WHERE status IN ('new', 'pending', 'offered', 'quote_sent', 'awaiting_payment', 'confirmed')
        AND dispatch_status = 'manual_dispatch_required'
    `;
    results.push("✅ Refined new/pending/confirmed → awaiting_source_owner");

    // Step 5: Verify — no active booking should remain as not_required
    const remaining = await sql`
      SELECT id, status, dispatch_status, client_name
      FROM bookings
      WHERE dispatch_status = 'not_required'
    `;
    if (remaining.length === 0) {
      results.push("✅ CONSISTENCY CHECK PASSED: Zero bookings with dispatch_status = not_required");
    } else {
      results.push(`⚠️ WARNING: ${remaining.length} bookings still have not_required — manual review needed`);
      results.push(JSON.stringify(remaining.map((b: any) => ({ id: b.id?.slice(0, 8), status: b.status }))));
    }

    // Step 6: Final distribution
    const after = await sql`
      SELECT dispatch_status, status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status, status
      ORDER BY dispatch_status, status
    `;
    results.push(`📊 Final distribution: ${JSON.stringify(after)}`);

    return NextResponse.json({ success: true, results, fixed: catchAll.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}

// GET — Check current dispatch_status distribution
export async function GET() {
  try {
    const distribution = await sql`
      SELECT dispatch_status, status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status, status
      ORDER BY dispatch_status, status
    `;

    const inconsistent = await sql`
      SELECT id, status, dispatch_status, client_name, pickup_at
      FROM bookings
      WHERE dispatch_status = 'not_required'
        AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress')
    `;

    return NextResponse.json({
      distribution,
      inconsistentBookings: inconsistent,
      hasInconsistency: inconsistent.length > 0,
      message: inconsistent.length > 0
        ? `⚠️ ${inconsistent.length} bookings need reclassification — POST to this endpoint to fix`
        : "✅ All bookings have consistent dispatch_status",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
