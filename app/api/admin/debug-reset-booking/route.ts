export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * GET /api/admin/debug-reset-booking?booking_id=xxx
 * Resets a booking to pending_dispatch state for testing dispatch/offer flow.
 * Also clears all dispatch_offers for this booking.
 */
export async function GET(req: NextRequest) {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id");

  if (!bookingId) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  }

  try {
    // Reset booking to pending_dispatch
    const reset = await sql`
      UPDATE bookings
      SET
        status = 'pending_dispatch',
        dispatch_status = 'pending_dispatch',
        assigned_driver_id = NULL,
        updated_at = NOW()
      WHERE id = ${bookingId}::uuid
      RETURNING id, status, dispatch_status
    `;

    // Clear all dispatch_offers for this booking
    const cleared = await sql`
      DELETE FROM dispatch_offers
      WHERE booking_id = ${bookingId}::uuid
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      booking: reset[0],
      cleared_offers: cleared.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
