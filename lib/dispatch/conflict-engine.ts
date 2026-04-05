// ============================================================
// lib/dispatch/conflict-engine.ts
//
// BM18 — CONFLICT DETECTION ENGINE
// Driver Availability Validator v1.0
//
// Validates whether a driver can accept a candidate ride
// BEFORE assignment — server-side, deterministic.
//
// DESIGN PRINCIPLES:
// - Wraps BM16 schedule-conflict.ts for pair-level logic
// - Adds airport-aware buffer rules (BM18 spec)
// - Performs its own DB query: no caller needs to pre-fetch rides
// - Returns a simple { available, reason } result
// - All thresholds are configurable constants — never hardcoded
// - Pure audit trail: every decision is logged in the result
//
// RESULT CODES:
//   AVAILABLE        — no conflicts detected
//   OVERLAP          — direct temporal overlap with existing ride
//   BUFFER           — insufficient turn buffer after existing ride
//   TRAVEL_TIME      — travel time + buffer exceeds available window
//
// USAGE:
//   import { checkDriverAvailability } from "@/lib/dispatch/conflict-engine"
//   const result = await checkDriverAvailability(sql, { ... })
//   if (!result.available) { ... }
//
// INTEGRATION POINTS (BM18 Part 2):
//   - /api/admin/dispatch (manual assignment)
//   - /api/admin/dispatch/candidates (candidate scoring)
//   - /api/admin/fallback-dispatch (fallback pool)
//   - /api/admin/reassign (manual reassignment)
// ============================================================

import {
  checkScheduleConflict,
  BM16_CONFIG,
  type ScheduledRide,
} from "@/lib/dispatch/schedule-conflict";

// ── BM18 Configuration ────────────────────────────────────────────────────
export const BM18_CONFIG = {
  /**
   * Minimum buffer (minutes) required between end of an airport ride
   * and the start of the next ride. Airport rides require extra staging time.
   */
  AIRPORT_BUFFER_MINUTES: 45,

  /**
   * Minimum buffer (minutes) required between end of a standard city ride
   * and the start of the next ride.
   */
  STANDARD_BUFFER_MINUTES: 25,

  /**
   * Keywords in pickup_address or dropoff_address that indicate an airport ride.
   * Case-insensitive match.
   */
  AIRPORT_KEYWORDS: ["MCO", "airport", "Orlando International", "SFB", "Sanford"],

  /**
   * Lookahead window (hours) for fetching driver's active rides from DB.
   * Rides outside this window are not considered for conflict detection.
   */
  CONFLICT_LOOKAHEAD_HOURS: 48,

  /**
   * Default estimated ride duration (minutes) when not stored in booking.
   * Fallback used when estimated_duration_minutes IS NULL in DB.
   */
  DEFAULT_RIDE_DURATION_MINUTES: 60,

  /**
   * Average speed (km/h) used for travel time estimation between rides.
   */
  AVG_SPEED_KMH: 50,
} as const;

// ── Types ─────────────────────────────────────────────────────────────────

/** Reason codes for unavailability — matches BM18 spec output */
export type ConflictReason = "OVERLAP" | "BUFFER" | "TRAVEL_TIME";

/** Result returned by checkDriverAvailability() */
export interface DriverAvailabilityResult {
  /** Whether the driver is available for the candidate ride */
  available: boolean;

  /** Reason code if not available */
  reason?: ConflictReason;

  /**
   * Human-readable explanation of the conflict.
   * Always present when available = false.
   */
  explanation?: string;

  /** ID of the conflicting existing ride (if applicable) */
  conflicting_booking_id?: string;

  /** Minutes of overlap (positive) or buffer deficit (negative) */
  conflict_minutes?: number;

  /** ISO timestamp of when this check was performed */
  checked_at: string;

  /** Snapshot of config used for this check */
  config_snapshot: typeof BM18_CONFIG;
}

/** Input for checkDriverAvailability() */
export interface DriverAvailabilityInput {
  /** UUID of the driver being evaluated */
  driver_id: string;

  /** Proposed ride pickup datetime */
  candidate_pickup_datetime: Date;

  /**
   * Proposed ride dropoff datetime.
   * If not available, pass null — engine will estimate using DEFAULT_RIDE_DURATION_MINUTES.
   */
  candidate_dropoff_datetime: Date | null;

  /** Pickup address of the candidate ride (used for airport buffer detection) */
  candidate_pickup_location?: string | null;

  /** Dropoff address of the candidate ride (used for airport buffer detection) */
  candidate_dropoff_location?: string | null;

