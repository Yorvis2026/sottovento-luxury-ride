export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getRecommendedActions } from "@/lib/airport/flight-intelligence-engine";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// GET /api/admin/airport-queue
// BM8: Airport Intelligence Layer — LIVE-FIRST
// Returns all airport bookings under active monitoring,
// with flight data, validation status, phase, SLA state,
// and recommended actions.
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // ── Active airport bookings ──────────────────────────────
    const activeAirport = await sql`
      SELECT
        b.id,
        b.booking_ref,
        b.status,
        b.dispatch_status,
        b.pickup_at,
        b.pickup_address,
        b.dropoff_address,
        b.flight_number,
        b.airport_code,
        b.airline_code,
        b.terminal_code,
        b.gate_info,
        b.baggage_claim_zone,
        b.scheduled_arrival_at,
        b.estimated_arrival_at,
        b.actual_arrival_at,
        b.flight_delay_minutes,
        b.airport_phase,
        b.airport_intelligence_status,
        b.airport_monitoring_enabled,
        b.airport_irregularity_flag,
        b.flight_validation_status,
        b.flight_validation_message,
        b.flight_validation_attempted_at,
        b.flight_provider_used,
        b.manual_flight_review_required,
        b.operational_pickup_target_at,
        b.operational_monitoring_start_at,
        b.operational_driver_release_at,
        b.flight_lookup_last_at,
        b.flight_lookup_source,
        b.sla_current_state,
        b.sla_protection_level,
        b.airport_admin_notes,
        b.airport_last_action,
        b.total_price,
        b.assigned_driver_id,
        cl.full_name   AS client_name,
        cl.phone       AS client_phone,
        cl.email       AS client_email,
        d.full_name    AS driver_name,
        d.driver_code  AS driver_code,
        d.phone        AS driver_phone
      FROM bookings b
      LEFT JOIN clients cl ON b.client_id = cl.id
      LEFT JOIN drivers d  ON b.assigned_driver_id = d.id
      WHERE b.status NOT IN ('completed', 'cancelled', 'archived')
        AND (
          b.airport_monitoring_enabled = TRUE
          OR b.airport_code IS NOT NULL
          OR b.flight_number IS NOT NULL
          OR b.airport_irregularity_flag = TRUE
          OR b.manual_flight_review_required = TRUE
          OR LOWER(b.pickup_address) LIKE '%airport%'
          OR LOWER(b.pickup_address) LIKE '%mco%'
          OR LOWER(b.pickup_address) LIKE '%jeff fuqua%'
          OR LOWER(b.dropoff_address) LIKE '%airport%'
          OR LOWER(b.dropoff_address) LIKE '%mco%'
        )
      ORDER BY
        -- Irregulars and manual review first
        CASE WHEN b.airport_irregularity_flag = TRUE THEN 0
             WHEN b.manual_flight_review_required = TRUE THEN 1
             WHEN b.airport_intelligence_status = 'delayed' THEN 2
             WHEN b.airport_intelligence_status = 'landed' THEN 3
             ELSE 4
        END,
        b.pickup_at ASC NULLS LAST
    `;

    // ── Stats ────────────────────────────────────────────────
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE airport_monitoring_enabled = TRUE)                             AS monitoring_active,
        COUNT(*) FILTER (WHERE airport_intelligence_status = 'delayed')                       AS delayed_count,
        COUNT(*) FILTER (WHERE airport_intelligence_status = 'landed')                        AS landed_count,
        COUNT(*) FILTER (WHERE airport_irregularity_flag = TRUE)                              AS irregular_count,
        COUNT(*) FILTER (WHERE manual_flight_review_required = TRUE)                          AS manual_review_count,
        COUNT(*) FILTER (WHERE flight_validation_status = 'verified')                         AS verified_count,
        COUNT(*) FILTER (WHERE flight_validation_status = 'not_found')                        AS not_found_count,
        COUNT(*) FILTER (WHERE flight_validation_status = 'provider_unavailable')             AS provider_unavailable_count,
        COUNT(*) FILTER (WHERE flight_validation_status = 'invalid_format')                   AS invalid_format_count,
        COUNT(*) FILTER (WHERE airport_intelligence_status IN ('cancelled','diverted'))       AS cancelled_diverted
      FROM bookings
      WHERE status NOT IN ('completed', 'cancelled', 'archived')
        AND (
          airport_monitoring_enabled = TRUE
          OR airport_code IS NOT NULL
          OR flight_number IS NOT NULL
          OR airport_irregularity_flag = TRUE
          OR manual_flight_review_required = TRUE
        )
    `;

    // ── Compute recommended actions ──────────────────────────
    const enriched = activeAirport.map((b: Record<string, unknown>) => {
      const phase = (b.airport_phase as string | null) ?? "pre_arrival";
      const validationStatus = (b.flight_validation_status as any) ?? "pending_customer_update";
      const isIrregular = (b.airport_irregularity_flag as boolean) ?? false;

      const recommendedActions = getRecommendedActions(
        phase as any,
        validationStatus,
        isIrregular
      );

      // Add additional actions based on state
      if (!b.flight_number) recommendedActions.push("add_flight_number");
      if (!b.airport_monitoring_enabled) recommendedActions.push("enable_monitoring");
      if (!b.assigned_driver_id) recommendedActions.push("assign_driver");
      if (b.flight_number && !b.flight_lookup_last_at) recommendedActions.push("run_flight_lookup");

      return {
        ...b,
        recommended_actions: [...new Set(recommendedActions)], // deduplicate
      };
    });

    return NextResponse.json({
      airport_bookings: enriched,
      stats: stats[0] ?? {},
      mode: process.env.AIRPORT_INTELLIGENCE_MODE ?? "live_primary",
      providers: {
        primary: "FlightAware AeroAPI",
        secondary: "aviationstack",
        fallback: "sandbox_simulation",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    console.error("[airport-queue] Error:", e);
    return NextResponse.json(
      { error: "Internal server error", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
