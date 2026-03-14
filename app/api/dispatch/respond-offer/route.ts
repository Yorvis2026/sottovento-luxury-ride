import { NextRequest, NextResponse } from "next/server";
import { calculateCommissions } from "@/lib/dispatch/engine";
import type { RespondOfferRequest, RespondOfferResponse } from "@/lib/dispatch/types";

// ============================================================
// POST /api/dispatch/respond-offer
//
// Called when a driver accepts or declines a dispatch offer.
//
// Flow (ACCEPT):
// 1. Validate offer is active and not expired
// 2. Mark offer as accepted
// 3. Assign driver to booking
// 4. Confirm commission split
// 5. Update booking status to "assigned"
//
// Flow (DECLINE / TIMEOUT):
// 1. Mark offer as declined/timeout
// 2. Preserve source_driver_id for commission
// 3. Dispatch to network fallback (round 2+)
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body: RespondOfferRequest = await req.json();

    if (!body.offer_id || !body.driver_id || !body.response) {
      return NextResponse.json(
        { error: "Missing required fields: offer_id, driver_id, response" },
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
    const offer = await db.dispatchOffers.findById(body.offer_id);
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    if (offer.driver_id !== body.driver_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (offer.response !== null) {
      return NextResponse.json(
        { error: "Offer already responded to", current_response: offer.response },
        { status: 409 }
      );
    }

    // Check if offer expired
    const now = new Date();
    const expiresAt = new Date(offer.expires_at);
    if (now > expiresAt && body.response === "accepted") {
      // Mark as timed out
      await db.dispatchOffers.update(offer.id, {
        response: "timeout",
        responded_at: now.toISOString(),
      });
      await db.bookings.update(offer.booking_id, {
        offer_timed_out_at: now.toISOString(),
      });
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
      await db.dispatchOffers.update(offer.id, {
        response: "accepted",
        responded_at: respondedAt,
      });

      await db.bookings.update(booking.id, {
        assigned_driver_id: body.driver_id,
        offer_accepted: true,
        offer_accepted_at: respondedAt,
        status: "assigned",
      });

      // Confirm commission split
      const commissions = calculateCommissions(
        booking.total_price,
        booking.source_driver_id !== null
      );

      await db.commissions.updateByBooking(booking.id, {
        executor_driver_id: body.driver_id,
        executor_amount: commissions.executor_amount,
        executor_pct: commissions.executor_pct,
        source_amount: commissions.source_amount,
        source_pct: commissions.source_pct,
        platform_amount: commissions.platform_amount,
        platform_pct: commissions.platform_pct,
        status: "confirmed",
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
          commissions,
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
      // ---- DECLINE ----
      await db.dispatchOffers.update(offer.id, {
        response: "declined",
        responded_at: respondedAt,
      });

      await db.bookings.update(booking.id, {
        offer_declined_at: respondedAt,
        // source_driver_id remains preserved for commission
      });

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
// POST /api/dispatch/timeout-offer
// Called by a scheduled job when offer window expires
// ============================================================
export async function PUT(req: NextRequest) {
  try {
    const { offer_id } = await req.json();
    if (!offer_id) {
      return NextResponse.json({ error: "offer_id required" }, { status: 400 });
    }

    const offer = await db.dispatchOffers.findById(offer_id);
    if (!offer || offer.response !== null) {
      return NextResponse.json({ message: "Offer already resolved" });
    }

    const now = new Date();
    await db.dispatchOffers.update(offer_id, {
      response: "timeout",
      responded_at: now.toISOString(),
    });

    await db.bookings.update(offer.booking_id, {
      offer_timed_out_at: now.toISOString(),
    });

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
// Helpers — replace with real DB adapter
// ============================================================

async function dispatchToNetwork(bookingId: string, round: number): Promise<void> {
  // TODO: Query available active drivers, exclude already-offered drivers,
  // create new dispatch_offers rows, send push notifications
  console.log(`[dispatch] Network fallback — Booking ${bookingId} — Round ${round}`);
}

const db = {
  dispatchOffers: {
    findById: async (id: string) => null as any,
    update: async (id: string, data: any) => {},
  },
  bookings: {
    findById: async (id: string) => null as any,
    update: async (id: string, data: any) => {},
  },
  commissions: {
    updateByBooking: async (bookingId: string, data: any) => {},
  },
  auditLogs: {
    create: async (data: any) => {},
  },
};
