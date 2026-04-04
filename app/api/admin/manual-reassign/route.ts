export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// POST /api/admin/manual-reassign
//
// BM10 MASTER BLOCK — PART 8: Manual Admin Reassignment
//
// Fixes the Reassign flow so it does NOT fail for valid admin users
// when booking is in:
//   - ROUND_2_PREMIUM_PRIORITY
//   - ROUND_3_POOL_OPEN
//   - ADMIN_ATTENTION_REQUIRED
//   - Any operational fallback state
//
// A booking that is unpaid or completed can be blocked.
// A booking that is paid and unresolved MUST remain manually reassignable.
//
// Body:
//   {
//     booking_id: string,          // required
//     driver_id?: string,          // optional: specific driver to assign
//     driver_code?: string,        // optional: driver by code
//     override_state?: boolean,    // skip state validation (admin override)
//   }
//
// Auth: x-admin-key: sln-admin-2024
// ============================================================

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// States that allow manual reassignment (paid + unresolved)
const REASSIGNABLE_DISPATCH_STATES = [
  "ROUND_1_CAPTOR_PRIORITY",
  "ROUND_2_PREMIUM_PRIORITY",
  "ROUND_3_POOL_OPEN",
  "ADMIN_ATTENTION_REQUIRED",
  "NEW",
  // Also allow legacy dispatch_status values
];
const REASSIGNABLE_DISPATCH_STATUSES = [
  "manual_dispatch_required",
  "reassignment_needed",
  "urgent_reassignment",
  "critical_driver_failure",
  "pending_dispatch",
  "offer_pending",
  "fallback_dispatched",
  "awaiting_source_owner",
  "awaiting_sln_member",
  "needs_review",
  "driver_rejected",
  "needs_correction",
];

