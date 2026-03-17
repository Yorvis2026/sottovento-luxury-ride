import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/driver/me?code=YHV001 — Get driver data by driver_code
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        id,
        driver_code,
        full_name,
        phone,
        email,
        driver_status,
        is_eligible,
        created_at
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driver = rows[0];

    // Get stats
    const [clientStats] = await sql`
      SELECT
        COUNT(DISTINCT client_id) AS total_clients,
        COUNT(*) AS total_bookings,
        COALESCE(SUM(total_price * 0.05), 0) AS lifetime_earnings
      FROM bookings
      WHERE source_driver_id = ${driver.id}
        AND status != 'cancelled'
    `;

    const [monthStats] = await sql`
      SELECT COALESCE(SUM(total_price * 0.05), 0) AS month_earnings
      FROM bookings
      WHERE source_driver_id = ${driver.id}
        AND status != 'cancelled'
        AND created_at >= date_trunc('month', NOW())
    `;

    const [pendingOffers] = await sql`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE assigned_driver_id = ${driver.id}
        AND status = 'pending'
    `;

    return NextResponse.json({
      driver: {
        ...driver,
        stats: {
          total_clients: Number(clientStats?.total_clients ?? 0),
          total_bookings: Number(clientStats?.total_bookings ?? 0),
          lifetime_earnings: Number(clientStats?.lifetime_earnings ?? 0),
          month_earnings: Number(monthStats?.month_earnings ?? 0),
          pending_offers: Number(pendingOffers?.count ?? 0),
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
