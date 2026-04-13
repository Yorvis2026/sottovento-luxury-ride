/**
 * isDriverEligibleForBooking — Canonical eligibility function
 *
 * BM-DISPATCH-ELIGIBILITY-01
 *
 * Replaces the simplistic `availability_status = 'available'` filter with a
 * full temporal conflict matrix. A driver with a future confirmed booking
 * (reserved) is NOT automatically excluded — only excluded if there is a
 * REAL schedule conflict.
 *
 * Evaluation order:
 *   1. Manual online/offline switch (hard gate)
 *   2. Legal/document validity (hard gate)
 *   3. Declined/excluded list (hard gate)
 *   4. Active live execution (in_trip / en_route / arrived) — hard gate
 *   5. Temporal conflict matrix (future reservations)
 *
 * Returns: { eligible: boolean, reason: string | null }
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Minimum buffer in minutes between end of one ride and start of next.
 * A driver needs at least this much time between rides to be eligible.
 */
const MIN_BUFFER_MINUTES = 45;

/**
 * Default estimated ride duration in minutes when no duration data is available.
 * Conservative estimate to avoid over-booking.
 */
const DEFAULT_RIDE_DURATION_MINUTES = 90;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DriverEligibilityInput {
  driver_id: string;
  manual_online_status: string;   // 'offline' | 'available' (manual switch only)
  ride_state: string | null;      // 'reserved' | 'en_route' | 'in_trip' | 'arrived' | null
  is_excluded: boolean;           // already declined/timed out for this booking
  license_valid: boolean;
  insurance_valid: boolean;
  is_eligible_flag: boolean;      // drivers.is_eligible DB flag
  driver_status: string;          // 'active' | 'suspended' | etc.
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string | null;
  conflict_details?: {
    conflicting_booking_id?: string;
    new_pickup_at?: string;
    existing_pickup_at?: string;
    estimated_end_at?: string;
    buffer_minutes?: number;
    required_buffer_minutes?: number;
  };
}

// ── Live execution states — hard block regardless of schedule ─────────────────
const LIVE_EXECUTION_STATES = ['en_route', 'arrived', 'in_trip'];

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Evaluates whether a driver is eligible to receive a new dispatch offer.
 *
 * @param driver - Driver eligibility input (pre-loaded fields)
 * @param newBookingPickupAt - ISO string of the new booking's pickup time
 * @param newBookingEstimatedDuration - Estimated duration of the new booking in minutes (optional)
 */
