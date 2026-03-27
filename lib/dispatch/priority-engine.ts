/**
 * Smart Dispatch Priority Engine V1
 * Sottovento Luxury Network (SLN)
 *
 * Ranks eligible drivers for a given booking using 5 sequential steps:
 *
 *   STEP 1: Hard Eligibility Filter
 *           Exclude suspended/restricted drivers, missing/inactive vehicles,
 *           expired insurance/registration, and location-specific permit gates.
 *
 *   STEP 2: Lead Ownership Priority
 *           If source_driver_id exists and that driver passes Step 1,
 *           force them to rank #1 (source_driver_override = true).
 *
 *   STEP 3: Service Eligibility Filter
 *           Premium/corporate/VIP rides require is_eligible_for_premium_dispatch.
 *           Airport-priority rides require is_eligible_for_airport_priority.
 *           Standard rides allow all eligible drivers.
 *
 *   STEP 4: Reputation Ranking
 *           Score based on tier, total score, status, completion rate,
 *           acceptance rate, and contribution score.
 *
 *   STEP 5: Recent Behavior Penalty
 *           Subtract points for late cancels, complaints, and no-response
 *           timeouts in the last 7 days.
 *
 * Outputs:
 *   - Ordered list of RankedCandidate (dispatch_priority_rank, dispatch_priority_score)
 *   - Excluded list with excluded_reason per driver
 *   - Audit log payload for persistence
 */

import {
  checkVehicleEligibility,
  deriveServiceLocationType,
  type VehicleRecord,
  type ExclusionReason,
  type ServiceLocationType,
} from "@/lib/vehicles/gate";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type DriverStatus = "active" | "provisional" | "suspended" | "restricted" | "inactive";
export type ScoreTier    = "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "NEEDS_ATTENTION";
export type ServiceType  = "standard" | "premium" | "corporate" | "vip" | "airport_priority" | "";

export interface DriverCandidate {
  // Identity
  id:           string;
  driver_code:  string;
  full_name:    string;
  // Status
  driver_status: DriverStatus;
  // Scoring Engine V1 fields
  driver_score_total:               number;
  driver_score_tier:                string;
  is_eligible_for_premium_dispatch: boolean;
  is_eligible_for_airport_priority: boolean;
  rides_completed:                  number;
  on_time_rides:                    number;
  late_cancel_count:                number;
  complaint_count:                  number;
  // Recent behavior (last 7 days — computed by caller from audit_logs)
  late_cancel_recent:               number;  // late cancels in last 7d
  complaint_recent:                 number;  // complaints in last 7d
  no_response_recent:               number;  // offer timeouts in last 7d
  // Vehicle (primary vehicle record, null if none)
  vehicle:                          VehicleRecord | null;
}

export interface BookingContext {
  id:                  string;
  pickup_zone:         string;
  service_type:        ServiceType;
  source_driver_id:    string | null;  // UUID of the capturing driver
  service_location_type?: ServiceLocationType;
}

export interface RankedCandidate extends DriverCandidate {
  dispatch_priority_rank:   number;
  dispatch_priority_score:  number;
  priority_reason:          string;
  source_driver_override:   boolean;
  // Eligibility flags exposed to admin
  vehicle_eligibility_flags: {
    has_vehicle:       boolean;
    vehicle_active:    boolean;
    city_permit:       boolean;
    insurance:         boolean;
    registration:      boolean;
    mco_permit:        boolean;
    port_permit:       boolean;
  };
  service_eligibility_flags: {
    premium_eligible:  boolean;
    airport_eligible:  boolean;
    service_type_req:  ServiceType;
    passes:            boolean;
  };
}

export interface ExcludedCandidate {
  id:              string;
  driver_code:     string;
  full_name:       string;
  excluded_reason: string;
  excluded_step:   "hard_eligibility" | "service_eligibility";
}

export interface PriorityEngineResult {
  ranked:   RankedCandidate[];
  excluded: ExcludedCandidate[];
  source_driver_override: boolean;
  source_driver_id:       string | null;
  audit_payload:          object;
}

// ─── WEIGHTS ─────────────────────────────────────────────────────────────────

const TIER_WEIGHTS: Record<string, number> = {
  PLATINUM:        400,
  GOLD:            300,
  SILVER:          200,
  BRONZE:          100,
  NEEDS_ATTENTION: 50,
};

const STATUS_BONUS: Record<string, number> = {
  active:      20,
  provisional: 10,
};

