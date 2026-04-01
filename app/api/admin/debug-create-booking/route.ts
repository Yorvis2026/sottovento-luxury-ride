export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/**
 * POST /api/admin/debug-create-booking
 * Creates a test booking with all required fields for driver panel testing.
 * Also assigns it to a driver if assign_driver_code is provided.
 */
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

  try {
    const body = await req.json();
    const {
      pickup_address = "MCO Terminal A, Orlando, FL",
      dropoff_address = "4200 Daetwyler Drive, Orlando, FL",
      pickup_at = new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 90 min from now
      total_price = 65,
      vehicle_type = "Sedan",
      client_name = "Test Client",
      assign_driver_code = null,
      status = "pending_dispatch",
    } = body;

    // Create the booking
    const rows = await sql`
      INSERT INTO bookings (
        status,
        dispatch_status,
        pickup_address,
        dropoff_address,
        pickup_at,
        total_price,
        vehicle_type,
        client_name,
        service_type,
        created_at,
        updated_at
      ) VALUES (
        ${status},
        ${status},
        ${pickup_address},
        ${dropoff_address},
        ${pickup_at}::timestamptz,
        ${total_price},
        ${vehicle_type},
        ${client_name},
        'transfer',
        NOW(),
        NOW()
      )
      RETURNING id, status, dispatch_status, pickup_at, pickup_address, dropoff_address, total_price
    `;

    const booking = rows[0];

    // Optionally assign driver
    let assignResult = null;
    if (assign_driver_code) {
      const driverRows = await sql`
        SELECT id, driver_code FROM drivers
        WHERE driver_code = ${assign_driver_code}
        LIMIT 1
      `;
      if (driverRows.length > 0) {
        const driver = driverRows[0];
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

        await sql`
          UPDATE bookings
          SET
            status = 'offer_pending',
            dispatch_status = 'offer_pending',
            updated_at = NOW()
          WHERE id = ${booking.id}::uuid
        `;

        await sql`
          INSERT INTO dispatch_offers (
            booking_id, driver_id, status, expires_at, round, created_at, updated_at
          ) VALUES (
            ${booking.id}::uuid,
            ${driver.id}::uuid,
            'pending',
            ${expiresAt}::timestamptz,
            1,
            NOW(),
            NOW()
          )
        `;

        assignResult = { driver_code: assign_driver_code, offer_expires_at: expiresAt };
      }
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      status: booking.status,
      pickup_at: booking.pickup_at,
      pickup_address: booking.pickup_address,
      dropoff_address: booking.dropoff_address,
      total_price: booking.total_price,
      assign: assignResult,
    });

  } catch (err: any) {
    console.error("[debug-create-booking]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
