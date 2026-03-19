import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// PATCH /api/admin/bookings/[id] — Update booking (assign driver, cancel, change status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, assigned_driver_id } = body;

    if (status) {
      await sql`
        UPDATE bookings
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${params.id}::uuid
      `;
    }
    if (assigned_driver_id !== undefined) {
      await sql`
        UPDATE bookings
        SET assigned_driver_id = ${assigned_driver_id}::uuid, updated_at = NOW()
        WHERE id = ${params.id}::uuid
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/admin/bookings/[id] — Get single booking with full details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rows = await sql`
      SELECT
        b.*,
        c.full_name AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        d.full_name AS driver_name,
        d.driver_code AS driver_code
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE b.id = ${params.id}::uuid
    `;
    if (!rows[0]) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ booking: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
