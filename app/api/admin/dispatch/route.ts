import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/dispatch — Return all bookings requiring dispatch, grouped by dispatch_status
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
      WHERE b.dispatch_status IN (
        'awaiting_source_owner',
        'awaiting_sln_member',
        'manual_dispatch_required'
      )
      ORDER BY b.created_at DESC
    `;

    // Group by dispatch_status
    const awaitingSourceOwner = rows.filter((r: any) => r.dispatch_status === "awaiting_source_owner");
    const awaitingSlnMember = rows.filter((r: any) => r.dispatch_status === "awaiting_sln_member");
    const manualDispatchRequired = rows.filter((r: any) => r.dispatch_status === "manual_dispatch_required");

    return NextResponse.json({
      awaitingSourceOwner,
      awaitingSlnMember,
      manualDispatchRequired,
      total: rows.length,
    });
  } catch (err: any) {
    // Fallback if dispatch_status column doesn't exist yet
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
            'awaiting_source_owner' AS dispatch_status,
            b.payment_status,
            b.assigned_driver_id,
            b.created_at,
            c.full_name AS client_name,
            c.phone AS client_phone
          FROM bookings b
          LEFT JOIN clients c ON b.client_id = c.id
          WHERE b.status IN ('new', 'offered')
          ORDER BY b.created_at DESC
        `;
        return NextResponse.json({
          awaitingSourceOwner: rows,
          awaitingSlnMember: [],
          manualDispatchRequired: [],
          total: rows.length,
          migrationRequired: true,
        });
      } catch (err2: any) {
        return NextResponse.json({ error: err2.message }, { status: 500 });
      }
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/dispatch — Update dispatch_status for a booking
export async function PATCH(req: NextRequest) {
  try {
    const { booking_id, dispatch_status } = await req.json();
    if (!booking_id || !dispatch_status) {
      return NextResponse.json({ error: "booking_id and dispatch_status required" }, { status: 400 });
    }

    const validStatuses = [
      "not_required",
      "awaiting_source_owner",
      "awaiting_sln_member",
      "manual_dispatch_required",
      "assigned",
      "expired",
      "cancelled",
    ];
    if (!validStatuses.includes(dispatch_status)) {
      return NextResponse.json({ error: `Invalid dispatch_status: ${dispatch_status}` }, { status: 400 });
    }

    try {
      await sql`
        UPDATE bookings
        SET dispatch_status = ${dispatch_status}, updated_at = NOW()
        WHERE id = ${booking_id}::uuid
      `;
    } catch (e: any) {
      if (e.message?.includes("dispatch_status")) {
        return NextResponse.json({ error: "Migration required: run POST /api/admin/migrate first" }, { status: 503 });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
