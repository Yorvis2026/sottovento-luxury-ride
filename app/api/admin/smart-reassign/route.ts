export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/admin/smart-reassign
// Smart Reassignment Engine — BM6
//
// Triggered when a booking is in sla_high_risk or sla_critical.
// Selects best rescue driver using:
//   1. capture priority (if still valid)
//   2. legal_affiliation_type priority (SLN > Partner > General)
//   3. reliability_score DESC
//   4. airport/vehicle eligibility
//
// Body: { booking_id, force?: boolean, admin_override?: boolean }
// ============================================================
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { booking_id, force = false, admin_override = false } = await req.json();
    if (!booking_id) {
      return NextResponse.json({ error: "booking_id required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // ── Load booking ─────────────────────────────────────────
    const [booking] = await sql`
      SELECT
        b.id, b.status, b.dispatch_status,
        b.sla_current_state, b.sla_protection_level,
        b.assigned_driver_id, b.pickup_at,
        b.service_location_type, b.trip_type, b.pickup_zone,
        b.pickup_address, b.dropoff_address,
        b.reassignment_count, b.fallback_offer_count,
        b.captured_by_driver_code,
        b.source_driver_id,
        b.is_eligible_for_premium_dispatch,
        b.rescue_reassignment_started_at
      FROM bookings b
      WHERE b.id = ${booking_id}::uuid
    `;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // ── Guard: only reassign if in risk state or forced ──────
    const isRiskState = ["sla_high_risk", "sla_critical"].includes(booking.sla_current_state ?? "");
    if (!isRiskState && !force && !admin_override) {
      return NextResponse.json({
        error: "Booking is not in a risk state. Use force=true to override.",
        sla_state: booking.sla_current_state,
      }, { status: 400 });
    }

    // ── Guard: no double assign — lock booking ───────────────
    if (booking.rescue_reassignment_started_at && !force) {
      return NextResponse.json({
        error: "Rescue reassignment already in progress for this booking.",
        started_at: booking.rescue_reassignment_started_at,
      }, { status: 409 });
    }

    // ── Lock booking for reassignment ────────────────────────
    await sql`
      UPDATE bookings SET
        rescue_reassignment_started_at = ${now}::timestamptz,
        sla_current_state              = 'smart_reassignment_started',
        dispatcher_override_required   = ${booking.sla_current_state === 'sla_critical'},
        reassignment_count             = COALESCE(reassignment_count, 0) + 1,
        updated_at                     = NOW()
      WHERE id = ${booking_id}::uuid
    `;

    // ── Find rescue driver candidates ────────────────────────
    const isAirport =
      booking.service_location_type === "airport" ||
      booking.trip_type === "airport" ||
      (booking.pickup_zone && booking.pickup_zone.toLowerCase().includes("airport")) ||
      (booking.pickup_zone && booking.pickup_zone.toLowerCase().includes("mco"));

    const candidates = await sql`
      SELECT
        d.id,
        d.driver_code,
        d.full_name,
        d.phone,
        d.driver_status,
        COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER') AS legal_affiliation_type,
        COALESCE(d.reliability_score, 65)::numeric                   AS reliability_score,
        COALESCE(d.driver_tier, 'STANDARD')                          AS driver_tier,
        COALESCE(d.is_eligible_for_premium_dispatch, false)          AS is_eligible_for_premium_dispatch,
        COALESCE(d.is_eligible_for_airport_priority, false)          AS is_eligible_for_airport_priority,
        COALESCE(d.driver_score_total, 75)::integer                  AS driver_score_total,
        -- Vehicle eligibility
        v.id AS vehicle_id,
        v.airport_permit_mco_status,
        v.city_permit_status,
        v.insurance_status,
        v.registration_status
      FROM drivers d
      LEFT JOIN vehicles v ON v.driver_id = d.id AND v.vehicle_status = 'active'
      WHERE d.driver_status IN ('active', 'provisional')
        AND d.is_eligible = true
        AND d.id != ${booking.assigned_driver_id ?? '00000000-0000-0000-0000-000000000000'}::uuid
      ORDER BY
        -- 1. Capture priority: source driver first (if different from current)
        CASE WHEN d.id = ${booking.source_driver_id ?? '00000000-0000-0000-0000-000000000000'}::uuid THEN 0 ELSE 1 END,
        -- 2. Legal affiliation priority
        CASE COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
          WHEN 'SOTTOVENTO_LEGAL_FLEET' THEN 1
          WHEN 'PARTNER_LEGAL_FLEET'    THEN 2
          ELSE 3
        END,
        -- 3. Reliability score DESC
        COALESCE(d.reliability_score, 65) DESC,
        -- 4. Airport eligibility (if airport ride)
        CASE WHEN ${isAirport} AND COALESCE(d.is_eligible_for_airport_priority, false) THEN 0 ELSE 1 END,
        d.created_at ASC
    `;

    if (candidates.length === 0) {
      // No candidates — require admin override
      await sql`
        UPDATE bookings SET
          sla_current_state            = 'dispatcher_override_required',
          dispatcher_override_required = TRUE,
          updated_at                   = NOW()
        WHERE id = ${booking_id}::uuid
      `;

      // Log
      try {
        await sql`
          INSERT INTO dispatch_event_log (
            booking_id, driver_id, event_type, trigger_reason, sla_level, event_data, created_at
          ) VALUES (
            ${booking_id}::uuid, NULL,
            'dispatcher_override_required',
            'no_rescue_candidates_available',
            ${booking.sla_protection_level ?? 'STANDARD'},
            ${JSON.stringify({ booking_id, reason: "no_eligible_drivers" })}::jsonb,
            NOW()
          )
        `;
      } catch { /* non-blocking */ }

      return NextResponse.json({
        success: false,
        action: "dispatcher_override_required",
        reason: "No eligible rescue drivers found",
        booking_id,
      });
    }

    // ── Select top rescue candidate ───────────────────────────
    const topCandidate = candidates[0];

    // ── For CRITICAL: auto-offer to top SOTTOVENTO_LEGAL_FLEET driver ──
    const isCritical = booking.sla_current_state === "sla_critical" || booking.sla_protection_level === "CRITICAL";
    const autoOffer = isCritical && topCandidate.legal_affiliation_type === "SOTTOVENTO_LEGAL_FLEET";

    if (autoOffer || admin_override) {
      // Auto-assign the top candidate
      await sql`
        UPDATE bookings SET
          assigned_driver_id              = ${topCandidate.id}::uuid,
          dispatch_status                 = 'rescue_assignment_in_progress',
          sla_current_state               = 'rescue_assignment_in_progress',
          rescue_reassignment_completed_at = ${now}::timestamptz,
          updated_at                      = NOW()
        WHERE id = ${booking_id}::uuid
      `;

      // Create rescue offer in dispatch_offers
      try {
        await sql`
          INSERT INTO dispatch_offers (
            booking_id, driver_id, offer_round, is_rescue_offer,
            rescue_priority_level, rescue_deadline_at,
            sent_at, expires_at, created_at
          ) VALUES (
            ${booking_id}::uuid,
            ${topCandidate.id}::uuid,
            COALESCE((SELECT MAX(offer_round) FROM dispatch_offers WHERE booking_id = ${booking_id}::uuid), 0) + 1,
            TRUE,
            ${booking.sla_protection_level ?? 'STANDARD'},
            ${new Date(Date.now() + 3 * 60000).toISOString()}::timestamptz,
            NOW(),
            ${new Date(Date.now() + 3 * 60000).toISOString()}::timestamptz,
            NOW()
          )
        `;
      } catch { /* non-blocking */ }

      // Log rescue assignment
      try {
        await sql`
          INSERT INTO dispatch_event_log (
            booking_id, driver_id, event_type, trigger_reason, sla_level, event_data, created_at
          ) VALUES (
            ${booking_id}::uuid,
            ${topCandidate.id}::uuid,
            'rescue_reassignment_started',
            ${isCritical ? 'sla_critical_auto_rescue' : 'admin_override_rescue'},
            ${booking.sla_protection_level ?? 'STANDARD'},
            ${JSON.stringify({
              rescue_driver: topCandidate.driver_code,
              rescue_driver_tier: topCandidate.driver_tier,
              rescue_driver_affiliation: topCandidate.legal_affiliation_type,
              rescue_driver_drs: topCandidate.reliability_score,
              auto_offer: autoOffer,
              admin_override,
              candidates_evaluated: candidates.length,
            })}::jsonb,
            NOW()
          )
        `;
      } catch { /* non-blocking */ }

      // ── BM7: Trigger client communication for reassignment ──
      try {
        const { triggerCommunication } = await import("@/lib/communication/trigger-engine");
        await triggerCommunication({
          booking_id,
          event_type: "driver_reassigned",
          trigger_source: isCritical ? "sla_critical_auto_rescue" : "admin_override_rescue",
          metadata: {
            new_driver_name: topCandidate.full_name,
            new_driver_phone: topCandidate.phone,
            rescue_tier: topCandidate.driver_tier,
          },
          db: sql,
        });
      } catch { /* non-blocking */ }

      return NextResponse.json({
        success: true,
        action: "rescue_assigned",
        rescue_driver: {
          id: topCandidate.id,
          driver_code: topCandidate.driver_code,
          full_name: topCandidate.full_name,
          phone: topCandidate.phone,
          legal_affiliation_type: topCandidate.legal_affiliation_type,
          reliability_score: topCandidate.reliability_score,
          driver_tier: topCandidate.driver_tier,
        },
        candidates_evaluated: candidates.length,
        auto_offer: autoOffer,
        booking_id,
      });
    }

    // ── For HIGH_RISK: return candidate list for admin to choose ──
    // Log rescue reassignment started
    try {
      await sql`
        INSERT INTO dispatch_event_log (
          booking_id, driver_id, event_type, trigger_reason, sla_level, event_data, created_at
        ) VALUES (
          ${booking_id}::uuid,
          ${topCandidate.id}::uuid,
          'rescue_reassignment_started',
          'sla_high_risk_rescue_candidates_prepared',
          ${booking.sla_protection_level ?? 'STANDARD'},
          ${JSON.stringify({
            candidates_count: candidates.length,
            top_candidate: topCandidate.driver_code,
          })}::jsonb,
          NOW()
        )
      `;
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      action: "candidates_ready",
      top_candidate: {
        id: topCandidate.id,
        driver_code: topCandidate.driver_code,
        full_name: topCandidate.full_name,
        phone: topCandidate.phone,
        legal_affiliation_type: topCandidate.legal_affiliation_type,
        reliability_score: topCandidate.reliability_score,
        driver_tier: topCandidate.driver_tier,
      },
      all_candidates: candidates.slice(0, 5).map((c: any) => ({
        id: c.id,
        driver_code: c.driver_code,
        full_name: c.full_name,
        legal_affiliation_type: c.legal_affiliation_type,
        reliability_score: c.reliability_score,
        driver_tier: c.driver_tier,
        is_eligible_for_airport_priority: c.is_eligible_for_airport_priority,
      })),
      candidates_evaluated: candidates.length,
      booking_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
