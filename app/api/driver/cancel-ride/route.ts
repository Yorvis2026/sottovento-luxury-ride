export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/driver/cancel-ride
//
// BM20-I — Driver-initiated cancellation with automatic pool re-dispatch
//
// Handles structured ride cancellation with:
//   - Mandatory cancel_reason selection
//   - Automatic cancel_responsibility classification
//   - Passenger no-show workflow (Fase 3)
//   - Early/late cancel flags (Fases 4-5)
//   - Financial impact determination (Fase 6)
//   - SLN Network fee distribution (Auto Fee Logic V2)
//   - Incident registry in audit_logs (Fase 8)
//   - BM20-I: Automatic pool re-dispatch when driver/dispatch is responsible
//     · Sets dispatch_status = 'reassignment_needed'
//     · Sets original_driver_id = cancelling driver (excluded from re-dispatch pool)
//     · Clears assigned_driver_id so the booking re-enters the dispatch queue
//     · Does NOT mark booking as 'cancelled' when re-dispatch is possible
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
// ─── CANCEL REASON → RESPONSIBILITY MAPPING ──────────────────────────────────────────────
// Keys must match the CANCEL_REASONS array in the driver panel modal exactly.
const CANCEL_RESPONSIBILITY: Record<string, "passenger" | "driver" | "dispatch" | "system"> = {
  // Passenger-side reasons (driver gets payout)
  PASSENGER_NO_SHOW:                "passenger",
  PASSENGER_REQUESTED:              "passenger",   // ← aligned with driver panel modal
  PASSENGER_CANCELLED:              "passenger",   // legacy alias
  PASSENGER_UNREACHABLE:            "passenger",
  PASSENGER_FLIGHT_DELAY:           "passenger",
  PASSENGER_TOOK_DIFFERENT_VEHICLE: "passenger",
  WRONG_PICKUP_LOCATION:            "passenger",
  WRONG_ADDRESS:                    "passenger",   // ← aligned with driver panel modal
  // Driver-side reasons (driver not eligible for payout, ride goes back to pool)
  SAFETY_CONCERN:                   "driver",
  VEHICLE_BREAKDOWN:                "driver",      // ← aligned with driver panel modal
  VEHICLE_ISSUE:                    "driver",      // legacy alias
  DRIVER_EMERGENCY:                 "driver",
  // BM20-L: Justified driver reasons (ride goes back to pool, score NOT affected)
  AIRPORT_DELAY:                    "driver",      // ← BM20-L justified
  TRAFFIC_DELAY_CRITICAL:           "driver",      // ← BM20-L justified
  CLIENT_DELAY_EXTENDED:            "driver",      // ← BM20-L justified
  // Dispatch-side reasons (ride goes back to pool, manual review)
  DISPATCH_INSTRUCTION:             "dispatch",    // ← aligned with driver panel modal
  DISPATCH_REQUEST:                 "dispatch",    // legacy alias
  // System / catch-all
  OTHER:                            "system",
};

// ─── BM20-L: JUSTIFIED CANCEL REASONS (no score penalty) ───────────────────────────
// When a driver cancels with a justified reason, affects_driver_metrics = false.
// This prevents score degradation for circumstances outside the driver's control.
const JUSTIFIED_CANCEL_REASONS = new Set([
  // BM20-L Part 3 — justified reasons
  "AIRPORT_DELAY",
  "TRAFFIC_DELAY_CRITICAL",
  "VEHICLE_BREAKDOWN",
  "SAFETY_CONCERN",
  "CLIENT_DELAY_EXTENDED",
  "DISPATCH_INSTRUCTION",
  // Legacy aliases also justified
  "DISPATCH_REQUEST",
  "VEHICLE_ISSUE",
]);

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

// ─── BM20-I: Determine whether the ride should go back to the dispatch pool ──
// Returns true when the cancellation is NOT the passenger's fault and the
// booking should be re-dispatched to another driver instead of being closed.
function shouldRedispatch(responsibility: string): boolean {
  // passenger cancellations close the booking (no re-dispatch needed)
  // driver/dispatch cancellations release the ride back to the pool
  return responsibility === "driver" || responsibility === "dispatch";
}

