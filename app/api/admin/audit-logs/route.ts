export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key")
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Check if audit_logs table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'audit_logs'
      ) AS exists
    `

    if (!tableCheck[0]?.exists) {
      return NextResponse.json({
        error: "audit_logs table does not exist",
        note: "The webhook creates it on first real payment — no payments have been processed yet",
      })
    }

    const logs = await sql`
      SELECT id, entity_type, entity_id, action, actor_type, new_data, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 50
    `

    const emailLogs = logs.filter((l: any) =>
      l.action?.includes("email") || l.action?.includes("dispatch") || l.action?.includes("payment")
    )

    return NextResponse.json({
      total: logs.length,
      email_related: emailLogs.length,
      recent_logs: logs.slice(0, 20),
      email_logs: emailLogs,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
