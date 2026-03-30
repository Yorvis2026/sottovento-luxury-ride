export const dynamic = "force-dynamic"
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET — List all partner companies with performance
export async function GET() {
  try {
    const companies = await sql`
      SELECT
        pc.id,
        pc.name,
        pc.brand_name,
        pc.master_ref_code,
        pc.commission_split_company,
        pc.commission_split_staff,
        pc.status,
        pc.created_at,
        COUNT(DISTINCT p.id) AS staff_count,
        COALESCE(SUM(pe.commission_amount), 0) AS total_earnings,
        COALESCE(SUM(CASE WHEN pe.created_at >= date_trunc('month', NOW()) THEN pe.commission_amount ELSE 0 END), 0) AS earnings_mtd
      FROM partner_companies pc
      LEFT JOIN partners p ON p.parent_company_id = pc.id
      LEFT JOIN partner_earnings pe ON pe.partner_id = p.id AND pe.status != 'void'
      GROUP BY pc.id
      ORDER BY pc.created_at DESC
    `;

    return NextResponse.json({ companies });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST — Create a new partner company
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, brand_name, commission_split_company, commission_split_staff } = body;

    if (!name || !brand_name) {
      return NextResponse.json({ error: "name and brand_name required" }, { status: 400 });
    }

    // Generate master_ref_code from brand_name
    const master_ref_code = brand_name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 20);

    const result = await sql`
      INSERT INTO partner_companies (name, brand_name, master_ref_code, commission_split_company, commission_split_staff)
      VALUES (
        ${name},
        ${brand_name},
        ${master_ref_code},
        ${commission_split_company ?? 0.10},
        ${commission_split_staff ?? 0.05}
      )
      RETURNING *
    `;

    return NextResponse.json({ company: result[0] });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
