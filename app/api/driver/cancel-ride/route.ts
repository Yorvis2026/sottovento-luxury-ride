export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/driver/cancel-ride
//
// Handles structured ride cancellation with:
//   - Mandatory cancel_reason selection
//   - Automatic cancel_responsibility classification
//   - Passenger no-show workflow (Fase 3)
//   - Early/late cancel flags (Fases 4-5)
//   - Financial impact determination (Fase 6)
//   - SLN Network fee distribution (Auto Fee Logic V2)
//     · executor_share_amount
//     · source_driver_share_amount
//     · platform_share_amount
//     · fee_split_strategy
//   - Incident registry in audit_logs (Fase 8)
//   - Needs Review auto-trigger for non-passenger cancellations (Fase 10)
//
// Body:
//   {
//     booking_id:                   string,
//     driver_id:                    string,
//     cancel_reason:                CancelReason,
//     cancellation_notes?:          string,    // required if cancel_reason === 'OTHER'
//     passenger_no_show_confirmed?: boolean,   // required if cancel_reason === 'PASSENGER_NO_SHOW'
//     gps_lat?:                     number,
//     gps_lng?:                     number,
//     evidence_url?:                string,    // optional photo evidence URL
//   }
// ============================================================

// ─── CANCEL REASON → RESPONSIBILITY MAPPING ──────────────────────────────────
const CANCEL_RESPONSIBILITY: Record<string, "passenger" | "driver" | "dispatch" | "system"> = {
  PASSENGER_NO_SHOW:                "passenger",
  PASSENGER_CANCELLED:              "passenger",
  PASSENGER_UNREACHABLE:            "passenger",
  PASSENGER_FLIGHT_DELAY:           "passenger",
  PASSENGER_TOOK_DIFFERENT_VEHICLE: "passenger",
  WRONG_PICKUP_LOCATION:            "passenger",
  SAFETY_CONCERN:                   "driver",
  VEHICLE_ISSUE:                    "driver",
  DRIVER_EMERGENCY:                 "driver",
  DISPATCH_REQUEST:                 "dispatch",
  OTHER:                            "system",
};

const VALID_CANCEL_REASONS = Object.keys(CANCEL_RESPONSIBILITY);

// ─── PAYOUT STATUS BASED ON RESPONSIBILITY ───────────────────────────────────
function getPayoutStatus(responsibility: string): string {
  switch (responsibility) {
    case "passenger": return "pending";         // driver eligible for payout
    case "driver":    return "cancelled";       // driver not eligible
    case "dispatch":  return "needs_review";    // manual review required
    case "system":    return "needs_review";    // manual review required
    default:          return "needs_review";
  }
}

// ─── BOOKING STATUS BASED ON RESPONSIBILITY ──────────────────────────────────
function getBookingStatus(responsibility: string): string {
  switch (responsibility) {
    case "passenger": return "cancelled";       // standard cancel
    case "driver":    return "cancelled";       // driver cancelled
    case "dispatch":  return "needs_review";    // needs admin review
    case "system":    return "needs_review";    // needs admin review
    default:          return "cancelled";
  }
}

// ─── SLN NETWORK FEE DISTRIBUTION (Auto Fee Logic V2) ────────────────────────
//
// Determines how the cancellation_fee is split across:
//   executor (the driver who held the ride)
//   source_driver (the driver who originally captured/referred the booking)
//   platform (SLN Network)
//
// Three strategies based on attribution:
//
//   "same_driver"  — source_driver_id == executor_driver_id
//     executor:      80%
//     source_driver: 0%
//     platform:      20%
//
//   "split_network" — source_driver_id != executor_driver_id (both present)
//     executor:      65%
//     source_driver: 15%
//     platform:      20%
//
//   "platform_origin" — source_type == 'platform' (no source driver)
//     executor:      75%
//     source_driver: 0%
//     platform:      25%
//
interface FeeSplit {
  executor_share_amount:      number;
  source_driver_share_amount: number;
  platform_share_amount:      number;
  fee_split_strategy:         "same_driver" | "split_network" | "platform_origin";
}

