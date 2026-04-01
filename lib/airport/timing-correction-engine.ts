// ============================================================
// BM8: Airport Timing Correction Engine
// Sottovento Luxury Network
//
// Recalculates the real operational service activation moment
// based on actual flight data. The pickup window must NOT
// depend solely on the original booking_time.
// ============================================================

import type { FlightLookupResult, AirportPhase } from "./flight-intelligence-engine";

// ── Configuration: timing windows (minutes) ─────────────────
const TIMING_CONFIG = {
  // How many minutes before estimated landing to start monitoring
  MONITORING_START_BEFORE_ARRIVAL_MIN: 60,
  // How many minutes after landing before passenger is ready (baggage claim buffer)
  BAGGAGE_CLAIM_BUFFER_MIN: 25,
  // How many minutes before operational_pickup_target to release driver
  DRIVER_RELEASE_BEFORE_PICKUP_MIN: 30,
  // Minimum delay (minutes) to trigger a timing shift
  DELAY_SHIFT_THRESHOLD_MIN: 10,
  // Baggage phase timeout before escalation (minutes)
  BAGGAGE_PHASE_TIMEOUT_MIN: 45,
};

export interface TimingCorrectionResult {
  // The adjusted pickup target based on flight data
  operational_pickup_target_at: string | null;
  // When to start monitoring (send driver to standby)
  operational_monitoring_start_at: string | null;
  // When the driver can be released/dispatched
  operational_driver_release_at: string | null;
  // Minutes shifted from original pickup_at
  shift_minutes: number;
  // Whether the shift is significant enough to notify
  should_notify_client: boolean;
  // Whether the shift is significant enough to adjust SLA
  should_adjust_sla: boolean;
  // Human-readable reason for the shift
  shift_reason: string;
  // Whether driver should be held in protected standby
  hold_driver_in_standby: boolean;
  // Whether this is an irregular operation requiring admin review
  requires_admin_review: boolean;
}

export function calculateAirportTiming(
  originalPickupAt: Date,
  flightData: FlightLookupResult
): TimingCorrectionResult {
  const now = new Date();

  // ── Handle irregular operations ──────────────────────────
  if (flightData.is_irregular) {
    return {
      operational_pickup_target_at: null,
      operational_monitoring_start_at: null,
      operational_driver_release_at: null,
      shift_minutes: 0,
      should_notify_client: true,
      should_adjust_sla: false,
      shift_reason: `Flight ${flightData.flight_status} — admin review required`,
      hold_driver_in_standby: true,
      requires_admin_review: true,
    };
  }

  // ── Determine effective arrival time ─────────────────────
  const effectiveArrivalStr =
    flightData.actual_arrival_at ??
    flightData.estimated_arrival_at ??
    flightData.scheduled_arrival_at;

  const effectiveArrival = effectiveArrivalStr ? new Date(effectiveArrivalStr) : null;
  const scheduledArrival = flightData.scheduled_arrival_at
    ? new Date(flightData.scheduled_arrival_at)
    : null;

  // ── Calculate shift from original pickup ─────────────────
  let shiftMinutes = flightData.delay_minutes ?? 0;

  // If we have actual arrival data, calculate shift more precisely
  if (effectiveArrival && scheduledArrival) {
    const preciseShift = Math.round(
      (effectiveArrival.getTime() - scheduledArrival.getTime()) / 60000
    );
    shiftMinutes = preciseShift;
  }

  // ── Calculate operational pickup target ──────────────────
  // Pickup target = effective arrival + baggage claim buffer
  let operationalPickupTarget: Date;
  if (effectiveArrival) {
    operationalPickupTarget = new Date(
      effectiveArrival.getTime() +
      TIMING_CONFIG.BAGGAGE_CLAIM_BUFFER_MIN * 60 * 1000
    );
  } else {
    // Fallback: shift original pickup by delay
    operationalPickupTarget = new Date(
      originalPickupAt.getTime() + shiftMinutes * 60 * 1000
    );
  }

  // ── Calculate monitoring start ────────────────────────────
  const monitoringStart = effectiveArrival
    ? new Date(
        effectiveArrival.getTime() -
        TIMING_CONFIG.MONITORING_START_BEFORE_ARRIVAL_MIN * 60 * 1000
      )
    : new Date(
        operationalPickupTarget.getTime() -
        (TIMING_CONFIG.MONITORING_START_BEFORE_ARRIVAL_MIN + TIMING_CONFIG.BAGGAGE_CLAIM_BUFFER_MIN) * 60 * 1000
      );

  // ── Calculate driver release time ────────────────────────
  const driverRelease = new Date(
    operationalPickupTarget.getTime() -
    TIMING_CONFIG.DRIVER_RELEASE_BEFORE_PICKUP_MIN * 60 * 1000
  );

  // ── Determine if driver should be held in standby ────────
  // Hold if: flight is significantly delayed OR flight hasn't landed yet
  // and the operational pickup is more than 60 min away
  const minutesToOperationalPickup = Math.round(
    (operationalPickupTarget.getTime() - now.getTime()) / 60000
  );
  const holdDriverInStandby =
    (flightData.flight_status === "delayed" && shiftMinutes >= 30) ||
    (flightData.flight_status !== "landed" && minutesToOperationalPickup > 60);

  // ── Determine notification and SLA adjustment thresholds ─
  const shouldNotifyClient = Math.abs(shiftMinutes) >= TIMING_CONFIG.DELAY_SHIFT_THRESHOLD_MIN;
  const shouldAdjustSla = Math.abs(shiftMinutes) >= TIMING_CONFIG.DELAY_SHIFT_THRESHOLD_MIN;

  // ── Build shift reason ────────────────────────────────────
  let shiftReason = "No timing adjustment needed";
  if (flightData.flight_status === "landed") {
    shiftReason = "Flight landed — baggage claim phase active";
  } else if (shiftMinutes > 0) {
    shiftReason = `Flight delayed ${shiftMinutes} min — service window shifted`;
  } else if (shiftMinutes < 0) {
    shiftReason = `Flight arriving ${Math.abs(shiftMinutes)} min early — monitoring advanced`;
  }

  return {
    operational_pickup_target_at: operationalPickupTarget.toISOString(),
    operational_monitoring_start_at: monitoringStart.toISOString(),
    operational_driver_release_at: driverRelease.toISOString(),
    shift_minutes: shiftMinutes,
    should_notify_client: shouldNotifyClient,
    should_adjust_sla: shouldAdjustSla,
    shift_reason: shiftReason,
    hold_driver_in_standby: holdDriverInStandby,
    requires_admin_review: false,
  };
}