// States that BLOCK reassignment (completed or unpaid)
const TERMINAL_STATUSES = [
  "completed", "cancelled", "archived", "no_show",
  "in_trip", "en_route", "arrived",
];

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key") || "";
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    booking_id?: string;
    driver_id?: string;
    driver_code?: string;
    override_state?: boolean;
  } = {};
  try { body = await req.json(); } catch { /* no body */ }

  const { booking_id, driver_id, driver_code, override_state = false } = body;

  if (!booking_id) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  }

  try {
    // ── Load booking ─────────────────────────────────────────
    const bookingRows = await sql`
      SELECT
        b.id::text,
        b.status,
        b.dispatch_status,
        COALESCE(b.dispatch_state, 'NEW') AS dispatch_state,
        COALESCE(b.dispatch_round, 1)     AS dispatch_round,
        b.payment_status,
        b.assigned_driver_id::text,
        b.captured_by_driver_code,
        b.source_driver_id::text,
        b.manual_dispatch_required
      FROM bookings b
      WHERE b.id = ${booking_id}::uuid
      LIMIT 1
    `;

    if (bookingRows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingRows[0];

    // ── Guard 1: Block terminal bookings ─────────────────────
    if (TERMINAL_STATUSES.includes(booking.status)) {
      return NextResponse.json({
        error: `Cannot reassign: booking is in terminal state '${booking.status}'.`,
        booking_status: booking.status,
        dispatch_state: booking.dispatch_state,
      }, { status: 422 });
    }

    // ── Guard 2: Block unpaid bookings (unless override) ──────
    if (booking.payment_status !== "paid" && !override_state) {
      return NextResponse.json({
        error: "Cannot reassign: booking is not paid. Use override_state=true to bypass.",
        payment_status: booking.payment_status,
      }, { status: 422 });
    }

    // ── Guard 3: Validate reassignable state ──────────────────
    const isReassignableState =
      REASSIGNABLE_DISPATCH_STATES.includes(booking.dispatch_state) ||
      REASSIGNABLE_DISPATCH_STATUSES.includes(booking.dispatch_status) ||
      booking.manual_dispatch_required === true;

    if (!isReassignableState && !override_state) {
      return NextResponse.json({
        error: `Booking is not in a reassignable state. dispatch_state='${booking.dispatch_state}', dispatch_status='${booking.dispatch_status}'. Use override_state=true to force.`,
        dispatch_state:  booking.dispatch_state,
        dispatch_status: booking.dispatch_status,
      }, { status: 422 });
    }

    // ── Guard 4: Block double reassignment (BM10 Follow-Up 4) ────
    // RULE: Cannot create a new offer if:
    //   (a) There is already an active pending offer for this booking, OR
    //   (b) The booking is in a fully accepted/locked state (dispatch_state=ASSIGNED)
    //       and override_state is not explicitly set.
    // This prevents the admin from accidentally creating two parallel active offers
    // and prevents reassigning a ride that a driver has already accepted.
    const existingPendingOffers = await sql`
      SELECT id::text, driver_id::text, expires_at
      FROM dispatch_offers
      WHERE booking_id = ${booking_id}::uuid
        AND response = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `;

    if (existingPendingOffers.length > 0 && !override_state) {
      const existing = existingPendingOffers[0];
      return NextResponse.json({
        error: `Cannot reassign: booking already has an active pending offer (offer_id=${existing.id}). The driver has not yet responded. Wait for the offer to expire or use override_state=true to supersede it.`,
        existing_offer_id: existing.id,
        existing_offer_expires_at: existing.expires_at,
        booking_status: booking.status,
        dispatch_state: booking.dispatch_state,
      }, { status: 409 });
    }

    const isFullyAccepted =
      booking.dispatch_state === 'ASSIGNED' &&
      (booking.status === 'accepted' || booking.status === 'assigned') &&
      booking.dispatch_status === 'assigned';

    if (isFullyAccepted && !override_state) {
      return NextResponse.json({
        error: `Cannot reassign: booking is fully accepted by a driver (dispatch_state=ASSIGNED, status=${booking.status}). The driver has already confirmed this ride. Use override_state=true to force a reassignment.`,
        booking_status: booking.status,
        dispatch_state: booking.dispatch_state,
        dispatch_status: booking.dispatch_status,
        assigned_driver_id: booking.assigned_driver_id,
      }, { status: 409 });
    }

    // ── Resolve target driver ─────────────────────────────────
    let targetDriverId: string | null = driver_id ?? null;
    let targetDriverCode: string | null = null;
    let targetDriverName: string | null = null;

    if (!targetDriverId && driver_code) {
      const driverRows = await sql`
        SELECT id::text, driver_code, full_name
        FROM drivers
        WHERE driver_code = ${driver_code}
          AND driver_status IN ('active', 'provisional')
          AND is_eligible = true
        LIMIT 1
      `;
      if (driverRows.length === 0) {
        return NextResponse.json({
          error: `Driver with code '${driver_code}' not found or not eligible.`,
        }, { status: 404 });
      }
      targetDriverId   = driverRows[0].id;
      targetDriverCode = driverRows[0].driver_code;
      targetDriverName = driverRows[0].full_name;
    } else if (targetDriverId) {
      const driverRows = await sql`
        SELECT id::text, driver_code, full_name
        FROM drivers
        WHERE id = ${targetDriverId}::uuid
        LIMIT 1
      `;
      if (driverRows.length > 0) {
        targetDriverCode = driverRows[0].driver_code;
        targetDriverName = driverRows[0].full_name;
      }
    }

    // If no specific driver provided → auto-select best available
    if (!targetDriverId) {
      // Collect already-tried drivers
      const triedRows = await sql`
        SELECT DISTINCT driver_id::text
        FROM dispatch_offers
        WHERE booking_id = ${booking_id}::uuid
          AND response IN ('declined', 'timeout')
      `;
      const triedIds = triedRows.map((r: any) => r.driver_id as string);
      const excludeList = triedIds.length > 0
        ? triedIds
        : ["00000000-0000-0000-0000-000000000000"];

      const candidates = await sql`
        SELECT id::text, driver_code, full_name
        FROM drivers
        WHERE driver_status IN ('active', 'provisional')
          AND is_eligible = true
          AND (license_expires_at IS NULL OR license_expires_at > NOW())
          AND (insurance_expires_at IS NULL OR insurance_expires_at > NOW())
          AND COALESCE(availability_status, 'available') = 'available'
          AND id NOT IN (SELECT unnest(${excludeList}::uuid[]))
        ORDER BY
          CASE COALESCE(legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
            WHEN 'SOTTOVENTO_LEGAL_FLEET' THEN 1
            WHEN 'PARTNER_LEGAL_FLEET'    THEN 2
            ELSE 3
          END ASC,
          COALESCE(reliability_score, 65) DESC
        LIMIT 1
      `;

      if (candidates.length === 0) {
        // No auto-candidate — mark as ADMIN_ATTENTION_REQUIRED
        await sql`
          UPDATE bookings SET
            dispatch_state           = 'ADMIN_ATTENTION_REQUIRED',
            dispatch_status          = 'manual_dispatch_required',
            manual_dispatch_required = TRUE,
            assigned_driver_id       = NULL,
            updated_at               = NOW()
          WHERE id = ${booking_id}::uuid
        `;
        return NextResponse.json({
          success: false,
          action: "escalated_to_admin",
          reason: "No eligible drivers available for auto-selection",
          dispatch_state: "ADMIN_ATTENTION_REQUIRED",
          booking_id,
        });
      }

      targetDriverId   = candidates[0].id;
      targetDriverCode = candidates[0].driver_code;
      targetDriverName = candidates[0].full_name;
    }

    // ── Determine next round ──────────────────────────────────
    const currentRound = booking.dispatch_round ?? 1;
    const nextRound = currentRound + 1;
    const offerWindowMinutes = 20;

    // ── Cancel any existing pending offers ────────────────────
    await sql`
      UPDATE dispatch_offers
      SET response = 'superseded', responded_at = NOW()
      WHERE booking_id = ${booking_id}::uuid
        AND response = 'pending'
    `;

    // ── Create new dispatch_offer ─────────────────────────────
    const newOfferRows = await sql`
      INSERT INTO dispatch_offers (
        booking_id, driver_id,
        response, offer_round, round_number,
        is_source_offer, is_fallback_offer,
        sent_at, expires_at, created_at
      ) VALUES (
        ${booking_id}::uuid,
        ${targetDriverId}::uuid,
        'pending',
        ${nextRound},
        ${nextRound},
        false,
        false,
        NOW(),
        NOW() + (${offerWindowMinutes} || ' minutes')::interval,
        NOW()
      )
      RETURNING id::text
    `;
    const newOfferId = newOfferRows[0]?.id ?? null;

    // ── Update booking state ──────────────────────────────────
    // BUG A FIX: Set assigned_driver_id to the target driver (not NULL).
    // Previously this was NULL, so the driver panel could not find the ride
    // via assigned_driver_id = driver.id in the driver/me query.
    // dispatch_state = 'ROUND_3_POOL_OPEN' is correct here because the offer
    // is still pending acceptance. Once the driver accepts via respond-offer,
    // that endpoint will set dispatch_state = 'ASSIGNED'.
    // SAFETY: Does NOT change booking.status
    await sql`
      UPDATE bookings SET
        dispatch_state           = 'ROUND_3_POOL_OPEN',
        dispatch_status          = 'offer_pending',
        dispatch_round           = ${nextRound},
        assigned_driver_id       = ${targetDriverId}::uuid,
        manual_dispatch_required = FALSE,
        offer_expires_at         = NOW() + (${offerWindowMinutes} || ' minutes')::interval,
        updated_at               = NOW()
      WHERE id = ${booking_id}::uuid
        AND status NOT IN (
          'completed', 'cancelled', 'archived', 'no_show',
          'in_trip', 'en_route', 'arrived'
        )
    `;

    // ── Write driver_offer_history ────────────────────────────
    try {
      await sql`
        INSERT INTO driver_offer_history (
          booking_id, driver_id, driver_code,
          round_number, offer_status,
          sent_at, notes, created_at
        ) VALUES (
          ${booking_id}::uuid,
          ${targetDriverId}::uuid,
          ${targetDriverCode},
          ${nextRound},
          'offer_received',
          NOW(),
          ${'Manual admin reassignment — round ' + nextRound},
          NOW()
        )
      `;
    } catch { /* non-blocking */ }

    // ── Audit log ─────────────────────────────────────────────
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'booking', ${booking_id}::uuid,
          'bm10_manual_admin_reassign',
          'admin',
          ${JSON.stringify({
            target_driver_id:   targetDriverId,
            target_driver_code: targetDriverCode,
            new_offer_id:       newOfferId,
            round:              nextRound,
            previous_state:     booking.dispatch_state,
            previous_status:    booking.dispatch_status,
            override_state,
            timestamp:          new Date().toISOString(),
          })}::jsonb
        )
      `;
    } catch { /* non-blocking */ }

    // ── Dispatch event log ────────────────────────────────────
    try {
      await sql`
        INSERT INTO dispatch_event_log (booking_id, driver_id, event_type, event_data, created_at)
        VALUES (
          ${booking_id}::uuid,
          ${targetDriverId}::uuid,
          'manual_admin_reassign',
          ${JSON.stringify({
            trigger:            'manual_admin',
            previous_state:     booking.dispatch_state,
            next_state:         'ROUND_3_POOL_OPEN',
            round:              nextRound,
            new_offer_id:       newOfferId,
            target_driver_code: targetDriverCode,
          })}::jsonb,
          NOW()
        )
      `;
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      action: "manual_reassign_dispatched",
      booking_id,
      new_offer_id:   newOfferId,
      target_driver: {
        id:          targetDriverId,
        driver_code: targetDriverCode,
        full_name:   targetDriverName,
      },
      round:         nextRound,
      dispatch_state: "ROUND_3_POOL_OPEN",
      dispatch_status: "offer_pending",
      offer_window_minutes: offerWindowMinutes,
    });

  } catch (err: any) {
    console.error("[manual-reassign] error:", err?.message);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
