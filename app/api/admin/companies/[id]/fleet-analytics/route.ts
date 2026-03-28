import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/admin/companies/[id]/fleet-analytics
//
// Affiliate Company Fleet Dashboard Layer — Phase 2
// SLN Architectural Convergence
//
// Returns read-only analytics for a partner_company:
//   1. Driver performance (filtered by company_id)
//   2. Vehicle performance (filtered by company_id)
//   3. Network revenue analytics (informational only)
//   4. Fleet health indicators / alerts
//
// Does NOT modify:
//   - fee_split_strategy / executor_share_amount
//   - payout_status
//   - vehicle eligibility gates
//   - dispatch priority engine
//   - cancellation workflow
// ============================================================

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params;

  if (!companyId) {
    return NextResponse.json({ error: "company_id required" }, { status: 400 });
  }

  try {
    // ── 1. Company metadata ───────────────────────────────────
    const companyRows = await sql`
      SELECT
        pc.id,
        pc.name,
        pc.brand_name,
        pc.master_ref_code,
        pc.commission_split_company,
        pc.commission_split_staff,
        pc.status,
        pc.created_at
      FROM partner_companies pc
      WHERE pc.id = ${companyId}::uuid
    `;

    if (companyRows.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const company = companyRows[0];

    // ── 2. Driver performance ─────────────────────────────────
    // Drivers linked via drivers.company_id
    const driverRows = await sql`
      SELECT
        d.id,
        d.full_name                                                   AS driver_name,
        d.driver_code,
        d.driver_status,
        d.driver_score_tier,
        COALESCE(d.driver_score_total, 75)::integer                   AS driver_score_total,
        COALESCE(d.rides_completed, 0)::integer                       AS rides_completed,
        COALESCE(d.on_time_rides, 0)::integer                         AS on_time_rides,
        COALESCE(d.late_cancel_count, 0)::integer                     AS late_cancel_count,
        COALESCE(d.complaint_count, 0)::integer                       AS complaint_count,
        COALESCE(d.is_eligible_for_premium_dispatch, false)           AS is_eligible_for_premium_dispatch,
        COALESCE(d.is_eligible_for_airport_priority, false)           AS is_eligible_for_airport_priority,
        d.driver_status                                               AS status,
        d.provisional_completed_rides,
        d.provisional_ends_at,
        d.created_at
      FROM drivers d
      WHERE d.company_id = ${companyId}::uuid
      ORDER BY d.driver_score_total DESC NULLS LAST, d.rides_completed DESC
    `;

    // Compute derived metrics per driver
    const drivers = driverRows.map((d: any) => {
      const completionRate =
        d.rides_completed > 0
          ? Math.round(((d.rides_completed - d.late_cancel_count) / d.rides_completed) * 100)
          : null;
      const onTimeRate =
        d.rides_completed > 0
          ? Math.round((d.on_time_rides / d.rides_completed) * 100)
          : null;

      return {
        id:                             d.id,
        driver_name:                    d.driver_name,
        driver_code:                    d.driver_code,
        driver_status:                  d.driver_status,
        current_score_tier:             d.driver_score_tier ?? "GOLD",
        driver_score_total:             d.driver_score_total,
        rides_completed:                d.rides_completed,
        completion_rate:                completionRate,
        on_time_rate:                   onTimeRate,
        late_cancel_count:              d.late_cancel_count,
        complaint_count:                d.complaint_count,
        is_eligible_for_premium_dispatch: d.is_eligible_for_premium_dispatch,
        is_eligible_for_airport_priority: d.is_eligible_for_airport_priority,
        provisional_completed_rides:    d.provisional_completed_rides ?? 0,
        provisional_ends_at:            d.provisional_ends_at ?? null,
        is_provisional:                 d.driver_status === "provisional",
        created_at:                     d.created_at,
      };
    });

    // ── 3. Vehicle performance ────────────────────────────────
    // Vehicles linked via vehicles.company_id OR via driver.company_id
    const vehicleRows = await sql`
      SELECT
        v.id,
        v.make,
        v.model,
        v.plate,
        v.year,
        v.vehicle_status,
        v.city_permit_status,
        v.airport_permit_mco_status,
        v.port_permit_canaveral_status,
        v.insurance_status,
        v.registration_status,
        v.is_primary,
        v.driver_id,
        v.company_id,
        v.verified_at,
        v.expires_at,
        v.created_at,
        d.full_name                   AS driver_name,
        d.driver_code                 AS driver_code,
        -- Rides completed via this vehicle (bookings assigned to this vehicle's driver)
        COALESCE(
          (SELECT COUNT(*)::integer
           FROM bookings b
           WHERE b.assigned_driver_id = v.driver_id
             AND b.status = 'completed'),
          0
        )                             AS rides_completed
      FROM vehicles v
      LEFT JOIN drivers d ON v.driver_id = d.id
      WHERE
        v.company_id = ${companyId}::uuid
        OR (v.driver_id IN (
          SELECT id FROM drivers WHERE company_id = ${companyId}::uuid
        ))
      ORDER BY v.is_primary DESC, v.created_at ASC
    `;

    const vehicles = vehicleRows.map((v: any) => {
      // Eligibility flags
      const allPermits = [
        v.city_permit_status,
        v.airport_permit_mco_status,
        v.port_permit_canaveral_status,
        v.insurance_status,
        v.registration_status,
      ];
      const airportEligible =
        v.vehicle_status === "active" &&
        v.airport_permit_mco_status === "approved" &&
        v.city_permit_status === "approved" &&
        v.insurance_status === "approved" &&
        v.registration_status === "approved";
      const portEligible =
        v.vehicle_status === "active" &&
        v.port_permit_canaveral_status === "approved" &&
        v.city_permit_status === "approved" &&
        v.insurance_status === "approved" &&
        v.registration_status === "approved";

      const hasExpired  = allPermits.some((s: string) => s === "expired");
      const hasPending  = allPermits.some((s: string) => s === "pending");
      const hasRejected = allPermits.some((s: string) => s === "rejected");

      // Document status summary
      let documentStatus: string;
      if (hasExpired || hasRejected)       documentStatus = "requires_action";
      else if (hasPending)                 documentStatus = "pending_review";
      else if (v.vehicle_status !== "active") documentStatus = "inactive";
      else                                 documentStatus = "compliant";

      // Availability index: 0–100 based on how many permits are approved
      const approvedCount = allPermits.filter((s: string) => s === "approved").length;
      const availabilityIndex = Math.round((approvedCount / allPermits.length) * 100);

      return {
        id:                            v.id,
        vehicle_model:                 `${v.year ?? ""} ${v.make} ${v.model}`.trim(),
        plate:                         v.plate,
        vehicle_status:                v.vehicle_status,
        rides_completed:               v.rides_completed,
        airport_eligibility_status:    airportEligible ? "eligible" : "not_eligible",
        port_eligibility_status:       portEligible    ? "eligible" : "not_eligible",
        document_status:               documentStatus,
        availability_index:            availabilityIndex,
        city_permit_status:            v.city_permit_status,
        airport_permit_mco_status:     v.airport_permit_mco_status,
        port_permit_canaveral_status:  v.port_permit_canaveral_status,
        insurance_status:              v.insurance_status,
        registration_status:           v.registration_status,
        is_primary:                    v.is_primary,
        driver_name:                   v.driver_name ?? null,
        driver_code:                   v.driver_code ?? null,
        verified_at:                   v.verified_at ?? null,
        expires_at:                    v.expires_at ?? null,
        created_at:                    v.created_at,
      };
    });

    // ── 4. Network revenue analytics (informational only) ─────
    // Aggregate from bookings where assigned driver belongs to this company
    const revenueRows = await sql`
      SELECT
        COUNT(b.id)::integer                                          AS total_rides,
        COALESCE(SUM(b.total_price), 0)::numeric                     AS total_revenue,
        COALESCE(SUM(b.executor_share_amount), 0)::numeric           AS total_executor_share,
        COALESCE(SUM(b.source_driver_share_amount), 0)::numeric      AS total_source_share,
        COALESCE(SUM(b.platform_share_amount), 0)::numeric           AS total_platform_share,
        COALESCE(AVG(b.total_price), 0)::numeric                     AS avg_ride_value,
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::integer  AS completed_rides,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)::integer  AS cancelled_rides,
        COUNT(CASE WHEN b.created_at >= date_trunc('month', NOW()) THEN 1 END)::integer AS rides_mtd,
        COALESCE(SUM(CASE WHEN b.created_at >= date_trunc('month', NOW()) THEN b.total_price ELSE 0 END), 0)::numeric AS revenue_mtd
      FROM bookings b
      INNER JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE d.company_id = ${companyId}::uuid
        AND b.status IN ('completed', 'cancelled', 'in_progress')
    `;

    const rev = revenueRows[0] ?? {};
    const driverCount  = drivers.length;
    const vehicleCount = vehicles.length;

    const revenueAnalytics = {
      total_rides:                  rev.total_rides ?? 0,
      completed_rides:              rev.completed_rides ?? 0,
      cancelled_rides:              rev.cancelled_rides ?? 0,
      rides_mtd:                    rev.rides_mtd ?? 0,
      total_revenue:                parseFloat(rev.total_revenue ?? "0"),
      revenue_mtd:                  parseFloat(rev.revenue_mtd ?? "0"),
      avg_ride_value:               parseFloat(rev.avg_ride_value ?? "0"),
      total_executor_share:         parseFloat(rev.total_executor_share ?? "0"),
      total_source_share:           parseFloat(rev.total_source_share ?? "0"),
      total_platform_share:         parseFloat(rev.total_platform_share ?? "0"),
      rides_completed_per_driver:
        driverCount > 0 ? Math.round((rev.completed_rides ?? 0) / driverCount) : 0,
      rides_completed_per_vehicle:
        vehicleCount > 0 ? Math.round((rev.completed_rides ?? 0) / vehicleCount) : 0,
      // Estimated network-generated revenue = executor share (display only)
      estimated_network_revenue:    parseFloat(rev.total_executor_share ?? "0"),
    };

    // ── 5. Fleet health indicators / alerts ───────────────────
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const alerts: {
      type: string;
      severity: "critical" | "warning" | "info";
      entity_type: "driver" | "vehicle";
      entity_id: string;
      entity_name: string;
      message: string;
    }[] = [];

    // Driver alerts
    for (const d of drivers) {
      if (d.complaint_count >= 2) {
        alerts.push({
          type:        "active_complaints",
          severity:    "critical",
          entity_type: "driver",
          entity_id:   d.id,
          entity_name: d.driver_name,
          message:     `${d.complaint_count} active complaint(s) — score impact risk`,
        });
      }
      if (d.late_cancel_count >= 2) {
        alerts.push({
          type:        "late_cancellations",
          severity:    "warning",
          entity_type: "driver",
          entity_id:   d.id,
          entity_name: d.driver_name,
          message:     `${d.late_cancel_count} late cancellation(s) in record`,
        });
      }
      if (d.driver_status === "provisional" && d.provisional_ends_at) {
        const endsAt = new Date(d.provisional_ends_at);
        if (endsAt <= thirtyDaysFromNow) {
          alerts.push({
            type:        "provisional_expiring",
            severity:    "info",
            entity_type: "driver",
            entity_id:   d.id,
            entity_name: d.driver_name,
            message:     `Provisional window ends ${endsAt.toLocaleDateString()} — ${d.provisional_completed_rides}/10 rides completed`,
          });
        }
      }
      if (d.driver_status === "suspended" || d.driver_status === "restricted") {
        alerts.push({
          type:        "inactive_driver",
          severity:    "critical",
          entity_type: "driver",
          entity_id:   d.id,
          entity_name: d.driver_name,
          message:     `Driver status: ${d.driver_status} — excluded from dispatch`,
        });
      }
    }

    // Vehicle alerts
    for (const v of vehicles) {
      if (v.insurance_status === "expired" || v.insurance_status === "rejected") {
        alerts.push({
          type:        "insurance_issue",
          severity:    "critical",
          entity_type: "vehicle",
          entity_id:   v.id,
          entity_name: v.vehicle_model,
          message:     `Insurance status: ${v.insurance_status} — vehicle excluded from dispatch`,
        });
      }
      if (v.registration_status === "expired" || v.registration_status === "rejected") {
        alerts.push({
          type:        "registration_issue",
          severity:    "critical",
          entity_type: "vehicle",
          entity_id:   v.id,
          entity_name: v.vehicle_model,
          message:     `Registration status: ${v.registration_status} — vehicle excluded from dispatch`,
        });
      }
      if (v.city_permit_status === "pending" || v.city_permit_status === "expired") {
        alerts.push({
          type:        "missing_city_permit",
          severity:    v.city_permit_status === "expired" ? "critical" : "warning",
          entity_type: "vehicle",
          entity_id:   v.id,
          entity_name: v.vehicle_model,
          message:     `City permit: ${v.city_permit_status} — vehicle may be ineligible for dispatch`,
        });
      }
      if (v.airport_permit_mco_status === "pending") {
        alerts.push({
          type:        "missing_airport_permit_mco",
          severity:    "warning",
          entity_type: "vehicle",
          entity_id:   v.id,
          entity_name: v.vehicle_model,
          message:     `MCO airport permit pending — vehicle excluded from airport pickups`,
        });
      }
      if (v.port_permit_canaveral_status === "pending") {
        alerts.push({
          type:        "missing_port_permit_canaveral",
          severity:    "warning",
          entity_type: "vehicle",
          entity_id:   v.id,
          entity_name: v.vehicle_model,
          message:     `Port Canaveral permit pending — vehicle excluded from port pickups`,
        });
      }
      if (v.vehicle_status !== "active") {
        alerts.push({
          type:        "inactive_vehicle",
          severity:    "warning",
          entity_type: "vehicle",
          entity_id:   v.id,
          entity_name: v.vehicle_model,
          message:     `Vehicle status: ${v.vehicle_status} — excluded from dispatch`,
        });
      }
      // Expiring documents (expires_at within 30 days)
      if (v.expires_at) {
        const expiresAt = new Date(v.expires_at);
        if (expiresAt > now && expiresAt <= thirtyDaysFromNow) {
          alerts.push({
            type:        "documents_expiring_soon",
            severity:    "warning",
            entity_type: "vehicle",
            entity_id:   v.id,
            entity_name: v.vehicle_model,
            message:     `Vehicle documents expire on ${expiresAt.toLocaleDateString()} — renewal required`,
          });
        }
      }
    }

    // Sort alerts: critical first
    alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    // ── 6. Fleet health summary ───────────────────────────────
    const activeVehicles   = vehicles.filter(v => v.vehicle_status === "active").length;
    const mcoEligible      = vehicles.filter(v => v.airport_eligibility_status === "eligible").length;
    const portEligible     = vehicles.filter(v => v.port_eligibility_status === "eligible").length;
    const compliantVehicles = vehicles.filter(v => v.document_status === "compliant").length;
    const activeDrivers    = drivers.filter(d => d.driver_status === "active").length;
    const provisionalDrivers = drivers.filter(d => d.driver_status === "provisional").length;
    const premiumEligible  = drivers.filter(d => d.is_eligible_for_premium_dispatch).length;
    const airportPriorityEligible = drivers.filter(d => d.is_eligible_for_airport_priority).length;

    const fleetHealth = {
      total_drivers:              driverCount,
      active_drivers:             activeDrivers,
      provisional_drivers:        provisionalDrivers,
      premium_eligible_drivers:   premiumEligible,
      airport_priority_drivers:   airportPriorityEligible,
      total_vehicles:             vehicleCount,
      active_vehicles:            activeVehicles,
      mco_eligible_vehicles:      mcoEligible,
      port_eligible_vehicles:     portEligible,
      compliant_vehicles:         compliantVehicles,
      critical_alerts:            alerts.filter(a => a.severity === "critical").length,
      warning_alerts:             alerts.filter(a => a.severity === "warning").length,
      info_alerts:                alerts.filter(a => a.severity === "info").length,
    };

    return NextResponse.json({
      company,
      drivers,
      vehicles,
      revenue_analytics: revenueAnalytics,
      fleet_health:      fleetHealth,
      alerts,
      generated_at:      new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
