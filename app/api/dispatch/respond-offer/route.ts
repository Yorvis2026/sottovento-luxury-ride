import { NextRequest, NextResponse } from "next/server";
import { calculateCommissions } from "@/lib/dispatch/engine";
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
      if (offer.id) {
        await sql`
          UPDATE dispatch_offers
          SET response = 'accepted', responded_at = ${respondedAt}::timestamptz
          WHERE id = ${offer.id}
        `;
      } else {
        // offerMissing=true: no dispatch_offer row — mark any pending offers for this booking as accepted
        await sql`
          UPDATE dispatch_offers
          SET response = 'accepted', responded_at = ${respondedAt}::timestamptz
          WHERE booking_id = ${offer.booking_id}::uuid
            AND driver_id = ${body.driver_id}::uuid
            AND response IN ('pending', 'timeout')
        `;
      }

      await sql`
        UPDATE bookings
        SET
          assigned_driver_id = ${body.driver_id}::uuid,
          offer_accepted = true,
          offer_accepted_at = ${respondedAt}::timestamptz,
          status = 'accepted',
          dispatch_status = 'accepted',
          updated_at = NOW()
        WHERE id = ${booking.id}
      `;

      // Confirm commission split
      const commissionCalc = calculateCommissions(
        booking.total_price,
        booking.source_driver_id !== null
      );

      await sql`
        UPDATE commissions
        SET
          executor_driver_id = ${body.driver_id}::uuid,
          executor_amount = ${commissionCalc.executor_amount},
          executor_pct = ${commissionCalc.executor_pct},
          source_amount = ${commissionCalc.source_amount ?? null},
          source_pct = ${commissionCalc.source_pct ?? null},
          platform_amount = ${commissionCalc.platform_amount},
          platform_pct = ${commissionCalc.platform_pct},
          status = 'confirmed'
        WHERE booking_id = ${booking.id}
      `;

      await db.auditLogs.create({
        entity_type: "booking",
        entity_id: booking.id,
        action: "offer_accepted",
        actor_type: "driver",
        actor_id: body.driver_id,
        new_data: {
          assigned_driver_id: body.driver_id,
          is_source_driver: offer.is_source_offer,
          commissions: commissionCalc,
        },
      });

      const response: RespondOfferResponse = {
        booking_id: booking.id,
        assigned_driver_id: body.driver_id,
        fallback_dispatched: false,
        message: "Offer accepted. You are assigned to this booking.",
      };
      return NextResponse.json(response);
    } else {
      // ---- DECLINE / REJECT ----
      // Section 2: Driver rejected the offer.
      // Clear assigned_driver_id and return booking to ready_for_dispatch
      // so admin dispatch pipeline can reassign.
      await sql`
        UPDATE dispatch_offers
        SET response = 'declined', responded_at = ${respondedAt}::timestamptz
        WHERE id = ${offer.id}
      `;

      // Release to network pool:
      // - Clear assigned_driver_id so no driver is locked to this booking
      // - Set dispatch_status = 'offer_pending' so network drivers can see it
      // - status remains 'assigned' to preserve lifecycle integrity
      await sql`
        UPDATE bookings
        SET
          assigned_driver_id = NULL,
          dispatch_status = 'offer_pending',
          updated_at = NOW()
        WHERE id = ${booking.id}
      `;

      // Dispatch to network (next round)
      await dispatchToNetwork(booking.id, offer.offer_round + 1);

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

async function dispatchToNetwork(bookingId: string, round: number): Promise<void> {
  // Release to network pool:
  // Mark booking as available for any active network driver to claim.
  // Clears assigned_driver_id and sets dispatch_status = 'offer_pending'
  // so the booking surfaces in the network driver panel.
  // Future rounds may create new dispatch_offers rows for targeted broadcast.
  try {
    await sql`
      UPDATE bookings
      SET
        assigned_driver_id = NULL,
        dispatch_status = 'offer_pending',
        updated_at = NOW()
      WHERE id = ${bookingId}::uuid
        AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
    `;
    console.log(`[dispatch] release_to_network_pool — Booking ${bookingId} — Round ${round}`);
  } catch (err: any) {
    console.error(`[dispatch] release_to_network_pool error — Booking ${bookingId}:`, err?.message);
  }
}
