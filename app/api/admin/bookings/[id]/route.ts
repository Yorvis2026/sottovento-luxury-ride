import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// Booking Status → Dispatch Status mapping rules
// ============================================================
function inferDispatchStatus(bookingStatus: string): string {
  switch (bookingStatus) {
    case "new":
    case "quote_sent":
    case "awaiting_payment":
    case "confirmed":
      return "awaiting_source_owner"
    case "accepted":
    case "assigned":
    case "in_service":
    case "in_progress":
    case "completed":
      return "assigned"
    case "cancelled":
      return "cancelled"
    default:
      return "not_required"
  }
}

// PATCH /api/admin/bookings/[id] — Update booking status and/or dispatch_status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, dispatch_status, assigned_driver_id } = body;

    if (status) {
      const inferredDispatch = dispatch_status ?? inferDispatchStatus(status);
      try {
        await sql`
          UPDATE bookings
          SET
            status = ${status},
            dispatch_status = ${inferredDispatch},
            updated_at = NOW()
          WHERE id = ${params.id}::uuid
        `;
      } catch (e: any) {
        // Fallback if dispatch_status column doesn't exist yet
        if (e.message?.includes("dispatch_status")) {
          await sql`
            UPDATE bookings
            SET status = ${status}, updated_at = NOW()
            WHERE id = ${params.id}::uuid
          `;
        } else throw e;
      }
    }

    // Update dispatch_status independently (without changing booking status)
    if (dispatch_status && !status) {
      try {
        await sql`
          UPDATE bookings
          SET dispatch_status = ${dispatch_status}, updated_at = NOW()
          WHERE id = ${params.id}::uuid
        `;
      } catch (e: any) {
        if (!e.message?.includes("dispatch_status")) throw e;
      }
    }

    // Assign driver
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
