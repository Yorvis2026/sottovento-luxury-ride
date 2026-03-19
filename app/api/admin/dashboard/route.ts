import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/dashboard — SLN Dashboard stats
export async function GET() {
  try {
    // Bookings today
    const todayBookings = await sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= CURRENT_DATE
    `;
    // Bookings this week
    const weekBookings = await sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= date_trunc('week', CURRENT_DATE)
    `;
    // Bookings this month
    const monthBookings = await sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `;
    // Active drivers
    const activeDrivers = await sql`
      SELECT COUNT(*) AS count FROM drivers WHERE driver_status = 'active'
    `;
    // Total leads
    const totalLeads = await sql`
      SELECT COUNT(*) AS count FROM leads
    `;
    // Leads by source
    const leadsBySource = await sql`
      SELECT lead_source, COUNT(*) AS count
      FROM leads
      GROUP BY lead_source
      ORDER BY count DESC
    `;
    // Booking statuses
    const bookingStatuses = await sql`
      SELECT status, COUNT(*) AS count
      FROM bookings
      GROUP BY status
      ORDER BY count DESC
    `;
    // Recent bookings (last 5)
    const recentBookings = await sql`
      SELECT b.id, b.pickup_zone, b.dropoff_zone, b.total_price, b.status, b.created_at,
             c.full_name AS client_name
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `;

    return NextResponse.json({
      today: { count: Number(todayBookings[0]?.count ?? 0), revenue: Number(todayBookings[0]?.revenue ?? 0) },
      week: { count: Number(weekBookings[0]?.count ?? 0), revenue: Number(weekBookings[0]?.revenue ?? 0) },
      month: { count: Number(monthBookings[0]?.count ?? 0), revenue: Number(monthBookings[0]?.revenue ?? 0) },
      activeDrivers: Number(activeDrivers[0]?.count ?? 0),
      totalLeads: Number(totalLeads[0]?.count ?? 0),
      leadsBySource,
      bookingStatuses,
      recentBookings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
