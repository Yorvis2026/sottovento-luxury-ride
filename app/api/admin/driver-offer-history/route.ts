export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/admin/driver-offer-history
//
// BM10 MASTER BLOCK — Admin: Driver Offer History
//
// Query params:
//   driver_code  — filter by specific driver
//   booking_id   — filter by specific booking
//   offer_status — filter by status (offer_expired, offer_accepted, etc.)
//   limit        — max rows (default 100, max 500)
//   offset       — pagination offset
//
// Returns offer history with full booking and driver context.
// PART 9 of MASTER BLOCK spec.
// ============================================================

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key") || "";
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const driverCode  = searchParams.get("driver_code");
  const bookingId   = searchParams.get("booking_id");
  const offerStatus = searchParams.get("offer_status");
  const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "100"), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  try {
    // Build dynamic WHERE conditions
    const conditions: string[] = [];

    let rows: any[];

    if (driverCode && bookingId && offerStatus) {
      rows = await sql`
        SELECT
          doh.id::text, doh.booking_id::text, doh.driver_id::text,
          doh.driver_code, doh.round_number, doh.offer_status,
          doh.sent_at, doh.expired_at, doh.responded_at, doh.notes, doh.created_at,
          d.full_name AS driver_name,
          b.pickup_address, b.dropoff_address, b.pickup_at,
          b.status AS booking_status, b.dispatch_state, b.dispatch_round,
          b.total_price, b.currency
        FROM driver_offer_history doh
        JOIN drivers d ON d.id = doh.driver_id
        JOIN bookings b ON b.id = doh.booking_id
        WHERE doh.driver_code = ${driverCode}
          AND doh.booking_id  = ${bookingId}::uuid
          AND doh.offer_status = ${offerStatus}
        ORDER BY doh.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (driverCode && bookingId) {
      rows = await sql`
        SELECT
          doh.id::text, doh.booking_id::text, doh.driver_id::text,
          doh.driver_code, doh.round_number, doh.offer_status,
          doh.sent_at, doh.expired_at, doh.responded_at, doh.notes, doh.created_at,
          d.full_name AS driver_name,
          b.pickup_address, b.dropoff_address, b.pickup_at,
          b.status AS booking_status, b.dispatch_state, b.dispatch_round,
          b.total_price, b.currency
        FROM driver_offer_history doh
        JOIN drivers d ON d.id = doh.driver_id
        JOIN bookings b ON b.id = doh.booking_id
        WHERE doh.driver_code = ${driverCode}
          AND doh.booking_id  = ${bookingId}::uuid
        ORDER BY doh.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (driverCode && offerStatus) {
      rows = await sql`
        SELECT
          doh.id::text, doh.booking_id::text, doh.driver_id::text,
          doh.driver_code, doh.round_number, doh.offer_status,
          doh.sent_at, doh.expired_at, doh.responded_at, doh.notes, doh.created_at,
          d.full_name AS driver_name,
          b.pickup_address, b.dropoff_address, b.pickup_at,
          b.status AS booking_status, b.dispatch_state, b.dispatch_round,
          b.total_price, b.currency
        FROM driver_offer_history doh
        JOIN drivers d ON d.id = doh.driver_id
        JOIN bookings b ON b.id = doh.booking_id
        WHERE doh.driver_code  = ${driverCode}
          AND doh.offer_status = ${offerStatus}
        ORDER BY doh.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (bookingId) {
      rows = await sql`
        SELECT
          doh.id::text, doh.booking_id::text, doh.driver_id::text,
          doh.driver_code, doh.round_number, doh.offer_status,
          doh.sent_at, doh.expired_at, doh.responded_at, doh.notes, doh.created_at,
          d.full_name AS driver_name,
          b.pickup_address, b.dropoff_address, b.pickup_at,
          b.status AS booking_status, b.dispatch_state, b.dispatch_round,
          b.total_price, b.currency
        FROM driver_offer_history doh
        JOIN drivers d ON d.id = doh.driver_id
        JOIN bookings b ON b.id = doh.booking_id
        WHERE doh.booking_id = ${bookingId}::uuid
        ORDER BY doh.round_number ASC, doh.created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (driverCode) {
      rows = await sql`
        SELECT
          doh.id::text, doh.booking_id::text, doh.driver_id::text,
          doh.driver_code, doh.round_number, doh.offer_status,
          doh.sent_at, doh.expired_at, doh.responded_at, doh.notes, doh.created_at,
          d.full_name AS driver_name,
          b.pickup_address, b.dropoff_address, b.pickup_at,
          b.status AS booking_status, b.dispatch_state, b.dispatch_round,
          b.total_price, b.currency
        FROM driver_offer_history doh
        JOIN drivers d ON d.id = doh.driver_id
        JOIN bookings b ON b.id = doh.booking_id
        WHERE doh.driver_code = ${driverCode}
        ORDER BY doh.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // No filter — return most recent entries
      rows = await sql`
        SELECT
          doh.id::text, doh.booking_id::text, doh.driver_id::text,
          doh.driver_code, doh.round_number, doh.offer_status,
          doh.sent_at, doh.expired_at, doh.responded_at, doh.notes, doh.created_at,
          d.full_name AS driver_name,
          b.pickup_address, b.dropoff_address, b.pickup_at,
          b.status AS booking_status, b.dispatch_state, b.dispatch_round,
          b.total_price, b.currency
        FROM driver_offer_history doh
        JOIN drivers d ON d.id = doh.driver_id
        JOIN bookings b ON b.id = doh.booking_id
        ORDER BY doh.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return NextResponse.json({
      ok: true,
      filters: { driver_code: driverCode, booking_id: bookingId, offer_status: offerStatus },
      count: rows.length,
      history: rows,
      pagination: { limit, offset, returned: rows.length },
    });

  } catch (err: any) {
    console.error("[admin/driver-offer-history] error:", err?.message);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
