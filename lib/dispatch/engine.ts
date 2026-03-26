// ============================================================
// SOTTOVENTO NETWORK — Dispatch Engine
// Source Driver Priority Logic
// ============================================================

import {
  COMMISSION_SPLIT,
  OFFER_TIMEOUT,
  IMMEDIATE_THRESHOLD_HOURS,
  type Driver,
  type Client,
  type Booking,
  type DriverStatus,
  type SourceType,
} from "./types";

// ============================================================
// Driver eligibility check
// A driver must meet ALL conditions to receive priority offer
// ============================================================
export function isDriverEligible(driver: Driver, serviceType: string): boolean {
  if (driver.driver_status !== "active") return false;
  if (!driver.is_eligible) return false;
  if (!driver.service_types.includes(serviceType)) return false;

  // Check document expiry
  const today = new Date();
  if (driver.license_expires_at) {
    const licenseExp = new Date(driver.license_expires_at);
    if (licenseExp < today) return false;
  }
  if (driver.insurance_expires_at) {
    const insuranceExp = new Date(driver.insurance_expires_at);
    if (insuranceExp < today) return false;
  }

  return true;
}

// ============================================================
// Determine offer timeout based on pickup urgency
// ============================================================
export function getOfferTimeout(pickupAt: Date): number {
  const now = new Date();
  const hoursUntilPickup = (pickupAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilPickup < IMMEDIATE_THRESHOLD_HOURS
    ? OFFER_TIMEOUT.IMMEDIATE
    : OFFER_TIMEOUT.STANDARD;
}

// ============================================================
// SLN Commission Engine v1.0
// Spec: https://docs.slnchauffeur.com/commission-engine-v1
//
// THREE CASES (spec §4-6):
//
// CASE A — self_capture_execute
//   source_driver_id IS NOT NULL
//   executor_driver_id IS NOT NULL
//   source_driver_id = executor_driver_id
//   → platform 20 / source 80 / executor 0
//
// CASE B — network_reassigned_execute
//   source_driver_id IS NOT NULL
//   executor_driver_id IS NOT NULL
//   source_driver_id ≠ executor_driver_id
//   → platform 20 / source 15 / executor 65
//
// CASE C — platform_direct_assign
//   source_driver_id IS NULL
//   executor_driver_id IS NOT NULL
//   → platform 25 / source 0 / executor 75
//
// SAFETY (spec §10):
//   - does NOT modify source_driver_id, executor_driver_id, dispatch_status
//   - only reads attribution + calculates percentages
//
// IDEMPOTENCY (spec §12):
//   - caller must check commission_locked_at IS NULL before calling
//   - this function is pure (no DB side effects)
// ============================================================

export type CommissionModel =
  | 'self_capture_execute'
  | 'network_reassigned_execute'
  | 'platform_direct_assign'
  | 'manual_admin_override';

export interface CommissionResult {
  commission_model: CommissionModel;
  platform_pct: number;
  platform_amount: number;
  source_pct: number;
  source_amount: number | null;
  executor_pct: number;
  executor_amount: number;
  total_amount: number;
}

export function calculateCommissions(
  totalPrice: number,
  // New spec-compliant signature:
  sourceDriverId: string | null | boolean,  // accepts UUID string OR legacy boolean
  executorDriverId?: string | null
): CommissionResult {
  // ── Backward-compat: legacy callers pass (price, hasSourceDriver: boolean) ──
  // New callers pass (price, source_driver_id: string|null, executor_driver_id: string|null)
  let srcId: string | null;
  let exeId: string | null;

  if (typeof sourceDriverId === 'boolean') {
    // Legacy call: calculateCommissions(price, hasSourceDriver)
    // Cannot determine CASE A vs B without IDs — default to CASE B if source exists
    srcId = sourceDriverId ? '__legacy_source__' : null;
    exeId = '__legacy_executor__';
  } else {
    srcId = sourceDriverId ?? null;
    exeId = executorDriverId ?? null;
  }

  let model: CommissionModel;
  let platformPct: number;
  let sourcePct: number;
  let executorPct: number;

  if (srcId !== null && exeId !== null && srcId === exeId) {
    // CASE A: self_capture_execute
    model       = 'self_capture_execute';
    platformPct = 20;
    sourcePct   = 80;
    executorPct = 0;
  } else if (srcId !== null && exeId !== null && srcId !== exeId) {
    // CASE B: network_reassigned_execute
    model       = 'network_reassigned_execute';
    platformPct = 20;
    sourcePct   = 15;
    executorPct = 65;
  } else {
    // CASE C: platform_direct_assign (source is null or unknown)
    model       = 'platform_direct_assign';
    platformPct = 25;
    sourcePct   = 0;
    executorPct = 75;
  }

  const amt = (pct: number) => parseFloat(((totalPrice * pct) / 100).toFixed(2));

  return {
    commission_model:  model,
    platform_pct:      platformPct,
    platform_amount:   amt(platformPct),
    source_pct:        sourcePct,
    source_amount:     sourcePct > 0 ? amt(sourcePct) : null,
    executor_pct:      executorPct,
    executor_amount:   amt(executorPct),
    total_amount:      totalPrice,
  };
}

// Legacy alias for callers that only need the boolean shorthand
// (create-booking, etc.) — returns same shape, compatible with old code
export function calculateCommissionsLegacy(
  totalPrice: number,
  hasSourceDriver: boolean
): CommissionResult {
  return calculateCommissions(
    totalPrice,
    hasSourceDriver ? '__legacy_source__' : null,
    hasSourceDriver ? '__legacy_executor_different__' : null
  );
}

// ============================================================
// Determine dispatch strategy for a booking
// Returns: should_offer_source_first, timeout_secs
// ============================================================
export function getDispatchStrategy(
  client: Client | null,
  sourceDriver: Driver | null,
  booking: { pickup_at: string; service_type: string }
): {
  offer_source_first: boolean;
  source_driver_id: string | null;
  timeout_secs: number;
  reason: string;
} {
  const pickupAt = new Date(booking.pickup_at);
  const timeoutSecs = getOfferTimeout(pickupAt);

  // No client or no source driver on record
  if (!client || !client.source_driver_id) {
    return {
      offer_source_first: false,
      source_driver_id: null,
      timeout_secs: timeoutSecs,
      reason: "no_source_driver",
    };
  }

  // Source driver exists but not provided
  if (!sourceDriver) {
    return {
      offer_source_first: false,
      source_driver_id: client.source_driver_id,
      timeout_secs: timeoutSecs,
      reason: "source_driver_not_found",
    };
  }

  // Check eligibility
  if (!isDriverEligible(sourceDriver, booking.service_type)) {
    return {
      offer_source_first: false,
      source_driver_id: client.source_driver_id,
      timeout_secs: timeoutSecs,
      reason: `source_driver_ineligible:${sourceDriver.driver_status}`,
    };
  }

  // All conditions met — offer source driver first
  return {
    offer_source_first: true,
    source_driver_id: sourceDriver.id,
    timeout_secs: timeoutSecs,
    reason: "source_driver_priority",
  };
}

// ============================================================
// Resolve source attribution from URL params / tablet
// Used when creating a new client from a booking or lead
// ============================================================
export function resolveAttribution(params: {
  ref_code?: string;
  tablet_code?: string;
  driver_code?: string;
  source_type?: SourceType;
}): {
  source_type: SourceType;
  ref_code: string | null;
  tablet_code: string | null;
  driver_code: string | null;
} {
  const { ref_code, tablet_code, driver_code, source_type } = params;

  // Determine source type from available signals
  let resolved_source: SourceType = source_type ?? "direct";
  if (tablet_code) resolved_source = "tablet";
  else if (ref_code || driver_code) resolved_source = "qr";

  return {
    source_type: resolved_source,
    ref_code: ref_code ?? null,
    tablet_code: tablet_code ?? null,
    driver_code: driver_code ?? null,
  };
}

// ============================================================
// Validate that source_driver_id is never overwritten
// Call this before any client update
// ============================================================
export function guardSourceDriverId(
  existingSourceDriverId: string | null,
  newSourceDriverId: string | null | undefined
): string | null {
  // Once set, source_driver_id is immutable
  if (existingSourceDriverId !== null) {
    return existingSourceDriverId;
  }
  return newSourceDriverId ?? null;
}
