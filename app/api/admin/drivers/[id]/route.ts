export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// PATCH /api/admin/drivers/[id] — Update driver fields (status, legal_affiliation_type, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      driver_status,
      legal_affiliation_type,
      driver_tier,
      is_eligible_for_premium_dispatch,
      is_eligible_for_airport_priority,
    } = body;

    // BM5: Update legal_affiliation_type (Admin Only)
    if (legal_affiliation_type !== undefined) {
      const validAffiliations = ["SOTTOVENTO_LEGAL_FLEET", "PARTNER_LEGAL_FLEET", "GENERAL_NETWORK_DRIVER"];
      if (!validAffiliations.includes(legal_affiliation_type)) {
        return NextResponse.json({ error: `Invalid legal_affiliation_type. Must be one of: ${validAffiliations.join(", ")}` }, { status: 400 });
      }
      await sql`
        UPDATE drivers
        SET legal_affiliation_type = ${legal_affiliation_type}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, updated: "legal_affiliation_type", value: legal_affiliation_type });
    }

    // BM5: Update driver_tier manually (Admin Override)
    if (driver_tier !== undefined) {
      const validTiers = ["ELITE", "PREMIUM", "STANDARD", "RESTRICTED", "OBSERVATION"];
      if (!validTiers.includes(driver_tier)) {
        return NextResponse.json({ error: `Invalid driver_tier. Must be one of: ${validTiers.join(", ")}` }, { status: 400 });
      }
      await sql`
        UPDATE drivers
        SET driver_tier = ${driver_tier}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, updated: "driver_tier", value: driver_tier });
    }

    // Update premium dispatch eligibility
    if (is_eligible_for_premium_dispatch !== undefined) {
      await sql`
        UPDATE drivers
        SET is_eligible_for_premium_dispatch = ${is_eligible_for_premium_dispatch}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, updated: "is_eligible_for_premium_dispatch", value: is_eligible_for_premium_dispatch });
    }

    // Update airport priority eligibility
    if (is_eligible_for_airport_priority !== undefined) {
      await sql`
        UPDATE drivers
        SET is_eligible_for_airport_priority = ${is_eligible_for_airport_priority}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, updated: "is_eligible_for_airport_priority", value: is_eligible_for_airport_priority });
    }

    // Legacy: Update driver_status
    if (driver_status) {
      await sql`
        UPDATE drivers
        SET driver_status = ${driver_status}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, updated: "driver_status", value: driver_status });
    }

    return NextResponse.json({ error: "No valid field provided to update" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
