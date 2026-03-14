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

const sql = neon(process.env.DATABASE_URL!);

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
    const offerRows = await sql`
      SELECT * FROM dispatch_offers WHERE id = ${body.offer_id} LIMIT 1
    `;
    const offer = offerRows[0] ?? null;

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    if (offer.driver_id !== body.driver_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (offer.status !== "pending") {
      return NextResponse.json(
        { error: "Offer already responded to", current_status: offer.status },
        { status: 409 }
      );
    }

    // Check if offer expired
    const now = new Date();
    const expiresAt = new Date(offer.expires_at);
    if (now > expiresAt && body.response === "accepted") {
      await sql`
        UPDATE dispatch_offers
        SET status = 'timeout', responded_at = NOW()
        WHERE id = ${offer.id}
      `;
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
      await sql`
        UPDATE dispatch_offers
        SET status = 'accepted', responded_at = ${respondedAt}::timestamptz
        WHERE id = ${offer.id}
      `;

      await sql`
        UPDATE bookings
        SET
          assigned_driver_id = ${body.driver_id}::uuid,
          offer_accepted = true,
          offer_accepted_at = ${respondedAt}::timestamptz,
          status = 'assigned',
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
      // ---- DECLINE ----
      await sql`
        UPDATE dispatch_offers
        SET status = 'declined', responded_at = ${respondedAt}::timestamptz
        WHERE id = ${offer.id}
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

    if (!offer || offer.status !== "pending") {
      return NextResponse.json({ message: "Offer already resolved" });
    }

    await sql`
      UPDATE dispatch_offers
      SET status = 'timeout', responded_at = NOW()
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
  // TODO: Query available active drivers, exclude already-offered drivers,
  // create new dispatch_offers rows, send push notifications
  console.log(`[dispatch] Network fallback — Booking ${bookingId} — Round ${round}`);
}
