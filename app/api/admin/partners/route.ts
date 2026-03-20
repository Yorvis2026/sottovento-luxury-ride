import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET — List all partners with earnings summary
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const companyId = searchParams.get("company_id");

    const partners = await sql`
      SELECT
        p.id,
        p.type,
        p.name,
        p.email,
        p.phone,
        p.status,
        p.ref_code,
        p.commission_rate,
        p.last_activity_at,
        p.created_at,
        pc.brand_name AS company_name,
        pc.id AS company_id,
        COALESCE(SUM(CASE WHEN pe.created_at >= date_trunc('month', NOW()) THEN pe.commission_amount ELSE 0 END), 0) AS earnings_mtd,
        COALESCE(SUM(pe.commission_amount), 0) AS earnings_lifetime,
        COUNT(DISTINCT b.id) AS total_bookings,
        COUNT(DISTINCT b.client_id) AS total_clients
      FROM partners p
      LEFT JOIN partner_companies pc ON p.parent_company_id = pc.id
      LEFT JOIN partner_earnings pe ON pe.partner_id = p.id AND pe.status != 'void'
      LEFT JOIN bookings b ON b.partner_id = p.id
      WHERE
        (${type}::text IS NULL OR p.type = ${type})
        AND (${status}::text IS NULL OR p.status = ${status})
        AND (${companyId}::text IS NULL OR p.parent_company_id::text = ${companyId})
      GROUP BY p.id, pc.brand_name, pc.id
      ORDER BY p.created_at DESC
    `;

    return NextResponse.json({ partners });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH — Update partner (rate, status)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, commission_rate, status } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await sql`
      UPDATE partners SET
        commission_rate = COALESCE(${commission_rate}::numeric, commission_rate),
        status = COALESCE(${status}, status)
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
