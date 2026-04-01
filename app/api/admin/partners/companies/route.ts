export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * PATCH /api/admin/partners/companies
 * BM5 — Partner Governance Model
 * Update partner_dispatch_mode for a partner company.
 *
 * Body: { company_id: string, partner_dispatch_mode: "CAPTURE_ONLY" | "SUBNETWORK_PRIORITY" }
 */
export async function PATCH(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { company_id, partner_dispatch_mode } = body;

    if (!company_id) {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }

    const validModes = ["CAPTURE_ONLY", "SUBNETWORK_PRIORITY"];
    if (partner_dispatch_mode && !validModes.includes(partner_dispatch_mode)) {
      return NextResponse.json({ error: `Invalid partner_dispatch_mode. Must be one of: ${validModes.join(", ")}` }, { status: 400 });
    }

    // Check if partner_dispatch_mode column exists — if not, add it gracefully
    await sql`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS partner_dispatch_mode TEXT DEFAULT 'CAPTURE_ONLY'
    `.catch(() => {});

    const [updated] = await sql`
      UPDATE companies
      SET
        partner_dispatch_mode = ${partner_dispatch_mode ?? "CAPTURE_ONLY"},
        updated_at = NOW()
      WHERE id = ${company_id}::uuid
      RETURNING id, name, brand_name, partner_dispatch_mode
    `;

    if (!updated) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Audit log
    await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
      VALUES (
        'partner_company',
        ${company_id}::uuid,
        'partner_dispatch_mode_updated',
        'admin',
        ${JSON.stringify({ partner_dispatch_mode, updated_at: new Date().toISOString() })}::jsonb
      )
    `.catch(() => {});

    return NextResponse.json({
      success: true,
      company_id: updated.id,
      name: updated.brand_name ?? updated.name,
      partner_dispatch_mode: updated.partner_dispatch_mode,
      message: `Partner dispatch mode updated to ${updated.partner_dispatch_mode}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

/**
 * GET /api/admin/partners/companies
 * List all partner companies with their dispatch mode.
 */
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const companies = await sql`
      SELECT
        id,
        name,
        brand_name,
        master_ref_code,
        COALESCE(partner_dispatch_mode, 'CAPTURE_ONLY') AS partner_dispatch_mode,
        status,
        created_at
      FROM companies
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ companies });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
