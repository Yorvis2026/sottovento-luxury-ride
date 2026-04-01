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
// Evaluates all active bookings and updates SLA states
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
      const pickupMs = new Date(booking.pickup_at).getTime();
      const minutesToPickup = (pickupMs - nowMs) / 60000;

      // Determine if airport
      const isAirport =
        booking.service_location_type === "airport" ||
        booking.trip_type === "airport" ||
        (booking.pickup_zone && booking.pickup_zone.toLowerCase().includes("airport")) ||
        (booking.pickup_zone && booking.pickup_zone.toLowerCase().includes("mco")) ||
        (booking.pickup_address && booking.pickup_address.toLowerCase().includes("airport"));

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
          });
        }

        evaluated.push({
          booking_id: booking.id,
          sla_level: slaLevel,
          sla_state: newSlaState,
          minutes_to_pickup: minutesToPickup.toFixed(1),
          state_changed: stateChanged,
          is_airport: isAirport,
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
