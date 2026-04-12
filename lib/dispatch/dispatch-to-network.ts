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
 * This ensures driver-cancel redispatch uses the SAME pipeline as
 * driver-reject: same round counter, same exclusion semantics,
 * same 30-min offer window, same BM5 priority ordering.
 *
 * BM-LOG-ELIGIBILITY-SLN-01:
 * Logs candidate evaluation results to dispatch_candidate_log for
 * observability. Non-blocking — never interrupts dispatch flow.
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// ── BM-LOG-ELIGIBILITY-SLN-01: log helper ────────────────────────────────────
// Non-blocking: failures are silently swallowed so logging never interrupts dispatch.
async function logCandidate(
  bookingId: string,
  driverId: string | null,
  availabilityStatus: string | null,
  bookingStatus: string | null,
  eligibilityResult: string,
  exclusionReason: string | null
): Promise<void> {
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
        ${bookingId}::uuid,
        ${driverId ? `${driverId}` : null}::uuid,
        ${availabilityStatus},
        ${bookingStatus},
        ${eligibilityResult},
        ${exclusionReason},
        NOW()
      )
    `;
  } catch { /* non-blocking — logging failure must never interrupt dispatch */ }
}

export async function dispatchToNetwork(
  bookingId: string,
  round: number,
  excludeDriverId?: string
): Promise<void> {
  try {
    // Guard: skip terminal bookings
    const bookingRows = await sql`
      SELECT id, vehicle_type, service_type, service_location_type, status
      FROM bookings
      WHERE id = ${bookingId}::uuid
        AND status NOT IN ('completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin', 'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip')
      LIMIT 1
    `;
    const booking = bookingRows[0];
    if (!booking) {
      console.log(`[dispatchToNetwork] booking not found or terminal state — ${bookingId}`);
      return;
    }

    const currentBookingStatus: string = booking.status ?? null;

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

    // ── BM-LOG-ELIGIBILITY-SLN-01: evaluate ALL active drivers for this booking ──
    // We query a broader set (no availability filter) to log exclusion reasons,
    // then the actual dispatch uses the standard filtered query (LIMIT 1, available only).
    // This is a separate read — does NOT change dispatch logic.
    try {
      const allCandidates = await sql`
        SELECT
          id::text,
          driver_code,
          COALESCE(availability_status, 'available') AS availability_status,
          driver_status,
          is_eligible,
          license_expires_at,
          insurance_expires_at
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

      for (const d of allCandidates) {
        const isDeclined = excludeList.includes(d.id);
        const isAvailable = d.availability_status === 'available';

        let eligibilityResult: string;
        let exclusionReason: string | null;

        if (isDeclined) {
          eligibilityResult = 'excluded';
          exclusionReason = declinedIds.includes(d.id)
            ? (d.id === originalDriverId ? 'already_assigned' : 'declined_excluded')
            : 'manual_exclusion';
        } else if (!isAvailable) {
          eligibilityResult = 'excluded';
          exclusionReason = 'availability_not_available';
        } else {
          eligibilityResult = 'eligible';
          exclusionReason = null;
        }

        await logCandidate(
          bookingId,
          d.id,
          d.availability_status,
          currentBookingStatus,
          eligibilityResult,
          exclusionReason
        );
      }
    } catch { /* non-blocking — eligibility logging must never interrupt dispatch */ }

    // BM5 priority ordering: SOTTOVENTO_LEGAL_FLEET > PARTNER_LEGAL_FLEET > GENERAL
    // Within tier: reliability_score DESC
    // ── THIS QUERY IS UNCHANGED — no modifications to dispatch logic ──
    const candidateRows = await sql`
      SELECT id::text, driver_code, full_name
      FROM drivers
      WHERE driver_status = 'active'
        AND is_eligible = true
        AND (license_expires_at IS NULL OR license_expires_at > NOW())
        AND (insurance_expires_at IS NULL OR insurance_expires_at > NOW())
        AND COALESCE(availability_status, 'available') = 'available'
        AND id NOT IN (
          SELECT unnest(${excludeList}::uuid[])
        )
      ORDER BY
        CASE COALESCE(legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
          WHEN 'SOTTOVENTO_LEGAL_FLEET' THEN 1
          WHEN 'PARTNER_LEGAL_FLEET'    THEN 2
          ELSE 3
        END ASC,
        COALESCE(reliability_score, 65) DESC,
        created_at ASC
      LIMIT 1
    `;

    if (candidateRows.length === 0) {
      // BM-CANCEL-STATE-SLN-02 Section 4: pool exhausted → system_reassignment_required
      // Sets booking_status = 'system_reassignment_required' (redispatchable, not terminal)
      // dispatch_status = 'pending_dispatch' preserved for admin visibility
      await sql`
        UPDATE bookings
        SET
          assigned_driver_id = NULL,
          status             = 'system_reassignment_required',
          dispatch_status    = 'pending_dispatch',
          updated_at         = NOW()
        WHERE id = ${bookingId}::uuid
          AND status NOT IN ('completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin', 'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip')
      `;
      // BM-LOG-ELIGIBILITY-SLN-01: log pool exhaustion
      await logCandidate(bookingId, null, null, currentBookingStatus, 'pool_exhausted', null);
      console.log(`[dispatchToNetwork] no_eligible_drivers — Booking ${bookingId} — system_reassignment_required`);
      return;
    }

    const nextDriver = candidateRows[0];
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // BM-TTL-SEQUENTIAL-POOL-01: 10 min window (captador priority layer)

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

    // Update booking: offer_pending — SAFETY: does NOT change booking.status
    await sql`
      UPDATE bookings
      SET
        assigned_driver_id = NULL,
        dispatch_status    = 'offer_pending',
        offer_expires_at   = ${expiresAt}::timestamptz,
        updated_at         = NOW()
      WHERE id = ${bookingId}::uuid
          AND status NOT IN ('completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin', 'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip')
    `;

    console.log(`[dispatchToNetwork] bm10_next_offer Booking ${bookingId} — Round ${round} — Driver ${nextDriver.driver_code}`);
  } catch (err: any) {
    console.error(`[dispatchToNetwork] error — Booking ${bookingId}:`, err?.message);
    // Last resort: release to pool
    try {
      await sql`
        UPDATE bookings
        SET assigned_driver_id = NULL, dispatch_status = 'pending_dispatch', updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;
    } catch { /* ignore */ }
  }
}
