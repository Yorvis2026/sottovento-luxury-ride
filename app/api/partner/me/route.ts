import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET — Get partner data by ref_code
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

    // Get partner
    const partners = await sql`
      SELECT
        p.*,
        pc.brand_name AS company_name,
        pc.master_ref_code AS company_ref_code
      FROM partners p
      LEFT JOIN partner_companies pc ON p.parent_company_id = pc.id
      WHERE p.ref_code = ${code.toUpperCase()}
      LIMIT 1
    `;

    if (partners.length === 0) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partner = partners[0];

    if (partner.status === 'suspended' || partner.status === 'inactive') {
      return NextResponse.json({ error: "Partner account is not active" }, { status: 403 });
    }

    // Earnings summary
    const earningsSummary = await sql`
      SELECT
        COALESCE(SUM(commission_amount), 0) AS lifetime_earnings,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN commission_amount ELSE 0 END), 0) AS mtd_earnings,
        COUNT(*) AS total_earnings_records
      FROM partner_earnings
      WHERE partner_id = ${partner.id} AND status != 'void'
    `;

    // Clients captured
    const clientStats = await sql`
      SELECT
        COUNT(DISTINCT client_id) AS total_clients,
        COUNT(*) AS total_bookings
      FROM bookings
      WHERE partner_id = ${partner.id}
    `;

    // Recent clients
    const clients = await sql`
      SELECT
        c.id,
        c.full_name,
        c.phone,
        MAX(b.pickup_at) AS last_ride,
        COUNT(b.id) AS total_rides,
        COALESCE(SUM(b.total_price), 0) AS total_revenue
      FROM bookings b
      JOIN clients c ON c.id = b.client_id
      WHERE b.partner_id = ${partner.id}
      GROUP BY c.id, c.full_name, c.phone
      ORDER BY last_ride DESC
      LIMIT 20
    `;

    // Recent earnings
    const earnings = await sql`
      SELECT
        pe.id,
        pe.gross_amount,
        pe.commission_amount,
        pe.commission_rate,
        pe.status,
        pe.created_at,
        b.pickup_address,
        b.dropoff_address
      FROM partner_earnings pe
      LEFT JOIN bookings b ON b.id = pe.booking_id
      WHERE pe.partner_id = ${partner.id}
      ORDER BY pe.created_at DESC
      LIMIT 20
    `;

    // Update last_activity_at
    await sql`
      UPDATE partners SET last_activity_at = NOW() WHERE id = ${partner.id}
    `;

    return NextResponse.json({
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        type: partner.type,
        status: partner.status,
        ref_code: partner.ref_code,
        commission_rate: partner.commission_rate,
        company_name: partner.company_name,
        created_at: partner.created_at
      },
      stats: {
        total_clients: Number(clientStats[0]?.total_clients ?? 0),
        total_bookings: Number(clientStats[0]?.total_bookings ?? 0),
        mtd_earnings: Number(earningsSummary[0]?.mtd_earnings ?? 0),
        lifetime_earnings: Number(earningsSummary[0]?.lifetime_earnings ?? 0)
      },
      clients,
      earnings
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
