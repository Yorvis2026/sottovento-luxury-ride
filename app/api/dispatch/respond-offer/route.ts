export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { calculateCommissions } from "@/lib/dispatch/engine";
import { lockCommission } from "@/lib/dispatch/commission-engine";
import { db } from "@/lib/dispatch/db";
import { neon } from "@neondatabase/serverless";
import type { RespondOfferRequest, RespondOfferResponse } from "@/lib/dispatch/types";

// ============================================================
// POST /api/dispatch/respond-offer
//
// Called when a driver accepts or declines a dispatch offer.
//
// IMPORTANT: dispatch_offers table uses column "response" (not "status")
// Values: 'pending' | 'accepted' | 'declined' | 'timeout'
//
// Flow (ACCEPT):
// 1. Validate offer is active and not expired
// 2. Mark offer as accepted
// 3. Assign driver to booking
// 4. Confirm commission split
// 5. Update booking status to "accepted"
//
// Flow (DECLINE / TIMEOUT):
// 1. Mark offer as declined/timeout
// 2. Preserve source_driver_id for commission
// 3. Dispatch to network fallback (round 2+)
// ============================================================

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();

    if ((!body.offer_id && !body.booking_id) || !body.driver_id || !body.response) {
      return NextResponse.json(
        { error: "Missing required fields: (offer_id or booking_id), driver_id, response" },
        { status: 400 }
      );
    }

    if (!["accepted", "declined"].includes(body.response)) {
      return NextResponse.json(
        { error: "response must be 'accepted' or 'declined'" },
        { status: 400 }
      );
    }

    // ---- Load offer ----
    let offer: any = null;
    let offerMissing = false; // true when no dispatch_offer row exists but booking is still valid

    if (body.offer_id) {
      const offerRows = await sql`
        SELECT * FROM dispatch_offers WHERE id = ${body.offer_id} LIMIT 1
      `;
      offer = offerRows[0] ?? null;
    } else if (body.booking_id) {
      // For direct assignments (offer_pending), find the latest offer for this booking/driver.
      // CRITICAL FIX: include 'timeout' response — if the 15-min window expired but the driver
      // taps Accept before the system processes the timeout, the offer row may already be 'timeout'.
      // We allow acceptance of recently-timed-out offers to prevent the offer screen from looping.
      // NOTE: dispatch_offers uses column "response" (not "status")
      const offerRows = await sql`
        SELECT * FROM dispatch_offers 
        WHERE booking_id = ${body.booking_id}::uuid
          AND driver_id = ${body.driver_id}::uuid
          AND response IN ('pending', 'timeout')
        ORDER BY created_at DESC LIMIT 1
      `;
      offer = offerRows[0] ?? null;

      // Fallback: if no dispatch_offer row exists at all, check if booking is still
      // in offer_pending state and assigned to this driver — allow direct acceptance.
      if (!offer && body.response === "accepted") {
        const bookingCheck = await sql`
          SELECT id, status, dispatch_status, assigned_driver_id
          FROM bookings
          WHERE id = ${body.booking_id}::uuid
            AND assigned_driver_id = ${body.driver_id}::uuid
            AND dispatch_status IN ('offer_pending', 'assigned')
            AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
          LIMIT 1
        `;
        if (bookingCheck[0]) {
          // Booking is valid and assigned to this driver — proceed without offer row
          offerMissing = true;
          offer = { id: null, booking_id: body.booking_id, driver_id: body.driver_id,
                    response: 'pending', offer_round: 1, is_source_offer: true,
                    expires_at: new Date(Date.now() + 60000).toISOString() };
          console.log('[respond-offer] no dispatch_offer row found — using booking-level fallback for', body.booking_id);
        }
      }
    }

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    if (offer.driver_id !== body.driver_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    // Allow 'timeout' response for acceptance (driver tapped Accept during/after expiry window)
    if (offer.response !== "pending" && offer.response !== "timeout" && !offerMissing) {
      return NextResponse.json(
        { error: "Offer already responded to", current_status: offer.response },
        { status: 409 }
      );
    }

    // Check if offer expired
    const now = new Date();
    const expiresAt = new Date(offer.expires_at);
    // CRITICAL FIX: Do NOT block acceptance on expiry when using booking_id lookup.
    // If the driver taps Accept after the 15-min window, we still allow it
    // (the offer row may be 'timeout' or the window just passed).
    // Only block if using offer_id (broadcast flow) and strictly expired.
    if (body.offer_id && now > expiresAt && body.response === "accepted" && !offerMissing) {
      if (offer.id) {
        await sql`
          UPDATE dispatch_offers
          SET response = 'timeout', responded_at = NOW()
          WHERE id = ${offer.id}
        `;
      }
      await dispatchToNetwork(offer.booking_id, offer.offer_round + 1);
      return NextResponse.json(
        { error: "Offer has expired. Booking dispatched to network." },
        { status: 410 }
      );
    }

    // ---- Load booking ----
    const booking = await db.bookings.findById(offer.booking_id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const respondedAt = now.toISOString();

    if (body.response === "accepted") {
      // ---- ACCEPT ----
      // Section 2: offer_pending → accepted (driver confirmed the ride)
      // Only update dispatch_offers if the offer row actually exists (id != null)
      // CRITICAL FIX: Always close ALL pending/timeout dispatch_offer rows for this booking.
      // Using WHERE id = offer.id only closes the specific row found, leaving any other
      // pending rows open — those can re-surface as active offers on the next poll.
      // Closing by booking_id ensures no stale offer rows remain after acceptance.
      await sql`
        UPDATE dispatch_offers
        SET response = 'accepted', responded_at = ${respondedAt}::timestamptz
        WHERE booking_id = ${offer.booking_id}::uuid
          AND response IN ('pending', 'timeout')
      `;
      if (offer.id) {
        // Also ensure the specific offer row is marked (covers edge case where booking_id mismatch)
        await sql`
          UPDATE dispatch_offers
          SET response = 'accepted', responded_at = ${respondedAt}::timestamptz
          WHERE id = ${offer.id}
        `;
      }

      await sql`
        UPDATE bookings
        SET
          assigned_driver_id    = ${body.driver_id}::uuid,
          offered_driver_id     = COALESCE(offered_driver_id, ${body.driver_id}::uuid),
          accepted_driver_id    = ${body.driver_id}::uuid,
          executor_driver_id    = ${body.driver_id}::uuid,
          offer_accepted        = true,
          offer_accepted_at     = ${respondedAt}::timestamptz,
          accepted_at           = ${respondedAt}::timestamptz,
          status                = 'accepted',
          dispatch_status       = 'assigned',
          updated_at            = NOW()
        WHERE id = ${booking.id}
      `;

      // ── Commission Engine v1.0 (spec §3): lock on confirmation ──
      // Uses source_driver_id + executor_driver_id (spec §9)
      // Idempotent: if already locked, skips silently (spec §12)
      const commissionResult = await lockCommission({
        booking_id:        booking.id,
        total_price:       booking.total_price,
        source_driver_id:  booking.source_driver_id ?? null,
        executor_driver_id: body.driver_id,
      });

      await db.auditLogs.create({
        entity_type: "booking",
        entity_id: booking.id,
        action: "offer_accepted",
        actor_type: "driver",
        actor_id: body.driver_id,
        new_data: {
          assigned_driver_id: body.driver_id,
          is_source_driver: offer.is_source_offer,
          commission_model: commissionResult.commission_model,
          commission_locked: commissionResult.locked,
          platform_pct: commissionResult.platform_pct,
          source_pct: commissionResult.source_pct,
          executor_pct: commissionResult.executor_pct,
        },
      });

      // ── Availability Engine: driver is now busy ──────────────────────
      // Set availability_status = 'busy' so no new dispatch offers are sent
      // while this driver is executing an active ride.
      try {
        await sql`
          UPDATE drivers
          SET availability_status = 'busy', updated_at = NOW()
          WHERE id = ${body.driver_id}::uuid
        `;
      } catch { /* non-blocking — column may not exist yet on first deploy */ }

      const response: RespondOfferResponse = {
        booking_id: booking.id,
        assigned_driver_id: body.driver_id,
        fallback_dispatched: false,
        message: "Offer accepted. You are assigned to this booking.",
      };
      return NextResponse.json(response);
    } else {
      // ---- DECLINE / REJECT (spec §5) ----
      // Release to network pool:
      // - Clear assigned_driver_id so no driver is locked to this booking
      // - Set dispatch_status = 'network_pool_pending' (spec value)
      // - Do NOT touch offered_driver_id / source_driver_id / attribution fields
      await sql`
        UPDATE dispatch_offers
        SET response = 'declined', responded_at = ${respondedAt}::timestamptz
        WHERE booking_id = ${booking.id}::uuid
          AND response IN ('pending', 'timeout')
      `;
      await sql`
        UPDATE bookings
        SET
          status             = 'ready_for_dispatch',
          assigned_driver_id = NULL,
          dispatch_status    = 'reassignment_needed',
          updated_at         = NOW()
        WHERE id = ${booking.id}
      `;

      // Dispatch to network (next round) — exclude the driver who just declined
      await dispatchToNetwork(booking.id, offer.offer_round + 1, body.driver_id);

      await db.auditLogs.create({
        entity_type: "booking",
        entity_id: booking.id,
        action: "offer_declined",
        actor_type: "driver",
        actor_id: body.driver_id,
        new_data: {
          declined_by: body.driver_id,
          is_source_offer: offer.is_source_offer,
          fallback_round: offer.offer_round + 1,
        },
      });

      const response: RespondOfferResponse = {
        booking_id: booking.id,
        assigned_driver_id: null,
        fallback_dispatched: true,
        message: "Offer declined. Booking dispatched to network drivers.",
      };
      return NextResponse.json(response);
    }
  } catch (err: any) {
    console.error("[dispatch/respond-offer]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/dispatch/respond-offer
// Called by a scheduled job when offer window expires
// ============================================================
export async function PUT(req: NextRequest) {
  try {
    const { offer_id } = await req.json();
    if (!offer_id) {
      return NextResponse.json({ error: "offer_id required" }, { status: 400 });
    }

    const offerRows = await sql`
      SELECT * FROM dispatch_offers WHERE id = ${offer_id} LIMIT 1
    `;
    const offer = offerRows[0] ?? null;

    if (!offer || offer.response !== "pending") {
      return NextResponse.json({ message: "Offer already resolved" });
    }

    await sql`
      UPDATE dispatch_offers
      SET response = 'timeout', responded_at = NOW()
      WHERE id = ${offer_id}
    `;

    // SLN: 15-min window expired — release booking to network pool.
    // FIX: Reset status to 'ready_for_dispatch' and set dispatch_status to 'reassignment_needed'
    // to ensure the booking returns to the pool and triggers the fallback engine.
    await sql`
      UPDATE bookings
      SET
        status = 'ready_for_dispatch',
        dispatch_status = 'reassignment_needed',
        assigned_driver_id = NULL,
        updated_at = NOW()
      WHERE id = ${offer.booking_id}::uuid
        AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip')
    `;

    await dispatchToNetwork(offer.booking_id, offer.offer_round + 1);

    return NextResponse.json({
      message: "Offer timed out. Dispatched to network.",
      booking_id: offer.booking_id,
    });
  } catch (err: any) {
    console.error("[dispatch/timeout-offer]", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// ============================================================
// Helpers
// ============================================================

async function dispatchToNetwork(
  bookingId: string,
  round: number,
  excludeDriverId?: string
): Promise<void> {
  // ── BM10: Targeted next-driver dispatch ───────────────────
  // 1. Collect all declined/timeout driver IDs for this booking
  // 2. Select next eligible driver using BM5 priority ordering
  // 3. Create a new dispatch_offer row
  // 4. Update booking.dispatch_status = 'offer_pending'
  //    SAFETY: Does NOT change booking.status
  // If no eligible driver found → release to manual pool
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
      console.log(`[dispatch] booking not found or terminal state — ${bookingId}`);
      return;
    }

    // Collect all drivers who already declined or timed out for this booking
    const declinedRows = await sql`
      SELECT DISTINCT driver_id::text FROM dispatch_offers
      WHERE booking_id = ${bookingId}::uuid
        AND response IN ('declined', 'timeout')
    `;
    const declinedIds = declinedRows.map((r: any) => r.driver_id as string);
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
      console.log(`[dispatch] no_eligible_drivers — Booking ${bookingId} — released to manual pool`);
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

    console.log(`[dispatch] bm10_next_offer — Booking ${bookingId} — Round ${round} — Driver ${nextDriver.driver_code}`);
  } catch (err: any) {
    console.error(`[dispatch] dispatchToNetwork error — Booking ${bookingId}:`, err?.message);
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
