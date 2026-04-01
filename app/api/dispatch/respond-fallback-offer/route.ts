import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL_UNPOOLED as string);

// POST /api/dispatch/respond-fallback-offer
// Bloque Maestro 3 — Driver response to fallback pool offer
//
// Body: { offer_id, driver_code, response: 'accepted' | 'declined' }
//
// ACCEPT: assigns booking to driver, marks other pending offers as superseded
// DECLINE/TIMEOUT: marks offer, triggers next candidate if available

async function logEvent(bookingId: string, driverId: string | null, eventType: string, eventData: object) {
  try {
    await sql`
      INSERT INTO dispatch_event_log (booking_id, driver_id, event_type, event_data, created_at)
      VALUES (
        ${bookingId}::uuid,
        ${driverId ? `${driverId}::uuid` : null}::uuid,
        ${eventType},
        ${JSON.stringify(eventData)}::jsonb,
        NOW()
      )
    `;
  } catch (_) {}
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { offer_id, driver_code, response } = body;

  if (!offer_id || !driver_code || !response) {
    return NextResponse.json({ error: 'offer_id, driver_code, and response are required' }, { status: 400 });
  }

  if (!['accepted', 'declined'].includes(response)) {
    return NextResponse.json({ error: 'response must be accepted or declined' }, { status: 400 });
  }

  try {
    // Load the offer
    const offerRows = await sql`
      SELECT o.*, d.id AS driver_id_resolved, d.driver_code AS driver_code_resolved
      FROM dispatch_offers o
      JOIN drivers d ON d.id = o.driver_id
      WHERE o.id = ${offer_id}::uuid
        AND d.driver_code = ${driver_code}
        AND o.is_fallback_offer = true
        AND o.response = 'pending'
      LIMIT 1
    `;

    if (offerRows.length === 0) {
      return NextResponse.json({ error: 'Fallback offer not found, already responded, or not yours' }, { status: 404 });
    }

    const offer = offerRows[0];
    const bookingId = offer.booking_id;
    const driverId = offer.driver_id_resolved;

    // Check offer expiry
    if (new Date(offer.expires_at) < new Date()) {
      await sql`
        UPDATE dispatch_offers
        SET response = 'timeout', timeout_at = NOW(), updated_at = NOW()
        WHERE id = ${offer_id}::uuid
      `;
      await logEvent(bookingId, driverId, 'fallback_offer_timeout', {
        offer_id,
        driver_code,
        case: offer.fallback_case_level,
      });
      return NextResponse.json({ error: 'Offer has expired' }, { status: 410 });
    }

    if (response === 'accepted') {
      // ── DOUBLE-ASSIGN PROTECTION: SELECT FOR UPDATE ──────────────────────
      // Check booking is still in a dispatchable state
      const bookingRows = await sql`
        SELECT id, status, dispatch_status, assigned_driver_id, fallback_case_level
        FROM bookings
        WHERE id = ${bookingId}::uuid
          AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show', 'assigned')
          AND dispatch_status IN ('offer_pending', 'reassignment_needed', 'urgent_reassignment', 'critical_driver_failure')
        FOR UPDATE
        LIMIT 1
      `;

      if (bookingRows.length === 0) {
        // Already assigned to another driver (double-assign prevention)
        await sql`
          UPDATE dispatch_offers
          SET response = 'superseded', updated_at = NOW()
          WHERE id = ${offer_id}::uuid
        `;
        await logEvent(bookingId, driverId, 'fallback_offer_superseded', {
          offer_id,
          driver_code,
          reason: 'booking_already_assigned',
        });
        return NextResponse.json({
          error: 'Booking already assigned to another driver',
          code: 'DOUBLE_ASSIGN_PREVENTED',
        }, { status: 409 });
      }

      const booking = bookingRows[0];
      const startTime = new Date(offer.sent_at);
      const responseTime = Math.round((Date.now() - startTime.getTime()) / 1000);

      // Accept: assign driver to booking
      await sql`
        UPDATE bookings
        SET
          assigned_driver_id = ${driverId}::uuid,
          status = 'assigned',
          dispatch_status = 'reassigned',
          reassigned_at = NOW(),
          fallback_driver_id = ${driverId}::uuid,
          fallback_assignment_time = NOW(),
          fallback_response_time = MAKE_INTERVAL(secs => ${responseTime}),
          accepted_at = NOW(),
          updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;

      // Mark this offer as accepted
      await sql`
        UPDATE dispatch_offers
        SET response = 'accepted', updated_at = NOW()
        WHERE id = ${offer_id}::uuid
      `;

      // Supersede all other pending fallback offers for this booking (Case B: top-3)
      await sql`
        UPDATE dispatch_offers
        SET response = 'superseded', updated_at = NOW()
        WHERE booking_id = ${bookingId}::uuid
          AND id != ${offer_id}::uuid
          AND response = 'pending'
          AND is_fallback_offer = true
      `;

      // Set driver as busy
      await sql`
        UPDATE drivers
        SET availability_status = 'busy', updated_at = NOW()
        WHERE id = ${driverId}::uuid
      `;

      // Log assignment in fallback_assignment_log
      try {
        await sql`
          INSERT INTO fallback_assignment_log (
            booking_id, original_driver_id, fallback_driver_id,
            fallback_trigger_reason, fallback_case_level,
            fallback_assignment_time, fallback_response_time,
            offers_sent, final_status, created_at
          ) VALUES (
            ${bookingId}::uuid,
            ${booking.assigned_driver_id || null}::uuid,
            ${driverId}::uuid,
            ${booking.dispatch_status},
            ${booking.fallback_case_level || offer.fallback_case_level},
            NOW(),
            MAKE_INTERVAL(secs => ${responseTime}),
            1,
            'assigned',
            NOW()
          )
        `;
      } catch (_) {}

      await logEvent(bookingId, driverId, 'fallback_offer_accepted', {
        offer_id,
        driver_code,
        case: offer.fallback_case_level,
        response_time_seconds: responseTime,
      });

      await logEvent(bookingId, driverId, 'fallback_assignment_completed', {
        new_driver_code: driver_code,
        case: offer.fallback_case_level,
        dispatch_status: 'reassigned',
      });

      return NextResponse.json({
        ok: true,
        action: 'accepted',
        booking_id: bookingId,
        driver_code,
        new_status: 'assigned',
        new_dispatch_status: 'reassigned',
        response_time_seconds: responseTime,
        case: offer.fallback_case_level,
      });

    } else {
      // DECLINE
      await sql`
        UPDATE dispatch_offers
        SET response = 'declined', declined_at = NOW(), updated_at = NOW()
        WHERE id = ${offer_id}::uuid
      `;

      // Update booking declined count
      await sql`
        UPDATE bookings
        SET
          fallback_declined_count = COALESCE(fallback_declined_count, 0) + 1,
          updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;

      await logEvent(bookingId, driverId, 'fallback_offer_declined', {
        offer_id,
        driver_code,
        case: offer.fallback_case_level,
      });

      // Check if there are still pending offers (Case B simultaneous)
      const pendingOffers = await sql`
        SELECT COUNT(*) AS cnt FROM dispatch_offers
        WHERE booking_id = ${bookingId}::uuid
          AND response = 'pending'
          AND is_fallback_offer = true
      `;
      const stillPending = parseInt(pendingOffers[0]?.cnt || '0');

      if (stillPending === 0) {
        // No more pending offers — trigger next round
        // Re-check booking status
        const bookingCheck = await sql`
          SELECT dispatch_status FROM bookings
          WHERE id = ${bookingId}::uuid
            AND dispatch_status = 'offer_pending'
          LIMIT 1
        `;
        if (bookingCheck.length > 0) {
          // Restore to reassignment_needed for next guardrail cycle
          await sql`
            UPDATE bookings
            SET dispatch_status = 'reassignment_needed', updated_at = NOW()
            WHERE id = ${bookingId}::uuid
              AND dispatch_status = 'offer_pending'
          `;
        }
      }

      return NextResponse.json({
        ok: true,
        action: 'declined',
        booking_id: bookingId,
        driver_code,
        still_pending_offers: stillPending,
        case: offer.fallback_case_level,
      });
    }
  } catch (err: any) {
    console.error('[respond-fallback-offer] error:', err?.message);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
