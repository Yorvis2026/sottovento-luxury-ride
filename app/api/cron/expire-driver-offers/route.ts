export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/cron/expire-driver-offers
//
// BM10 MASTER BLOCK — Post-Timeout Dispatch Lifecycle Engine
//
// SEQUENCE (per MASTER BLOCK spec):
//
//   STEP 1: Mark dispatch_offer.status = EXPIRED (response = 'timeout')
//   STEP 2: Write driver_offer_history event (offer_received + offer_expired)
//   STEP 3: Release driver lock — clear assigned_driver_id
//   STEP 4: Increment dispatch_round
//   STEP 5: Advance dispatch_state:
//             ROUND_1_CAPTOR_PRIORITY  → ROUND_2_PREMIUM_PRIORITY
//             ROUND_2_PREMIUM_PRIORITY → ROUND_3_POOL_OPEN
//             ROUND_3_POOL_OPEN        → ADMIN_ATTENTION_REQUIRED
//   STEP 6: Select next eligible driver for new round
//   STEP 7: Create new dispatch_offer (or escalate to ADMIN_ATTENTION_REQUIRED)
//
// SAFETY RULES:
//   - Does NOT change booking.status
//   - Does NOT override captured_by_driver_id or source_driver_id
//   - Does NOT modify the scoring engine
//   - Does NOT modify Stripe, WhatsApp, Google Maps
//   - Idempotent: second run finds 0 expired pending offers
// ============================================================

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// Offer window per round (minutes)
const OFFER_WINDOW: Record<number, number> = {
  1: 30,  // ROUND_1: captor priority — 30 min
  2: 20,  // ROUND_2: premium network — 20 min
  3: 15,  // ROUND_3: open pool — 15 min
};
const DEFAULT_OFFER_WINDOW = 20;

// dispatch_state progression map
const NEXT_DISPATCH_STATE: Record<string, string> = {
  "ROUND_1_CAPTOR_PRIORITY":  "ROUND_2_PREMIUM_PRIORITY",
  "ROUND_2_PREMIUM_PRIORITY": "ROUND_3_POOL_OPEN",
  "ROUND_3_POOL_OPEN":        "ADMIN_ATTENTION_REQUIRED",
  "NEW":                      "ROUND_2_PREMIUM_PRIORITY",
  // Any other state → escalate to admin
};

// Round number for each dispatch_state
const ROUND_FOR_STATE: Record<string, number> = {
  "ROUND_1_CAPTOR_PRIORITY":  1,
  "ROUND_2_PREMIUM_PRIORITY": 2,
  "ROUND_3_POOL_OPEN":        3,
  "ADMIN_ATTENTION_REQUIRED": 3,
  "NEW":                      1,
};

// ── writeDriverOfferHistory ──────────────────────────────────
// STEP 2: Write driver history events for transparency, analytics
// and future payout attribution.
async function writeDriverOfferHistory(
  bookingId: string,
  driverId: string,
  driverCode: string | null,
  roundNumber: number,
  offerStatus: "offer_received" | "offer_expired" | "offer_declined" | "offer_accepted",
  sentAt: string | null,
  expiredAt: string | null
): Promise<void> {
  try {
    await sql`
      INSERT INTO driver_offer_history (
        booking_id, driver_id, driver_code,
        round_number, offer_status,
        sent_at, expired_at, responded_at,
        notes, created_at
      ) VALUES (
        ${bookingId}::uuid,
        ${driverId}::uuid,
        ${driverCode},
        ${roundNumber},
        ${offerStatus},
        ${sentAt ? `${sentAt}` : null}::timestamptz,
        ${expiredAt ? `${expiredAt}` : null}::timestamptz,
        ${offerStatus === "offer_expired" ? "NOW()" : null}::timestamptz,
        ${"Booking reached this driver in round " + roundNumber + " and " + (offerStatus === "offer_expired" ? "expired without acceptance." : offerStatus + ".")},
        NOW()
      )
      ON CONFLICT DO NOTHING
    `;
  } catch (e: any) {
    console.warn(`[bm10] writeDriverOfferHistory warn — booking ${bookingId}:`, e?.message);
  }
}

