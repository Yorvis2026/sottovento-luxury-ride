import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// Active operational statuses (aligned with Admin Reservations + Dispatch)
const ACTIVE_STATUSES = [
  'new', 'needs_review', 'ready_for_dispatch',
  'assigned', 'driver_confirmed', 'in_progress', 'driver_issue',
  'pending_dispatch', 'pending', 'pending_payment'
]

// GET /api/admin/dashboard — SLN Dashboard stats
export async function GET() {
  try {
    // ── Timezone-safe date boundaries (America/New_York = Florida EDT/EST) ──
    // Strategy: convert NOW() to Florida local time, truncate to day/week/month,
    // then cast back to timestamptz so the comparison works against UTC-stored created_at.
    //
    // date_trunc('day', NOW() AT TIME ZONE 'America/New_York') gives us midnight in ET
    // as a plain timestamp (no tz). Casting it AT TIME ZONE 'America/New_York' converts
    // that plain midnight back to a UTC timestamptz for the WHERE clause.

    // Bookings today — midnight ET → UTC
    const todayBookings = await sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
        AND status = ANY(ARRAY['new','needs_review','ready_for_dispatch','assigned',
                               'driver_confirmed','in_progress','driver_issue',
                               'pending_dispatch','pending','pending_payment','completed'])
    `;
    // Bookings this week — start of ISO week (Monday) in ET → UTC
    const weekBookings = await sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= date_trunc('week', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
        AND status = ANY(ARRAY['new','needs_review','ready_for_dispatch','assigned',
                               'driver_confirmed','in_progress','driver_issue',
                               'pending_dispatch','pending','pending_payment','completed'])
    `;
    // Bookings this month — 1st of month in ET → UTC
    const monthBookings = await sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= date_trunc('month', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
        AND status = ANY(ARRAY['new','needs_review','ready_for_dispatch','assigned',
                               'driver_confirmed','in_progress','driver_issue',
                               'pending_dispatch','pending','pending_payment','completed'])
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
    // Booking statuses (all, for status breakdown widget)
    const bookingStatuses = await sql`
      SELECT status, COUNT(*) AS count
      FROM bookings
      GROUP BY status
      ORDER BY count DESC
    `;
    // Needs Review count — exact same logic as Dispatch endpoint
    // Includes: status='needs_review' OR status='new' with missing required fields
    const needsReviewCount = await sql`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE status = 'needs_review'
         OR (
           status = 'new'
           AND (
             (pickup_address IS NULL OR pickup_address = '') AND (pickup_zone IS NULL OR pickup_zone = '')
             OR (dropoff_address IS NULL OR dropoff_address = '') AND (dropoff_zone IS NULL OR dropoff_zone = '')
             OR pickup_at IS NULL
           )
         )
    `;
    // Recent bookings (last 5)
    const recentBookings = await sql`
      SELECT b.id, b.pickup_zone, b.dropoff_zone, b.pickup_address, b.dropoff_address,
             b.total_price, b.status, b.dispatch_status, b.payment_status, b.created_at,
             b.booking_ref, b.booking_origin,
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
      needsReview: Number(needsReviewCount[0]?.count ?? 0),
      leadsBySource,
      bookingStatuses,
      recentBookings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