  /**
   * Booking ID of the candidate ride (excluded from conflict checks to avoid
   * self-conflict when re-evaluating an already-assigned ride).
   */
  candidate_booking_id?: string | null;
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Haversine distance between two lat/lng points (km) */
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

/** Estimated travel time (minutes) from distance (km) */
function estimateTravelTimeMinutes(distanceKm: number): number {
  return Math.ceil((distanceKm / BM18_CONFIG.AVG_SPEED_KMH) * 60);
}

/** Estimated end time of a ride given pickup and optional duration */
function estimatedEndTime(pickupAt: Date, durationMinutes: number | null): Date {
  const dur = durationMinutes ?? BM18_CONFIG.DEFAULT_RIDE_DURATION_MINUTES;
  return new Date(pickupAt.getTime() + dur * 60 * 1000);
}

/** Detect if an address string indicates an airport location */
function isAirportAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return BM18_CONFIG.AIRPORT_KEYWORDS.some((kw) =>
    lower.includes(kw.toLowerCase())
  );
}

/** Determine the required buffer (minutes) based on ride addresses */
function requiredBufferMinutes(
  existingDropoffAddress: string | null | undefined,
  candidatePickupAddress: string | null | undefined
): number {
  // If either end is an airport, apply the stricter airport buffer
  if (
    isAirportAddress(existingDropoffAddress) ||
    isAirportAddress(candidatePickupAddress)
  ) {
    return BM18_CONFIG.AIRPORT_BUFFER_MINUTES;
  }
  return BM18_CONFIG.STANDARD_BUFFER_MINUTES;
}

// ── Main exported function ────────────────────────────────────────────────

/**
 * checkDriverAvailability()
 *
 * Queries the driver's active rides from the database and evaluates
 * whether the candidate ride can be safely assigned without conflict.
 *
 * @param sql   Neon serverless SQL client (tagged template function)
 * @param input DriverAvailabilityInput — candidate ride details
 * @returns     DriverAvailabilityResult with available flag and reason
 */
