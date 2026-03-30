export const dynamic = "force-dynamic"
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/admin/companies/[id]/reputation-score
//
// Affiliate Company Reputation Score — Phase 2
// SLN Architectural Convergence
//
// Aggregates driver-level signals into a company-level score:
//
//   Component                  Weight
//   ─────────────────────────  ──────
//   avg_driver_score_total      35%
//   completion_rate             25%
//   on_time_rate                20%
//   vehicle_eligibility_rate    10%
//   response_speed_score        10%
//
// company_tier_label:
//   PLATINUM  ≥ 90
//   GOLD      ≥ 75
//   SILVER    ≥ 60
//   NEEDS_ATTENTION < 60
//
// Does NOT modify any driver scores, payout logic, or dispatch routing.
// ============================================================

const WEIGHTS = {
  avg_driver_score:     0.35,
  completion_rate:      0.25,
  on_time_rate:         0.20,
  vehicle_eligibility:  0.10,
  response_speed:       0.10,
} as const;

function computeTierLabel(score: number): string {
  if (score >= 90) return "PLATINUM";
  if (score >= 75) return "GOLD";
  if (score >= 60) return "SILVER";
  return "NEEDS_ATTENTION";
}

function computeTierColor(tier: string): string {
  switch (tier) {
    case "PLATINUM":        return "#e5e4e2";
    case "GOLD":            return "#c9a84c";
    case "SILVER":          return "#9ca3af";
    case "NEEDS_ATTENTION": return "#f87171";
    default:                return "#888";
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;

  if (!companyId) {
    return NextResponse.json({ error: "company_id required" }, { status: 400 });
  }

  try {
    // ── Company metadata ──────────────────────────────────────
    const companyRows = await sql`
      SELECT id, name, brand_name, status
      FROM partner_companies
      WHERE id = ${companyId}::uuid
    `;

    if (companyRows.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const company = companyRows[0];

    // ── Driver aggregate signals ──────────────────────────────
    const driverRows = await sql`
      SELECT
        COUNT(*)::integer                                             AS driver_count,
        COALESCE(AVG(COALESCE(driver_score_total, 75)), 75)::numeric AS avg_driver_score,
        COALESCE(SUM(rides_completed), 0)::integer                   AS total_rides,
        COALESCE(SUM(on_time_rides), 0)::integer                     AS total_on_time,
        COALESCE(SUM(late_cancel_count), 0)::integer                 AS total_late_cancels,
        COALESCE(SUM(complaint_count), 0)::integer                   AS total_complaints,
        COUNT(CASE WHEN driver_status = 'active' THEN 1 END)::integer     AS active_count,
        COUNT(CASE WHEN driver_status = 'provisional' THEN 1 END)::integer AS provisional_count,
        COUNT(CASE WHEN driver_status IN ('suspended','restricted') THEN 1 END)::integer AS inactive_count
      FROM drivers
      WHERE company_id = ${companyId}::uuid
    `;

    const dr = driverRows[0] ?? {};
    const driverCount    = dr.driver_count ?? 0;
    const totalRides     = dr.total_rides ?? 0;
    const totalOnTime    = dr.total_on_time ?? 0;
    const totalLateCancels = dr.total_late_cancels ?? 0;
    const avgDriverScore = parseFloat(dr.avg_driver_score ?? "75");

    // ── Vehicle eligibility aggregate ─────────────────────────
    const vehicleRows = await sql`
      SELECT
        COUNT(*)::integer AS total_vehicles,
        COUNT(CASE WHEN
          vehicle_status = 'active'
          AND city_permit_status = 'approved'
          AND insurance_status = 'approved'
          AND registration_status = 'approved'
        THEN 1 END)::integer AS fully_compliant_vehicles
      FROM vehicles
      WHERE
        company_id = ${companyId}::uuid
        OR driver_id IN (SELECT id FROM drivers WHERE company_id = ${companyId}::uuid)
    `;

    const vr = vehicleRows[0] ?? {};
    const totalVehicles     = vr.total_vehicles ?? 0;
    const compliantVehicles = vr.fully_compliant_vehicles ?? 0;

    // ── Response speed proxy ──────────────────────────────────
    // Use no_response_offer_timeout events in last 30 days as a penalty signal
    const responseRows = await sql`
      SELECT COUNT(*)::integer AS no_response_count
      FROM audit_logs al
      INNER JOIN drivers d ON al.entity_id = d.id
      WHERE d.company_id = ${companyId}::uuid
        AND al.action = 'no_response_offer_timeout'
        AND al.created_at >= NOW() - INTERVAL '30 days'
    `;

    const noResponseCount = responseRows[0]?.no_response_count ?? 0;

    // ── Component scores (0–100 each) ─────────────────────────

    // 1. Avg driver score component (already 0–100 scale)
    const driverScoreComponent = Math.min(100, Math.max(0, avgDriverScore));

    // 2. Completion rate component
    const completionRateComponent =
      totalRides > 0
        ? Math.min(100, Math.round(((totalRides - totalLateCancels) / totalRides) * 100))
        : 80; // neutral default for new companies

    // 3. On-time rate component
    const onTimeRateComponent =
      totalRides > 0
        ? Math.min(100, Math.round((totalOnTime / totalRides) * 100))
        : 80;

    // 4. Vehicle eligibility compliance component
    const vehicleEligibilityComponent =
      totalVehicles > 0
        ? Math.min(100, Math.round((compliantVehicles / totalVehicles) * 100))
        : 80;

    // 5. Response speed component (penalize no-response events)
    //    Start at 100, deduct 5 per no-response event in last 30 days
    const responseSpeedComponent = Math.max(0, 100 - noResponseCount * 5);

    // ── Weighted company score ────────────────────────────────
    const companyScore = Math.round(
      driverScoreComponent     * WEIGHTS.avg_driver_score   +
      completionRateComponent  * WEIGHTS.completion_rate    +
      onTimeRateComponent      * WEIGHTS.on_time_rate       +
      vehicleEligibilityComponent * WEIGHTS.vehicle_eligibility +
      responseSpeedComponent   * WEIGHTS.response_speed
    );

    const companyTierLabel = computeTierLabel(companyScore);
    const tierColor        = computeTierColor(companyTierLabel);

    // ── Score breakdown ───────────────────────────────────────
    const scoreBreakdown = {
      driver_score_component: {
        raw:    avgDriverScore,
        score:  Math.round(driverScoreComponent),
        weight: WEIGHTS.avg_driver_score,
        contribution: Math.round(driverScoreComponent * WEIGHTS.avg_driver_score),
      },
      completion_rate_component: {
        raw:    completionRateComponent,
        score:  completionRateComponent,
        weight: WEIGHTS.completion_rate,
        contribution: Math.round(completionRateComponent * WEIGHTS.completion_rate),
      },
      on_time_rate_component: {
        raw:    onTimeRateComponent,
        score:  onTimeRateComponent,
        weight: WEIGHTS.on_time_rate,
        contribution: Math.round(onTimeRateComponent * WEIGHTS.on_time_rate),
      },
      vehicle_eligibility_component: {
        raw:    vehicleEligibilityComponent,
        score:  vehicleEligibilityComponent,
        weight: WEIGHTS.vehicle_eligibility,
        contribution: Math.round(vehicleEligibilityComponent * WEIGHTS.vehicle_eligibility),
      },
      response_speed_component: {
        raw:    responseSpeedComponent,
        score:  responseSpeedComponent,
        weight: WEIGHTS.response_speed,
        contribution: Math.round(responseSpeedComponent * WEIGHTS.response_speed),
      },
    };

    // ── Fleet summary ─────────────────────────────────────────
    const fleetSummary = {
      driver_count:         driverCount,
      active_drivers:       dr.active_count ?? 0,
      provisional_drivers:  dr.provisional_count ?? 0,
      inactive_drivers:     dr.inactive_count ?? 0,
      total_rides:          totalRides,
      total_vehicles:       totalVehicles,
      compliant_vehicles:   compliantVehicles,
      total_complaints:     dr.total_complaints ?? 0,
      total_late_cancels:   totalLateCancels,
      no_response_30d:      noResponseCount,
    };

    return NextResponse.json({
      company_id:          companyId,
      company_name:        company.name,
      company_brand:       company.brand_name,
      company_status:      company.status,
      company_score:       companyScore,
      company_tier_label:  companyTierLabel,
      tier_color:          tierColor,
      score_breakdown:     scoreBreakdown,
      fleet_summary:       fleetSummary,
      computed_at:         new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
