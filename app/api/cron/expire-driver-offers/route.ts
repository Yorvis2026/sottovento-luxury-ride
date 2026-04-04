export const dynamic = "force-dynamic"
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/cron/expire-driver-offers
//
// BM10 FINAL — Dispatch Offer Expiration + Automatic Next-Driver
// Regeneration Engine
//
// PURPOSE:
//   1. Detect all expired pending dispatch_offers
//   2. Mark them as 'timeout'
//   3. Clear assigned_driver_id on the booking
//   4. Immediately select the next eligible driver
//   5. Create a new dispatch_offer for that driver
//   6. Set booking.dispatch_status = 'offer_pending'
//
//   If no eligible driver is found → release to manual pool
//   (dispatch_status = 'pending_dispatch')
//
// RUNS: Every 1 minute via Vercel Cron (see vercel.json)
//
// IDEMPOTENCY GUARANTEE:
//   - Only processes offers WHERE response = 'pending' AND expires_at < NOW()
//   - Each offer is updated with WHERE id = X AND response = 'pending'
//     so concurrent runs cannot double-process the same offer
//   - Booking update uses WHERE status NOT IN (finalized states)
//     so already-accepted/completed bookings are never touched
//   - Running twice in a row: second run finds 0 expired pending offers
//
// CRITICAL SAFETY RULES (BM10):
//   - Does NOT change booking.status (only dispatch_status)
//   - Does NOT override captured_by_driver_id or source_driver_id
//   - Does NOT modify the scoring engine
//   - Does NOT modify cron frequency
// ============================================================

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// Standard offer window for next driver (30 minutes)
const NEXT_OFFER_WINDOW_MINUTES = 30;

// ── selectNextEligibleDriver ─────────────────────────────────
// Finds the highest-priority available driver for a booking,
// excluding all drivers who have already declined or timed out.
//
// Priority order (BM5 spec):
//   1. SOTTOVENTO_LEGAL_FLEET
//   2. PARTNER_LEGAL_FLEET
//   3. GENERAL_NETWORK_DRIVER
//   Within each tier: reliability_score DESC
//
// Safety: never returns a driver already in declined/timeout list.
async function selectNextEligibleDriver(
  bookingId: string,
  previousDriverId: string | null
): Promise<{ id: string; driver_code: string; full_name: string } | null> {
  try {
    // Collect all drivers who already declined or timed out for this booking
    const declinedRows = await sql`
      SELECT DISTINCT driver_id::text
      FROM dispatch_offers
      WHERE booking_id = ${bookingId}::uuid
        AND response IN ('declined', 'timeout')
    `;
    const declinedIds: string[] = declinedRows.map((r: any) => r.driver_id as string);

    // Also exclude the driver who just timed out (in case not yet in dispatch_offers)
    if (previousDriverId && !declinedIds.includes(previousDriverId)) {
      declinedIds.push(previousDriverId);
    }

    // Use a safe placeholder UUID when the exclusion list is empty
    const excludeList = declinedIds.length > 0
      ? declinedIds
      : ['00000000-0000-0000-0000-000000000000'];

    const candidates = await sql`
      SELECT
        d.id::text,
        d.driver_code,
        d.full_name,
        COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER') AS legal_affiliation_type,
        COALESCE(d.reliability_score, 65)::numeric                   AS reliability_score
      FROM drivers d
      WHERE d.driver_status = 'active'
        AND d.is_eligible = true
        AND (d.license_expires_at IS NULL OR d.license_expires_at > NOW())
        AND (d.insurance_expires_at IS NULL OR d.insurance_expires_at > NOW())
        AND COALESCE(d.availability_status, 'available') = 'available'
        AND d.id NOT IN (
          SELECT unnest(${excludeList}::uuid[])
        )
      ORDER BY
        -- BM5: Legal affiliation priority
        CASE COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
          WHEN 'SOTTOVENTO_LEGAL_FLEET' THEN 1
          WHEN 'PARTNER_LEGAL_FLEET'    THEN 2
          ELSE 3
        END ASC,
        -- Within tier: highest reliability score first
        COALESCE(d.reliability_score, 65) DESC,
        d.created_at ASC
      LIMIT 1
    `;

    return candidates.length > 0 ? candidates[0] : null;
  } catch (err: any) {
    console.error(`[bm10] selectNextEligibleDriver error — booking ${bookingId}:`, err?.message);
    return null;
  }
}

