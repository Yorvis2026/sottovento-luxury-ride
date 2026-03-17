import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/bookings — List all bookings with client info
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        b.id,
        b.pickup_zone,
        b.dropoff_zone,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at,
        b.vehicle_type,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at,
        c.full_name AS client_name,
        c.phone AS client_phone
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ bookings: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
