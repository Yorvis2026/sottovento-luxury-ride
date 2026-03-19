import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/leads — List all SLN leads
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        l.id,
        l.lead_source,
        l.full_name,
        l.phone,
        l.email,
        l.interested_package,
        l.status,
        l.driver_code,
        l.tablet_code,
        l.created_at,
        d.full_name AS driver_name
      FROM leads l
      LEFT JOIN drivers d ON l.driver_id = d.id
      ORDER BY l.created_at DESC
      LIMIT 200
    `;
    return NextResponse.json({ leads: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