// ── createDispatchOffer ──────────────────────────────────────
// Inserts a new dispatch_offer row for the selected driver.
// Returns the new offer ID or null on failure.
async function createDispatchOffer(
  bookingId: string,
  driverId: string,
  round: number
): Promise<string | null> {
  try {
    const expiresAt = new Date(
      Date.now() + NEXT_OFFER_WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    const rows = await sql`
      INSERT INTO dispatch_offers (
        booking_id,
        driver_id,
        response,
        offer_round,
        is_source_offer,
        is_fallback_offer,
        sent_at,
        expires_at,
        created_at
      ) VALUES (
        ${bookingId}::uuid,
        ${driverId}::uuid,
        'pending',
        ${round},
        false,
        true,
        NOW(),
        ${expiresAt}::timestamptz,
        NOW()
      )
      RETURNING id::text
    `;

    return rows[0]?.id ?? null;
  } catch (err: any) {
    console.error(`[bm10] createDispatchOffer error — booking ${bookingId}:`, err?.message);
    return null;
  }
}

// ── logAudit ─────────────────────────────────────────────────
// Non-blocking audit log entry for BM10 lifecycle events.
async function logAudit(
  bookingId: string,
  action: string,
  data: object
): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
      VALUES (
        'booking',
        ${bookingId}::uuid,
        ${action},
        'system',
        ${JSON.stringify(data)}::jsonb
      )
    `;
  } catch { /* non-blocking */ }
}

// ── logDispatchEvent ─────────────────────────────────────────
// Non-blocking dispatch_event_log entry (BM3 observability layer).
async function logDispatchEvent(
  bookingId: string,
  driverId: string | null,
  eventType: string,
  eventData: object
): Promise<void> {
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
  } catch { /* non-blocking */ }
}

// ── Main handler ─────────────────────────────────────────────
export async function GET(request: Request) {
  // Auth: Vercel Cron passes Authorization header with CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results: Array<{
    offer_id: string;
    booking_id: string;
    status:
      | "next_offer_created"
      | "released_to_manual_pool"
      | "skipped_already_processed"
      | "skipped_terminal_booking"
      | "error";
    next_driver_code?: string;
    next_offer_id?: string;
    detail?: string;
  }> = [];

  try {
    // ── Step 1: Find all expired pending offers ──────────────
    const expiredOffers = await sql`
      SELECT
        dof.id::text          AS offer_id,
        dof.booking_id::text  AS booking_id,
        dof.driver_id::text   AS driver_id,
        dof.offer_round,
        dof.response,
        dof.expires_at,
        b.status              AS booking_status,
        b.dispatch_status,
        b.assigned_driver_id::text AS assigned_driver_id
      FROM dispatch_offers dof
      JOIN bookings b ON b.id = dof.booking_id
      WHERE dof.response = 'pending'
        AND dof.expires_at IS NOT NULL
        AND dof.expires_at < NOW()
      ORDER BY dof.expires_at ASC
    `;

    console.log(`[bm10-expire] found ${expiredOffers.length} expired pending offers`);

    if (expiredOffers.length === 0) {
      return NextResponse.json({
        ok: true,
        started_at: startedAt,
        processed: 0,
        results: [],
        message: "No expired pending offers found.",
      });
    }

    // ── Step 2: Process each expired offer ──────────────────
    for (const offer of expiredOffers) {
      console.log(`[bm10-expire] processing booking ${offer.booking_id} offer ${offer.offer_id}`);

      try {
        // ── Guard: skip terminal bookings ──────────────────
        const TERMINAL_STATUSES = [
          'completed', 'cancelled', 'archived', 'no_show',
          'accepted', 'en_route', 'arrived', 'in_trip',
        ];
        if (TERMINAL_STATUSES.includes(offer.booking_status)) {
          console.log(`[bm10-expire] skipped terminal booking ${offer.booking_id} (status=${offer.booking_status})`);
          results.push({
            offer_id: offer.offer_id,
            booking_id: offer.booking_id,
            status: "skipped_terminal_booking",
            detail: `booking.status = '${offer.booking_status}' — no action needed`,
          });
          continue;
        }

        // ── Step 2a: Mark offer as timeout (idempotent) ────
        await sql`
          UPDATE dispatch_offers
          SET response = 'timeout', responded_at = NOW()
          WHERE id = ${offer.offer_id}
            AND response = 'pending'
        `;

        // Verify the update actually applied (concurrent-run guard)
        const recheckRows = await sql`
          SELECT response FROM dispatch_offers WHERE id = ${offer.offer_id} LIMIT 1
        `;
        const currentResponse = recheckRows[0]?.response;

        if (currentResponse !== "timeout") {
          // Driver responded between our SELECT and UPDATE — skip
          console.log(`[bm10-expire] skipped — offer ${offer.offer_id} is now '${currentResponse}'`);
          results.push({
            offer_id: offer.offer_id,
            booking_id: offer.booking_id,
            status: "skipped_already_processed",
            detail: `offer.response = '${currentResponse}' (driver responded before cron ran)`,
          });
          continue;
        }

        console.log(`[bm10-expire] timeout applied — offer ${offer.offer_id}`);

        // ── Step 2b: Clear assigned_driver_id on booking ──
        // SAFETY: Does NOT change booking.status
        await sql`
          UPDATE bookings
          SET
            assigned_driver_id = NULL,
            dispatch_status    = 'reassignment_needed',
            updated_at         = NOW()
          WHERE id = ${offer.booking_id}::uuid
            AND status NOT IN (
              'completed', 'cancelled', 'archived', 'no_show',
              'accepted', 'en_route', 'arrived', 'in_trip'
            )
        `;

        // ── Step 2c: BM10 CORE — Select next eligible driver ──
        const previousDriverId = offer.driver_id ?? offer.assigned_driver_id ?? null;
        const nextDriver = await selectNextEligibleDriver(
          offer.booking_id,
          previousDriverId
        );

        if (!nextDriver) {
          // No eligible drivers available — release to manual pool
          await sql`
            UPDATE bookings
            SET
              dispatch_status    = 'pending_dispatch',
              assigned_driver_id = NULL,
              updated_at         = NOW()
            WHERE id = ${offer.booking_id}::uuid
              AND status NOT IN (
                'completed', 'cancelled', 'archived', 'no_show',
                'accepted', 'en_route', 'arrived', 'in_trip'
              )
          `;

          await logAudit(offer.booking_id, 'bm10_no_drivers_available', {
            previous_driver_id: previousDriverId,
            offer_round: offer.offer_round,
            action: 'released_to_manual_pool',
            timestamp: new Date().toISOString(),
          });

          await logDispatchEvent(offer.booking_id, null, 'fallback_pool_exhausted', {
            trigger: 'offer_timeout',
            previous_driver_id: previousDriverId,
            round: offer.offer_round,
            result: 'no_eligible_drivers',
          });

          console.log(`[bm10-expire] no_drivers — booking ${offer.booking_id} released to manual pool`);
          results.push({
            offer_id: offer.offer_id,
            booking_id: offer.booking_id,
            status: "released_to_manual_pool",
            detail: `No eligible drivers found after round ${offer.offer_round} — released to manual pool`,
          });
          continue;
        }

        // ── Step 2d: Create new dispatch_offer for next driver ──
        const nextRound = (offer.offer_round ?? 1) + 1;
        const newOfferId = await createDispatchOffer(
          offer.booking_id,
          nextDriver.id,
          nextRound
        );

        if (!newOfferId) {
          // Offer creation failed — release to manual pool as fallback
          await sql`
            UPDATE bookings
            SET
              dispatch_status    = 'pending_dispatch',
              assigned_driver_id = NULL,
              updated_at         = NOW()
            WHERE id = ${offer.booking_id}::uuid
          `;
          results.push({
            offer_id: offer.offer_id,
            booking_id: offer.booking_id,
            status: "error",
            detail: `Failed to create dispatch_offer for driver ${nextDriver.driver_code}`,
          });
          continue;
        }

        // ── Step 2e: Update booking to offer_pending for next driver ──
        // SAFETY: Does NOT change booking.status — only dispatch_status
        await sql`
          UPDATE bookings
          SET
            dispatch_status    = 'offer_pending',
            assigned_driver_id = NULL,
            offer_expires_at   = NOW() + INTERVAL '${NEXT_OFFER_WINDOW_MINUTES} minutes',
            updated_at         = NOW()
          WHERE id = ${offer.booking_id}::uuid
            AND status NOT IN (
              'completed', 'cancelled', 'archived', 'no_show',
              'accepted', 'en_route', 'arrived', 'in_trip'
            )
        `;

        // ── Step 2f: Audit + observability logs ──────────────
        await logAudit(offer.booking_id, 'bm10_next_driver_offer_created', {
          previous_driver_id:   previousDriverId,
          next_driver_id:       nextDriver.id,
          next_driver_code:     nextDriver.driver_code,
          new_offer_id:         newOfferId,
          offer_round:          nextRound,
          offer_window_minutes: NEXT_OFFER_WINDOW_MINUTES,
          timestamp:            new Date().toISOString(),
        });

        await logDispatchEvent(offer.booking_id, nextDriver.id, 'fallback_offer_sent', {
          trigger:          'offer_timeout',
          previous_driver:  previousDriverId,
          next_driver_code: nextDriver.driver_code,
          round:            nextRound,
          new_offer_id:     newOfferId,
          expires_in_minutes: NEXT_OFFER_WINDOW_MINUTES,
        });

        console.log(
          `[bm10-expire] ✓ next_offer_created — booking ${offer.booking_id}` +
          ` — Driver ${nextDriver.driver_code} — Round ${nextRound} — Offer ${newOfferId}`
        );

        results.push({
          offer_id:         offer.offer_id,
          booking_id:       offer.booking_id,
          status:           "next_offer_created",
          next_driver_code: nextDriver.driver_code,
          next_offer_id:    newOfferId,
          detail:           `Round ${nextRound} → Driver ${nextDriver.driver_code} (${NEXT_OFFER_WINDOW_MINUTES}min window)`,
        });

      } catch (offerErr: any) {
        console.error(`[bm10-expire] error processing offer ${offer.offer_id}:`, offerErr?.message);
        results.push({
          offer_id:  offer.offer_id,
          booking_id: offer.booking_id,
          status:    "error",
          detail:    offerErr?.message,
        });
      }
    }

    // ── Summary ──────────────────────────────────────────────
    const created  = results.filter(r => r.status === "next_offer_created").length;
    const released = results.filter(r => r.status === "released_to_manual_pool").length;
    const skipped  = results.filter(r => r.status === "skipped_already_processed" || r.status === "skipped_terminal_booking").length;
    const errors   = results.filter(r => r.status === "error").length;

    console.log(
      `[bm10-expire] done — created=${created} released=${released} skipped=${skipped} errors=${errors}`
    );

    return NextResponse.json({
      ok: true,
      started_at: startedAt,
      processed: expiredOffers.length,
      next_offers_created: created,
      released_to_manual_pool: released,
      skipped,
      errors,
      results,
    });

  } catch (err: any) {
    console.error("[bm10-expire] fatal error:", err?.message);
    return NextResponse.json(
      { ok: false, error: err?.message, started_at: startedAt },
      { status: 500 }
    );
  }
}