export async function isDriverEligibleForBooking(
  driver: DriverEligibilityInput,
  newBookingPickupAt: string | null,
  newBookingEstimatedDuration?: number
): Promise<EligibilityResult> {

  // ── Gate 1: Manual offline switch ────────────────────────────────────────────
  if (driver.manual_online_status === 'offline') {
    return { eligible: false, reason: 'manual_offline' };
  }

  // ── Gate 2: Driver status and document validity ───────────────────────────────
  if (driver.driver_status !== 'active') {
    return { eligible: false, reason: 'driver_not_active' };
  }
  if (!driver.is_eligible_flag) {
    return { eligible: false, reason: 'driver_not_eligible_flag' };
  }
  if (!driver.license_valid) {
    return { eligible: false, reason: 'license_expired' };
  }
  if (!driver.insurance_valid) {
    return { eligible: false, reason: 'insurance_expired' };
  }

  // ── Gate 3: Already declined/excluded for this booking ───────────────────────
  if (driver.is_excluded) {
    return { eligible: false, reason: 'declined_excluded' };
  }

  // ── Gate 4: Live execution — driver is physically on a ride RIGHT NOW ─────────
  // en_route / arrived / in_trip = driver is executing a ride.
  // This is a hard block regardless of schedule — driver cannot accept another ride
  // while physically driving/waiting for a client.
  if (driver.ride_state && LIVE_EXECUTION_STATES.includes(driver.ride_state)) {
    return { eligible: false, reason: `live_execution_${driver.ride_state}` };
  }

  // ── Gate 5: Temporal conflict matrix ─────────────────────────────────────────
  // A driver with ride_state = 'reserved' (accepted but not started) is NOT
  // automatically excluded. We check if there is a REAL schedule conflict.
  //
  // Conflict exists if:
  //   new_pickup_at falls within [existing_pickup_at - buffer, existing_estimated_end + buffer]
  //
  // If no pickup time is provided for the new booking, we cannot evaluate conflict
  // → treat as eligible (conservative: let the driver decide).

  if (!newBookingPickupAt) {
    // No pickup time — cannot evaluate conflict — eligible by default
    return { eligible: true, reason: null };
  }

  const newPickup = new Date(newBookingPickupAt).getTime();
  if (isNaN(newPickup)) {
    return { eligible: true, reason: null };
  }

  // Load all future confirmed bookings for this driver
  try {
    const confirmedBookings = await sql`
      SELECT
        id::text,
        pickup_at,
        estimated_duration_minutes,
        status
      FROM bookings
      WHERE assigned_driver_id = ${driver.driver_id}::uuid
        AND status IN ('assigned_not_started', 'reserved', 'accepted', 'assigned')
        AND pickup_at IS NOT NULL
        AND pickup_at > NOW() - INTERVAL '2 hours'
      ORDER BY pickup_at ASC
    `;

    for (const existing of confirmedBookings) {
      const existingPickup = new Date(existing.pickup_at).getTime();
      const estimatedDuration = existing.estimated_duration_minutes ?? DEFAULT_RIDE_DURATION_MINUTES;
      const estimatedEnd = existingPickup + estimatedDuration * 60 * 1000;

      // Buffer window around the existing ride
      const bufferMs = MIN_BUFFER_MINUTES * 60 * 1000;
      const windowStart = existingPickup - bufferMs;
      const windowEnd = estimatedEnd + bufferMs;

      // Conflict: new pickup falls inside the blocked window
      if (newPickup >= windowStart && newPickup <= windowEnd) {
        return {
          eligible: false,
          reason: 'temporal_conflict',
          conflict_details: {
            conflicting_booking_id: existing.id,
            new_pickup_at: newBookingPickupAt,
            existing_pickup_at: existing.pickup_at,
            estimated_end_at: new Date(estimatedEnd).toISOString(),
            buffer_minutes: Math.round((newPickup - existingPickup) / 60000),
            required_buffer_minutes: MIN_BUFFER_MINUTES,
          },
        };
      }

      // Also check: existing ride ends after new pickup starts (overlap)
      const newEstimatedDuration = newBookingEstimatedDuration ?? DEFAULT_RIDE_DURATION_MINUTES;
      const newEnd = newPickup + newEstimatedDuration * 60 * 1000;
      if (newEnd >= existingPickup - bufferMs && newPickup <= estimatedEnd + bufferMs) {
        return {
          eligible: false,
          reason: 'temporal_overlap',
          conflict_details: {
            conflicting_booking_id: existing.id,
            new_pickup_at: newBookingPickupAt,
            existing_pickup_at: existing.pickup_at,
            estimated_end_at: new Date(estimatedEnd).toISOString(),
            buffer_minutes: Math.round(Math.abs(newPickup - existingPickup) / 60000),
            required_buffer_minutes: MIN_BUFFER_MINUTES,
          },
        };
      }
    }
  } catch {
    // DB error during conflict check — fail open (eligible) to avoid blocking dispatch
    return { eligible: true, reason: null };
  }

  // All gates passed — driver is eligible
  return { eligible: true, reason: null };
}

// ── Extended log helper ───────────────────────────────────────────────────────

export interface EligibilityLogEntry {
  booking_id: string;
  driver_id: string;
  manual_online_status: string;
  ride_state: string | null;
  future_booking_count: number;
  conflict_reason: string | null;
  eligible: boolean;
}

/**
 * Logs a driver eligibility evaluation to dispatch_candidate_log.
 * Non-blocking — failures are silently swallowed.
 */
export async function logEligibility(entry: EligibilityLogEntry): Promise<void> {
  try {
    await sql`
      INSERT INTO dispatch_candidate_log (
        booking_id,
        driver_id,
        availability_status,
        booking_status,
        eligibility_result,
        exclusion_reason,
        evaluated_at
      ) VALUES (
        ${entry.booking_id}::uuid,
        ${entry.driver_id}::uuid,
        ${entry.manual_online_status},
        ${entry.ride_state ?? 'none'},
        ${entry.eligible ? 'eligible' : 'excluded'},
        ${entry.conflict_reason},
        NOW()
      )
    `;
  } catch { /* non-blocking */ }
}
