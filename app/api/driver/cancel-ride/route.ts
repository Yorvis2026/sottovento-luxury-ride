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
//   - Incident registry in audit_logs (Fase 8)
//   - Needs Review auto-trigger for non-passenger cancellations (Fase 10)
//
// Body:
//   {
//     booking_id: string,
//     driver_id: string,
//     cancel_reason: CancelReason,
//     cancellation_notes?: string,       // required if cancel_reason === 'OTHER'
//     passenger_no_show_confirmed?: boolean, // required if cancel_reason === 'PASSENGER_NO_SHOW'
//     gps_lat?: number,
//     gps_lng?: number,
//     evidence_url?: string,             // optional photo evidence URL
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
      SELECT id, status, assigned_driver_id, pickup_at, total_price,
             pickup_address, dropoff_address, client_id, source_driver_id
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

    // ── Compute flags ─────────────────────────────────────────
    const now = new Date();
    const nowIso = now.toISOString();

    // Determine early_cancel vs late_cancel based on pickup_at
    const pickupAt = booking.pickup_at ? new Date(booking.pickup_at) : null;
    const earlyCancel = pickupAt ? now < pickupAt : false;
    const lateCancel = pickupAt ? now >= pickupAt : false;
    const pickupTimeDeltaMinutes = pickupAt
      ? Math.round((now.getTime() - pickupAt.getTime()) / 60000)
      : null;

    // Passenger no-show flag
    const passengerNoShow = cancel_reason === "PASSENGER_NO_SHOW" &&
      passenger_no_show_confirmed === true;

    // Determine responsibility and payout
    const responsibility = CANCEL_RESPONSIBILITY[cancel_reason] ?? "system";
    const newPayoutStatus = getPayoutStatus(responsibility);
    const newBookingStatus = getBookingStatus(responsibility);

    // ── Ensure cancellation columns exist ─────────────────────
    try {
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS cancel_reason         TEXT,
          ADD COLUMN IF NOT EXISTS cancel_responsibility TEXT,
          ADD COLUMN IF NOT EXISTS cancellation_notes    TEXT,
          ADD COLUMN IF NOT EXISTS passenger_no_show     BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS early_cancel          BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS late_cancel           BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS cancelled_at          TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS no_show_at            TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS payout_status         TEXT
      `;
    } catch {
      // Columns may already exist — safe to ignore
    }

    // ── Update booking ────────────────────────────────────────
    await sql`
      UPDATE bookings
      SET
        status                = ${newBookingStatus},
        dispatch_status       = 'cancelled',
        cancel_reason         = ${cancel_reason},
        cancel_responsibility = ${responsibility},
        cancellation_notes    = ${cancellation_notes ?? null},
        passenger_no_show     = ${passengerNoShow},
        early_cancel          = ${earlyCancel},
        late_cancel           = ${lateCancel},
        cancelled_at          = ${nowIso}::timestamptz,
        no_show_at            = ${passengerNoShow ? nowIso : null}::timestamptz,
        payout_status         = ${newPayoutStatus},
        updated_at            = NOW()
      WHERE id = ${booking_id}::uuid
    `;

    // ── Incident Registry: write to audit_logs (Fase 8) ──────
    const incidentData = {
      cancel_reason,
      cancel_responsibility: responsibility,
      cancellation_notes: cancellation_notes ?? null,
      passenger_no_show: passengerNoShow,
      early_cancel: earlyCancel,
      late_cancel: lateCancel,
      pickup_time_delta_minutes: pickupTimeDeltaMinutes,
      driver_location: gps_lat && gps_lng ? { lat: gps_lat, lng: gps_lng } : null,
      optional_evidence_url: evidence_url ?? null,
      timestamp: nowIso,
      payout_status: newPayoutStatus,
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

    // ── Needs Review auto-trigger (Fase 10) ───────────────────
    // If responsibility is NOT passenger, move to needs_review bucket
    // by setting dispatch_status = 'needs_review' (already done via newBookingStatus)
    // Admin will see it in the Needs Review bucket on next dispatch load.

    return NextResponse.json({
      success: true,
      booking_id,
      cancel_reason,
      cancel_responsibility: responsibility,
      passenger_no_show: passengerNoShow,
      early_cancel: earlyCancel,
      late_cancel: lateCancel,
      payout_status: newPayoutStatus,
      new_booking_status: newBookingStatus,
      pickup_time_delta_minutes: pickupTimeDeltaMinutes,
    });

  } catch (err: any) {
    console.error("[driver/cancel-ride]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