export async function checkDriverAvailability(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  input: DriverAvailabilityInput
): Promise<DriverAvailabilityResult> {
  const checkedAt = new Date().toISOString();

  const {
    driver_id,
    candidate_pickup_datetime,
    candidate_dropoff_datetime,
    candidate_pickup_location,
    candidate_dropoff_location,
    candidate_booking_id,
  } = input;

  // Compute candidate end time
  const candidateEnd =
    candidate_dropoff_datetime ??
    estimatedEndTime(candidate_pickup_datetime, null);

  // ── STEP 1: Fetch driver's active rides from DB ─────────────────────────
  // Active = status in (accepted, assigned, en_route, arrived, in_trip)
  // Excludes: completed, cancelled, no_show, archived, resolved_incident
  // Window: NOW - 2h to NOW + CONFLICT_LOOKAHEAD_HOURS
  let existingRides: Array<{
    booking_id: string;
    pickup_at: Date;
    estimated_duration_minutes: number | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
    pickup_address: string;
    dropoff_address: string;
    status: string;
    dispatch_status: string;
  }> = [];

  try {
    const lookaheadHours = BM18_CONFIG.CONFLICT_LOOKAHEAD_HOURS;
    const rows = await sql`
      SELECT
        b.id                          AS booking_id,
        b.pickup_at,
        b.estimated_duration_minutes,
        b.pickup_lat,
        b.pickup_lng,
        b.dropoff_lat,
        b.dropoff_lng,
        COALESCE(b.pickup_address, b.pickup_zone, '')   AS pickup_address,
        COALESCE(b.dropoff_address, b.dropoff_zone, '') AS dropoff_address,
        b.status,
        COALESCE(b.dispatch_status, b.status)           AS dispatch_status
      FROM bookings b
      WHERE b.assigned_driver_id = ${driver_id}::uuid
        AND b.status IN ('accepted', 'assigned', 'en_route', 'arrived', 'in_trip')
        AND b.status NOT IN ('completed', 'cancelled', 'no_show', 'archived')
        AND b.pickup_at IS NOT NULL
        AND b.pickup_at > NOW() - INTERVAL '2 hours'
        AND b.pickup_at <= NOW() + (${lookaheadHours} || ' hours')::interval
        ${candidate_booking_id ? sql`AND b.id != ${candidate_booking_id}::uuid` : sql``}
      ORDER BY b.pickup_at ASC
    `;

    existingRides = rows.map((r: any) => ({
      booking_id: r.booking_id,
      pickup_at: new Date(r.pickup_at),
      estimated_duration_minutes: r.estimated_duration_minutes != null
        ? Number(r.estimated_duration_minutes)
        : null,
      pickup_lat: r.pickup_lat != null ? Number(r.pickup_lat) : null,
      pickup_lng: r.pickup_lng != null ? Number(r.pickup_lng) : null,
      dropoff_lat: r.dropoff_lat != null ? Number(r.dropoff_lat) : null,
      dropoff_lng: r.dropoff_lng != null ? Number(r.dropoff_lng) : null,
      pickup_address: r.pickup_address ?? '',
      dropoff_address: r.dropoff_address ?? '',
      status: r.status,
      dispatch_status: r.dispatch_status ?? r.status,
    }));
  } catch (err) {
    // DB error: fail open (don't block assignment due to DB issues)
    // Log the error but return available = true to avoid false negatives
    console.error("[BM18] conflict-engine DB query failed:", err);
    return {
      available: true,
      explanation: "[BM18] DB query failed — conflict check skipped (fail-open)",
      checked_at: checkedAt,
      config_snapshot: BM18_CONFIG,
    };
  }

  // If no existing rides, driver is available
  if (existingRides.length === 0) {
    return {
      available: true,
      checked_at: checkedAt,
      config_snapshot: BM18_CONFIG,
    };
  }

  // ── STEP 2-4: Evaluate each existing ride against the candidate ──────────
  for (const existing of existingRides) {
    const existingEnd = estimatedEndTime(
      existing.pickup_at,
      existing.estimated_duration_minutes
    );

    // ── STEP 2: Direct temporal overlap ────────────────────────────────────
    // Overlap condition: existing.pickup < candidate_end AND candidate_pickup < existing_end
    const hasOverlap =
      existing.pickup_at < candidateEnd &&
      candidate_pickup_datetime < existingEnd;

    if (hasOverlap) {
      const overlapMs = Math.min(
        candidateEnd.getTime() - existing.pickup_at.getTime(),
        existingEnd.getTime() - candidate_pickup_datetime.getTime()
      );
      const overlapMinutes = Math.ceil(overlapMs / 60000);
      return {
        available: false,
        reason: "OVERLAP",
        explanation: `[BM18_OVERLAP] Direct temporal overlap with ride ${existing.booking_id.slice(0, 8).toUpperCase()}. ` +
          `Existing: ${existing.pickup_at.toISOString()} → ${existingEnd.toISOString()}. ` +
          `Candidate: ${candidate_pickup_datetime.toISOString()} → ${candidateEnd.toISOString()}. ` +
          `Overlap: ${overlapMinutes}min.`,
        conflicting_booking_id: existing.booking_id,
        conflict_minutes: overlapMinutes,
        checked_at: checkedAt,
        config_snapshot: BM18_CONFIG,
      };
    }

    // ── STEP 3: Buffer check ────────────────────────────────────────────────
    // Determine which ride comes first chronologically
    const [earlier, later, earlierEnd] =
      existing.pickup_at <= candidate_pickup_datetime
        ? [existing, { pickup_at: candidate_pickup_datetime, pickup_address: candidate_pickup_location ?? '' }, existingEnd]
        : [
            { pickup_at: candidate_pickup_datetime, pickup_address: candidate_pickup_location ?? '', dropoff_address: candidate_dropoff_location ?? '' },
            existing,
            candidateEnd,
          ];

    const bufferMs = later.pickup_at.getTime() - earlierEnd.getTime();
    const bufferAvailableMinutes = Math.floor(bufferMs / 60000);

    // Determine required buffer based on airport rules
    const earlierDropoffAddr =
      existing.pickup_at <= candidate_pickup_datetime
        ? existing.dropoff_address
        : (candidate_dropoff_location ?? '');
    const laterPickupAddr =
      existing.pickup_at <= candidate_pickup_datetime
        ? (candidate_pickup_location ?? '')
        : existing.pickup_address;

    const bufferRequired = requiredBufferMinutes(earlierDropoffAddr, laterPickupAddr);

    if (bufferAvailableMinutes < bufferRequired) {
      const deficit = bufferRequired - bufferAvailableMinutes;
      return {
        available: false,
        reason: "BUFFER",
        explanation: `[BM18_BUFFER] Insufficient turn buffer near ride ${existing.booking_id.slice(0, 8).toUpperCase()}. ` +
          `Available: ${bufferAvailableMinutes}min, Required: ${bufferRequired}min ` +
          `(${isAirportAddress(earlierDropoffAddr) || isAirportAddress(laterPickupAddr) ? 'airport' : 'standard'} buffer). ` +
          `Deficit: ${deficit}min.`,
        conflicting_booking_id: existing.booking_id,
        conflict_minutes: -deficit,
        checked_at: checkedAt,
        config_snapshot: BM18_CONFIG,
      };
    }

    // ── STEP 4: Travel time check ───────────────────────────────────────────
    // Only evaluate if geographic coordinates are available for both rides
    const [earlierRide, laterRide] =
      existing.pickup_at <= candidate_pickup_datetime
        ? [existing, null]
        : [null, existing];

    // We need dropoff coords of the earlier ride and pickup coords of the later ride
    const earlierDropoffLat = earlierRide?.dropoff_lat ?? null;
    const earlierDropoffLng = earlierRide?.dropoff_lng ?? null;
    const laterPickupLat = laterRide?.pickup_lat ?? null;
    const laterPickupLng = laterRide?.pickup_lng ?? null;

    if (
      earlierDropoffLat != null && earlierDropoffLng != null &&
      laterPickupLat != null && laterPickupLng != null
    ) {
      const distanceKm = haversineKm(
        earlierDropoffLat, earlierDropoffLng,
        laterPickupLat, laterPickupLng
      );
      const travelTimeMin = estimateTravelTimeMinutes(distanceKm);
      const repositionBuffer = BM16_CONFIG.DEFAULT_REPOSITION_BUFFER_MINUTES;
      const totalRequired = travelTimeMin + repositionBuffer;

      if (bufferAvailableMinutes < totalRequired) {
        const deficit = totalRequired - bufferAvailableMinutes;
        return {
          available: false,
          reason: "TRAVEL_TIME",
          explanation: `[BM18_TRAVEL_TIME] Insufficient travel time buffer near ride ${existing.booking_id.slice(0, 8).toUpperCase()}. ` +
            `Distance: ${distanceKm.toFixed(1)}km, Travel: ${travelTimeMin}min + ${repositionBuffer}min reposition = ${totalRequired}min required. ` +
            `Available: ${bufferAvailableMinutes}min. Deficit: ${deficit}min.`,
          conflicting_booking_id: existing.booking_id,
          conflict_minutes: -deficit,
          checked_at: checkedAt,
          config_snapshot: BM18_CONFIG,
        };
      }
    }
  }

  // ── STEP 5: No conflicts detected ──────────────────────────────────────
  return {
    available: true,
    checked_at: checkedAt,
    config_snapshot: BM18_CONFIG,
  };
}

