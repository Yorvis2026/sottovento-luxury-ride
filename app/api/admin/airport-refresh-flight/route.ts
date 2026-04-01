export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  lookupFlight,
  isAirportBooking,
  detectAirportCode,
  getRecommendedActions,
  type SandboxScenario,
  type AirportIntelligenceMode,
} from "@/lib/airport/flight-intelligence-engine";
import {
  calculateAirportTiming,
} from "@/lib/airport/timing-correction-engine";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// POST /api/admin/airport-refresh-flight
// BM8: Airport Intelligence Layer — LIVE-FIRST
//
// Runs flight lookup for a booking using the LIVE-FIRST chain:
//   1. FlightAware AeroAPI (primary)
//   2. aviationstack (secondary)
//   3. sandbox simulation (contingency only)
//
// CRITICAL: Never invalidates booking due to flight errors.
// Booking continuity is always maintained.
//
// Body: {
//   booking_id: string,
//   sandbox_scenario?: SandboxScenario,  // contingency/testing
//   force_mode?: AirportIntelligenceMode, // override mode
//   force_phase?: string,                 // manual phase override
//   mark_passenger_ready?: boolean,
//   force_pickup_window?: boolean,
//   manual_terminal?: string,
//   escalate_dispatch?: boolean,
//   contact_customer?: boolean,
//   manual_validate?: boolean,            // mark as manually_reviewed
//   admin_notes?: string,
// }
// ============================================================
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const bookingId = body.booking_id as string | undefined;
  if (!bookingId) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  }

  const sandboxScenario = body.sandbox_scenario as SandboxScenario | undefined;
  const forceMode = body.force_mode as AirportIntelligenceMode | undefined;
  const markPassengerReady = body.mark_passenger_ready === true;
  const forcePickupWindow = body.force_pickup_window === true;
  const manualTerminal = body.manual_terminal as string | undefined;
  const forcePhase = body.force_phase as string | undefined;
  const escalateDispatch = body.escalate_dispatch === true;
  const contactCustomer = body.contact_customer === true;
  const manualValidate = body.manual_validate === true;
  const adminNotes = body.admin_notes as string | undefined;

  try {
    // ── Load booking ─────────────────────────────────────────
    const rows = await sql`
      SELECT
        id, booking_ref, status, pickup_at, pickup_address, dropoff_address,
        flight_number, airport_code, airline_code, flight_date,
        airport_monitoring_enabled, airport_phase, airport_intelligence_status,
        flight_validation_status, manual_flight_review_required,
        operational_pickup_target_at, sla_current_state, sla_protection_level,
        client_id, assigned_driver_id
      FROM bookings
      WHERE id = ${bookingId}
      LIMIT 1
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const booking = rows[0] as Record<string, unknown>;

    // ── Detect airport if not set ─────────────────────────────
    const airportCode = (booking.airport_code as string | null) ??
      detectAirportCode((booking.pickup_address as string) ?? "") ??
      detectAirportCode((booking.dropoff_address as string) ?? "") ??
      "MCO";

    // ── Handle manual validate action ─────────────────────────
    if (manualValidate) {
      await sql`
        UPDATE bookings SET
          flight_validation_status        = 'manually_reviewed',
          flight_validation_message       = 'Flight information manually reviewed and confirmed by dispatch.',
          manual_flight_review_required   = FALSE,
          flight_validation_attempted_at  = NOW(),
          airport_last_action             = 'manual_validate',
          airport_admin_notes             = ${adminNotes ?? null},
          updated_at                      = NOW()
        WHERE id = ${bookingId}
      `;
      await sql`
        INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
        VALUES (${bookingId}, 'FLIGHT_MANUALLY_REVIEWED', ${JSON.stringify({ admin_notes: adminNotes })}, NOW())
      `;
      return NextResponse.json({
        success: true,
        action: "manual_validate",
        booking_id: bookingId,
        flight_validation_status: "manually_reviewed",
        timestamp: new Date().toISOString(),
      });
    }

    // ── Handle mark passenger ready ───────────────────────────
    if (markPassengerReady) {
      await sql`
        UPDATE bookings SET
          airport_phase                   = 'passenger_ready',
          airport_intelligence_status     = 'ready_for_pickup',
          airport_phase_updated_at        = NOW(),
          airport_last_action             = 'mark_passenger_ready',
          updated_at                      = NOW()
        WHERE id = ${bookingId}
      `;
      await sql`
        INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
        VALUES (${bookingId}, 'AIRPORT_PASSENGER_READY', ${JSON.stringify({ manual: true })}, NOW())
      `;
      return NextResponse.json({
        success: true,
        action: "mark_passenger_ready",
        booking_id: bookingId,
        final_phase: "passenger_ready",
        timestamp: new Date().toISOString(),
      });
    }

    // ── Handle force pickup window ────────────────────────────
    if (forcePickupWindow) {
      await sql`
        UPDATE bookings SET
          airport_phase                   = 'pickup_window_active',
          airport_intelligence_status     = 'ready_for_pickup',
          airport_phase_updated_at        = NOW(),
          airport_last_action             = 'force_pickup_window',
          updated_at                      = NOW()
        WHERE id = ${bookingId}
      `;
      await sql`
        INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
        VALUES (${bookingId}, 'AIRPORT_PICKUP_WINDOW_ACTIVE', ${JSON.stringify({ forced: true })}, NOW())
      `;
      return NextResponse.json({
        success: true,
        action: "force_pickup_window",
        booking_id: bookingId,
        final_phase: "pickup_window_active",
        timestamp: new Date().toISOString(),
      });
    }

    // ── Handle manual terminal update ─────────────────────────
    if (manualTerminal && !booking.flight_number) {
      await sql`
        UPDATE bookings SET
          terminal_code                   = ${manualTerminal},
          airport_last_action             = 'manual_terminal_update',
          airport_admin_notes             = ${adminNotes ?? null},
          updated_at                      = NOW()
        WHERE id = ${bookingId}
      `;
      return NextResponse.json({
        success: true,
        action: "manual_terminal_update",
        booking_id: bookingId,
        terminal_code: manualTerminal,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Run flight lookup — LIVE-FIRST chain ──────────────────
    const flightResult = await lookupFlight(
      {
        flight_number: (booking.flight_number as string) ?? "UNKNOWN",
        airline_code: booking.airline_code as string | null,
        flight_date: booking.flight_date as string | null,
        airport_code: airportCode,
        sandbox_scenario: sandboxScenario,
        force_mode: forceMode,
      },
      booking.pickup_at ? new Date(booking.pickup_at as string) : null
    );

    // ── Calculate timing correction ───────────────────────────
    const originalPickupAt = booking.pickup_at
      ? new Date(booking.pickup_at as string)
      : new Date();
    const timingResult = calculateAirportTiming(originalPickupAt, flightResult);

    // ── Determine final phase ─────────────────────────────────
    let finalPhase = forcePhase ?? flightResult.airport_phase;

    // ── Determine event type ──────────────────────────────────
    let eventType: string;
    if (flightResult.flight_validation_status === "provider_unavailable") {
      eventType = "FLIGHT_PROVIDER_UNAVAILABLE";
    } else if (flightResult.flight_validation_status === "not_found") {
      eventType = "FLIGHT_NOT_FOUND";
    } else if (flightResult.flight_validation_status === "invalid_format") {
      eventType = "FLIGHT_VALIDATION_INVALID_FORMAT";
    } else if (flightResult.is_irregular) {
      eventType = "AIRPORT_IRREGULARITY";
    } else if (flightResult.delay_minutes > 0) {
      eventType = "FLIGHT_DELAY_DETECTED";
    } else if (flightResult.flight_status === "landed") {
      eventType = "FLIGHT_LANDED";
    } else {
      eventType = "FLIGHT_LOOKUP_SUCCESS";
    }

    // ── Update booking ────────────────────────────────────────
    await sql`
      UPDATE bookings SET
        airport_code                    = ${airportCode},
        airline_code                    = ${flightResult.airline_code},
        terminal_code                   = ${manualTerminal ?? flightResult.terminal_code},
        gate_info                       = ${flightResult.gate_info},
        baggage_claim_zone              = ${flightResult.baggage_claim_zone},
        scheduled_arrival_at            = ${flightResult.scheduled_arrival_at},
        estimated_arrival_at            = ${flightResult.estimated_arrival_at},
        actual_arrival_at               = ${flightResult.actual_arrival_at},
        flight_delay_minutes            = ${flightResult.delay_minutes},
        airport_intelligence_status     = ${flightResult.airport_intelligence_status},
        airport_phase                   = ${finalPhase},
        airport_monitoring_enabled      = TRUE,
        airport_irregularity_flag       = ${flightResult.is_irregular},
        flight_validation_status        = ${flightResult.flight_validation_status},
        flight_validation_message       = ${flightResult.flight_validation_message},
        flight_validation_attempted_at  = NOW(),
        flight_provider_used            = ${flightResult.flight_provider_used},
        manual_flight_review_required   = ${flightResult.manual_flight_review_required},
        operational_pickup_target_at    = ${timingResult.operational_pickup_target_at},
        operational_monitoring_start_at = ${timingResult.operational_monitoring_start_at},
        operational_driver_release_at   = ${timingResult.operational_driver_release_at},
        flight_lookup_last_at           = ${flightResult.lookup_at},
        flight_lookup_source            = ${flightResult.source},
        airport_phase_updated_at        = NOW(),
        airport_last_action             = ${"flight_refresh:" + (sandboxScenario ?? flightResult.source)},
        airport_admin_notes             = ${adminNotes ?? null},
        updated_at                      = NOW()
      WHERE id = ${bookingId}
    `;

    // ── Log primary dispatch event ────────────────────────────
    await sql`
      INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
      VALUES (
        ${bookingId},
        ${eventType},
        ${JSON.stringify({
          scenario: sandboxScenario ?? null,
          flight_status: flightResult.flight_status,
          flight_validation_status: flightResult.flight_validation_status,
          delay_minutes: flightResult.delay_minutes,
          airport_phase: finalPhase,
          shift_minutes: timingResult.shift_minutes,
          shift_reason: timingResult.shift_reason,
          requires_admin_review: timingResult.requires_admin_review,
          source: flightResult.source,
          provider: flightResult.flight_provider_used,
          manual_review_required: flightResult.manual_flight_review_required,
        })},
        NOW()
      )
    `;

    // ── Log SLA shift event if applicable ────────────────────
    if (timingResult.should_adjust_sla) {
      await sql`
        INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
        VALUES (
          ${bookingId},
          'SLA_SHIFTED_BY_FLIGHT',
          ${JSON.stringify({
            shift_minutes: timingResult.shift_minutes,
            original_pickup_at: originalPickupAt.toISOString(),
            operational_pickup_target_at: timingResult.operational_pickup_target_at,
            reason: timingResult.shift_reason,
          })},
          NOW()
        )
      `;
    }

    // ── Log phase update ──────────────────────────────────────
    await sql`
      INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
      VALUES (
        ${bookingId},
        'AIRPORT_PHASE_UPDATED',
        ${JSON.stringify({
          new_phase: finalPhase,
          intelligence_status: flightResult.airport_intelligence_status,
        })},
        NOW()
      )
    `;

    // ── Log customer flight update request if needed ──────────
    if (flightResult.manual_flight_review_required || contactCustomer) {
      await sql`
        INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
        VALUES (
          ${bookingId},
          'CUSTOMER_FLIGHT_UPDATE_REQUESTED',
          ${JSON.stringify({
            validation_status: flightResult.flight_validation_status,
            message: flightResult.flight_validation_message,
            triggered_by: contactCustomer ? "admin_manual" : "auto_validation",
          })},
          NOW()
        )
      `;
    }

    // ── Log driver alert if validation pending ────────────────
    if (flightResult.manual_flight_review_required && booking.assigned_driver_id) {
      await sql`
        INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
        VALUES (
          ${bookingId},
          'DRIVER_FLIGHT_REVIEW_ALERTED',
          ${JSON.stringify({
            driver_id: booking.assigned_driver_id,
            validation_status: flightResult.flight_validation_status,
          })},
          NOW()
        )
      `;
    }

    // ── Log escalation if requested ───────────────────────────
    if (escalateDispatch || flightResult.is_irregular) {
      await sql`
        INSERT INTO dispatch_event_log (booking_id, event_type, event_data, created_at)
        VALUES (
          ${bookingId},
          'AIRPORT_IRREGULARITY',
          ${JSON.stringify({
            flight_status: flightResult.flight_status,
            is_irregular: flightResult.is_irregular,
            escalated_by: escalateDispatch ? "admin_manual" : "auto",
          })},
          NOW()
        )
      `;
    }

    // ── Recommended actions ───────────────────────────────────
    const recommendedActions = getRecommendedActions(
      finalPhase as any,
      flightResult.flight_validation_status,
      flightResult.is_irregular
    );

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      flight_result: flightResult,
      timing_result: timingResult,
      final_phase: finalPhase,
      event_logged: eventType,
      sla_shifted: timingResult.should_adjust_sla,
      requires_admin_review: timingResult.requires_admin_review || flightResult.manual_flight_review_required,
      manual_flight_review_required: flightResult.manual_flight_review_required,
      flight_validation_status: flightResult.flight_validation_status,
      flight_provider_used: flightResult.flight_provider_used,
      recommended_actions: recommendedActions,
      mode: flightResult.source,
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    console.error("[airport-refresh-flight] Error:", e);
    return NextResponse.json(
      { error: "Internal server error", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
