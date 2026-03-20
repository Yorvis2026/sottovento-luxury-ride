import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * POST /api/admin/reclassify
 *
 * Emergency fix: reclassify ALL bookings where dispatch_status is inconsistent.
 *
 * BUSINESS RULES:
 * - payment_status = paid AND status IN (pending, pending_dispatch) → must be in dispatch buckets
 * - not_required is ONLY valid for: assigned, completed, cancelled, rejected, expired
 * - pending (old) bookings with dispatch_status = 'pending' → reclassify to awaiting_sln_member
 *
 * This endpoint is idempotent — safe to run multiple times.
 */
export async function POST() {
  const results: string[] = [];

  try {
    // Step 1: Show current state
    const before = await sql`
      SELECT id, status, dispatch_status, payment_status, pickup_at
      FROM bookings
      ORDER BY created_at DESC
    `;
    results.push(`📊 Total bookings: ${before.length}`);
    results.push(`📋 Current state: ${JSON.stringify(before.map((b: any) => ({
      id: b.id?.slice(0, 8),
      status: b.status,
      dispatch_status: b.dispatch_status,
      payment_status: b.payment_status,
    })))}`);

    // Step 2: Fix bookings that are paid but still have dispatch_status = 'pending' or 'not_required'
    // These are the main issue: paid bookings not appearing in dispatch
    const paidFix = await sql`
      UPDATE bookings
      SET
        status = 'pending_dispatch',
        dispatch_status = CASE
          WHEN source_code IS NOT NULL AND source_driver_id IS NOT NULL THEN 'awaiting_source_owner'
          ELSE 'awaiting_sln_member'
        END,
        offer_expires_at = CASE
          WHEN source_code IS NOT NULL AND source_driver_id IS NOT NULL
            THEN NOW() + INTERVAL '120 seconds'
          ELSE NOW() + INTERVAL '60 seconds'
        END,
        offer_status = 'pending',
        offer_stage = CASE
          WHEN source_code IS NOT NULL AND source_driver_id IS NOT NULL THEN 'source_owner'
          ELSE 'sln_member'
        END,
        updated_at = NOW()
      WHERE payment_status = 'paid'
        AND status IN ('pending', 'pending_payment', 'pending_dispatch')
        AND dispatch_status IN ('pending', 'not_required', 'awaiting_payment')
      RETURNING id, status, dispatch_status
    `;
    results.push(`✅ Fixed ${paidFix.length} paid bookings → dispatch buckets`);
    if (paidFix.length > 0) {
      results.push(`📋 Fixed: ${JSON.stringify(paidFix.map((b: any) => ({
        id: b.id?.slice(0, 8),
        status: b.status,
        dispatch_status: b.dispatch_status,
      })))}`);
    }

    // Step 3: Reclassify terminal states
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

    // Step 4: CATCH-ALL — any remaining not_required → manual_dispatch_required
    const catchAll = await sql`
      UPDATE bookings
      SET dispatch_status = 'manual_dispatch_required'
      WHERE dispatch_status IN ('not_required', 'pending')
        AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress')
      RETURNING id, status, dispatch_status
    `;
    results.push(`✅ Catch-all: ${catchAll.length} bookings → manual_dispatch_required`);

    // Step 5: Verify consistency
    const inconsistent = await sql`
      SELECT id, status, dispatch_status, payment_status
      FROM bookings
      WHERE (
        -- Paid bookings not in any dispatch bucket
        (payment_status = 'paid' AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress')
          AND dispatch_status NOT IN ('awaiting_source_owner', 'awaiting_sln_member', 'manual_dispatch_required', 'assigned'))
        OR
        -- Active bookings with not_required
        (dispatch_status = 'not_required' AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress'))
      )
    `;

    if (inconsistent.length === 0) {
      results.push("✅ CONSISTENCY CHECK PASSED: All paid bookings are in dispatch buckets");
    } else {
      results.push(`⚠️ WARNING: ${inconsistent.length} bookings still inconsistent`);
      results.push(JSON.stringify(inconsistent.map((b: any) => ({
        id: b.id?.slice(0, 8),
        status: b.status,
        dispatch_status: b.dispatch_status,
        payment_status: b.payment_status,
      }))));
    }

    // Step 6: Final distribution
    const after = await sql`
      SELECT dispatch_status, status, payment_status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status, status, payment_status
      ORDER BY dispatch_status, status
    `;
    results.push(`📊 Final distribution: ${JSON.stringify(after)}`);

    return NextResponse.json({
      success: true,
      results,
      fixed: paidFix.length + catchAll.length,
      paidFixed: paidFix.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, results }, { status: 500 });
  }
}

// GET — Check current dispatch_status distribution
export async function GET() {
  try {
    const distribution = await sql`
      SELECT dispatch_status, status, payment_status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status, status, payment_status
      ORDER BY dispatch_status, status
    `;

    const inconsistent = await sql`
      SELECT id, status, dispatch_status, payment_status, pickup_at, created_at
      FROM bookings
      WHERE (
        (payment_status = 'paid' AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress')
          AND dispatch_status NOT IN ('awaiting_source_owner', 'awaiting_sln_member', 'manual_dispatch_required', 'assigned'))
        OR
        (dispatch_status IN ('not_required', 'pending') AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress'))
      )
      ORDER BY created_at DESC
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
