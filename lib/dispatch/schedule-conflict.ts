// ============================================================
// lib/dispatch/schedule-conflict.ts
//
// BM16 — DRIVER FUTURE SCHEDULE LAYER
// Schedule Conflict Detection Engine v1.0
//
// Detects scheduling conflicts between a proposed new booking
// and a driver's existing future committed bookings.
//
// DESIGN PRINCIPLES:
// - Phase 1 hybrid: uses pickup_at + estimated_duration_minutes
//   (no live routing API required in v1)
// - All thresholds are configurable constants — never hardcoded
// - Pure functions: no DB calls, no side effects
// - Returns structured conflict result with full audit trail
//
// LIMITATIONS (v1):
// - estimated_duration_minutes defaults to a configurable fallback
//   when not stored in the booking record
// - Geographic incompatibility uses straight-line distance heuristic
//   (Haversine formula) — not actual road routing
// - Does not account for traffic or real-time conditions
// ============================================================

// ── Configurable constants ────────────────────────────────────────────────
export const BM16_CONFIG = {
  /** Hours into the future to look for committed bookings when checking conflicts */
  CONFLICT_LOOKAHEAD_HOURS: 48,

  /** Hours into the future to include in the future_bookings schedule layer */
  FUTURE_SCHEDULE_WINDOW_HOURS: 72,

  /** Minimum buffer (minutes) required between end of ride A and start of ride B */
  MIN_TURN_BUFFER_MINUTES: 30,

  /** Additional buffer (minutes) added to estimated travel time between rides */
  DEFAULT_REPOSITION_BUFFER_MINUTES: 15,

  /** Default estimated ride duration (minutes) when not stored in booking */
  DEFAULT_RIDE_DURATION_MINUTES: 60,

  /** Maximum number of future bookings to return in the driver panel */
  MAX_DRIVER_FUTURE_VISIBLE_COUNT: 20,

  /** Average speed (km/h) used for geographic incompatibility heuristic */
  AVG_SPEED_KMH: 50,

  /** Conflict is "strong" (driver excluded) if overlap or buffer < this value (minutes) */
  STRONG_CONFLICT_THRESHOLD_MINUTES: 0,

  /** Conflict is "borderline" if buffer is between 0 and this value (minutes) */
  BORDERLINE_CONFLICT_THRESHOLD_MINUTES: 20,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────
export interface ScheduledRide {
  booking_id: string;
  pickup_at: Date;
  /** Estimated duration in minutes. Falls back to DEFAULT_RIDE_DURATION_MINUTES if null. */
  estimated_duration_minutes: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  dispatch_status: string;
}

export type ConflictType =
  | "temporal_overlap"
  | "insufficient_buffer"
  | "geographic_incompatibility"
  | "none";

export type ConflictSeverity = "strong" | "borderline" | "none";

export interface ConflictPair {
  ride_a_id: string;
  ride_b_id: string;
  conflict_type: ConflictType;
  severity: ConflictSeverity;
  overlap_minutes: number;
  buffer_available_minutes: number;
  buffer_required_minutes: number;
  distance_km: number | null;
  travel_time_minutes: number | null;
  reason: string;
}

export interface ScheduleConflictResult {
  driver_id: string;
  proposed_booking_id: string;
  has_strong_conflict: boolean;
  has_borderline_conflict: boolean;
  conflict_pairs: ConflictPair[];
  eligible: boolean;
  exclusion_reason: string | null;
  checked_at: string;
  config_snapshot: typeof BM16_CONFIG;
}

// ── Haversine distance (km) ───────────────────────────────────────────────
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Estimated travel time between two points (minutes) ───────────────────
function estimatedTravelMinutes(distanceKm: number): number {
  return Math.ceil((distanceKm / BM16_CONFIG.AVG_SPEED_KMH) * 60);
}

// ── Estimate end time of a ride ───────────────────────────────────────────
function estimatedEndTime(ride: ScheduledRide): Date {
  const durationMin =
    ride.estimated_duration_minutes ?? BM16_CONFIG.DEFAULT_RIDE_DURATION_MINUTES;
  return new Date(ride.pickup_at.getTime() + durationMin * 60 * 1000);
}

// ── Core conflict check between two rides ────────────────────────────────
function checkPairConflict(
  rideA: ScheduledRide,
  rideB: ScheduledRide
): ConflictPair {
  // Ensure rideA is the earlier ride
  const [earlier, later] =
    rideA.pickup_at <= rideB.pickup_at ? [rideA, rideB] : [rideB, rideA];

  const earlierEnd = estimatedEndTime(earlier);
  const laterStart = later.pickup_at;

  // Buffer available = time between end of earlier ride and start of later ride
  const bufferMs = laterStart.getTime() - earlierEnd.getTime();
  const bufferAvailableMinutes = Math.floor(bufferMs / 60000);

  // Overlap check
  const overlapMinutes = bufferAvailableMinutes < 0
    ? Math.abs(bufferAvailableMinutes)
    : 0;

  // Geographic distance between dropoff of earlier and pickup of later
  let distanceKm: number | null = null;
  let travelTimeMinutes: number | null = null;
  let geoIncompatible = false;

  if (
    earlier.dropoff_lat != null && earlier.dropoff_lng != null &&
    later.pickup_lat != null && later.pickup_lng != null
  ) {
    distanceKm = haversineKm(
      earlier.dropoff_lat, earlier.dropoff_lng,
      later.pickup_lat, later.pickup_lng
    );
    travelTimeMinutes = estimatedTravelMinutes(distanceKm);

    // Geographic incompatibility: travel time + reposition buffer > available buffer
    const requiredForGeo =
      travelTimeMinutes + BM16_CONFIG.DEFAULT_REPOSITION_BUFFER_MINUTES;
    if (bufferAvailableMinutes < requiredForGeo) {
      geoIncompatible = true;
    }
  }

  // Required buffer (minimum turn buffer)
  const bufferRequired = BM16_CONFIG.MIN_TURN_BUFFER_MINUTES;

  // Determine conflict type and severity
  let conflictType: ConflictType = "none";
  let severity: ConflictSeverity = "none";
  let reason = "No conflict detected";

  if (overlapMinutes > 0) {
    conflictType = "temporal_overlap";
    severity = "strong";
    reason = `Rides overlap by ${overlapMinutes} minutes. Ride ${earlier.booking_id.slice(0, 8)} ends at ${earlierEnd.toISOString()}, ride ${later.booking_id.slice(0, 8)} starts at ${laterStart.toISOString()}.`;
  } else if (bufferAvailableMinutes < BM16_CONFIG.STRONG_CONFLICT_THRESHOLD_MINUTES) {
    conflictType = "insufficient_buffer";
    severity = "strong";
    reason = `Insufficient buffer: ${bufferAvailableMinutes}min available, ${bufferRequired}min required.`;
  } else if (bufferAvailableMinutes < bufferRequired) {
    conflictType = "insufficient_buffer";
    severity = bufferAvailableMinutes < BM16_CONFIG.BORDERLINE_CONFLICT_THRESHOLD_MINUTES
      ? "strong"
      : "borderline";
    reason = `Buffer too short: ${bufferAvailableMinutes}min available, ${bufferRequired}min required (MIN_TURN_BUFFER).`;
  } else if (geoIncompatible && travelTimeMinutes != null) {
    conflictType = "geographic_incompatibility";
    severity = "borderline";
    reason = `Geographic incompatibility: ${distanceKm?.toFixed(1)}km between dropoff and next pickup. Estimated travel ${travelTimeMinutes}min + ${BM16_CONFIG.DEFAULT_REPOSITION_BUFFER_MINUTES}min buffer = ${travelTimeMinutes + BM16_CONFIG.DEFAULT_REPOSITION_BUFFER_MINUTES}min required, only ${bufferAvailableMinutes}min available.`;
  }

  return {
    ride_a_id: earlier.booking_id,
    ride_b_id: later.booking_id,
    conflict_type: conflictType,
    severity,
    overlap_minutes: overlapMinutes,
    buffer_available_minutes: bufferAvailableMinutes,
    buffer_required_minutes: bufferRequired,
    distance_km: distanceKm,
    travel_time_minutes: travelTimeMinutes,
    reason,
  };
}

// ── Main exported function ────────────────────────────────────────────────
/**
 * Checks whether a proposed new booking conflicts with a driver's
 * existing future committed schedule.
 *
 * @param driverId       UUID of the driver being evaluated
 * @param proposedRide   The new booking being proposed
 * @param existingRides  Driver's already-committed future bookings
 * @returns              ScheduleConflictResult with full audit trail
 */
export function checkScheduleConflict(
  driverId: string,
  proposedRide: ScheduledRide,
  existingRides: ScheduledRide[]
): ScheduleConflictResult {
  const conflictPairs: ConflictPair[] = [];

  for (const existing of existingRides) {
    // Skip rides that are the same booking
    if (existing.booking_id === proposedRide.booking_id) continue;

    const pair = checkPairConflict(proposedRide, existing);
    if (pair.conflict_type !== "none") {
      conflictPairs.push(pair);
    }
  }

  const hasStrongConflict = conflictPairs.some((p) => p.severity === "strong");
  const hasBorderlineConflict = conflictPairs.some(
    (p) => p.severity === "borderline"
  );

  let exclusionReason: string | null = null;
  if (hasStrongConflict) {
    const strong = conflictPairs.find((p) => p.severity === "strong")!;
    exclusionReason = `[BM16_CONFLICT_DETECTED] Driver excluded due to strong schedule conflict: ${strong.reason}`;
  }

  return {
    driver_id: driverId,
    proposed_booking_id: proposedRide.booking_id,
    has_strong_conflict: hasStrongConflict,
    has_borderline_conflict: hasBorderlineConflict,
    conflict_pairs: conflictPairs,
    eligible: !hasStrongConflict,
    exclusion_reason: exclusionReason,
    checked_at: new Date().toISOString(),
    config_snapshot: BM16_CONFIG,
  };
}

/**
 * Checks all pairs within a driver's existing schedule for internal conflicts.
 * Used for the future_bookings display layer — marks each ride with conflict flags.
 */
export function checkInternalScheduleConflicts(
  driverId: string,
  rides: ScheduledRide[]
): ConflictPair[] {
  const pairs: ConflictPair[] = [];
  for (let i = 0; i < rides.length; i++) {
    for (let j = i + 1; j < rides.length; j++) {
      const pair = checkPairConflict(rides[i], rides[j]);
      if (pair.conflict_type !== "none") {
        pairs.push(pair);
      }
    }
  }
  return pairs;
}
