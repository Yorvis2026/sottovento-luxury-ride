import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/driver/me?code=YHV001
//
// Returns driver data with:
//  - stats: computed from COMPLETED rides (executor earnings)
//  - assigned_ride: rides with pickup_at <= NOW (current/past) OR in LIVE_FLOW
//  - upcoming_rides: future rides with pickup_at > NOW
//  - completed_rides: last 20 completed rides
//
// RIDE MODE LOGIC (simple timeline model):
//  UPCOMING      → pickup_at > NOW AND status in (accepted, assigned)
//  ACTIVE_WINDOW → pickup_at <= NOW OR pickup_at IS NULL AND status in (accepted, assigned)
//  LIVE_FLOW     → status in (en_route, arrived, in_trip)
//  COMPLETED     → status = completed
// ============================================================

const ACTIVATION_BUFFER_MINUTES = 90;

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

    // ── Stats: executor earnings from completed rides ────────
    // Month earnings = sum of total_price for completed rides this month
    // Lifetime earnings = sum of all completed rides
    // Source earnings = 5% of bookings where source_driver_id = this driver
    const [executorStats] = await sql`
      SELECT
        COUNT(*) AS completed_rides_count,
        COALESCE(SUM(total_price), 0) AS lifetime_executor_earnings,
        COALESCE(SUM(CASE WHEN completed_at >= date_trunc('month', NOW()) THEN total_price ELSE 0 END), 0) AS month_executor_earnings
      FROM bookings
      WHERE assigned_driver_id = ${driver.id}
        AND status = 'completed'
    `;

    const [sourceStats] = await sql`
      SELECT
        COUNT(DISTINCT client_id) AS total_clients,
        COALESCE(SUM(total_price * 0.05), 0) AS lifetime_source_earnings,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN total_price * 0.05 ELSE 0 END), 0) AS month_source_earnings
      FROM bookings
      WHERE source_driver_id = ${driver.id}
        AND status != 'cancelled'
    `;

    const [pendingOffers] = await sql`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE assigned_driver_id = ${driver.id}
        AND status = 'pending'
    `;

    // Combined earnings
    const lifetime_earnings =
      Number(executorStats?.lifetime_executor_earnings ?? 0) +
      Number(sourceStats?.lifetime_source_earnings ?? 0);
    const month_earnings =
      Number(executorStats?.month_executor_earnings ?? 0) +
      Number(sourceStats?.month_source_earnings ?? 0);

    // ── Active offer ─────────────────────────────────────────
    let active_offer = null;

    try {
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
    } catch { /* dispatch_offers may not exist */ }

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
            OR (dispatch_status = 'awaiting_source_owner' AND source_driver_id = ${driver.id})
            OR (dispatch_status = 'awaiting_sln_member' AND assigned_driver_id = ${driver.id})
          )
          AND status NOT IN ('cancelled', 'completed', 'assigned')
          AND (offer_expires_at IS NULL OR offer_expires_at > NOW())
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (fallbackRows.length > 0) {
          const o = fallbackRows[0];
          active_offer = {
            offer_id: o.booking_id,
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
      } catch { /* dispatch columns not yet migrated */ }
    }

    // ── Assigned ride: current/past pickup OR LIVE_FLOW ────────
    // Simple timeline model: pickup_at <= NOW → assigned (actionable)
    //                        pickup_at > NOW  → upcoming (future)
    // LIVE_FLOW: en_route, arrived, in_trip always shown regardless of time
    let assigned_ride = null;
    try {
      const assignedRows = await sql`
        SELECT
          id AS booking_id,
          status,
          pickup_address,
          dropoff_address,
          pickup_zone,
          dropoff_zone,
          pickup_at,
          vehicle_type,
          total_price,
          client_id,
          service_type,
          flight_number,
          notes,
          passengers,
          luggage,
          updated_at
        FROM bookings
        WHERE assigned_driver_id = ${driver.id}
          AND (
            -- LIVE_FLOW: already executing regardless of time
            status IN ('en_route', 'arrived', 'in_trip')
            OR
            -- ACTIVE_WINDOW: pickup is now or in the past (ride is actionable)
            -- Simple model: future rides → upcoming, current/past rides → assigned
            (
              status IN ('accepted', 'assigned')
              AND (
                pickup_at IS NULL
                OR pickup_at <= NOW()
              )
            )
          )
        ORDER BY
          CASE status
            WHEN 'in_trip'  THEN 1
            WHEN 'arrived'  THEN 2
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

        let en_route_at = null, arrived_at = null, trip_started_at = null, completed_at = null;
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
        } catch {}

        // Compute ride_mode for the client
        const pickupAt = r.pickup_at ? new Date(r.pickup_at) : null;
        const now = new Date();
        const minutesUntilPickup = pickupAt
          ? (pickupAt.getTime() - now.getTime()) / 60000
          : null;

        let ride_mode = "active_window";
        if (["en_route", "arrived", "in_trip"].includes(r.status)) {
          ride_mode = "live_flow";
        } else if (minutesUntilPickup !== null && minutesUntilPickup > ACTIVATION_BUFFER_MINUTES) {
          ride_mode = "active_window"; // shouldn't happen due to query, but safety
        }

        // ── Fetch bookings_count for repeat client detection ──
        let bookings_count = 1;
        if (r.client_id) {
          try {
            const countRows = await sql`
              SELECT COUNT(*) AS cnt FROM bookings
              WHERE client_id = ${r.client_id} AND status = 'completed'
            `;
            bookings_count = Number(countRows[0]?.cnt ?? 0);
          } catch {}
        }

        assigned_ride = {
          booking_id: r.booking_id,
          status: r.status ?? "assigned",
          pickup_location: r.pickup_address ?? "TBD",
          dropoff_location: r.dropoff_address ?? "TBD",
          pickup_zone: r.pickup_zone ?? null,
          dropoff_zone: r.dropoff_zone ?? null,
          pickup_datetime: r.pickup_at,
          vehicle_type: r.vehicle_type ?? "Sedan",
          total_price: Number(r.total_price ?? 0),
          client_name,
          client_phone,
          service_type: r.service_type ?? "transfer",
          flight_number: r.flight_number ?? null,
          notes: r.notes ?? null,
          passengers: r.passengers ?? null,
          luggage: r.luggage ?? null,
          bookings_count,
          en_route_at,
          arrived_at,
          trip_started_at,
          completed_at,
          ride_mode,
          minutes_until_pickup: minutesUntilPickup !== null ? Math.round(minutesUntilPickup) : null,
          updated_at: r.updated_at ?? null,
        };
      }
    } catch (assignErr: any) {
      console.error("[driver/me] assigned_ride error:", assignErr?.message);
    }

    // ── Upcoming rides: outside active window ────────────────
    let upcoming_rides: Record<string, unknown>[] = [];
    try {
      const upcomingRows = await sql`
        SELECT
          b.id AS booking_id,
          b.status,
          b.pickup_address,
          b.dropoff_address,
          b.pickup_at,
          b.vehicle_type,
          b.total_price,
          b.flight_number,
          b.passengers,
          b.luggage,
          b.notes,
          c.full_name AS client_name,
          c.phone AS client_phone
        FROM bookings b
        LEFT JOIN clients c ON c.id = b.client_id
        WHERE b.assigned_driver_id = ${driver.id}
          AND b.status IN ('accepted', 'assigned')
          AND b.pickup_at > NOW()
        ORDER BY b.pickup_at ASC
        LIMIT 10
      `;
      upcoming_rides = upcomingRows.map((r) => {
        const pickupAt = r.pickup_at ? new Date(r.pickup_at) : null;
        const minutesUntil = pickupAt
          ? Math.round((pickupAt.getTime() - Date.now()) / 60000)
          : null;
        return {
          booking_id: r.booking_id,
          status: r.status,
          pickup_location: r.pickup_address ?? "TBD",
          dropoff_location: r.dropoff_address ?? "TBD",
          pickup_datetime: r.pickup_at,
          vehicle_type: r.vehicle_type ?? "Sedan",
          total_price: Number(r.total_price ?? 0),
          ride_window_state: "upcoming",
          minutes_until_pickup: minutesUntil,
          flight_number: r.flight_number ?? null,
          passengers: r.passengers ?? null,
          luggage: r.luggage ?? null,
          notes: r.notes ?? null,
          client_name: r.client_name ?? null,
          client_phone: r.client_phone ?? null,
        };
      });
    } catch { /* non-blocking */ }

    // ── Completed rides: last 20 ─────────────────────────────
    let completed_rides: Record<string, unknown>[] = [];
    try {
      const completedRows = await sql`
        SELECT
          b.id AS booking_id,
          b.status,
          b.pickup_address,
          b.dropoff_address,
          b.pickup_at,
          b.completed_at,
          b.vehicle_type,
          b.total_price,
          b.flight_number,
          b.notes,
          b.passengers,
          b.luggage,
          COALESCE(cl.full_name, b.client_name_override) AS client_name,
          COALESCE(cl.phone, b.client_phone_override) AS client_phone,
          c.executor_amount,
          c.source_amount,
          c.platform_amount,
          c.status AS payout_status
        FROM bookings b
        LEFT JOIN clients cl ON cl.id = b.client_id
        LEFT JOIN commissions c ON c.booking_id = b.id
        WHERE b.assigned_driver_id = ${driver.id}
          AND b.status IN ('completed', 'no_show')
        ORDER BY COALESCE(b.completed_at, b.pickup_at) DESC NULLS LAST
        LIMIT 50
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
        flight_number: r.flight_number ?? null,
        notes: r.notes ?? null,
        passengers: r.passengers ?? null,
        luggage: r.luggage ?? null,
        client_name: r.client_name ?? null,
        client_phone: r.client_phone ?? null,
        driver_earnings: r.executor_amount ? Number(r.executor_amount) : null,
        sln_commission: r.platform_amount ? Number(r.platform_amount) : null,
        source_earnings: r.source_amount ? Number(r.source_amount) : null,
        payout_status: r.payout_status ?? "pending",
      }));
    } catch { /* non-blocking */ }

    return NextResponse.json({
      driver: {
        ...driver,
        stats: {
          total_clients: Number(sourceStats?.total_clients ?? 0),
          completed_rides_count: Number(executorStats?.completed_rides_count ?? 0),
          lifetime_earnings,
          month_earnings,
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