const PENALTY = {
  late_cancel_recent:  -30,  // per occurrence (capped at 2)
  complaint_recent:    -40,  // per occurrence (capped at 1)
  no_response_recent:  -15,  // per occurrence (capped at 2)
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function completionRate(d: DriverCandidate): number {
  if (!d.rides_completed || d.rides_completed === 0) return 0;
  return (d.on_time_rides ?? 0) / d.rides_completed;
}

function buildVehicleFlags(
  vehicle: VehicleRecord | null,
  slt: ServiceLocationType | ""
): RankedCandidate["vehicle_eligibility_flags"] {
  if (!vehicle) {
    return {
      has_vehicle:    false,
      vehicle_active: false,
      city_permit:    false,
      insurance:      false,
      registration:   false,
      mco_permit:     false,
      port_permit:    false,
    };
  }
  return {
    has_vehicle:    true,
    vehicle_active: vehicle.vehicle_status === "active",
    city_permit:    vehicle.city_permit_status === "approved",
    insurance:      vehicle.insurance_status === "approved",
    registration:   vehicle.registration_status === "approved",
    mco_permit:     vehicle.airport_permit_mco_status === "approved",
    port_permit:    vehicle.port_permit_canaveral_status === "approved",
  };
}

function buildServiceFlags(
  d: DriverCandidate,
  serviceType: ServiceType
): RankedCandidate["service_eligibility_flags"] {
  const isPremiumReq = ["premium", "corporate", "vip"].includes(serviceType);
  const isAirportReq = serviceType === "airport_priority";
  let passes = true;
  if (isPremiumReq && !d.is_eligible_for_premium_dispatch) passes = false;
  if (isAirportReq && !d.is_eligible_for_airport_priority) passes = false;
  return {
    premium_eligible: d.is_eligible_for_premium_dispatch,
    airport_eligible: d.is_eligible_for_airport_priority,
    service_type_req: serviceType,
    passes,
  };
}

// ─── CORE ENGINE ─────────────────────────────────────────────────────────────

/**
 * Run the 5-step priority ranking for a given booking and candidate pool.
 */
export function runPriorityEngine(
  candidates: DriverCandidate[],
  booking:    BookingContext
): PriorityEngineResult {
  const excluded: ExcludedCandidate[] = [];
  const eligible: DriverCandidate[]   = [];

  // Resolve service location type once
  const slt: ServiceLocationType | "" =
    booking.service_location_type ??
    (deriveServiceLocationType(booking.pickup_zone) as ServiceLocationType | "");

  const serviceType: ServiceType = (booking.service_type as ServiceType) || "standard";

  // ── STEP 1: Hard Eligibility Filter ──────────────────────────────────────
  for (const d of candidates) {
    const reasons: string[] = [];

    // Driver status gate
    if (d.driver_status === "suspended" || d.driver_status === "restricted") {
      reasons.push(`driver_status_${d.driver_status}`);
    }

    // Vehicle gate
    if (!d.vehicle) {
      reasons.push("no_primary_vehicle");
    } else {
      if (d.vehicle.vehicle_status !== "active") reasons.push("vehicle_inactive");
      if (d.vehicle.insurance_status !== "approved") reasons.push("insurance_not_approved");
      if (d.vehicle.registration_status !== "approved") reasons.push("registration_not_approved");
      if (d.vehicle.city_permit_status !== "approved") reasons.push("city_permit_not_approved");

      // Location-specific permit gate (delegates to VEG module)
      if (slt === "airport_pickup_mco" || slt === "port_pickup_canaveral") {
        const gateResult = checkVehicleEligibility(d.vehicle, slt);
        if (!gateResult.eligible) {
          reasons.push(...gateResult.reasons.map((r: ExclusionReason) => `veg_${r}`));
        }
      }
    }

    if (reasons.length > 0) {
      excluded.push({
        id:              d.id,
        driver_code:     d.driver_code,
        full_name:       d.full_name,
        excluded_reason: reasons.join(", "),
        excluded_step:   "hard_eligibility",
      });
    } else {
      eligible.push(d);
    }
  }

  // ── STEP 2: Lead Ownership Priority ──────────────────────────────────────
  // Identify if source driver is in the eligible pool
  let sourceDriverOverride = false;
  let sourceDriverId: string | null = booking.source_driver_id ?? null;
  let sourceDriverIdx = -1;

  if (sourceDriverId) {
    sourceDriverIdx = eligible.findIndex(d => d.id === sourceDriverId);
    if (sourceDriverIdx !== -1) {
      sourceDriverOverride = true;
    } else {
      // Source driver was excluded or not in pool — fall back to general ranking
      sourceDriverId = null;
    }
  }

  // ── STEP 3: Service Eligibility Filter ───────────────────────────────────
  const serviceEligible: DriverCandidate[] = [];
  for (const d of eligible) {
    const svcFlags = buildServiceFlags(d, serviceType);
    if (!svcFlags.passes) {
      excluded.push({
        id:              d.id,
        driver_code:     d.driver_code,
        full_name:       d.full_name,
        excluded_reason: `service_eligibility_${serviceType}_not_met`,
        excluded_step:   "service_eligibility",
      });
    } else {
      serviceEligible.push(d);
    }
  }

  // ── STEP 4 + 5: Reputation Ranking + Recent Behavior Penalty ─────────────
  const scored = serviceEligible.map(d => {
    const tierWeight = TIER_WEIGHTS[d.driver_score_tier?.toUpperCase() ?? "BRONZE"] ?? 100;
    const statusBonus = STATUS_BONUS[d.driver_status] ?? 0;
    const scoreComponent = Math.min(d.driver_score_total ?? 0, 100); // cap at 100

    // Completion rate (0–100 scale)
    const compRate = completionRate(d) * 100;

    // Contribution component: source leads generated (capped at 20 pts)
    const contributionBonus = Math.min((d.rides_completed ?? 0) * 0.1, 20);

    // Base priority score (Step 4)
    let priorityScore =
      tierWeight +
      statusBonus +
      scoreComponent * 0.5 +
      compRate * 0.3 +
      contributionBonus;

    // Late cancel penalty (Step 5) — cap at 2 occurrences
    const lateCancelPenalty = Math.min(d.late_cancel_recent ?? 0, 2) * PENALTY.late_cancel_recent;
    // Complaint penalty (Step 5) — cap at 1 occurrence
    const complaintPenalty = Math.min(d.complaint_recent ?? 0, 1) * PENALTY.complaint_recent;
    // No-response penalty (Step 5) — cap at 2 occurrences
    const noResponsePenalty = Math.min(d.no_response_recent ?? 0, 2) * PENALTY.no_response_recent;

    priorityScore += lateCancelPenalty + complaintPenalty + noResponsePenalty;

    // Build reason string
    const reasons: string[] = [];
    if (d.driver_score_tier) reasons.push(`tier:${d.driver_score_tier}`);
    if (d.driver_status === "active") reasons.push("status:active");
    if (d.driver_status === "provisional") reasons.push("status:provisional");
    if (d.is_eligible_for_premium_dispatch) reasons.push("premium_eligible");
    if (d.is_eligible_for_airport_priority) reasons.push("airport_eligible");
    if (lateCancelPenalty < 0) reasons.push(`late_cancel_penalty:${lateCancelPenalty}`);
    if (complaintPenalty < 0) reasons.push(`complaint_penalty:${complaintPenalty}`);
    if (noResponsePenalty < 0) reasons.push(`no_response_penalty:${noResponsePenalty}`);

    return {
      driver:        d,
      priorityScore: Math.round(priorityScore * 100) / 100,
      reason:        reasons.join(" | "),
    };
  });

  // Sort: source driver first (if override), then by priorityScore DESC
  scored.sort((a, b) => {
    if (sourceDriverOverride) {
      if (a.driver.id === sourceDriverId) return -1;
      if (b.driver.id === sourceDriverId) return 1;
    }
    return b.priorityScore - a.priorityScore;
  });

  // Build final ranked list
  const ranked: RankedCandidate[] = scored.map((s, idx) => {
    const isSourceOverride = sourceDriverOverride && s.driver.id === sourceDriverId;
    const vehicleFlags = buildVehicleFlags(s.driver.vehicle, slt);
    const serviceFlags = buildServiceFlags(s.driver, serviceType);

    return {
      ...s.driver,
      dispatch_priority_rank:    idx + 1,
      dispatch_priority_score:   s.priorityScore,
      priority_reason:           isSourceOverride
        ? `SOURCE_DRIVER_OVERRIDE | ${s.reason}`
        : s.reason,
      source_driver_override:    isSourceOverride,
      vehicle_eligibility_flags: vehicleFlags,
      service_eligibility_flags: serviceFlags,
    };
  });

  // ── Audit payload ─────────────────────────────────────────────────────────
  const audit_payload = {
    engine:               "SmartDispatchPriorityEngineV1",
    booking_id:           booking.id,
    service_location_type: slt,
    service_type:         serviceType,
    source_driver_id:     booking.source_driver_id,
    source_driver_override: sourceDriverOverride,
    total_candidates:     candidates.length,
    eligible_count:       serviceEligible.length,
    excluded_count:       excluded.length,
    ranked_count:         ranked.length,
    top_candidate:        ranked[0]
      ? {
          id:                      ranked[0].id,
          driver_code:             ranked[0].driver_code,
          dispatch_priority_score: ranked[0].dispatch_priority_score,
          source_driver_override:  ranked[0].source_driver_override,
        }
      : null,
    excluded_summary: excluded.map(e => ({
      driver_code:     e.driver_code,
      excluded_reason: e.excluded_reason,
      excluded_step:   e.excluded_step,
    })),
    timestamp: new Date().toISOString(),
  };

  return {
    ranked,
    excluded,
    source_driver_override: sourceDriverOverride,
    source_driver_id:       sourceDriverId,
    audit_payload,
  };
}
