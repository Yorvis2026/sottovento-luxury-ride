export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// Debug endpoint to test the active_offer query
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const driver_id = searchParams.get("driver_id");
  const adminKey = req.headers.get("x-admin-key");
  
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (!driver_id) {
    return NextResponse.json({ error: "driver_id required" }, { status: 400 });
  }

  try {
    // Test 1: Check dispatch_offers for this driver
    const offerCheck = await sql`
      SELECT dof.id, dof.booking_id, dof.response, dof.expires_at,
             b.status AS booking_status, b.dispatch_status
      FROM dispatch_offers dof
      JOIN bookings b ON b.id = dof.booking_id
      WHERE dof.driver_id = ${driver_id}::uuid
        AND dof.response = 'pending'
        AND (dof.expires_at IS NULL OR dof.expires_at > NOW())
      ORDER BY dof.created_at DESC
      LIMIT 5
    `;

    // Test 2: Full query with all fields
    let fullQuery: any[] = [];
    let fullQueryError: string | null = null;
    try {
      fullQuery = await sql`
        SELECT
          dof.id AS offer_id,
          dof.booking_id,
          dof.expires_at,
          dof.offer_round,
          dof.is_source_offer,
          b.pickup_address,
          b.dropoff_address,
          b.pickup_zone,
          b.dropoff_zone,
          b.pickup_at,
          b.vehicle_type,
          b.total_price,
          b.dispatch_status,
          b.client_id,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
          COALESCE(b.luggage_count, 0) AS luggage_count,
          b.notes,
          b.flight_number,
          c.full_name AS client_name,
          c.phone AS client_phone
        FROM dispatch_offers dof
        JOIN bookings b ON b.id = dof.booking_id
        LEFT JOIN clients c ON c.id = b.client_id
        WHERE dof.driver_id = ${driver_id}::uuid
          AND dof.response = 'pending'
          AND (dof.expires_at IS NULL OR dof.expires_at > NOW())
          AND b.status NOT IN ('cancelled', 'completed', 'no_show', 'archived', 'en_route', 'arrived', 'in_trip', 'accepted')
          AND b.dispatch_status NOT IN ('accepted', 'completed', 'cancelled', 'assigned')
        ORDER BY dof.created_at DESC
        LIMIT 1
      `;
    } catch (e: any) {
      fullQueryError = e?.message ?? String(e);
    }

    return NextResponse.json({
      driver_id,
      simple_offer_check: offerCheck,
      full_query_result: fullQuery,
      full_query_error: fullQueryError,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
