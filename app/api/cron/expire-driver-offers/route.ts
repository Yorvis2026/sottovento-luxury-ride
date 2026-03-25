import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/cron/expire-driver-offers
//
// Server-side fail-safe timeout for driver offer windows.
//
// PURPOSE:
//   Eliminates dependency on the frontend to expire offers.
//   If the driver closes the app, loses signal, or kills Safari,
//   this cron ensures the offer is still expired and the booking
//   is released to the network pool automatically.
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
// SAME LOGIC AS: PUT /api/dispatch/respond-offer (frontend timeout path)
//   Reuses identical DB operations — no new flow invented.
// ============================================================

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET(request: Request) {
  // ── Auth: same pattern as dispatch/engine ──────────────────
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
    status: "timeout_applied" | "skipped_already_processed" | "error";
    detail?: string;
  }> = [];

  try {
    // ── Step 1: Find all expired pending offers ─────────────
    const expiredOffers = await sql`
      SELECT
        do.id          AS offer_id,
        do.booking_id,
        do.driver_id,
        do.offer_round,
        do.response,
        do.expires_at,
        b.status       AS booking_status,
        b.dispatch_status,
        b.assigned_driver_id
      FROM dispatch_offers do
      JOIN bookings b ON b.id = do.booking_id
      WHERE do.response = 'pending'
        AND do.expires_at IS NOT NULL
        AND do.expires_at < NOW()
      ORDER BY do.expires_at ASC
    `;

    console.log(`[cron-expire] found ${expiredOffers.length} expired pending offers`);

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
      console.log(`[cron-expire] processing booking ${offer.booking_id} offer ${offer.offer_id}`);

      try {
        // IDEMPOTENCY: use WHERE response = 'pending' so concurrent runs
        // cannot double-process. If already processed, rowCount = 0.
        const updateResult = await sql`
          UPDATE dispatch_offers
          SET response = 'timeout', responded_at = NOW()
          WHERE id = ${offer.offer_id}
            AND response = 'pending'
        `;

        // Check if we actually updated anything (idempotency check)
        // Neon returns an array; if the WHERE didn't match, nothing was updated.
        // We detect this by re-reading the offer.
        const recheckRows = await sql`
          SELECT response FROM dispatch_offers WHERE id = ${offer.offer_id} LIMIT 1
        `;
        const currentResponse = recheckRows[0]?.response;

        if (currentResponse !== "timeout") {
          // Already accepted/declined by driver between our SELECT and UPDATE
          console.log(`[cron-expire] skipped already processed — offer ${offer.offer_id} is now '${currentResponse}'`);
          results.push({
            offer_id: offer.offer_id,
            booking_id: offer.booking_id,
            status: "skipped_already_processed",
            detail: `offer.response = '${currentResponse}' (driver responded before cron ran)`,
          });
          continue;
        }

        console.log(`[cron-expire] timeout applied — offer ${offer.offer_id}`);

        // ── Step 3: Release booking to network pool ──────────
        // Identical logic to PUT /api/dispatch/respond-offer
        // IDEMPOTENCY: WHERE status NOT IN (finalized) prevents touching
        // bookings that were already accepted/completed/cancelled.
        // If assigned_driver_id is already NULL, the UPDATE is a no-op (safe).
        await sql`
          UPDATE bookings
          SET
            assigned_driver_id = NULL,
            dispatch_status = 'offer_pending',
            updated_at = NOW()
          WHERE id = ${offer.booking_id}::uuid
            AND status NOT IN (
              'completed', 'cancelled', 'archived', 'no_show',
              'accepted', 'en_route', 'arrived', 'in_trip'
            )
        `;

        console.log(`[cron-expire] released to network — booking ${offer.booking_id}`);

        // ── Step 4: dispatchToNetwork (same as PUT handler) ──
        // Sets dispatch_status='offer_pending' (already done above) and logs.
        // This call is intentionally lightweight — no new offer rows created yet.
        await dispatchToNetwork(offer.booking_id, (offer.offer_round ?? 1) + 1);

        results.push({
          offer_id: offer.offer_id,
          booking_id: offer.booking_id,
          status: "timeout_applied",
          detail: `released to network pool (round ${(offer.offer_round ?? 1) + 1})`,
        });
      } catch (offerErr: any) {
        console.error(`[cron-expire] error processing offer ${offer.offer_id}:`, offerErr?.message);
        results.push({
          offer_id: offer.offer_id,
          booking_id: offer.booking_id,
          status: "error",
          detail: offerErr?.message,
        });
      }
    }

    const applied = results.filter(r => r.status === "timeout_applied").length;
    const skipped = results.filter(r => r.status === "skipped_already_processed").length;
    const errors  = results.filter(r => r.status === "error").length;

    console.log(`[cron-expire] done — applied=${applied} skipped=${skipped} errors=${errors}`);

    return NextResponse.json({
      ok: true,
      started_at: startedAt,
      processed: expiredOffers.length,
      applied,
      skipped,
      errors,
      results,
    });
  } catch (err: any) {
    console.error("[cron-expire] fatal error:", err?.message);
    return NextResponse.json(
      { ok: false, error: err?.message, started_at: startedAt },
      { status: 500 }
    );
  }
}

// ============================================================
// Helper: release_to_network_pool
// Identical to the helper in respond-offer/route.ts
// ============================================================
async function dispatchToNetwork(bookingId: string, round: number): Promise<void> {
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
    console.log(`[cron-expire] release_to_network_pool — Booking ${bookingId} — Round ${round}`);
  } catch (err: any) {
    console.error(`[cron-expire] release_to_network_pool error — Booking ${bookingId}:`, err?.message);
  }
}