// ── selectNextEligibleDriver ─────────────────────────────────
// STEP 6: Select next driver based on round and BM5 priority.
//
// ROUND_2 (PREMIUM): SOTTOVENTO_LEGAL_FLEET + PARTNER_LEGAL_FLEET only
// ROUND_3 (POOL):    All active eligible drivers
//
// Excludes all drivers who already declined or timed out.
async function selectNextEligibleDriver(
  bookingId: string,
  previousDriverId: string | null,
  nextState: string
): Promise<{ id: string; driver_code: string; full_name: string; legal_affiliation_type: string } | null> {
  try {
    // Collect all drivers who already declined or timed out for this booking
    const declinedRows = await sql`
      SELECT DISTINCT driver_id::text
      FROM dispatch_offers
      WHERE booking_id = ${bookingId}::uuid
        AND response IN ('declined', 'timeout')
    `;
    const declinedIds: string[] = declinedRows.map((r: any) => r.driver_id as string);
    if (previousDriverId && !declinedIds.includes(previousDriverId)) {
      declinedIds.push(previousDriverId);
    }
    const excludeList = declinedIds.length > 0
      ? declinedIds
      : ["00000000-0000-0000-0000-000000000000"];

    // ROUND_2: premium tier only (SOTTOVENTO_LEGAL_FLEET + PARTNER_LEGAL_FLEET)
    if (nextState === "ROUND_2_PREMIUM_PRIORITY") {
      const candidates = await sql`
        SELECT
          d.id::text,
          d.driver_code,
          d.full_name,
          COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER') AS legal_affiliation_type,
          COALESCE(d.reliability_score, 65)::numeric AS reliability_score
        FROM drivers d
        WHERE d.driver_status = 'active'
          AND d.is_eligible = true
          AND (d.license_expires_at IS NULL OR d.license_expires_at > NOW())
          AND (d.insurance_expires_at IS NULL OR d.insurance_expires_at > NOW())
          AND COALESCE(d.availability_status, 'available') = 'available'
          AND COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
              IN ('SOTTOVENTO_LEGAL_FLEET', 'PARTNER_LEGAL_FLEET')
          AND d.id NOT IN (SELECT unnest(${excludeList}::uuid[]))
        ORDER BY
          CASE COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
            WHEN 'SOTTOVENTO_LEGAL_FLEET' THEN 1
            WHEN 'PARTNER_LEGAL_FLEET'    THEN 2
            ELSE 3
          END ASC,
          COALESCE(d.reliability_score, 65) DESC,
          d.created_at ASC
        LIMIT 1
      `;
      return candidates.length > 0 ? candidates[0] : null;
    }

    // ROUND_3 / fallback: open pool — all active eligible drivers
    const candidates = await sql`
      SELECT
        d.id::text,
        d.driver_code,
        d.full_name,
        COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER') AS legal_affiliation_type,
        COALESCE(d.reliability_score, 65)::numeric AS reliability_score
      FROM drivers d
      WHERE d.driver_status = 'active'
        AND d.is_eligible = true
        AND (d.license_expires_at IS NULL OR d.license_expires_at > NOW())
        AND (d.insurance_expires_at IS NULL OR d.insurance_expires_at > NOW())
        AND COALESCE(d.availability_status, 'available') = 'available'
        AND d.id NOT IN (SELECT unnest(${excludeList}::uuid[]))
      ORDER BY
        CASE COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
          WHEN 'SOTTOVENTO_LEGAL_FLEET' THEN 1
          WHEN 'PARTNER_LEGAL_FLEET'    THEN 2
          ELSE 3
        END ASC,
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
// STEP 7: Insert new dispatch_offer for next driver.
async function createDispatchOffer(
  bookingId: string,
  driverId: string,
  round: number,
  windowMinutes: number
): Promise<string | null> {
  try {
    const rows = await sql`
      INSERT INTO dispatch_offers (
        booking_id, driver_id,
        response, offer_round, round_number,
        is_source_offer, is_fallback_offer,
        sent_at, expires_at, created_at
      ) VALUES (
        ${bookingId}::uuid,
        ${driverId}::uuid,
        'pending',
        ${round},
        ${round},
        false,
        ${round > 1},
        NOW(),
        NOW() + (${windowMinutes} || ' minutes')::interval,
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
async function logAudit(bookingId: string, action: string, data: object): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
      VALUES ('booking', ${bookingId}::uuid, ${action}, 'system', ${JSON.stringify(data)}::jsonb)
    `;
  } catch { /* non-blocking */ }
}

// ── logDispatchEvent ─────────────────────────────────────────
async function logDispatchEvent(
  bookingId: string,
  driverId: string | null,
  eventType: string,
  eventData: object
): Promise<void> {
  try {
    if (driverId) {
      await sql`
        INSERT INTO dispatch_event_log (booking_id, driver_id, event_type, event_data, created_at)
        VALUES (${bookingId}::uuid, ${driverId}::uuid, ${eventType}, ${JSON.stringify(eventData)}::jsonb, NOW())
      `;
    } else {
      await sql`
        INSERT INTO dispatch_event_log (booking_id, driver_id, event_type, event_data, created_at)
        VALUES (${bookingId}::uuid, NULL, ${eventType}, ${JSON.stringify(eventData)}::jsonb, NOW())
      `;
    }
  } catch { /* non-blocking */ }
}

// ── Main handler ─────────────────────────────────────────────
export async function GET(request: Request) {
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
      | "escalated_to_admin"
      | "skipped_already_processed"
      | "skipped_terminal_booking"
      | "error";
    round?: number;
    next_state?: string;
    next_driver_code?: string;
    next_offer_id?: string;
    detail?: string;
  }> = [];

  try {
    // ── Find all expired pending offers ─────────────────────
    const expiredOffers = await sql`
      SELECT
        dof.id::text            AS offer_id,
        dof.booking_id::text    AS booking_id,
        dof.driver_id::text     AS driver_id,
        d.driver_code           AS driver_code,
        dof.offer_round,
        dof.sent_at::text       AS sent_at,
        dof.expires_at::text    AS expires_at,
        b.status                AS booking_status,
        b.dispatch_status,
        COALESCE(b.dispatch_state, 'NEW') AS dispatch_state,
        COALESCE(b.dispatch_round, 1)     AS dispatch_round,
        b.assigned_driver_id::text        AS assigned_driver_id
      FROM dispatch_offers dof
      JOIN bookings b ON b.id = dof.booking_id
      LEFT JOIN drivers d ON d.id = dof.driver_id
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

    for (const offer of expiredOffers) {
      try {
        // ── Guard: skip terminal bookings ──────────────────
        const TERMINAL_STATUSES = [
          "completed", "cancelled", "archived", "no_show",
          "accepted", "en_route", "arrived", "in_trip",
        ];
        if (TERMINAL_STATUSES.includes(offer.booking_status)) {
          results.push({
            offer_id: offer.offer_id,
            booking_id: offer.booking_id,
            status: "skipped_terminal_booking",
            detail: `booking.status = '${offer.booking_status}'`,
          });
          continue;
        }

        // ── STEP 1: Mark offer as EXPIRED (idempotent) ─────
        await sql`
          UPDATE dispatch_offers
          SET response = 'timeout', responded_at = NOW()
          WHERE id = ${offer.offer_id}
            AND response = 'pending'
        `;

        // Concurrent-run guard
        const recheckRows = await sql`
          SELECT response FROM dispatch_offers WHERE id = ${offer.offer_id} LIMIT 1
        `;
        if (recheckRows[0]?.response !== "timeout") {
          results.push({
            offer_id: offer.offer_id,
            booking_id: offer.booking_id,
            status: "skipped_already_processed",
            detail: `offer already '${recheckRows[0]?.response}'`,
          });
          continue;
        }

        // ── STEP 2: Write driver_offer_history ─────────────
        const expiredDriverId = offer.driver_id ?? offer.assigned_driver_id;
        const currentRound = offer.offer_round ?? ROUND_FOR_STATE[offer.dispatch_state] ?? 1;

        if (expiredDriverId) {
          // Write both events: offer_received (historical) + offer_expired (current)
          await writeDriverOfferHistory(
            offer.booking_id,
            expiredDriverId,
            offer.driver_code,
            currentRound,
            "offer_expired",
            offer.sent_at,
            new Date().toISOString()
          );
        }

        // ── STEP 3: Release driver lock ────────────────────
        // Clear assigned_driver_id. NEVER changes booking.status.
        await sql`
          UPDATE bookings
          SET
            assigned_driver_id    = NULL,
            last_expired_driver_id = ${expiredDriverId ?? null}::uuid,
            updated_at             = NOW()
          WHERE id = ${offer.booking_id}::uuid
            AND status NOT IN (
              'completed', 'cancelled', 'archived', 'no_show',
              'accepted', 'en_route', 'arrived', 'in_trip'
            )
        `;

        // ── STEP 4 + 5: Increment round, advance dispatch_state ──
        const nextState = NEXT_DISPATCH_STATE[offer.dispatch_state] ?? "ADMIN_ATTENTION_REQUIRED";
        const nextRound = currentRound + 1;

        // If next state is ADMIN_ATTENTION_REQUIRED → escalate immediately
        if (nextState === "ADMIN_ATTENTION_REQUIRED") {
          await sql`
            UPDATE bookings
            SET
              dispatch_state           = 'ADMIN_ATTENTION_REQUIRED',
              dispatch_status          = 'manual_dispatch_required',
              dispatch_round           = ${nextRound},
              manual_dispatch_required = TRUE,
              assigned_driver_id       = NULL,
              updated_at               = NOW()
            WHERE id = ${offer.booking_id}::uuid
              AND status NOT IN (
                'completed', 'cancelled', 'archived', 'no_show',
                'accepted', 'en_route', 'arrived', 'in_trip'
              )
          `;

          await logAudit(offer.booking_id, "bm10_escalated_admin_attention", {
            previous_driver_id: expiredDriverId,
            previous_state:     offer.dispatch_state,
            next_state:         "ADMIN_ATTENTION_REQUIRED",
            round:              nextRound,
            timestamp:          new Date().toISOString(),
          });

          await logDispatchEvent(offer.booking_id, null, "dispatch_escalated_admin", {
            trigger:        "offer_timeout",
            previous_state: offer.dispatch_state,
            next_state:     "ADMIN_ATTENTION_REQUIRED",
            round:          nextRound,
          });

          console.log(`[bm10-expire] ⚠ escalated_to_admin — booking ${offer.booking_id} (${offer.dispatch_state} → ADMIN_ATTENTION_REQUIRED)`);
          results.push({
            offer_id:   offer.offer_id,
            booking_id: offer.booking_id,
            status:     "escalated_to_admin",
            round:      nextRound,
            next_state: "ADMIN_ATTENTION_REQUIRED",
            detail:     `No more rounds available — manual dispatch required`,
          });
          continue;
        }

        // ── STEP 6: Select next eligible driver ────────────
        const nextDriver = await selectNextEligibleDriver(
          offer.booking_id,
          expiredDriverId,
          nextState
        );

        if (!nextDriver) {
          // No driver in this round → try escalating to next round immediately
          const fallbackState = NEXT_DISPATCH_STATE[nextState] ?? "ADMIN_ATTENTION_REQUIRED";
          const isAdminFallback = fallbackState === "ADMIN_ATTENTION_REQUIRED";

          await sql`
            UPDATE bookings
            SET
              dispatch_state           = ${isAdminFallback ? "ADMIN_ATTENTION_REQUIRED" : fallbackState},
              dispatch_status          = ${isAdminFallback ? "manual_dispatch_required" : "reassignment_needed"},
              dispatch_round           = ${nextRound},
              manual_dispatch_required = ${isAdminFallback},
              assigned_driver_id       = NULL,
              updated_at               = NOW()
            WHERE id = ${offer.booking_id}::uuid
              AND status NOT IN (
                'completed', 'cancelled', 'archived', 'no_show',
                'accepted', 'en_route', 'arrived', 'in_trip'
              )
          `;

          await logAudit(offer.booking_id, "bm10_no_drivers_in_round", {
            previous_driver_id: expiredDriverId,
            attempted_state:    nextState,
            escalated_to:       fallbackState,
            round:              nextRound,
            timestamp:          new Date().toISOString(),
          });

          await logDispatchEvent(offer.booking_id, null, "dispatch_no_drivers_in_round", {
            trigger:        "offer_timeout",
            attempted_state: nextState,
            escalated_to:   fallbackState,
            round:          nextRound,
          });

          console.log(`[bm10-expire] no_drivers in ${nextState} — booking ${offer.booking_id} → ${fallbackState}`);
          results.push({
            offer_id:   offer.offer_id,
            booking_id: offer.booking_id,
            status:     isAdminFallback ? "escalated_to_admin" : "next_offer_created",
            round:      nextRound,
            next_state: fallbackState,
            detail:     `No drivers in ${nextState} — escalated to ${fallbackState}`,
          });
          continue;
        }

        // ── STEP 7: Create new dispatch_offer ──────────────
        const windowMinutes = OFFER_WINDOW[nextRound] ?? DEFAULT_OFFER_WINDOW;
        const newOfferId = await createDispatchOffer(
          offer.booking_id,
          nextDriver.id,
          nextRound,
          windowMinutes
        );

        if (!newOfferId) {
          await sql`
            UPDATE bookings
            SET
              dispatch_state           = 'ADMIN_ATTENTION_REQUIRED',
              dispatch_status          = 'manual_dispatch_required',
              manual_dispatch_required = TRUE,
              assigned_driver_id       = NULL,
              updated_at               = NOW()
            WHERE id = ${offer.booking_id}::uuid
          `;
          results.push({
            offer_id:   offer.offer_id,
            booking_id: offer.booking_id,
            status:     "error",
            detail:     `Failed to create dispatch_offer for driver ${nextDriver.driver_code}`,
          });
          continue;
        }

        // ── Update booking to new round state ──────────────
        // SAFETY: Does NOT change booking.status
        await sql`
          UPDATE bookings
          SET
            dispatch_state    = ${nextState},
            dispatch_status   = 'offer_pending',
            dispatch_round    = ${nextRound},
            assigned_driver_id = NULL,
            offer_expires_at  = NOW() + (${windowMinutes} || ' minutes')::interval,
            updated_at        = NOW()
          WHERE id = ${offer.booking_id}::uuid
            AND status NOT IN (
              'completed', 'cancelled', 'archived', 'no_show',
              'accepted', 'en_route', 'arrived', 'in_trip'
            )
        `;

        // Write driver_offer_history for the new driver (offer_received)
        await writeDriverOfferHistory(
          offer.booking_id,
          nextDriver.id,
          nextDriver.driver_code,
          nextRound,
          "offer_received",
          new Date().toISOString(),
          null
        );

        // Audit + observability
        await logAudit(offer.booking_id, "bm10_next_round_offer_created", {
          previous_driver_id:   expiredDriverId,
          next_driver_id:       nextDriver.id,
          next_driver_code:     nextDriver.driver_code,
          new_offer_id:         newOfferId,
          previous_state:       offer.dispatch_state,
          next_state:           nextState,
          round:                nextRound,
          offer_window_minutes: windowMinutes,
          timestamp:            new Date().toISOString(),
        });

        await logDispatchEvent(offer.booking_id, nextDriver.id, "next_round_offer_sent", {
          trigger:              "offer_timeout",
          previous_driver:      expiredDriverId,
          next_driver_code:     nextDriver.driver_code,
          previous_state:       offer.dispatch_state,
          next_state:           nextState,
          round:                nextRound,
          new_offer_id:         newOfferId,
          expires_in_minutes:   windowMinutes,
        });

        console.log(
          `[bm10-expire] ✓ next_offer_created — booking ${offer.booking_id}` +
          ` — ${offer.dispatch_state} → ${nextState}` +
          ` — Driver ${nextDriver.driver_code} — Round ${nextRound} — Offer ${newOfferId}`
        );

        results.push({
          offer_id:         offer.offer_id,
          booking_id:       offer.booking_id,
          status:           "next_offer_created",
          round:            nextRound,
          next_state:       nextState,
          next_driver_code: nextDriver.driver_code,
          next_offer_id:    newOfferId,
          detail:           `${offer.dispatch_state} → ${nextState} | Driver ${nextDriver.driver_code} | ${windowMinutes}min window`,
        });

      } catch (offerErr: any) {
        console.error(`[bm10-expire] error processing offer ${offer.offer_id}:`, offerErr?.message);
        results.push({
          offer_id:   offer.offer_id,
          booking_id: offer.booking_id,
          status:     "error",
          detail:     offerErr?.message,
        });
      }
    }

    const created   = results.filter(r => r.status === "next_offer_created").length;
    const escalated = results.filter(r => r.status === "escalated_to_admin").length;
    const skipped   = results.filter(r =>
      r.status === "skipped_already_processed" || r.status === "skipped_terminal_booking"
    ).length;
    const errors    = results.filter(r => r.status === "error").length;

    console.log(
      `[bm10-expire] done — created=${created} escalated=${escalated} skipped=${skipped} errors=${errors}`
    );

    return NextResponse.json({
      ok: true,
      started_at: startedAt,
      processed: expiredOffers.length,
      next_offers_created:    created,
      escalated_to_admin:     escalated,
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
