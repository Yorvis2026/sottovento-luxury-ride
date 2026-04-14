export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// POST /api/admin/deactivate-test-drivers
// SLN-DRIVER-CLEANUP-01: Deactivates test drivers IH002 and TEST001.
// Sets driver_status = 'inactive' and is_eligible = false so they are
// excluded from all dispatch queries and the Assign Driver UI.
export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cleanup-secret")
    const expectedSecret = process.env.CLEANUP_SECRET ?? "sln-cleanup-2026"
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Deactivate all test drivers by code — IH002 and TEST001
    const TEST_CODES = ["IH002", "TEST001"]

    const result = await sql`
      UPDATE drivers
      SET
        driver_status    = 'inactive',
        is_eligible      = false,
        availability_status = 'offline',
        updated_at       = NOW()
      WHERE driver_code = ANY(${TEST_CODES})
      RETURNING id, driver_code, full_name, driver_status, is_eligible, availability_status
    `

    // Log the action
    try {
      for (const d of result) {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES (
            'driver',
            ${d.id}::uuid,
            'driver_deactivated_cleanup',
            ${JSON.stringify({
              driver_code: d.driver_code,
              reason: "SLN-DRIVER-CLEANUP-01: test driver deactivated",
              driver_status: "inactive",
              is_eligible: false,
              timestamp: new Date().toISOString(),
            })}::jsonb,
            NOW()
          )
        `
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      deactivated: result.length,
      drivers: result,
    })

  } catch (err: any) {
    console.error("[deactivate-test-drivers]", err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}

// GET — preview which drivers would be deactivated
export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret")
    const expectedSecret = process.env.CLEANUP_SECRET ?? "sln-cleanup-2026"
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const TEST_CODES = ["IH002", "TEST001"]
    const rows = await sql`
      SELECT id, driver_code, full_name, driver_status, is_eligible, availability_status
      FROM drivers
      WHERE driver_code = ANY(${TEST_CODES})
    `

    return NextResponse.json({ preview: true, drivers: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
