export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/driver/push-ack
//
// SLN Push Notification Acknowledgment — SLN-PUSH-ACK-01
//
// Records when a driver opens/taps a push notification from
// the device lockscreen or notification banner.
//
// This endpoint distinguishes between:
//   - push sent   (recorded at send time in audit_logs)
//   - push opened (recorded here when driver taps notification)
//   - push ignored (inferred: sent but no ack within TTL)
//
// Called by: driver-sw.js notificationclick handler
//
// Body:
//   {
//     driver_code:       string,           // required
//     push_type:         string,           // required — e.g. dispatch_offer, eta_risk_alert, pre_trip_90
//     booking_id?:       number | null,    // optional
//     offer_id?:         string | null,    // optional
//     notification_tag?: string | null,    // optional — matches the 'tag' field in push payload
//     acknowledged_at?:  string | null,    // optional ISO timestamp; defaults to NOW()
//     source?:           string            // optional; defaults to 'notificationclick'
//   }
//
// Response:
//   { ok: true, id: number }  or  { error: string }
// ============================================================

// Valid push types — used for input sanitization
const VALID_PUSH_TYPES = new Set([
  "dispatch_offer",
  "eta_risk_alert",
  "pre_trip_90",
  "pre_trip_alert",
  "ride_assigned",
  "ride_cancelled",
  "offer_expired",
  "system",
  "unknown",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      driver_code,
      push_type,
      booking_id,
      offer_id,
      notification_tag,
      acknowledged_at,
      source,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!driver_code || typeof driver_code !== "string") {
      return NextResponse.json(
        { error: "driver_code is required" },
        { status: 400 }
      );
    }

    if (!push_type || typeof push_type !== "string") {
      return NextResponse.json(
        { error: "push_type is required" },
        { status: 400 }
      );
    }

    // Normalize and sanitize push_type
    const normalizedPushType = VALID_PUSH_TYPES.has(push_type)
      ? push_type
      : "unknown";

    const normalizedDriverCode = driver_code.toUpperCase().trim();

    // Normalize optional fields
    const bookingIdNum: number | null =
      booking_id != null && !isNaN(Number(booking_id))
        ? Number(booking_id)
        : null;

    const offerIdStr: string | null =
      offer_id != null && typeof offer_id === "string" && offer_id.trim()
        ? offer_id.trim()
        : null;

    const tagStr: string | null =
      notification_tag != null &&
      typeof notification_tag === "string" &&
      notification_tag.trim()
        ? notification_tag.trim().substring(0, 255) // guard against oversized tags
        : null;

    // acknowledged_at: use provided ISO timestamp or fall back to NOW()
    let ackedAt: Date | null = null;
    if (acknowledged_at) {
      const parsed = new Date(acknowledged_at);
      if (!isNaN(parsed.getTime())) {
        ackedAt = parsed;
      }
    }

    const sourceStr =
      source && typeof source === "string" ? source.trim() : "notificationclick";

    // ── [SLN-PUSH-ACK-01] Auto-migrate table (idempotent) ──────────────────
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS driver_push_acknowledgments (
          id                BIGSERIAL    PRIMARY KEY,
          driver_code       TEXT         NOT NULL,
          booking_id        BIGINT       NULL,
          push_type         TEXT         NOT NULL,
          offer_id          TEXT         NULL,
          notification_tag  TEXT         NULL,
          acknowledged_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
          source            TEXT         NOT NULL DEFAULT 'notificationclick',
          created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
      `;

      // Indexes for efficient querying by driver, booking, and time
      await sql`
        CREATE INDEX IF NOT EXISTS idx_push_ack_driver_code
          ON driver_push_acknowledgments (driver_code)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_push_ack_booking_id
          ON driver_push_acknowledgments (booking_id)
          WHERE booking_id IS NOT NULL
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_push_ack_push_type
          ON driver_push_acknowledgments (push_type)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_push_ack_acknowledged_at
          ON driver_push_acknowledgments (acknowledged_at)
      `;
    } catch { /* table/indexes may already exist */ }

    // ── Insert acknowledgment row ────────────────────────────────────────────
    const inserted = ackedAt
      ? await sql`
          INSERT INTO driver_push_acknowledgments
            (driver_code, booking_id, push_type, offer_id, notification_tag, acknowledged_at, source)
          VALUES
            (
              ${normalizedDriverCode},
              ${bookingIdNum},
              ${normalizedPushType},
              ${offerIdStr},
              ${tagStr},
              ${ackedAt.toISOString()},
              ${sourceStr}
            )
          RETURNING id, acknowledged_at
        `
      : await sql`
          INSERT INTO driver_push_acknowledgments
            (driver_code, booking_id, push_type, offer_id, notification_tag, source)
          VALUES
            (
              ${normalizedDriverCode},
              ${bookingIdNum},
              ${normalizedPushType},
              ${offerIdStr},
              ${tagStr},
              ${sourceStr}
            )
          RETURNING id, acknowledged_at
        `;

    const row = inserted[0];

    console.log("[SLN-PUSH-ACK-01]", JSON.stringify({
      id: row.id,
      driver_code: normalizedDriverCode,
      push_type: normalizedPushType,
      booking_id: bookingIdNum,
      offer_id: offerIdStr,
      notification_tag: tagStr,
      acknowledged_at: row.acknowledged_at,
      source: sourceStr,
    }));

    return NextResponse.json({ ok: true, id: Number(row.id) });

  } catch (err: any) {
    console.error("[driver/push-ack]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
