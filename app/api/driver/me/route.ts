export const dynamic = "force-dynamic"
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
    const debug = searchParams.get("debug") === "1";

    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    // ── Ensure availability_status column exists (idempotent migration) ──
    try {
      await sql`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'offline'`;
    } catch { /* already exists */ }

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
        COALESCE(availability_status, 'offline') AS availability_status,
        created_at,
        -- BM5: Driver Reliability Score Engine
        COALESCE(reliability_score, 65) AS reliability_score,
        COALESCE(driver_tier, 'STANDARD') AS driver_tier,
        COALESCE(legal_affiliation_type, 'GENERAL_NETWORK_DRIVER') AS legal_affiliation_type,
        acceptance_rate,
        completion_rate,
        driver_cancel_rate,
        fallback_response_rate,
        on_time_score,
        dispatch_response_score,
        driver_score_total,
        driver_score_tier
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
      // CRITICAL FIX: 'do' is a reserved word in PostgreSQL — alias renamed to 'dof'
      const offerRows = await sql`
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
        WHERE dof.driver_id = ${driver.id}::uuid
          AND dof.response = 'pending'
          AND (dof.expires_at IS NULL OR dof.expires_at > NOW())
          AND b.status NOT IN ('cancelled', 'completed', 'no_show', 'archived', 'en_route', 'arrived', 'in_trip', 'accepted')
          AND b.dispatch_status NOT IN ('accepted', 'completed', 'cancelled', 'assigned')
          AND COALESCE(dof.is_fallback_offer, false) = false
        ORDER BY dof.created_at DESC
        LIMIT 1
      `;

      if (offerRows.length > 0) {
        const o = offerRows[0];
        // Fetch bookings_count for repeat client detection
        let bookings_count = 1;
        if (o.client_id) {
          try {
            const cntRows = await sql`SELECT COUNT(*) AS cnt FROM bookings WHERE client_id = ${o.client_id} AND status = 'completed'`;
            bookings_count = Number(cntRows[0]?.cnt ?? 0);
          } catch {}
        }
        active_offer = {
          offer_id: o.offer_id,
          booking_id: o.booking_id,
          pickup_location: o.pickup_address || (o.pickup_zone ? `Zone: ${o.pickup_zone}` : "TBD"),
          dropoff_location: o.dropoff_address || (o.dropoff_zone ? `Zone: ${o.dropoff_zone}` : "TBD"),
          pickup_datetime: o.pickup_at,
          vehicle_type: o.vehicle_type ?? "Sedan",
          total_price: Number(o.total_price ?? 0),
          expires_at: o.expires_at,
          dispatch_status: o.dispatch_status ?? "awaiting_driver_response",
          is_source_offer: o.is_source_offer ?? false,
          offer_round: o.offer_round ?? 1,
          client_name: o.client_name ?? null,
          client_phone: o.client_phone ?? null,
          passengers: o.passenger_count ?? null,
          luggage: o.luggage_count ?? null,
          notes: o.notes ?? null,
          flight_number: o.flight_number ?? null,
          bookings_count,
        };
      }
    } catch (offerErr: any) {
      console.error('[driver/me] active_offer query failed:', offerErr?.message ?? offerErr);
    }

    if (!active_offer) {
      try {
        const fallbackRows = await sql`
          SELECT
            id AS booking_id,
            pickup_address,
            dropoff_address,
            pickup_zone,
            dropoff_zone,
            pickup_at,
            vehicle_type,
            total_price,
            dispatch_status,
            offer_expires_at
          FROM bookings
          WHERE (
            (dispatch_status = 'awaiting_driver_response' AND assigned_driver_id = ${driver.id}::uuid)
            OR (dispatch_status = 'awaiting_source_owner' AND source_driver_id = ${driver.id}::uuid)
            OR (dispatch_status = 'awaiting_sln_member' AND assigned_driver_id = ${driver.id}::uuid)
          )
          -- CRITICAL FIX: 'assigned' was excluded here, but auto-assigned bookings have
          -- status='assigned' AND dispatch_status='offer_pending'. They ARE valid offers.
          -- Only exclude 'assigned' if dispatch_status is NOT 'offer_pending'.
          AND status NOT IN ('cancelled', 'completed', 'no_show', 'archived', 'en_route', 'arrived', 'in_trip', 'accepted')
          AND NOT (status = 'assigned' AND (dispatch_status IS NULL OR dispatch_status != 'offer_pending'))
          AND (offer_expires_at IS NULL OR offer_expires_at > NOW())
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (fallbackRows.length > 0) {
          const o = fallbackRows[0];
          active_offer = {
            offer_id: o.booking_id,
            booking_id: o.booking_id,
            pickup_location: o.pickup_address || (o.pickup_zone ? `Zone: ${o.pickup_zone}` : "TBD"),
            dropoff_location: o.dropoff_address || (o.dropoff_zone ? `Zone: ${o.dropoff_zone}` : "TBD"),
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

    // ── Fallback offer (Bloque Maestro 3) ─────────────────────
    // Check if driver has a pending fallback pool offer
    let fallback_offer = null;
    if (!active_offer) {
      try {
        const fbOfferRows = await sql`
          SELECT
            dof.id AS offer_id,
            dof.booking_id,
            dof.expires_at,
            dof.offer_round,
            dof.fallback_case_level,
            dof.fallback_priority_level,
            b.pickup_address,
            b.dropoff_address,
            b.pickup_zone,
            b.dropoff_zone,
            b.pickup_at,
            b.vehicle_type,
            b.total_price,
            b.service_type,
            b.passengers,
            b.notes,
            b.flight_number,
            c.full_name AS client_name,
            c.phone AS client_phone
          FROM dispatch_offers dof
          JOIN bookings b ON b.id = dof.booking_id
          LEFT JOIN clients c ON c.id = b.client_id
          WHERE dof.driver_id = ${driver.id}::uuid
            AND dof.response = 'pending'
            AND dof.is_fallback_offer = true
            AND (dof.expires_at IS NULL OR dof.expires_at > NOW())
            AND b.status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
          ORDER BY dof.created_at DESC
          LIMIT 1
        `;
        if (fbOfferRows.length > 0) {
          const fo = fbOfferRows[0];
          fallback_offer = {
            offer_id: fo.offer_id,
            booking_id: fo.booking_id,
            pickup_location: fo.pickup_address || (fo.pickup_zone ? `Zone: ${fo.pickup_zone}` : 'TBD'),
            dropoff_location: fo.dropoff_address || (fo.dropoff_zone ? `Zone: ${fo.dropoff_zone}` : 'TBD'),
            pickup_datetime: fo.pickup_at,
            vehicle_type: fo.vehicle_type ?? 'Sedan',
            total_price: Number(fo.total_price ?? 0),
            expires_at: fo.expires_at,
            offer_round: fo.offer_round ?? 1,
            fallback_case_level: fo.fallback_case_level,
            fallback_priority_level: fo.fallback_priority_level,
            service_type: fo.service_type ?? 'transfer',
            passengers: fo.passengers ?? null,
            notes: fo.notes ?? null,
            flight_number: fo.flight_number ?? null,
            client_name: fo.client_name ?? null,
            client_phone: fo.client_phone ?? null,
            is_fallback_offer: true,
          };
        }
      } catch (fbErr: any) {
        console.error('[driver/me] fallback_offer query failed:', fbErr?.message);
      }
    }

    // ── Assigned ride: current/past pickup OR LIVE_FLOW ────────
    // Simple timeline model: pickup_at <= NOW → assigned (actionable)
    //                        pickup_at > NOW  → upcoming (future)
    // LIVE_FLOW: en_route, arrived, in_trip always shown regardless of time
    let assigned_ride = null;
    try {
      // Section 3 + 4: Corrected active ride query.
      // MUST exclude: completed, cancelled, archived (finalized rides must disappear).
      // MUST include: offer_pending (driver needs to accept/reject),
      //               accepted, assigned (confirmed, awaiting execution),
      //               en_route, arrived, in_trip (live flow).
      // Returns only the single most relevant active ride.
      const assignedRows = await sql`
        SELECT
          id AS booking_id,
          status,
          dispatch_status,
          pickup_address,
          dropoff_address,
          pickup_zone,
          dropoff_zone,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng,
          pickup_at,
          vehicle_type,
          total_price,
          client_id,
          service_type,
          flight_number,
          notes,
          passengers,
          luggage,
          updated_at,
          captured_by_driver_code,
          offer_expires_at,
          driver_exit_reason,
          driver_exit_comment,
          driver_exit_at,
          driver_exit_case,
          at_risk_flagged_at,
          risk_source,
          auto_escalated_at,
          auto_escalation_case,
          accepted_at,
          -- BM6: SLA fields
          sla_protection_level,
          sla_current_state,
          sla_window_start,
          sla_window_end,
          sla_critical_threshold,
          sla_high_risk_threshold,
          sla_monitoring_threshold,
          driver_im_on_my_way,
          driver_im_on_my_way_at,
          dispatcher_override_required,
          reassignment_count,
          last_system_action,
          -- BM8: Airport Intelligence fields
          airport_code,
          airline_code,
          terminal_code,
          gate_info,
          baggage_claim_zone,
          airport_intelligence_status,
          airport_phase,
          airport_monitoring_enabled,
          airport_irregularity_flag,
          scheduled_arrival_at,
          estimated_arrival_at,
          actual_arrival_at,
          flight_delay_minutes,
          operational_pickup_target_at,
          operational_driver_release_at
        FROM bookings
        WHERE assigned_driver_id = ${driver.id}::uuid
          -- Primary guard: exclude all finalized states by status
          AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
          -- Secondary guard: exclude by dispatch_status if present (covers partial-write scenarios)
          AND (dispatch_status IS NULL OR dispatch_status NOT IN ('completed', 'cancelled', 'archived', 'no_show'))
          -- Include driver_issue rides that are still assigned to this driver (for at_risk display)
          -- These are NOT excluded by the status filter above
          AND (
            -- OFFER_PENDING: driver must accept/reject — ALWAYS shown regardless of time.
            -- CRITICAL FIX: dispatch_status='offer_pending' must be visible even for future rides.
            -- A booking assigned for tomorrow with offer_pending must appear in the driver panel.
            -- Previously, the ACTIVE_WINDOW time gate was blocking these rides.
            status = 'offer_pending'
            OR
            dispatch_status = 'offer_pending'
            OR
            -- LIVE_FLOW: already executing regardless of time
            -- These statuses are always resumable regardless of pickup time
            status IN ('en_route', 'arrived', 'in_trip')
            OR
            -- ACTIVE_WINDOW: accepted/assigned rides within an extended time window.
            -- pickup_at IS NULL: rides without a scheduled time are always actionable.
            -- pickup_at IS NOT NULL: rides within the 7-day past to 120min future window.
            -- Extended to 7 days to handle rides accepted but not yet executed/completed.
            (
              status = 'accepted'
              AND dispatch_status NOT IN ('offer_pending', 'completed', 'cancelled')
              AND (
                pickup_at IS NULL
                OR (
                  pickup_at >= NOW() - INTERVAL '7 days'
                  AND pickup_at <= NOW() + INTERVAL '120 minutes'
                )
              )
            )
            OR
            (
              status = 'assigned'
              AND dispatch_status NOT IN ('offer_pending', 'completed', 'cancelled')
              AND (
                pickup_at IS NULL
                OR (
                  pickup_at >= NOW() - INTERVAL '7 days'
                  AND pickup_at <= NOW() + INTERVAL '120 minutes'
                )
              )
            )
          )
        ORDER BY
          CASE status
            WHEN 'in_trip'       THEN 1
            WHEN 'arrived'       THEN 2
            WHEN 'en_route'      THEN 3
            WHEN 'offer_pending' THEN 4
            WHEN 'accepted'      THEN 5
            WHEN 'assigned'      THEN 6
            ELSE 7
          END,
          pickup_at ASC
        LIMIT 1
      `;

      if (debug) {
        return NextResponse.json({
          _debug: true,
          driver_id: driver.id,
          assigned_rows_count: assignedRows.length,
          assigned_rows: assignedRows,
          query_window: "7 days past to 120 minutes future",
        });
      }

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
          // LIVE_FLOW: driver is already executing the ride
          ride_mode = "live_flow";
        } else if (r.dispatch_status === "offer_pending") {
          // OFFER_PENDING GATE: dispatch_status='offer_pending' means driver MUST accept/reject first.
          // This takes priority over status (covers status='new', 'assigned', 'offer_pending').
          // Prevents showNewRideAlert from firing before the driver has responded.
          ride_mode = "offer_pending";
        } else if (r.status === "accepted") {
          // ACCEPTED: driver confirmed the ride.
          // SLN PREMIUM RULE: operational controls only appear when within 2h of pickup.
          // Before that, ride_mode = 'active_window' → shows in Próximos, no buttons.
          const OPERATIONAL_THRESHOLD_MINUTES = 120; // 2 hours
          const minutesUntil = minutesUntilPickup;
          if (minutesUntil !== null && minutesUntil <= OPERATIONAL_THRESHOLD_MINUTES) {
            ride_mode = "operational_window_open";
          } else {
            ride_mode = "active_window";
          }
        } else if (r.status === "offer_pending") {
          // Explicit offer_pending status (legacy path)
          ride_mode = "offer_pending";
        } else if (r.status === "assigned") {
          // SCHEDULED: confirmed ride, not yet in operational window
          // SLN PREMIUM RULE: same 2h threshold for consistency
          const OPERATIONAL_THRESHOLD_MINUTES = 120; // 2 hours
          const minutesUntil = minutesUntilPickup;
          if (minutesUntil !== null && minutesUntil <= OPERATIONAL_THRESHOLD_MINUTES) {
            ride_mode = "operational_window_open";
          } else {
            ride_mode = "active_window"; // scheduled, not yet actionable
          }
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
          dispatch_status: r.dispatch_status ?? r.status ?? "assigned",
          pickup_location: r.pickup_address || (r.pickup_zone ? `Zone: ${r.pickup_zone}` : "TBD"),
          dropoff_location: r.dropoff_address || (r.dropoff_zone ? `Zone: ${r.dropoff_zone}` : "TBD"),
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
          captured_by_driver_code: r.captured_by_driver_code ?? null,
          offer_expires_at: r.offer_expires_at ?? null,
          pickup_lat: r.pickup_lat ? Number(r.pickup_lat) : null,
          pickup_lng: r.pickup_lng ? Number(r.pickup_lng) : null,
          dropoff_lat: r.dropoff_lat ? Number(r.dropoff_lat) : null,
          dropoff_lng: r.dropoff_lng ? Number(r.dropoff_lng) : null,
          // Driver exit fields
          driver_exit_reason: r.driver_exit_reason ?? null,
          driver_exit_comment: r.driver_exit_comment ?? null,
          driver_exit_at: r.driver_exit_at ?? null,
          driver_exit_case: r.driver_exit_case ?? null,
          // At-risk guardrail (Bloque Maestro 2)
          at_risk_flagged_at: r.at_risk_flagged_at ?? null,
          risk_source: r.risk_source ?? null,
          auto_escalated_at: r.auto_escalated_at ?? null,
          auto_escalation_case: r.auto_escalation_case ?? null,
          accepted_at: r.accepted_at ?? null,
          is_at_risk: !!r.at_risk_flagged_at,
          // Fallback pool fields (Bloque Maestro 3)
          fallback_case_level: r.fallback_case_level ?? null,
          fallback_trigger_reason: r.fallback_trigger_reason ?? null,
          original_driver_id: r.original_driver_id ?? null,
          fallback_pool_started_at: r.fallback_pool_started_at ?? null,
          reassigned_at: r.reassigned_at ?? null,
          // BM6: SLA Protection fields
          sla_protection_level: r.sla_protection_level ?? null,
          sla_current_state: r.sla_current_state ?? null,
          sla_window_start: r.sla_window_start ?? null,
          sla_window_end: r.sla_window_end ?? null,
          sla_critical_threshold: r.sla_critical_threshold ?? null,
          sla_high_risk_threshold: r.sla_high_risk_threshold ?? null,
          sla_monitoring_threshold: r.sla_monitoring_threshold ?? null,
          driver_im_on_my_way: r.driver_im_on_my_way ?? null,
          driver_im_on_my_way_at: r.driver_im_on_my_way_at ?? null,
          dispatcher_override_required: r.dispatcher_override_required ?? null,
          reassignment_count: r.reassignment_count ?? null,
          last_system_action: r.last_system_action ?? null,
          // BM8: Airport Intelligence fields
          airport_code: r.airport_code ?? null,
          airline_code: r.airline_code ?? null,
          terminal_code: r.terminal_code ?? null,
          gate_info: r.gate_info ?? null,
          baggage_claim_zone: r.baggage_claim_zone ?? null,
          airport_intelligence_status: r.airport_intelligence_status ?? null,
          airport_phase: r.airport_phase ?? null,
          airport_monitoring_enabled: r.airport_monitoring_enabled ?? null,
          airport_irregularity_flag: r.airport_irregularity_flag ?? null,
          scheduled_arrival_at: r.scheduled_arrival_at ?? null,
          estimated_arrival_at: r.estimated_arrival_at ?? null,
          actual_arrival_at: r.actual_arrival_at ?? null,
          flight_delay_minutes: r.flight_delay_minutes ?? null,
          operational_pickup_target_at: r.operational_pickup_target_at ?? null,
          operational_driver_release_at: r.operational_driver_release_at ?? null,
        };
      }
    } catch (assignErr: any) {
      console.error("[driver/me] assigned_ride query error:", assignErr?.message);
    }

    // Safety check: if assigned_ride somehow returned a completed ride, discard it
    if (assigned_ride && ['completed', 'cancelled', 'archived', 'no_show'].includes((assigned_ride as any).status)) {
      console.warn('[driver/me] SAFETY: discarding finalized ride from assigned_ride', (assigned_ride as any).booking_id, (assigned_ride as any).status);
      assigned_ride = null;
    }

    // ── Upcoming rides: outside active window ────────────────
    let upcoming_rides: Record<string, unknown>[] = [];
    try {
      // Section 4: upcoming_rides must include offer_pending and accepted/assigned future rides.
      // MUST exclude completed, cancelled, archived.
      const upcomingRows = await sql`
        SELECT
          b.id AS booking_id,
          b.status,
          b.dispatch_status,
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
          -- Primary guard: exclude all finalized states by status
          AND b.status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
          -- Secondary guard: exclude by dispatch_status if present (covers partial-write scenarios)
          AND (b.dispatch_status IS NULL OR b.dispatch_status NOT IN ('completed', 'cancelled', 'archived', 'no_show'))
          AND b.status IN ('offer_pending', 'accepted', 'assigned')
          -- UPCOMING: only rides with pickup_at BEYOND the 120-min operational window
          -- Rides within 120min are handled by assigned_ride (operational controls)
          AND b.pickup_at > NOW() + INTERVAL '120 minutes'
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
          dispatch_status: r.dispatch_status ?? r.status,
          pickup_location: r.pickup_address ?? "TBD",
          dropoff_location: r.dropoff_address ?? "TBD",
          pickup_datetime: r.pickup_at,
          vehicle_type: r.vehicle_type ?? "Sedan",
          total_price: Number(r.total_price ?? 0),
          ride_window_state: r.status === "offer_pending" ? "offer_pending" : "upcoming",
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

    // ── Section 6: cancelled_rides (Bloque Maestro — Cancellation Metrics Sync) ──────────
    let cancelled_rides: Record<string, unknown>[] = [];
    let cancelled_rides_count = 0;
    try {
      const cancelledRows = await sql`
        SELECT
          b.id AS booking_id,
          b.status,
          b.pickup_address,
          b.dropoff_address,
          b.pickup_at,
          b.cancelled_at,
          b.vehicle_type,
          b.total_price,
          COALESCE(b.cancellation_reason, '') AS cancel_reason,
          COALESCE(b.cancelled_by_type, 'system') AS cancelled_by_type,
          COALESCE(b.cancel_stage, 'before_assignment') AS cancel_stage,
          COALESCE(b.affects_driver_metrics, FALSE) AS affects_driver_metrics,
          COALESCE(b.affects_payout, FALSE) AS affects_payout,
          COALESCE(b.cancellation_fee, 0)::numeric AS cancellation_fee,
          cl.full_name AS client_name
        FROM bookings b
        LEFT JOIN clients cl ON cl.id = b.client_id
        WHERE b.assigned_driver_id = ${driver.id}
          AND (b.status = 'cancelled' OR b.cancelled_at IS NOT NULL)
        ORDER BY COALESCE(b.cancelled_at, b.updated_at) DESC NULLS LAST
        LIMIT 30
      `;
      cancelled_rides = cancelledRows.map((r) => ({
        booking_id: r.booking_id,
        status: r.status,
        pickup_location: r.pickup_address ?? 'TBD',
        dropoff_location: r.dropoff_address ?? 'TBD',
        pickup_datetime: r.pickup_at,
        cancelled_at: r.cancelled_at,
        vehicle_type: r.vehicle_type ?? 'Sedan',
        total_price: Number(r.total_price ?? 0),
        cancel_reason: r.cancel_reason ?? null,
        cancelled_by_type: r.cancelled_by_type ?? 'system',
        cancel_stage: r.cancel_stage ?? 'before_assignment',
        affects_driver_metrics: Boolean(r.affects_driver_metrics),
        affects_payout: Boolean(r.affects_payout),
        cancellation_fee: Number(r.cancellation_fee ?? 0),
        client_name: r.client_name ?? null,
      }));
      cancelled_rides_count = cancelled_rides.length;
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
        cancelled_rides,
        fallback_offer,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
