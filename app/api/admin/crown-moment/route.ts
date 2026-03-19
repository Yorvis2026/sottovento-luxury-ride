import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/crown-moment — Crown Moment stats
export async function GET() {
  try {
    // Crown Moment leads (captured via crown moment / tablet)
    const crownLeads = await sql`
      SELECT COUNT(*) AS total,
             COUNT(CASE WHEN status = 'booked' THEN 1 END) AS converted,
             COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS today,
             COUNT(CASE WHEN created_at >= date_trunc('week', CURRENT_DATE) THEN 1 END) AS this_week,
             COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) AS this_month
      FROM leads
      WHERE lead_source IN ('crown_moment', 'tablet', 'crown-moment')
    `;
    // All crown moment leads list
    const recentCrownLeads = await sql`
      SELECT id, full_name, email, phone, interested_package, status, driver_code, created_at
      FROM leads
      WHERE lead_source IN ('crown_moment', 'tablet', 'crown-moment')
         OR email IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      stats: {
        total: Number(crownLeads[0]?.total ?? 0),
        converted: Number(crownLeads[0]?.converted ?? 0),
        today: Number(crownLeads[0]?.today ?? 0),
        thisWeek: Number(crownLeads[0]?.this_week ?? 0),
        thisMonth: Number(crownLeads[0]?.this_month ?? 0),
      },
      recentLeads: recentCrownLeads,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
