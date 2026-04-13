/**
 * dispatchToNetwork — shared helper
 *
 * Selects the next eligible driver for a booking and creates a new
 * dispatch_offer row (BM10 targeted next-driver dispatch).
 *
 * Used by:
 *   - /api/dispatch/respond-offer  (driver DECLINE / TIMEOUT)
 *   - /api/driver/cancel-ride      (driver CANCEL redispatch — BM20-N5)
 *
 * BM-DISPATCH-ELIGIBILITY-01:
 * Replaces simplistic `availability_status = 'available'` filter with
 * isDriverEligibleForBooking() — canonical temporal conflict matrix.
 * A driver with a future confirmed booking (reserved) is NOT automatically
 * excluded — only excluded if there is a REAL schedule conflict.
 *
 * BM-LOG-ELIGIBILITY-SLN-01:
 * Logs candidate evaluation results to dispatch_candidate_log.
 * Non-blocking — never interrupts dispatch flow.
 */

import { neon } from "@neondatabase/serverless";
import {
  isDriverEligibleForBooking,
  logEligibility,
  type DriverEligibilityInput,
} from "./is-driver-eligible";

const sql = neon(process.env.DATABASE_URL!);

export async function dispatchToNetwork(
  bookingId: string,
  round: number,
  excludeDriverId?: string
): Promise<void> {
  try {
    // Guard: skip terminal bookings
    const bookingRows = await sql`
      SELECT
        id, vehicle_type, service_type, service_location_type, status,
        pickup_at, estimated_duration_minutes
      FROM bookings
      WHERE id = ${bookingId}::uuid
        AND status NOT IN (
          'completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin',
          'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip'
        )
      LIMIT 1
    `;
    const booking = bookingRows[0];
    if (!booking) {
      console.log(`[dispatchToNetwork] booking not found or terminal state — ${bookingId}`);
      return;
    }

    const currentBookingStatus: string = booking.status ?? null;
    const newBookingPickupAt: string | null = booking.pickup_at ?? null;
    const newBookingDuration: number | undefined = booking.estimated_duration_minutes ?? undefined;

    // Collect all drivers who already declined or timed out for this booking
    const declinedRows = await sql`
      SELECT DISTINCT driver_id::text FROM dispatch_offers
      WHERE booking_id = ${bookingId}::uuid
        AND response IN ('declined', 'timeout')
    `;
    const declinedIds = declinedRows.map((r: any) => r.driver_id as string);

    // Also exclude original_driver_id stored on the booking (set by cancel-ride BM20-N4)
    const bookingMeta = await sql`
      SELECT original_driver_id::text FROM bookings WHERE id = ${bookingId}::uuid LIMIT 1
    `;
    const originalDriverId = bookingMeta[0]?.original_driver_id ?? null;
    if (originalDriverId && !declinedIds.includes(originalDriverId)) {
      declinedIds.push(originalDriverId);
    }

    if (excludeDriverId && !declinedIds.includes(excludeDriverId)) {
      declinedIds.push(excludeDriverId);
    }

    const excludeList = declinedIds.length > 0
      ? declinedIds
      : ['00000000-0000-0000-0000-000000000000'];

    // ── BM-DISPATCH-ELIGIBILITY-01: Load all active candidates ───────────────────
    // No availability_status filter here — isDriverEligibleForBooking handles it.
    // We load ALL active, legal, document-valid drivers and evaluate each one.
    const allCandidates = await sql`
      SELECT
        id::text,
        driver_code,
        full_name,
        COALESCE(availability_status, 'available') AS availability_status,
        driver_status,
        is_eligible,
        CASE
          WHEN license_expires_at IS NULL OR license_expires_at > NOW() THEN true
          ELSE false
        END AS license_valid,
        CASE
          WHEN insurance_expires_at IS NULL OR insurance_expires_at > NOW() THEN true
          ELSE false
        END AS insurance_valid,
        COALESCE(reliability_score, 65) AS reliability_score,
        legal_affiliation_type
      FROM drivers
      WHERE driver_status = 'active'
        AND is_eligible = true
        AND (license_expires_at IS NULL OR license_expires_at > NOW())
        AND (insurance_expires_at IS NULL OR insurance_expires_at > NOW())
      ORDER BY
        CASE COALESCE(legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
          WHEN 'SOTTOVENTO_LEGAL_FLEET' THEN 1
          WHEN 'PARTNER_LEGAL_FLEET'    THEN 2
          ELSE 3
        END ASC,
        COALESCE(reliability_score, 65) DESC,
        created_at ASC
      LIMIT 50
    `;

    // ── BM-DISPATCH-ELIGIBILITY-01: Evaluate each candidate ──────────────────────
    // Separate manual_online_status from ride_state.
    // manual_online_status = 'offline' | 'available' (only these two are manual)
    // ride_state = 'reserved' | 'en_route' | 'in_trip' | 'arrived' (system-controlled)
    let nextDriver: { id: string; driver_code: string; full_name: string } | null = null;

    for (const d of allCandidates) {
      const rawStatus: string = d.availability_status;

      // Divorce: manual_online_status vs ride_state
      const MANUAL_STATES = ['offline', 'available'];
      const RIDE_STATES = ['reserved', 'en_route', 'in_trip', 'arrived', 'busy'];

      const manualOnlineStatus: string = MANUAL_STATES.includes(rawStatus)
        ? rawStatus
        : 'available'; // system-controlled states don't affect manual switch

      const rideState: string | null = RIDE_STATES.includes(rawStatus)
        ? rawStatus
        : null;

      const driverInput: DriverEligibilityInput = {
        driver_id: d.id,
        manual_online_status: manualOnlineStatus,
        ride_state: rideState,
        is_excluded: excludeList.includes(d.id),
        license_valid: d.license_valid,
        insurance_valid: d.insurance_valid,
        is_eligible_flag: d.is_eligible,
        driver_status: d.driver_status,
      };

      // Count future confirmed bookings for log
      let futureBookingCount = 0;
      try {
        const fbRows = await sql`
          SELECT COUNT(*)::int AS cnt
          FROM bookings
          WHERE assigned_driver_id = ${d.id}::uuid
            AND status IN ('assigned_not_started', 'reserved', 'accepted', 'assigned')
            AND pickup_at > NOW()
        `;
        futureBookingCount = fbRows[0]?.cnt ?? 0;
      } catch { /* non-blocking */ }

      const result = await isDriverEligibleForBooking(
        driverInput,
        newBookingPickupAt,
        newBookingDuration
      );

      // Log eligibility (non-blocking)
      await logEligibility({
        booking_id: bookingId,
        driver_id: d.id,
        manual_online_status: manualOnlineStatus,
        ride_state: rideState,
        future_booking_count: futureBookingCount,
        conflict_reason: result.reason,
        eligible: result.eligible,
      });

      // First eligible driver wins (already sorted by BM5 priority)
      if (result.eligible && !nextDriver) {
        nextDriver = { id: d.id, driver_code: d.driver_code, full_name: d.full_name };
      }
    }

    if (!nextDriver) {
      // BM-CANCEL-STATE-SLN-02 Section 4: pool exhausted → system_reassignment_required
      await sql`
        UPDATE bookings
        SET
          assigned_driver_id = NULL,
          status             = 'system_reassignment_required',
          dispatch_status    = 'pending_dispatch',
          updated_at         = NOW()
        WHERE id = ${bookingId}::uuid
          AND status NOT IN (
            'completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin',
            'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip'
          )
      `;
      // Log pool exhaustion
      try {
        await sql`
          INSERT INTO dispatch_candidate_log (
            booking_id, driver_id, availability_status, booking_status,
            eligibility_result, exclusion_reason, evaluated_at
          ) VALUES (
            ${bookingId}::uuid, NULL, NULL, ${currentBookingStatus},
            'pool_exhausted', NULL, NOW()
          )
        `;
      } catch { /* non-blocking */ }
      console.log(`[dispatchToNetwork] no_eligible_drivers — Booking ${bookingId} — system_reassignment_required`);
      return;
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // BM-TTL-SEQUENTIAL-POOL-01: 10 min

    // Create dispatch_offer for next driver
    await sql`
      INSERT INTO dispatch_offers (
        booking_id, driver_id, response, offer_round,
        is_source_offer, is_fallback_offer, sent_at, expires_at, created_at
      ) VALUES (
        ${bookingId}::uuid,
        ${nextDriver.id}::uuid,
        'pending',
        ${round},
        false,
        true,
        NOW(),
        ${expiresAt}::timestamptz,
        NOW()
      )
    `;

    // Update booking: offer_pending
    await sql`
      UPDATE bookings
      SET
        assigned_driver_id = NULL,
        dispatch_status    = 'offer_pending',
        offer_expires_at   = ${expiresAt}::timestamptz,
        updated_at         = NOW()
      WHERE id = ${bookingId}::uuid
        AND status NOT IN (
          'completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin',
          'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip'
        )
    `;

    console.log(`[dispatchToNetwork] bm10_next_offer Booking ${bookingId} — Round ${round} — Driver ${nextDriver.driver_code}`);
  } catch (err: any) {
    console.error(`[dispatchToNetwork] error — Booking ${bookingId}:`, err?.message);
    try {
      await sql`
        UPDATE bookings
        SET assigned_driver_id = NULL, dispatch_status = 'pending_dispatch', updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;
    } catch { /* ignore */ }
  }
}