// ── Determine if driver "I'm On My Way" button should be enabled ──
export function isDriverReleaseWindowOpen(
  operationalDriverReleaseAt: Date | null,
  operationalPickupTargetAt: Date | null,
  flightData: FlightLookupResult | null
): { enabled: boolean; reason: string } {
  const now = new Date();

  // Irregular flight — never enable
  if (flightData?.is_irregular) {
    return {
      enabled: false,
      reason: `Flight ${flightData.flight_status} — awaiting admin review`,
    };
  }

  // No operational data yet — use original logic
  if (!operationalDriverReleaseAt) {
    return { enabled: true, reason: "No airport monitoring active" };
  }

  // Check if we're past the driver release window
  if (now >= operationalDriverReleaseAt) {
    return { enabled: true, reason: "Driver release window open" };
  }

  const minutesUntilRelease = Math.round(
    (operationalDriverReleaseAt.getTime() - now.getTime()) / 60000
  );

  // Flight not yet landed and more than 30 min until release
  if (flightData?.flight_status !== "landed" && minutesUntilRelease > 30) {
    return {
      enabled: false,
      reason: flightData
        ? `Flight monitoring active — ${flightData.flight_status === "delayed" ? `delayed ${flightData.delay_minutes} min` : "awaiting landing update"}`
        : "Airport monitoring active",
    };
  }

  // Within 30 min of release — allow
  if (minutesUntilRelease <= 30) {
    return { enabled: true, reason: "Approaching driver release window" };
  }

  return {
    enabled: false,
    reason: `Passenger not ready for pickup yet — ${minutesUntilRelease} min until release window`,
  };
}

// ── SLA Window Shift for Airport Rides ───────────────────────
export function computeAirportSlaReference(
  originalPickupAt: Date,
  operationalPickupTargetAt: Date | null,
  flightData: FlightLookupResult | null
): Date {
  // If flight is irregular or no operational data, use original
  if (!operationalPickupTargetAt || flightData?.is_irregular) {
    return originalPickupAt;
  }
  // Use operational pickup target as SLA reference
  return operationalPickupTargetAt;
}
