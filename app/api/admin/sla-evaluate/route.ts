export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// SLA Window Engine — Thresholds (minutes before pickup)
// ============================================================
const SLA_THRESHOLDS = {
  AIRPORT: {
    monitoring: 45,   // pickup_time - 45min = monitoring window
    high_risk:  20,   // pickup_time - 20min = high urgency
    critical:   10,   // pickup_time - 10min = critical
  },
  PRIORITY: {
    monitoring: 35,
    high_risk:  15,
    critical:   8,
  },
  STANDARD: {
    monitoring: 20,
    high_risk:  10,
    critical:   5,
  },
};

function getSlaThresholds(slaLevel: string, isAirport: boolean) {
  if (isAirport) return SLA_THRESHOLDS.AIRPORT;
  if (slaLevel === "PRIORITY" || slaLevel === "CRITICAL") return SLA_THRESHOLDS.PRIORITY;
  return SLA_THRESHOLDS.STANDARD;
}

function computeSlaState(
  minutesToPickup: number,
  thresholds: typeof SLA_THRESHOLDS.AIRPORT,
  currentState: string | null,
  reassignmentCount: number
): string | null {
  // Already reassigned multiple times → always CRITICAL
  if (reassignmentCount >= 2) return "sla_critical";

  if (minutesToPickup <= thresholds.critical) return "sla_critical";
  if (minutesToPickup <= thresholds.high_risk) return "sla_high_risk";
  if (minutesToPickup <= thresholds.monitoring) return "sla_monitoring";

  // Outside all windows — no SLA state needed
  return null;
}