function computeFeeSplit(
  cancellationFee: number,
  executorDriverId: string | null,
  sourceDriverId:   string | null,
  sourceType:       string | null,
): FeeSplit {
  const fee = cancellationFee ?? 0;

  // Rule 3: source_type === 'platform' takes precedence over driver IDs
  if (sourceType === "platform" || (!sourceDriverId && !executorDriverId)) {
    return {
      executor_share_amount:      parseFloat((fee * 0.75).toFixed(2)),
      source_driver_share_amount: 0,
      platform_share_amount:      parseFloat((fee * 0.25).toFixed(2)),
      fee_split_strategy:         "platform_origin",
    };
  }

  // Rule 1: same driver captured and executed
  if (sourceDriverId && executorDriverId && sourceDriverId === executorDriverId) {
    return {
      executor_share_amount:      parseFloat((fee * 0.80).toFixed(2)),
      source_driver_share_amount: 0,
      platform_share_amount:      parseFloat((fee * 0.20).toFixed(2)),
      fee_split_strategy:         "same_driver",
    };
  }

  // Rule 2: different source driver and executor driver
  if (sourceDriverId && executorDriverId && sourceDriverId !== executorDriverId) {
    return {
      executor_share_amount:      parseFloat((fee * 0.65).toFixed(2)),
      source_driver_share_amount: parseFloat((fee * 0.15).toFixed(2)),
      platform_share_amount:      parseFloat((fee * 0.20).toFixed(2)),
      fee_split_strategy:         "split_network",
    };
  }

  // Fallback: executor present but no source driver → treat as platform_origin
  return {
    executor_share_amount:      parseFloat((fee * 0.75).toFixed(2)),
    source_driver_share_amount: 0,
    platform_share_amount:      parseFloat((fee * 0.25).toFixed(2)),
    fee_split_strategy:         "platform_origin",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      booking_id,
      driver_id,
      cancel_reason,
      cancellation_notes,
      passenger_no_show_confirmed,
      gps_lat,
      gps_lng,
      evidence_url,
    } = body;

    // ── Validation ────────────────────────────────────────────
    if (!booking_id || !driver_id || !cancel_reason) {
      return NextResponse.json(
        { error: "Missing required fields: booking_id, driver_id, cancel_reason" },
        { status: 400 }
      );
    }

    if (!VALID_CANCEL_REASONS.includes(cancel_reason)) {
      return NextResponse.json(
        { error: `Invalid cancel_reason. Must be one of: ${VALID_CANCEL_REASONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (cancel_reason === "OTHER" && !cancellation_notes?.trim()) {
      return NextResponse.json(
        { error: "cancellation_notes is required when cancel_reason is OTHER" },
        { status: 400 }
      );
    }

    // ── Load booking ──────────────────────────────────────────
    // Also fetch source_driver_id, source_type, cancellation_fee for fee split
    const bookingRows = await sql`
      SELECT
        id,
        status,
        assigned_driver_id,
        pickup_at,
        total_price,
        pickup_address,
        dropoff_address,
        client_id,
        source_driver_id,
        COALESCE(source_type, 'unknown')         AS source_type,
        COALESCE(cancellation_fee, 0)::numeric   AS cancellation_fee
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `;

    if (bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingRows[0];

    // ── Authorization ─────────────────────────────────────────
    if (booking.assigned_driver_id !== driver_id) {
      return NextResponse.json(
        { error: "Unauthorized: not assigned driver" },
        { status: 403 }
      );
    }

    // ── Validate current status allows cancellation ───────────
    const CANCELLABLE_STATUSES = [
      "offer_pending", "accepted", "assigned", "en_route", "arrived"
    ];
    if (!CANCELLABLE_STATUSES.includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a ride with status: ${booking.status}` },
        { status: 409 }
      );
    }

    // ── Compute timing flags ──────────────────────────────────
    const now = new Date();
    const nowIso = now.toISOString();

    const pickupAt = booking.pickup_at ? new Date(booking.pickup_at) : null;
    const earlyCancel = pickupAt ? now < pickupAt : false;
    const lateCancel  = pickupAt ? now >= pickupAt : false;
    const pickupTimeDeltaMinutes = pickupAt
      ? Math.round((now.getTime() - pickupAt.getTime()) / 60000)
      : null;

    // ── Passenger no-show flag ────────────────────────────────
    const passengerNoShow = cancel_reason === "PASSENGER_NO_SHOW" &&
      passenger_no_show_confirmed === true;

    // ── Responsibility and payout status ──────────────────────
    const responsibility  = CANCEL_RESPONSIBILITY[cancel_reason] ?? "system";
    const newPayoutStatus = getPayoutStatus(responsibility);
    const newBookingStatus = getBookingStatus(responsibility);

    // ── SLN Network fee distribution (Auto Fee Logic V2) ─────
    const cancellationFee = parseFloat(booking.cancellation_fee) || 0;
    const feeSplit = computeFeeSplit(
      cancellationFee,
      booking.assigned_driver_id ?? null,   // executor = assigned driver
      booking.source_driver_id   ?? null,   // source driver (who captured the booking)
      booking.source_type        ?? null,   // 'platform' | 'driver' | 'network' | etc.
    );

    // ── Ensure all required columns exist ─────────────────────
    try {
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS cancel_reason              TEXT,
          ADD COLUMN IF NOT EXISTS cancel_responsibility      TEXT,
          ADD COLUMN IF NOT EXISTS cancellation_notes         TEXT,
          ADD COLUMN IF NOT EXISTS passenger_no_show          BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS early_cancel               BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS late_cancel                BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS cancelled_at               TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS no_show_at                 TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS payout_status              TEXT,
          ADD COLUMN IF NOT EXISTS cancellation_fee           NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS executor_share_amount      NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS source_driver_share_amount NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS platform_share_amount      NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS fee_split_strategy         TEXT
      `;
    } catch {
      // Columns may already exist — safe to ignore
    }

    // ── Update booking ────────────────────────────────────────
    await sql`
      UPDATE bookings
      SET
        status                      = ${newBookingStatus},
        dispatch_status             = 'cancelled',
        cancel_reason               = ${cancel_reason},
        cancel_responsibility       = ${responsibility},
        cancellation_notes          = ${cancellation_notes ?? null},
        passenger_no_show           = ${passengerNoShow},
        early_cancel                = ${earlyCancel},
        late_cancel                 = ${lateCancel},
        cancelled_at                = ${nowIso}::timestamptz,
        no_show_at                  = ${passengerNoShow ? nowIso : null}::timestamptz,
        payout_status               = ${newPayoutStatus},
        executor_share_amount       = ${feeSplit.executor_share_amount},
        source_driver_share_amount  = ${feeSplit.source_driver_share_amount},
        platform_share_amount       = ${feeSplit.platform_share_amount},
        fee_split_strategy          = ${feeSplit.fee_split_strategy},
        updated_at                  = NOW()
      WHERE id = ${booking_id}::uuid
    `;

    // ── Incident Registry: write to audit_logs (Fase 8) ──────
    const incidentData = {
      cancel_reason,
      cancel_responsibility:       responsibility,
      cancellation_notes:          cancellation_notes ?? null,
      passenger_no_show:           passengerNoShow,
      early_cancel:                earlyCancel,
      late_cancel:                 lateCancel,
      pickup_time_delta_minutes:   pickupTimeDeltaMinutes,
      driver_location:             gps_lat && gps_lng ? { lat: gps_lat, lng: gps_lng } : null,
      optional_evidence_url:       evidence_url ?? null,
      timestamp:                   nowIso,
      payout_status:               newPayoutStatus,
         // ── Auto Fee Logic V2 — fee split audit ──────────────
      cancellation_fee: cancellationFee,
      fee_split_strategy:          feeSplit.fee_split_strategy,
      executor_share_amount:       feeSplit.executor_share_amount,
      source_driver_share_amount:  feeSplit.source_driver_share_amount,
      platform_share_amount:       feeSplit.platform_share_amount,
      executor_driver_id:          booking.assigned_driver_id ?? null,
      source_driver_id:            booking.source_driver_id   ?? null,
      source_type:                 booking.source_type        ?? null,
    };

    try {
      await sql`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, actor_id, new_data
        ) VALUES (
          'booking',
          ${booking_id}::uuid,
          'ride_cancelled_by_driver',
          'driver',
          ${driver_id}::uuid,
          ${JSON.stringify(incidentData)}::jsonb
        )
      `;
    } catch {
      // Audit log failure is non-blocking
    }

    // ── Response ──────────────────────────────────────────────
    return NextResponse.json({
      success:                     true,
      booking_id,
      cancel_reason,
      cancel_responsibility:       responsibility,
      passenger_no_show:           passengerNoShow,
      early_cancel:                earlyCancel,
      late_cancel:                 lateCancel,
      payout_status:               newPayoutStatus,
      new_booking_status:          newBookingStatus,
      pickup_time_delta_minutes:   pickupTimeDeltaMinutes,
        // ── Auto Fee Logic V2 ─────────────────────────────
      cancellation_fee: cancellationFee,
      fee_split_strategy:          feeSplit.fee_split_strategy,
      executor_share_amount:       feeSplit.executor_share_amount,
      source_driver_share_amount:  feeSplit.source_driver_share_amount,
      platform_share_amount:       feeSplit.platform_share_amount,
    });

  } catch (err: any) {
    console.error("[driver/cancel-ride]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
