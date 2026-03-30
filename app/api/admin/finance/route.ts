export const dynamic = "force-dynamic"
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/finance — SLN Finance overview
export async function GET() {
  try {
    // Total revenue all time
    const totalRevenue = await sql`
      SELECT COALESCE(SUM(total_price), 0) AS total
      FROM bookings
      WHERE status NOT IN ('cancelled')
    `;
    // Revenue this month
    const monthRevenue = await sql`
      SELECT COALESCE(SUM(total_price), 0) AS total
      FROM bookings
      WHERE status NOT IN ('cancelled')
        AND created_at >= date_trunc('month', CURRENT_DATE)
    `;
    // Commissions summary
    const commissions = await sql`
      SELECT
        COALESCE(SUM(executor_amount), 0) AS total_driver_earnings,
        COALESCE(SUM(source_amount), 0) AS total_source_earnings,
        COALESCE(SUM(platform_amount), 0) AS total_platform_earnings,
        COALESCE(SUM(total_amount), 0) AS total_commissions,
        COUNT(*) AS commission_count
      FROM commissions
      WHERE status = 'confirmed'
    `;
    // Top earning drivers
    const topDrivers = await sql`
      SELECT
        d.full_name,
        d.driver_code,
        COALESCE(SUM(c.executor_amount), 0) AS executor_earnings,
        COALESCE(SUM(c.source_amount), 0) AS source_earnings,
        COUNT(DISTINCT c.booking_id) AS rides
      FROM drivers d
      LEFT JOIN commissions c ON c.executor_driver_id = d.id OR c.source_driver_id = d.id
      GROUP BY d.id, d.full_name, d.driver_code
      ORDER BY (COALESCE(SUM(c.executor_amount), 0) + COALESCE(SUM(c.source_amount), 0)) DESC
      LIMIT 10
    `;
    // Recent commissions
    const recentCommissions = await sql`
      SELECT
        c.id,
        c.booking_id,
        c.executor_amount,
        c.source_amount,
        c.platform_amount,
        c.total_amount,
        c.status,
        c.created_at,
        d.full_name AS executor_name
      FROM commissions c
      LEFT JOIN drivers d ON c.executor_driver_id = d.id
      ORDER BY c.created_at DESC
      LIMIT 20
    `;

    return NextResponse.json({
      totalRevenue: Number(totalRevenue[0]?.total ?? 0),
      monthRevenue: Number(monthRevenue[0]?.total ?? 0),
      commissions: {
        totalDriverEarnings: Number(commissions[0]?.total_driver_earnings ?? 0),
        totalSourceEarnings: Number(commissions[0]?.total_source_earnings ?? 0),
        totalPlatformEarnings: Number(commissions[0]?.total_platform_earnings ?? 0),
        totalCommissions: Number(commissions[0]?.total_commissions ?? 0),
        count: Number(commissions[0]?.commission_count ?? 0),
      },
      topDrivers,
      recentCommissions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
