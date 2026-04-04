export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// GET /api/driver/offer-history?driver_code=XXX
//
// BM10 MASTER BLOCK — Driver Offer History Endpoint
//
// Returns the full offer history for a driver, including:
//   - offer_received: booking reached this driver
//   - offer_expired:  driver did not accept in time
//   - offer_declined: driver explicitly declined
//   - offer_accepted: driver accepted the booking
//
// This is required for:
//   - Driver transparency (see expired opportunities)
//   - Analytics and performance metrics
//   - Future payout attribution logic
//   - Fair attribution records
//
// PART 9 of MASTER BLOCK spec.
// ============================================================

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const driverCode = searchParams.get("driver_code");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  if (!driverCode) {
    return NextResponse.json({ error: "driver_code required" }, { status: 400 });
  }

  try {
    // Resolve driver_id from driver_code
    const driverRows = await sql`
      SELECT id::text, driver_code, full_name
      FROM drivers
      WHERE driver_code = ${driverCode}
        AND driver_status IN ('active', 'provisional')
      LIMIT 1
    `;

    if (driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driver = driverRows[0];

    // Fetch offer history with booking context
    const historyRows = await sql`
      SELECT
        doh.id::text                AS history_id,
        doh.booking_id::text        AS booking_id,
        doh.round_number,
        doh.offer_status,
        doh.sent_at,
        doh.expired_at,
        doh.responded_at,
        doh.notes,
        doh.created_at,
        -- Booking context
        b.pickup_address,
        b.dropoff_address,
        b.pickup_zone,
        b.dropoff_zone,
        b.pickup_at,
        b.vehicle_type,
        b.service_type,
        b.total_price,
        b.currency,
        b.status                    AS booking_status,
        b.dispatch_state,
        -- Client context (anonymized)
        c.full_name                 AS client_name
      FROM driver_offer_history doh
      JOIN bookings b  ON b.id  = doh.booking_id
      LEFT JOIN clients c ON c.id = b.client_id
      WHERE doh.driver_id = ${driver.id}::uuid
      ORDER BY doh.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Aggregate metrics
    const metricsRows = await sql`
      SELECT
        COUNT(*)                                                        AS total_offers,
        COUNT(*) FILTER (WHERE offer_status = 'offer_accepted')        AS accepted_count,
        COUNT(*) FILTER (WHERE offer_status = 'offer_expired')         AS expired_count,
        COUNT(*) FILTER (WHERE offer_status = 'offer_declined')        AS declined_count,
        COUNT(*) FILTER (WHERE offer_status = 'offer_received')        AS received_count,
        ROUND(
          COUNT(*) FILTER (WHERE offer_status = 'offer_accepted')::numeric
          / NULLIF(COUNT(*) FILTER (WHERE offer_status IN ('offer_accepted','offer_expired','offer_declined')), 0)
          * 100, 1
        )                                                               AS acceptance_rate_pct,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS offers_last_30_days,
        COUNT(*) FILTER (WHERE offer_status = 'offer_expired'
                           AND created_at > NOW() - INTERVAL '30 days') AS expired_last_30_days
      FROM driver_offer_history
      WHERE driver_id = ${driver.id}::uuid
    `;

    const metrics = metricsRows[0] ?? {};

    return NextResponse.json({
      ok: true,
      driver: {
        id:          driver.id,
        driver_code: driver.driver_code,
        full_name:   driver.full_name,
      },
      metrics: {
        total_offers:         parseInt(metrics.total_offers ?? "0"),
        accepted_count:       parseInt(metrics.accepted_count ?? "0"),
        expired_count:        parseInt(metrics.expired_count ?? "0"),
        declined_count:       parseInt(metrics.declined_count ?? "0"),
        received_count:       parseInt(metrics.received_count ?? "0"),
        acceptance_rate_pct:  parseFloat(metrics.acceptance_rate_pct ?? "0"),
        offers_last_30_days:  parseInt(metrics.offers_last_30_days ?? "0"),
        expired_last_30_days: parseInt(metrics.expired_last_30_days ?? "0"),
      },
      history: historyRows,
      pagination: {
        limit,
        offset,
        returned: historyRows.length,
      },
    });

  } catch (err: any) {
    console.error("[driver/offer-history] error:", err?.message);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
