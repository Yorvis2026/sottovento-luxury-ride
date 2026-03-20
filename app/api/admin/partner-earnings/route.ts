import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET — List partner earnings with filters + compliance data
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partner_id");
    const status = searchParams.get("status");
    const exportCsv = searchParams.get("export") === "csv";
    const compliance = searchParams.get("compliance") === "true";

    if (compliance) {
      // 1099 compliance view: partners with YTD earnings >= $600
      const complianceData = await sql`
        SELECT
          p.id,
          p.name,
          p.email,
          p.type,
          p.ref_code,
          pp.legal_name,
          pp.tax_id_type,
          pp.w9_status,
          pp.entity_type,
          COALESCE(SUM(pe.commission_amount), 0) AS ytd_earnings,
          CASE WHEN COALESCE(SUM(pe.commission_amount), 0) >= 600 THEN true ELSE false END AS requires_w9
        FROM partners p
        LEFT JOIN partner_profiles pp ON pp.partner_id = p.id
        LEFT JOIN partner_earnings pe ON pe.partner_id = p.id
          AND pe.status != 'void'
          AND pe.created_at >= date_trunc('year', NOW())
        GROUP BY p.id, pp.legal_name, pp.tax_id_type, pp.w9_status, pp.entity_type
        ORDER BY ytd_earnings DESC
      `;

      return NextResponse.json({ compliance: complianceData });
    }

    const earnings = await sql`
      SELECT
        pe.id,
        pe.partner_id,
        pe.booking_id,
        pe.gross_amount,
        pe.commission_amount,
        pe.commission_rate,
        pe.status,
        pe.created_at,
        p.name AS partner_name,
        p.ref_code,
        p.type AS partner_type,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at
      FROM partner_earnings pe
      JOIN partners p ON p.id = pe.partner_id
      LEFT JOIN bookings b ON b.id = pe.booking_id
      WHERE
        (${partnerId}::text IS NULL OR pe.partner_id::text = ${partnerId})
        AND (${status}::text IS NULL OR pe.status = ${status})
      ORDER BY pe.created_at DESC
      LIMIT 500
    `;

    if (exportCsv) {
      const headers = ["ID", "Partner", "Ref Code", "Type", "Booking ID", "Gross Amount", "Commission", "Rate", "Status", "Date"];
      const rows = earnings.map(e => [
        e.id,
        e.partner_name,
        e.ref_code,
        e.partner_type,
        e.booking_id ?? "",
        `$${Number(e.gross_amount).toFixed(2)}`,
        `$${Number(e.commission_amount).toFixed(2)}`,
        `${Math.round(Number(e.commission_rate) * 100)}%`,
        e.status,
        new Date(e.created_at).toLocaleDateString()
      ]);

      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="partner-earnings-${new Date().toISOString().split("T")[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ earnings });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH — Update earning status (approve/pay/void)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

    await sql`
      UPDATE partner_earnings SET status = ${status} WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