// ── Convenience wrapper: check from booking ID ───────────────────────────

/**
 * checkDriverAvailabilityForBooking()
 *
 * Convenience wrapper that fetches the candidate booking details from DB
 * and then calls checkDriverAvailability().
 *
 * Use this when you have a booking_id and driver_id but not the full
 * pickup/dropoff datetimes.
 *
 * @param sql        Neon serverless SQL client
 * @param driverId   UUID of the driver being evaluated
 * @param bookingId  UUID of the candidate booking
 * @returns          DriverAvailabilityResult
 */
export async function checkDriverAvailabilityForBooking(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  driverId: string,
  bookingId: string
): Promise<DriverAvailabilityResult> {
  const checkedAt = new Date().toISOString();

  // Fetch candidate booking details
  let candidatePickupAt: Date | null = null;
  let candidateDropoffAt: Date | null = null;
  let candidatePickupLocation: string | null = null;
  let candidateDropoffLocation: string | null = null;
  let candidateDurationMin: number | null = null;

  try {
    const [booking] = await sql`
      SELECT
        pickup_at,
        estimated_duration_minutes,
        COALESCE(pickup_address, pickup_zone, '') AS pickup_location,
        COALESCE(dropoff_address, dropoff_zone, '') AS dropoff_location
      FROM bookings
      WHERE id = ${bookingId}::uuid
      LIMIT 1
    `;
    if (!booking?.pickup_at) {
      return {
        available: true,
        explanation: "[BM18] Candidate booking not found or missing pickup_at — conflict check skipped",
        checked_at: checkedAt,
        config_snapshot: BM18_CONFIG,
      };
    }
    candidatePickupAt = new Date(booking.pickup_at);
    candidateDurationMin = booking.estimated_duration_minutes != null
      ? Number(booking.estimated_duration_minutes)
      : null;
    candidatePickupLocation = booking.pickup_location ?? null;
    candidateDropoffLocation = booking.dropoff_location ?? null;
    // Estimate dropoff if not stored
    candidateDropoffAt = estimatedEndTime(candidatePickupAt, candidateDurationMin);
  } catch (err) {
    console.error("[BM18] conflict-engine booking fetch failed:", err);
    return {
      available: true,
      explanation: "[BM18] Booking fetch failed — conflict check skipped (fail-open)",
      checked_at: checkedAt,
      config_snapshot: BM18_CONFIG,
    };
  }

  return checkDriverAvailability(sql, {
    driver_id: driverId,
    candidate_pickup_datetime: candidatePickupAt,
    candidate_dropoff_datetime: candidateDropoffAt,
    candidate_pickup_location: candidatePickupLocation,
    candidate_dropoff_location: candidateDropoffLocation,
    candidate_booking_id: bookingId,
  });
}
