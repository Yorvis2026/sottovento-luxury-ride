export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// POST /api/admin/cleanup-test
// Archives all test/pipeline bookings so they don't appear in operational views.
// Requires secret header for safety.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const secret = req.headers.get("x-cleanup-secret") ?? body.secret

    // Simple secret check — must match env var or hardcoded fallback
    const expectedSecret = process.env.CLEANUP_SECRET ?? "sln-cleanup-2026"
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Step 1: Count bookings before cleanup
    const beforeRows = await sql`
      SELECT COUNT(*) AS total FROM bookings
      WHERE status NOT IN ('archived', 'cancelled')
    `
    const totalBefore = Number(beforeRows[0]?.total ?? 0)

    // Step 2: Archive ALL non-production bookings
    // We identify test bookings by:
    // - client_name contains 'test', 'pipeline', 'demo', 'prueba' (case insensitive)
    // - OR pickup_address contains 'MCO', 'DISNEY', 'TBD', 'test'
    // - OR booking was created more than 0 days ago and is still in pending/new/offered state
    // For a full environment reset, we archive ALL bookings that are not in a real production state
    const archiveResult = await sql`
      UPDATE bookings
      SET
        status = 'archived',
        dispatch_status = 'archived',
        updated_at = NOW()
      WHERE status NOT IN ('archived')
        AND (
          -- Test client names
          LOWER(COALESCE(
            (SELECT full_name FROM clients WHERE id = bookings.client_id LIMIT 1),
            ''
          )) SIMILAR TO '%(test|pipeline|demo|prueba|sample)%'
          -- OR test addresses
          OR UPPER(COALESCE(bookings.pickup_address, '')) SIMILAR TO '%(MCO|DISNEY|TBD|TEST|SAMPLE)%'
          OR UPPER(COALESCE(bookings.dropoff_address, '')) SIMILAR TO '%(MCO|DISNEY|TBD|TEST|SAMPLE)%'
          -- OR any booking in a non-active state (cleanup all pending/new/offered/assigned)
          OR bookings.status IN ('new', 'offered', 'pending_dispatch', 'accepted', 'assigned', 'completed', 'cancelled')
          -- OR bookings with driver_rejected or needs_correction dispatch_status
          OR bookings.dispatch_status IN ('driver_rejected', 'needs_correction', 'manual_dispatch_required', 'needs_review')
        )
      RETURNING id
    `

    const archivedCount = archiveResult.length

    // Step 3: Count remaining active bookings
    const afterRows = await sql`
      SELECT COUNT(*) AS total FROM bookings
      WHERE status NOT IN ('archived', 'cancelled')
    `
    const totalAfter = Number(afterRows[0]?.total ?? 0)

    // Step 4: Log the cleanup action
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
        VALUES (
          'system',
          gen_random_uuid(),
          'test_environment_cleanup',
          ${JSON.stringify({
            archived_count: archivedCount,
            total_before: totalBefore,
            total_after: totalAfter,
            timestamp: new Date().toISOString(),
          })}::jsonb,
          NOW()
        )
      `
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      message: `Test environment cleaned. ${archivedCount} bookings archived.`,
      archived_count: archivedCount,
      total_before: totalBefore,
      total_after: totalAfter,
      archived_ids: archiveResult.map((r: any) => r.id),
    })

  } catch (err: any) {
    console.error("[cleanup-test]", err)
    return NextResponse.json({ error: "Internal server error", detail: err?.message }, { status: 500 })
  }
}

// GET /api/admin/cleanup-test — Preview what would be archived (dry run)
export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret")
    const expectedSecret = process.env.CLEANUP_SECRET ?? "sln-cleanup-2026"
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rows = await sql`
      SELECT
        b.id,
        b.status,
        b.dispatch_status,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at,
        b.created_at,
        c.full_name AS client_name
      FROM bookings b
      LEFT JOIN clients c ON c.id = b.client_id
      WHERE b.status NOT IN ('archived')
      ORDER BY b.created_at DESC
    `

    return NextResponse.json({
      preview: true,
      total_to_archive: rows.length,
      bookings: rows,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
