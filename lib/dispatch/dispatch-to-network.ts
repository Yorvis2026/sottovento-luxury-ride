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
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function dispatchToNetwork(
  bookingId: string,
  round: number,
  excludeDriverId?: string
): Promise<void> {
  try {
    // Guard: skip terminal bookings
    const bookingRows = await sql`
      SELECT id, vehicle_type, service_type, service_location_type
      FROM bookings
      WHERE id = ${bookingId}::uuid
        AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip')
      LIMIT 1
    `;
    const booking = bookingRows[0];
    if (!booking) {
      console.log(`[dispatchToNetwork] booking not found or terminal state — ${bookingId}`);
      return;
    }

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

    // BM5 priority ordering: SOTTOVENTO_LEGAL_FLEET > PARTNER_LEGAL_FLEET > GENERAL
    // Within tier: reliability_score DESC
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
      // No eligible drivers — release to manual pool
      await sql`
        UPDATE bookings
        SET
          assigned_driver_id = NULL,
          dispatch_status    = 'pending_dispatch',
          updated_at         = NOW()
        WHERE id = ${bookingId}::uuid
          AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip')
      `;
      console.log(`[dispatchToNetwork] no_eligible_drivers — Booking ${bookingId} — released to manual pool`);
      return;
    }

    const nextDriver = candidateRows[0];
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min window

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
        AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip')
    `;

    console.log(`[dispatchToNetwork] bm10_next_offer — Booking ${bookingId} — Round ${round} — Driver ${nextDriver.driver_code}`);
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