// ============================================================
// GET /api/admin/sla-evaluate
// Evaluates all active bookings and updates SLA states.
// BM8: For airport rides, uses operational_pickup_target_at
// instead of pickup_at when available (flight-adjusted timing).
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  try {
    // ── Load active bookings that need SLA evaluation ─────────
    const candidates = await sql`
      SELECT
        b.id,
        b.status,
        b.dispatch_status,
        b.pickup_at,
        b.assigned_driver_id,
        b.en_route_at,
        b.sla_protection_level,
        b.sla_current_state,
        b.sla_safe_at,
        b.driver_im_on_my_way_at,
        b.reassignment_count,
        b.fallback_offer_count,
        b.at_risk_flagged_at,
        b.pickup_address,
        b.dropoff_address,
        b.service_location_type,
        b.trip_type,
        b.pickup_zone,
        b.total_price,
        b.dispatcher_override_required,
        b.airport_monitoring_enabled,
        b.airport_intelligence_status,
        b.airport_phase,
        b.airport_irregularity_flag,
        b.operational_pickup_target_at,
        b.flight_delay_minutes,
        d.driver_code,
        d.full_name AS driver_name,
        d.phone AS driver_phone
      FROM bookings b
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE b.status IN ('accepted', 'assigned', 'pending')
        AND b.pickup_at IS NOT NULL
        AND b.pickup_at > NOW() - INTERVAL '30 minutes'
        AND b.pickup_at < NOW() + INTERVAL '6 hours'
        AND b.status NOT IN ('completed', 'cancelled')
        AND b.sla_safe_at IS NULL
    `;

    const evaluated: any[] = [];
    const escalated: any[] = [];

    for (const booking of candidates) {
      // ── BM8: Use operational_pickup_target_at for airport rides ──
      // This prevents false SLA alerts when flight is delayed.
      // BUG D FIX: Airport gate MUST use pickup_zone as the authoritative source.
      // The special permit gate applies ONLY when the PICKUP (origin) is at one of the
      // 4 designated MCO locations (Terminal A, B, C, Brightline) — represented by
      // pickup_zone = 'MCO' — or at SFB Airport (pickup_zone = 'SFB').
      // It does NOT apply for dropoff-to-airport routes (Disney→MCO, Hotel→MCO, etc.).
      // Removed: text matching on pickup_address which could falsely match dropoff addresses.
      const isAirport =
        booking.airport_monitoring_enabled === true ||
        booking.service_location_type === "airport_pickup_mco" ||
        booking.service_location_type === "airport_pickup_sfb" ||
        (booking.pickup_zone && ["MCO", "SFB"].includes(booking.pickup_zone.toUpperCase()));

      // BM8: For airport rides with active monitoring, use operational target
      // to avoid false SLA alerts when flight is delayed
      let slaReferenceTime = new Date(booking.pickup_at);
      let bm8SlaShifted = false;

      if (isAirport && booking.operational_pickup_target_at) {
        const operationalTarget = new Date(booking.operational_pickup_target_at);
        // Only use operational target if it's meaningfully different (>10 min)
        const shiftMinutes = Math.abs(
          (operationalTarget.getTime() - slaReferenceTime.getTime()) / 60000
        );
        if (shiftMinutes >= 10) {
          slaReferenceTime = operationalTarget;
          bm8SlaShifted = true;
        }
      }

      // BM8: If flight has an irregularity, skip SLA auto-escalation
      // (admin must review manually)
      if (booking.airport_irregularity_flag === true) {
        continue;
      }

      const pickupMs = slaReferenceTime.getTime();
      const minutesToPickup = (pickupMs - nowMs) / 60000;

      // Determine SLA protection level
      let slaLevel = booking.sla_protection_level ?? "STANDARD";

      // Auto-upgrade to PRIORITY if airport
      if (isAirport && slaLevel === "STANDARD") {
        slaLevel = "PRIORITY";
      }

      // Auto-upgrade to CRITICAL if already reassigned
      if ((booking.reassignment_count ?? 0) >= 1 && slaLevel !== "CRITICAL") {
        slaLevel = "CRITICAL";
      }

      const thresholds = getSlaThresholds(slaLevel, isAirport);
      const newSlaState = computeSlaState(
        minutesToPickup,
        thresholds,
        booking.sla_current_state,
        booking.reassignment_count ?? 0
      );

      // Skip if no SLA state needed and no current state
      if (!newSlaState && !booking.sla_current_state) continue;

      // Skip if driver already confirmed en_route or im_on_my_way
      if (booking.en_route_at || booking.driver_im_on_my_way_at) continue;

      const prevState = booking.sla_current_state;
      const stateChanged = newSlaState !== prevState;

      // Determine trigger reason
      let triggerReason = `minutes_to_pickup=${minutesToPickup.toFixed(1)}`;
      if (isAirport) triggerReason += ";airport_pickup";
      if (bm8SlaShifted) triggerReason += ";bm8_sla_shifted_by_flight";
      if ((booking.reassignment_count ?? 0) > 0) triggerReason += `;reassignment_count=${booking.reassignment_count}`;
      if (booking.at_risk_flagged_at) triggerReason += ";previously_at_risk";

      // Update booking SLA state
      try {
        await sql`
          UPDATE bookings SET
            sla_protection_level    = ${slaLevel},
            sla_current_state       = ${newSlaState},
            sla_last_evaluation_at  = ${nowIso}::timestamptz,
            sla_trigger_reason      = ${triggerReason},
            sla_trigger_source      = 'system',
            sla_flagged_at          = COALESCE(sla_flagged_at, ${stateChanged && newSlaState ? nowIso : null}::timestamptz),
            dispatcher_override_required = ${newSlaState === 'sla_critical'},
            updated_at              = NOW()
          WHERE id = ${booking.id}::uuid
        `;

        // Log to dispatch_event_log if state changed
        if (stateChanged && newSlaState) {
          const eventType =
            newSlaState === "sla_critical"   ? "sla_critical_triggered" :
            newSlaState === "sla_high_risk"  ? "sla_high_risk_triggered" :
            "sla_monitoring_started";

          try {
            await sql`
              INSERT INTO dispatch_event_log (
                booking_id, driver_id, event_type, trigger_reason,
                minutes_to_pickup, sla_level, event_data, created_at
              ) VALUES (
                ${booking.id}::uuid,
                ${booking.assigned_driver_id ?? null}::uuid,
                ${eventType},
                ${triggerReason},
                ${minutesToPickup.toFixed(1)}::numeric,
                ${slaLevel},
                ${JSON.stringify({
                  prev_state: prevState,
                  new_state: newSlaState,
                  is_airport: isAirport,
                  bm8_sla_shifted: bm8SlaShifted,
                  flight_delay_minutes: booking.flight_delay_minutes ?? 0,
                  airport_phase: booking.airport_phase,
                  reassignment_count: booking.reassignment_count ?? 0,
                  driver_code: booking.driver_code,
                  pickup_address: booking.pickup_address,
                  minutes_to_pickup: minutesToPickup.toFixed(1),
                })}::jsonb,
                NOW()
              )
            `;
          } catch { /* non-blocking */ }

          // ── BM7: Trigger client communication for SLA escalation ──
          if (newSlaState === "sla_high_risk" || newSlaState === "sla_critical") {
            try {
              const { triggerCommunication } = await import("@/lib/communication/trigger-engine");
              await triggerCommunication({
                booking_id: booking.id,
                event_type: newSlaState === "sla_critical" ? "sla_critical" : "sla_high_risk",
                trigger_source: "sla_engine",
                metadata: {
                  minutes_to_pickup: minutesToPickup.toFixed(1),
                  sla_level: slaLevel,
                  is_airport: isAirport,
                  bm8_sla_shifted: bm8SlaShifted,
                  driver_code: booking.driver_code,
                },
                db: sql,
              });
            } catch { /* non-blocking */ }
          }

          escalated.push({
            booking_id: booking.id,
            prev_state: prevState,
            new_state: newSlaState,
            sla_level: slaLevel,
            minutes_to_pickup: minutesToPickup.toFixed(1),
            driver_code: booking.driver_code,
            is_airport: isAirport,
            bm8_sla_shifted: bm8SlaShifted,
          });
        }

        evaluated.push({
          booking_id: booking.id,
          sla_level: slaLevel,
          sla_state: newSlaState,
          minutes_to_pickup: minutesToPickup.toFixed(1),
          state_changed: stateChanged,
          is_airport: isAirport,
          bm8_sla_shifted: bm8SlaShifted,
        });
      } catch (e: any) {
        // Non-blocking per booking
      }
    }

    return NextResponse.json({
      success: true,
      evaluated: evaluated.length,
      escalated: escalated.length,
      escalated_details: escalated,
      evaluated_details: evaluated,
      timestamp: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