// ─── BOOKING STATUS BASED ON RESPONSIBILITY ──────────────────────────────────
function getBookingStatus(responsibility: string): string {
  if (shouldRedispatch(responsibility)) {
    // BM20-I: ride goes back to pool — keep as ready_for_dispatch, not cancelled
    return "ready_for_dispatch";
  }
  switch (responsibility) {
    case "passenger": return "cancelled";       // standard cancel
    case "system":    return "needs_review";    // needs admin review
    default:          return "cancelled";
  }
}

// ─── DISPATCH STATUS BASED ON RESPONSIBILITY ─────────────────────────────────
function getDispatchStatus(responsibility: string): string {
  if (shouldRedispatch(responsibility)) {
    // BM20-I: trigger fallback-pool-dispatch engine (Case A: sequential)
    return "reassignment_needed";
  }
  return "cancelled";
}

// ─── SLN NETWORK FEE DISTRIBUTION (Auto Fee Logic V2) ────────────────────────
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

  if (sourceType === "platform" || (!sourceDriverId && !executorDriverId)) {
    return {
      executor_share_amount:      parseFloat((fee * 0.75).toFixed(2)),
      source_driver_share_amount: 0,
      platform_share_amount:      parseFloat((fee * 0.25).toFixed(2)),
      fee_split_strategy:         "platform_origin",
    };
  }

  if (sourceDriverId && executorDriverId && sourceDriverId === executorDriverId) {
    return {
      executor_share_amount:      parseFloat((fee * 0.80).toFixed(2)),
      source_driver_share_amount: 0,
      platform_share_amount:      parseFloat((fee * 0.20).toFixed(2)),
      fee_split_strategy:         "same_driver",
    };
  }

  if (sourceDriverId && executorDriverId && sourceDriverId !== executorDriverId) {
    return {
      executor_share_amount:      parseFloat((fee * 0.65).toFixed(2)),
      source_driver_share_amount: parseFloat((fee * 0.15).toFixed(2)),
      platform_share_amount:      parseFloat((fee * 0.20).toFixed(2)),
      fee_split_strategy:         "split_network",
    };
  }

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

    // ── Responsibility, payout and booking status ─────────────
    const responsibility   = CANCEL_RESPONSIBILITY[cancel_reason] ?? "system";
    const newPayoutStatus  = getPayoutStatus(responsibility);
    const newBookingStatus = getBookingStatus(responsibility);
    const newDispatchStatus = getDispatchStatus(responsibility);
    const redispatch = shouldRedispatch(responsibility);

    // ── SLN Network fee distribution (Auto Fee Logic V2) ─────
    const cancellationFee = parseFloat(booking.cancellation_fee) || 0;
    const feeSplit = computeFeeSplit(
      cancellationFee,
      booking.assigned_driver_id ?? null,
      booking.source_driver_id   ?? null,
      booking.source_type        ?? null,
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
          ADD COLUMN IF NOT EXISTS fee_split_strategy         TEXT,
          ADD COLUMN IF NOT EXISTS original_driver_id         UUID
      `;
    } catch {
      // Columns may already exist — safe to ignore
    }

    // ── Cancellation stage (Bloque Maestro — Cancellation Metrics Sync) ──────
    const cancelStage = booking.status === 'offer_pending' ? 'pre_accept'
      : booking.status === 'accepted' || booking.status === 'assigned' ? 'post_accept_pre_dispatch'
      : booking.status === 'en_route' ? 'en_route'
      : booking.status === 'arrived' ? 'arrived'
      : 'unknown';

    // BM20-L: justified cancellations do NOT affect driver score/metrics
    const isJustifiedCancel = JUSTIFIED_CANCEL_REASONS.has(cancel_reason);
    const affectsDriverMetrics = responsibility === 'driver' && !isJustifiedCancel;
    const affectsPayout = responsibility === 'passenger';

    // ── BM20-I: Update booking ────────────────────────────────
    // When redispatch=true:
    //   - status = 'ready_for_dispatch' (NOT 'cancelled')
    //   - dispatch_status = 'reassignment_needed' (triggers fallback-pool-dispatch engine)
    //   - assigned_driver_id = NULL (releases the driver lock)
    //   - original_driver_id = driver_id (fallback engine excludes this driver from pool)
    //   - cancelled_at is still recorded for audit purposes
    //
    // When redispatch=false (passenger cancel):
    //   - status = 'cancelled'
    //   - dispatch_status = 'cancelled'
    //   - assigned_driver_id = NULL
    if (redispatch) {
      await sql`
        UPDATE bookings
        SET
          status                      = 'ready_for_dispatch',
          dispatch_status             = 'reassignment_needed',
          assigned_driver_id          = NULL,
          original_driver_id          = ${driver_id}::uuid,
          cancel_reason               = ${cancel_reason},
          cancel_responsibility       = ${responsibility},
          cancellation_notes          = ${cancellation_notes ?? null},
          passenger_no_show           = ${passengerNoShow},
          early_cancel                = ${earlyCancel},
          late_cancel                 = ${lateCancel},
          cancelled_at                = ${nowIso}::timestamptz,
          no_show_at                  = NULL,
          payout_status               = ${newPayoutStatus},
          executor_share_amount       = ${feeSplit.executor_share_amount},
          source_driver_share_amount  = ${feeSplit.source_driver_share_amount},
          platform_share_amount       = ${feeSplit.platform_share_amount},
          fee_split_strategy          = ${feeSplit.fee_split_strategy},
          cancelled_by_type           = 'driver',
          cancelled_by_id             = ${driver_id}::uuid,
          cancel_stage                = ${cancelStage},
          affects_driver_metrics      = ${affectsDriverMetrics},
          affects_payout              = ${affectsPayout},
          updated_at                  = NOW()
        WHERE id = ${booking_id}::uuid
      `;
    } else {
      await sql`
        UPDATE bookings
        SET
          status                      = ${newBookingStatus},
          dispatch_status             = ${newDispatchStatus},
          assigned_driver_id          = NULL,
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
          cancelled_by_type           = 'driver',
          cancelled_by_id             = ${driver_id}::uuid,
          cancel_stage                = ${cancelStage},
          affects_driver_metrics      = ${affectsDriverMetrics},
          affects_payout              = ${affectsPayout},
          updated_at                  = NOW()
        WHERE id = ${booking_id}::uuid
      `;
    }

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
      // BM20-I: re-dispatch metadata
      redispatched_to_pool:        redispatch,
      new_booking_status:          redispatch ? 'ready_for_dispatch' : newBookingStatus,
      new_dispatch_status:         redispatch ? 'reassignment_needed' : newDispatchStatus,
      original_driver_id_set:      redispatch ? driver_id : null,
      // Auto Fee Logic V2 — fee split audit
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

    // ── BM20-I: Trigger fallback-pool-dispatch engine ─────────
    // Fire-and-forget: call the existing fallback-pool-dispatch endpoint
    // so the ride is immediately re-offered to the next eligible driver.
    // The fallback engine already reads original_driver_id and excludes it.
    if (redispatch) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
          || process.env.VERCEL_URL
          || "https://www.sottoventoluxuryride.com";
        const url = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
        fetch(`${url}/api/admin/fallback-pool-dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id, triggered_by: "driver_cancel_bm20i" }),
        }).catch(() => {
          // Non-blocking: if the call fails, the fallback engine will pick it up
          // on the next admin dispatch GET poll cycle (which runs every ~30s).
        });
      } catch {
        // Non-blocking
      }
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
      new_booking_status:          redispatch ? 'ready_for_dispatch' : newBookingStatus,
      new_dispatch_status:         redispatch ? 'reassignment_needed' : newDispatchStatus,
      redispatched_to_pool:        redispatch,
      pickup_time_delta_minutes:   pickupTimeDeltaMinutes,
      // Auto Fee Logic V2
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
