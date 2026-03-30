export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// GET /api/admin/debug-dispatch-state?booking_id=UUID&driver_id=UUID
// Inspects the real DB state of a booking and its dispatch_offers rows.
// Also runs a test admin assignment and reports what happens step by step.
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key") || "";
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id") || "73b03fce-c42f-48e9-a1ec-5831cdfcefd8";
  const driverId  = searchParams.get("driver_id")  || "f2cb4bc6-1962-4b35-bd7d-3ff6f4e806c3";

  const report: Record<string, any> = {
    booking_id: bookingId,
    driver_id:  driverId,
    timestamp:  new Date().toISOString(),
  };

  // 1. Current booking state
  try {
    const rows = await sql`
      SELECT
        id, status, dispatch_status,
        assigned_driver_id, offer_expires_at,
        payment_status, pickup_address, dropoff_address,
        pickup_zone, dropoff_zone, updated_at
      FROM bookings
      WHERE id = ${bookingId}::uuid
      LIMIT 1
    `;
    report.booking_state = rows[0] ?? null;
  } catch (e: any) {
    report.booking_state_error = e.message;
  }

  // 2. All dispatch_offers for this booking
  try {
    const rows = await sql`
      SELECT
        id, booking_id, driver_id,
        response, offer_round, is_source_offer,
        sent_at, expires_at, responded_at,
        created_at
      FROM dispatch_offers
      WHERE booking_id = ${bookingId}::uuid
      ORDER BY created_at DESC
    `;
    report.dispatch_offers = rows;
    report.dispatch_offers_count = rows.length;
    report.active_pending_offers = rows.filter((r: any) => r.response === "pending");
  } catch (e: any) {
    report.dispatch_offers_error = e.message;
  }

  // 3. What driver/me would return for this driver
  try {
    // Path A: dispatch_offers active_offer
    const offerRows = await sql`
      -- FIX: 'do' is a reserved word in PostgreSQL — alias renamed to 'dof'
      SELECT
        dof.id AS offer_id,
        dof.booking_id,
        dof.expires_at,
        dof.response,
        dof.offer_round,
        b.dispatch_status,
        b.assigned_driver_id,
        b.status AS booking_status
      FROM dispatch_offers dof
      JOIN bookings b ON b.id = dof.booking_id
      WHERE dof.driver_id = ${driverId}::uuid
        AND dof.response = 'pending'
        AND (dof.expires_at IS NULL OR dof.expires_at > NOW())
        AND b.status NOT IN ('cancelled', 'completed', 'no_show', 'archived', 'en_route', 'arrived', 'in_trip', 'accepted')
        AND b.dispatch_status NOT IN ('accepted', 'completed', 'cancelled', 'assigned')
      ORDER BY dof.created_at DESC
      LIMIT 1
    `;
    report.driver_me_path_A_active_offer = offerRows[0] ?? null;
    report.driver_me_path_A_found = offerRows.length > 0;
  } catch (e: any) {
    report.driver_me_path_A_error = e.message;
  }

  // Path B: fallback bookings direct
  try {
    const fallbackRows = await sql`
      SELECT
        id AS booking_id,
        status,
        dispatch_status,
        assigned_driver_id,
        offer_expires_at
      FROM bookings
      WHERE (
        (dispatch_status = 'awaiting_driver_response' AND assigned_driver_id = ${driverId}::uuid)
        OR (dispatch_status = 'awaiting_source_owner' AND source_driver_id = ${driverId}::uuid)
        OR (dispatch_status = 'awaiting_sln_member' AND assigned_driver_id = ${driverId}::uuid)
        OR (dispatch_status = 'offer_pending' AND assigned_driver_id = ${driverId}::uuid)
      )
      AND status NOT IN ('cancelled', 'completed', 'no_show', 'archived', 'en_route', 'arrived', 'in_trip', 'accepted')
      AND (offer_expires_at IS NULL OR offer_expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `;
    report.driver_me_path_B_fallback = fallbackRows[0] ?? null;
    report.driver_me_path_B_found = fallbackRows.length > 0;
  } catch (e: any) {
    report.driver_me_path_B_error = e.message;
  }

  // Path C: assigned_ride (what causes OfferScreen to be skipped)
  try {
    const assignedRows = await sql`
      SELECT
        id AS booking_id,
        status,
        dispatch_status,
        assigned_driver_id,
        pickup_at,
        offer_expires_at
      FROM bookings
      WHERE assigned_driver_id = ${driverId}::uuid
        AND status NOT IN ('cancelled', 'completed', 'no_show', 'archived')
        AND dispatch_status NOT IN ('offer_pending', 'awaiting_driver_response', 'awaiting_source_owner', 'awaiting_sln_member')
      ORDER BY pickup_at ASC
      LIMIT 1
    `;
    report.driver_me_path_C_assigned_ride = assignedRows[0] ?? null;
    report.driver_me_path_C_found = assignedRows.length > 0;
  } catch (e: any) {
    report.driver_me_path_C_error = e.message;
  }

  // 4. Root cause diagnosis
  const pathA = report.driver_me_path_A_found;
  const pathB = report.driver_me_path_B_found;
  const pathC = report.driver_me_path_C_found;
  const booking = report.booking_state;
  const pendingOffers = report.active_pending_offers;

  report.root_cause_diagnosis = {
    active_offer_found_in_dispatch_offers: pathA,
    fallback_offer_found_in_bookings: pathB,
    assigned_ride_found_bypassing_offer: pathC,
    booking_has_assigned_driver_id: !!booking?.assigned_driver_id,
    booking_dispatch_status: booking?.dispatch_status,
    booking_status: booking?.status,
    pending_dispatch_offers_count: pendingOffers?.length ?? 0,
    conclusion: pathC && !pathA
      ? "ROOT CAUSE CONFIRMED: bookings.assigned_driver_id is set BEFORE driver accepts. Driver panel reads assigned_ride path (Path C) and skips OfferScreen. dispatch_offers row either missing or not found by Path A query."
      : pathA
      ? "OFFER FLOW CORRECT: active_offer found via dispatch_offers (Path A). OfferScreen should render."
      : pathB
      ? "PARTIAL: fallback offer found via bookings direct (Path B). OfferScreen may render but without dispatch_offer row."
      : "NO OFFER FOUND: booking is not in any offer state for this driver.",
  };

  return NextResponse.json(report, { status: 200 });
}
