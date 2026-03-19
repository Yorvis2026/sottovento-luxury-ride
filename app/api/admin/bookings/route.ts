import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/bookings — List all bookings with client info + dispatch_status
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
        b.dispatch_status,
        b.payment_status,
        b.assigned_driver_id,
        b.created_at,
        c.full_name AS client_name,
        c.phone AS client_phone,
        d.full_name AS driver_name,
        d.driver_code AS driver_code
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ bookings: rows });
  } catch (err: any) {
    // Fallback if dispatch_status column not yet migrated
    if (err.message?.includes("dispatch_status")) {
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
            NULL AS dispatch_status,
            b.payment_status,
            b.assigned_driver_id,
            b.created_at,
            c.full_name AS client_name,
            c.phone AS client_phone
          FROM bookings b
          LEFT JOIN clients c ON b.client_id = c.id
          ORDER BY b.created_at DESC
          LIMIT 100
        `;
        return NextResponse.json({ bookings: rows });
      } catch (err2: any) {
        return NextResponse.json({ error: err2.message }, { status: 500 });
      }
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
