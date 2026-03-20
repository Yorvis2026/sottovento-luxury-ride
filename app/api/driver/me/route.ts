import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/driver/me?code=YHV001 — Get driver data + active offer + assigned ride
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    // ── Load driver ──────────────────────────────────────────
    const rows = await sql`
      SELECT
        id,
        driver_code,
        full_name,
        phone,
        email,
        driver_status,
        is_eligible,
        created_at
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driver = rows[0];

    // ── Stats ────────────────────────────────────────────────
    const [clientStats] = await sql`
      SELECT
        COUNT(DISTINCT client_id) AS total_clients,
        COUNT(*) AS total_bookings,
        COALESCE(SUM(total_price * 0.05), 0) AS lifetime_earnings
      FROM bookings
      WHERE source_driver_id = ${driver.id}
        AND status != 'cancelled'
    `;

    const [monthStats] = await sql`
      SELECT COALESCE(SUM(total_price * 0.05), 0) AS month_earnings
      FROM bookings
      WHERE source_driver_id = ${driver.id}
        AND status != 'cancelled'
        AND created_at >= date_trunc('month', NOW())
    `;

    const [pendingOffers] = await sql`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE assigned_driver_id = ${driver.id}
        AND status = 'pending'
    `;

    // ── Active offer — check dispatch_offers table first ────
    // Primary: dispatch_offers table (full dispatch system)
    // Fallback: bookings.dispatch_status = 'awaiting_driver_response' (simplified)
    let active_offer = null;

    try {
      // Strategy 1: dispatch_offers table (preferred)
      const offerRows = await sql`
        SELECT
          do.id AS offer_id,
          do.booking_id,
          do.expires_at,
          do.offer_round,
          do.is_source_offer,
          b.pickup_address,
          b.dropoff_address,
          b.pickup_at,
          b.vehicle_type,
          b.total_price,
          b.dispatch_status
        FROM dispatch_offers do
        JOIN bookings b ON b.id = do.booking_id
        WHERE do.driver_id = ${driver.id}
          AND do.status = 'pending'
          AND (do.expires_at IS NULL OR do.expires_at > NOW())
          AND b.status NOT IN ('cancelled', 'completed', 'assigned')
        ORDER BY do.created_at DESC
        LIMIT 1
      `;

      if (offerRows.length > 0) {
        const o = offerRows[0];
        active_offer = {
          offer_id: o.offer_id,
          booking_id: o.booking_id,
          pickup_location: o.pickup_address ?? "TBD",
          dropoff_location: o.dropoff_address ?? "TBD",
          pickup_datetime: o.pickup_at,
          vehicle_type: o.vehicle_type ?? "Sedan",
          total_price: Number(o.total_price ?? 0),
          expires_at: o.expires_at,
          dispatch_status: o.dispatch_status ?? "awaiting_driver_response",
          is_source_offer: o.is_source_offer ?? false,
          offer_round: o.offer_round ?? 1,
        };
      }
    } catch {
      // dispatch_offers table may not exist yet — try fallback
    }

    // Strategy 2 fallback: bookings.dispatch_status = 'awaiting_driver_response'
    if (!active_offer) {
      try {
        const fallbackRows = await sql`
          SELECT
            id AS booking_id,
            pickup_address,
            dropoff_address,
            pickup_at,
            vehicle_type,
            total_price,
            dispatch_status,
            offer_expires_at
          FROM bookings
          WHERE (
            (dispatch_status = 'awaiting_driver_response' AND assigned_driver_id = ${driver.id})
            OR
            (dispatch_status = 'awaiting_source_owner' AND source_driver_id = ${driver.id})
            OR
            (dispatch_status = 'awaiting_sln_member' AND assigned_driver_id = ${driver.id})
          )
          AND status NOT IN ('cancelled', 'completed', 'assigned')
          AND (offer_expires_at IS NULL OR offer_expires_at > NOW())
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (fallbackRows.length > 0) {
          const o = fallbackRows[0];
          active_offer = {
            offer_id: o.booking_id, // use booking_id as offer_id fallback
            booking_id: o.booking_id,
            pickup_location: o.pickup_address ?? "TBD",
            dropoff_location: o.dropoff_address ?? "TBD",
            pickup_datetime: o.pickup_at,
            vehicle_type: o.vehicle_type ?? "Sedan",
            total_price: Number(o.total_price ?? 0),
            expires_at: o.offer_expires_at,
            dispatch_status: o.dispatch_status ?? "awaiting_driver_response",
            is_source_offer: o.dispatch_status === "awaiting_source_owner",
            offer_round: 1,
          };
        }
      } catch {
        // dispatch columns not yet migrated — no active offer
      }
    }

    // ── Assigned ride — booking confirmed for this driver ────
    let assigned_ride = null;
    try {
      // Step 1: Get basic booking data (columns guaranteed to exist)
      const assignedRows = await sql`
        SELECT
          id AS booking_id,
          status,
          pickup_address,
          dropoff_address,
          pickup_at,
          vehicle_type,
          total_price,
          client_id
        FROM bookings
        WHERE assigned_driver_id = ${driver.id}
          AND status IN ('accepted', 'assigned', 'en_route', 'arrived', 'in_trip')
          AND (
            pickup_at >= NOW() - INTERVAL '4 hours'
            OR pickup_at IS NULL
            OR status IN ('en_route', 'arrived', 'in_trip')
          )
        ORDER BY
          CASE status
            WHEN 'in_trip' THEN 1
            WHEN 'arrived' THEN 2
            WHEN 'en_route' THEN 3
            WHEN 'assigned' THEN 4
            WHEN 'accepted' THEN 5
            ELSE 6
          END,
          pickup_at ASC
        LIMIT 1
      `;

      if (assignedRows.length > 0) {
        const r = assignedRows[0];
        let client_name = null;
        let client_phone = null;
        if (r.client_id) {
          try {
            const clientRows = await sql`
              SELECT full_name, phone FROM clients WHERE id = ${r.client_id} LIMIT 1
            `;
            if (clientRows.length > 0) {
              client_name = clientRows[0].full_name;
              client_phone = clientRows[0].phone;
            }
          } catch {}
        }

        // Step 2: Try to get optional trip timestamp columns
        let en_route_at = null;
        let arrived_at = null;
        let trip_started_at = null;
        let completed_at = null;
        try {
          const tsRows = await sql`
            SELECT en_route_at, arrived_at, trip_started_at, completed_at
            FROM bookings WHERE id = ${r.booking_id} LIMIT 1
          `;
          if (tsRows.length > 0) {
            en_route_at = tsRows[0].en_route_at ?? null;
            arrived_at = tsRows[0].arrived_at ?? null;
            trip_started_at = tsRows[0].trip_started_at ?? null;
            completed_at = tsRows[0].completed_at ?? null;
          }
        } catch { /* columns may not exist yet */ }

        assigned_ride = {
          booking_id: r.booking_id,
          status: r.status ?? "assigned",
          pickup_location: r.pickup_address ?? "TBD",
          dropoff_location: r.dropoff_address ?? "TBD",
          pickup_datetime: r.pickup_at,
          vehicle_type: r.vehicle_type ?? "Sedan",
          total_price: Number(r.total_price ?? 0),
          client_name,
          client_phone,
          en_route_at,
          arrived_at,
          trip_started_at,
          completed_at,
        };
      }
    } catch (assignErr: any) {
      // Log error but don't fail the whole response
      console.error("[driver/me] assigned_ride error:", assignErr?.message);
    }

    // ── Upcoming rides — future rides not yet in active window ──
    let upcoming_rides: Record<string, unknown>[] = [];
    try {
      const upcomingRows = await sql`
        SELECT
          id AS booking_id,
          status,
          pickup_address,
          dropoff_address,
          pickup_at,
          vehicle_type,
          total_price,
          COALESCE(ride_window_state, 'upcoming') AS ride_window_state
        FROM bookings
        WHERE assigned_driver_id = ${driver.id}
          AND status IN ('accepted', 'assigned')
          AND pickup_at > NOW() + INTERVAL '90 minutes'
        ORDER BY pickup_at ASC
        LIMIT 10
      `;
      upcoming_rides = upcomingRows.map((r) => ({
        booking_id: r.booking_id,
        status: r.status,
        pickup_location: r.pickup_address ?? "TBD",
        dropoff_location: r.dropoff_address ?? "TBD",
        pickup_datetime: r.pickup_at,
        vehicle_type: r.vehicle_type ?? "Sedan",
        total_price: Number(r.total_price ?? 0),
        ride_window_state: r.ride_window_state ?? "upcoming",
      }));
    } catch { /* upcoming_rides non-blocking */ }

    // ── Completed rides — last 10 completed ──────────────────
    let completed_rides: Record<string, unknown>[] = [];
    try {
      const completedRows = await sql`
        SELECT
          id AS booking_id,
          status,
          pickup_address,
          dropoff_address,
          pickup_at,
          completed_at,
          vehicle_type,
          total_price
        FROM bookings
        WHERE assigned_driver_id = ${driver.id}
          AND status IN ('completed', 'no_show')
        ORDER BY completed_at DESC NULLS LAST
        LIMIT 10
      `;
      completed_rides = completedRows.map((r) => ({
        booking_id: r.booking_id,
        status: r.status,
        pickup_location: r.pickup_address ?? "TBD",
        dropoff_location: r.dropoff_address ?? "TBD",
        pickup_datetime: r.pickup_at,
        completed_at: r.completed_at,
        vehicle_type: r.vehicle_type ?? "Sedan",
        total_price: Number(r.total_price ?? 0),
      }));
    } catch { /* completed_rides non-blocking */ }

    return NextResponse.json({
      driver: {
        ...driver,
        stats: {
          total_clients: Number(clientStats?.total_clients ?? 0),
          total_bookings: Number(clientStats?.total_bookings ?? 0),
          lifetime_earnings: Number(clientStats?.lifetime_earnings ?? 0),
          month_earnings: Number(monthStats?.month_earnings ?? 0),
          pending_offers: Number(pendingOffers?.count ?? 0),
        },
        active_offer,
        assigned_ride,
        upcoming_rides,
        completed_rides,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
