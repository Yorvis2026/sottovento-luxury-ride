/**
 * Smart Dispatch Priority Engine V2 — Bloque Maestro 5
 * Sottovento Luxury Network (SLN)
 *
 * Ranks eligible drivers for a given booking using 6 sequential steps:
 *
 *   STEP 0: Capture Priority Protection (ABSOLUTE RULE)
 *           If booking.source_driver_id exists and driver passes Step 1,
 *           they are ALWAYS ranked #1. No exception.
 *           Never overridden by reliability_score, partner_type, legal_affiliation,
 *           distance, or vehicle_rank.
 *
 *   STEP 1: Hard Eligibility Filter
 *           Exclude suspended/restricted drivers, missing/inactive vehicles,
 *           expired insurance/registration, and location-specific permit gates.
 *
 *   STEP 2: Legal Affiliation Priority Group
 *           Groups drivers by legal_affiliation_type:
 *             1. SOTTOVENTO_LEGAL_FLEET (highest structural priority)
 *             2. PARTNER_LEGAL_FLEET (if partner_dispatch_mode = SUBNETWORK_PRIORITY)
 *             3. GENERAL_NETWORK_DRIVER
 *
 *   STEP 3: Service Eligibility Filter
 *           Premium/corporate/VIP rides require is_eligible_for_premium_dispatch.
 *           Airport-priority rides require is_eligible_for_airport_priority.
 *
 *   STEP 4: Reliability Score Ranking (DRS)
 *           Within each affiliation group, rank by:
 *             reliability_score DESC → vehicle_match_score → ETA ASC
 *
 *   STEP 5: Recent Behavior Penalty
 *           Subtract points for late cancels, complaints, and no-response
 *           timeouts in the last 7 days.
 *
 * Booking Source Rules:
 *   - sottovento_direct: SOTTOVENTO_LEGAL_FLEET → SOTTOVENTO_UMBRELLA → GENERAL_NETWORK
 *     (excludes partner_subnetwork_priority unless explicitly enabled)
 *   - source_partner_id exists: captured_driver_partner → partner_drivers (if SUBNETWORK_PRIORITY) → general
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
export type LegalAffiliationType = "SOTTOVENTO_LEGAL_FLEET" | "PARTNER_LEGAL_FLEET" | "GENERAL_NETWORK_DRIVER";
export type DriverTier   = "ELITE" | "PREMIUM" | "STANDARD" | "RESTRICTED" | "OBSERVATION";
export type PartnerDispatchMode = "CAPTURE_ONLY" | "SUBNETWORK_PRIORITY";

export interface DriverCandidate {
  // Identity
  id:           string;
  driver_code:  string;
  full_name:    string;
  // Status
  driver_status: DriverStatus;
  // Scoring Engine V1 fields (legacy — still used for TIER_WEIGHTS tiebreaker)
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
  // BM5 — Legal Affiliation + Reliability
  legal_affiliation_type:           LegalAffiliationType;
  reliability_score:                number;   // 0–100 DRS score
  driver_tier:                      DriverTier; // BM5 tier
  acceptance_rate:                  number;   // 0.0–1.0
  completion_rate:                  number;   // 0.0–1.0
  driver_cancel_rate:               number;   // 0.0–1.0
  fallback_response_rate:           number;   // 0.0–1.0
  on_time_score:                    number;   // 0.0–1.0
  dispatch_response_score:          number;   // 0.0–1.0
  // Partner affiliation (if PARTNER_LEGAL_FLEET)
  company_id:                       string | null;
  company_partner_dispatch_mode:    PartnerDispatchMode | null;
  // Vehicle (primary vehicle record, null if none)
  vehicle:                          VehicleRecord | null;
}

export interface BookingContext {
  id:                  string;
  pickup_zone:         string;
  service_type:        ServiceType;
  source_driver_id:    string | null;  // UUID of the capturing driver (ABSOLUTE PRIORITY)
  source_partner_id?:  string | null;  // UUID of the originating partner company
  booking_source?:     string | null;  // e.g. "sottovento_direct", "partner_funnel"
  service_location_type?: ServiceLocationType;
}

export interface RankedCandidate extends DriverCandidate {
  dispatch_priority_rank:   number;
  dispatch_priority_score:  number;
  priority_reason:          string;
  source_driver_override:   boolean;
  affiliation_group:        number;  // 1=SOTTOVENTO_LEGAL, 2=PARTNER_LEGAL, 3=GENERAL
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
  excluded_step:   "hard_eligibility" | "service_eligibility" | "partner_governance";
}

export interface PriorityEngineResult {
  ranked:   RankedCandidate[];
  excluded: ExcludedCandidate[];
  source_driver_override: boolean;
  source_driver_id:       string | null;
  audit_payload:          object;
}

// ─── AFFILIATION GROUP WEIGHTS ────────────────────────────────────────────────
// Structural priority multipliers applied BEFORE reliability scoring.
// Ensures SOTTOVENTO_LEGAL_FLEET always outranks GENERAL_NETWORK at equal reliability.
const AFFILIATION_GROUP_BASE: Record<LegalAffiliationType, number> = {
  SOTTOVENTO_LEGAL_FLEET:  10000,  // Group 1 — highest structural priority
  PARTNER_LEGAL_FLEET:      5000,  // Group 2 — only if SUBNETWORK_PRIORITY enabled
  GENERAL_NETWORK_DRIVER:      0,  // Group 3 — baseline
};

const AFFILIATION_GROUP_NUM: Record<LegalAffiliationType, number> = {
  SOTTOVENTO_LEGAL_FLEET:  1,
  PARTNER_LEGAL_FLEET:     2,
  GENERAL_NETWORK_DRIVER:  3,
};

// ─── LEGACY TIER WEIGHTS (V1 — used as secondary tiebreaker) ─────────────────
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

function getEffectiveAffiliationGroup(
  d: DriverCandidate,
  booking: BookingContext
): { group: LegalAffiliationType; allowed: boolean; reason?: string } {
  const affiliation = d.legal_affiliation_type ?? "GENERAL_NETWORK_DRIVER";

  if (affiliation === "PARTNER_LEGAL_FLEET") {
    const partnerMode = d.company_partner_dispatch_mode ?? "CAPTURE_ONLY";

    // sottovento_direct bookings: exclude partner subnetwork unless SUBNETWORK_PRIORITY
    if (booking.booking_source === "sottovento_direct") {
      if (partnerMode !== "SUBNETWORK_PRIORITY") {
        // Downgrade to general pool (not excluded, just no structural priority)
        return { group: "GENERAL_NETWORK_DRIVER", allowed: true };
      }
    }

    if (partnerMode === "CAPTURE_ONLY") {
      // CAPTURE_ONLY: partner drivers join general pool (no structural priority)
      return { group: "GENERAL_NETWORK_DRIVER", allowed: true };
    }
  }

  return { group: affiliation, allowed: true };
}

// ─── CORE ENGINE ─────────────────────────────────────────────────────────────
/**
 * Run the 6-step priority ranking for a given booking and candidate pool.
 * BM5: Integrates legal_affiliation_priority, reliability_score, and partner_governance.
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

  // ── STEP 0: Identify source driver (ABSOLUTE PRIORITY — evaluated after Step 1) ──
  const sourceDriverId: string | null = booking.source_driver_id ?? null;
  let sourceDriverOverride = false;

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

  // Confirm source driver passed Step 1 — ABSOLUTE PRIORITY confirmed
  if (sourceDriverId) {
    const sourceInEligible = eligible.findIndex(d => d.id === sourceDriverId);
    if (sourceInEligible !== -1) {
      sourceDriverOverride = true;
    }
  }

  // ── STEP 2: Legal Affiliation Group Assignment + Partner Governance ───────
  const eligibleWithGroups: Array<{ driver: DriverCandidate; effectiveGroup: LegalAffiliationType }> = [];

  for (const d of eligible) {
    const { group, allowed, reason } = getEffectiveAffiliationGroup(d, booking);
    if (!allowed) {
      excluded.push({
        id:              d.id,
        driver_code:     d.driver_code,
        full_name:       d.full_name,
        excluded_reason: reason ?? "partner_governance_exclusion",
        excluded_step:   "partner_governance",
      });
    } else {
      eligibleWithGroups.push({ driver: d, effectiveGroup: group });
    }
  }

  // ── STEP 3: Service Eligibility Filter ───────────────────────────────────
  const serviceEligible: Array<{ driver: DriverCandidate; effectiveGroup: LegalAffiliationType }> = [];

  for (const item of eligibleWithGroups) {
    const svcFlags = buildServiceFlags(item.driver, serviceType);
    if (!svcFlags.passes) {
      excluded.push({
        id:              item.driver.id,
        driver_code:     item.driver.driver_code,
        full_name:       item.driver.full_name,
        excluded_reason: `service_eligibility_${serviceType}_not_met`,
        excluded_step:   "service_eligibility",
      });
    } else {
      serviceEligible.push(item);
    }
  }

  // ── STEP 4 + 5: Reliability Score Ranking + Recent Behavior Penalty ───────
  const scored = serviceEligible.map(({ driver: d, effectiveGroup }) => {
    // BM5: Affiliation group base score (structural priority layer)
    const affiliationBase = AFFILIATION_GROUP_BASE[effectiveGroup] ?? 0;

    // BM5: Reliability score (DRS) — primary ranking signal within group
    const reliabilityComponent = (d.reliability_score ?? 65) * 2; // scale to ~200 pts max

    // Legacy V1 signals (secondary — tiebreaker within same reliability band)
    const tierWeight = TIER_WEIGHTS[d.driver_score_tier?.toUpperCase() ?? "BRONZE"] ?? 100;
    const statusBonus = STATUS_BONUS[d.driver_status] ?? 0;
    const scoreComponent = Math.min(d.driver_score_total ?? 0, 100) * 0.5;
    const contributionBonus = Math.min((d.rides_completed ?? 0) * 0.1, 20);

    // Base priority score
    let priorityScore =
      affiliationBase +
      reliabilityComponent +
      tierWeight +
      statusBonus +
      scoreComponent +
      contributionBonus;

    // Step 5: Recent behavior penalties
    const lateCancelPenalty  = Math.min(d.late_cancel_recent ?? 0, 2) * PENALTY.late_cancel_recent;
    const complaintPenalty   = Math.min(d.complaint_recent ?? 0, 1) * PENALTY.complaint_recent;
    const noResponsePenalty  = Math.min(d.no_response_recent ?? 0, 2) * PENALTY.no_response_recent;
    priorityScore += lateCancelPenalty + complaintPenalty + noResponsePenalty;

    // Build reason string
    const reasons: string[] = [
      `affiliation:${effectiveGroup}`,
      `drs:${d.reliability_score ?? 65}`,
      `tier_bm5:${d.driver_tier ?? "STANDARD"}`,
    ];
    if (d.driver_score_tier) reasons.push(`tier_v1:${d.driver_score_tier}`);
    if (d.driver_status === "active") reasons.push("status:active");
    if (d.driver_status === "provisional") reasons.push("status:provisional");
    if (d.is_eligible_for_premium_dispatch) reasons.push("premium_eligible");
    if (d.is_eligible_for_airport_priority) reasons.push("airport_eligible");
    if (lateCancelPenalty < 0) reasons.push(`late_cancel_penalty:${lateCancelPenalty}`);
    if (complaintPenalty < 0) reasons.push(`complaint_penalty:${complaintPenalty}`);
    if (noResponsePenalty < 0) reasons.push(`no_response_penalty:${noResponsePenalty}`);

    return {
      driver:        d,
      effectiveGroup,
      priorityScore: Math.round(priorityScore * 100) / 100,
      reason:        reasons.join(" | "),
    };
  });

  // Sort: source driver ALWAYS first (ABSOLUTE RULE — Step 0),
  // then by affiliation group (structural), then by priorityScore DESC
  scored.sort((a, b) => {
    // STEP 0: Capture priority — absolute rule, never overridden
    if (sourceDriverOverride) {
      if (a.driver.id === sourceDriverId) return -1;
      if (b.driver.id === sourceDriverId) return 1;
    }
    // STEP 2: Affiliation group ordering (structural priority)
    const groupA = AFFILIATION_GROUP_NUM[a.effectiveGroup] ?? 3;
    const groupB = AFFILIATION_GROUP_NUM[b.effectiveGroup] ?? 3;
    if (groupA !== groupB) return groupA - groupB;
    // STEP 4: Reliability score within group
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
        ? `CAPTURE_PRIORITY_ABSOLUTE | ${s.reason}`
        : s.reason,
      source_driver_override:    isSourceOverride,
      affiliation_group:         AFFILIATION_GROUP_NUM[s.effectiveGroup] ?? 3,
      vehicle_eligibility_flags: vehicleFlags,
      service_eligibility_flags: serviceFlags,
    };
  });

  // ── Audit payload ─────────────────────────────────────────────────────────
  const audit_payload = {
    engine:               "SmartDispatchPriorityEngineV2_BM5",
    booking_id:           booking.id,
    service_location_type: slt,
    service_type:         serviceType,
    booking_source:       booking.booking_source ?? null,
    source_driver_id:     booking.source_driver_id,
    source_partner_id:    booking.source_partner_id ?? null,
    source_driver_override: sourceDriverOverride,
    total_candidates:     candidates.length,
    eligible_count:       serviceEligible.length,
    excluded_count:       excluded.length,
    ranked_count:         ranked.length,
    affiliation_breakdown: {
      sottovento_legal:  ranked.filter(r => r.affiliation_group === 1).length,
      partner_legal:     ranked.filter(r => r.affiliation_group === 2).length,
      general_network:   ranked.filter(r => r.affiliation_group === 3).length,
    },
    top_candidate: ranked[0]
      ? {
          id:                      ranked[0].id,
          driver_code:             ranked[0].driver_code,
          dispatch_priority_score: ranked[0].dispatch_priority_score,
          source_driver_override:  ranked[0].source_driver_override,
          affiliation_group:       ranked[0].affiliation_group,
          reliability_score:       ranked[0].reliability_score,
          driver_tier:             ranked[0].driver_tier,
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
