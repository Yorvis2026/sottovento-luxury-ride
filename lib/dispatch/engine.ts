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
// Calculate commission split for a booking
// ============================================================
export function calculateCommissions(totalPrice: number, hasSourceDriver: boolean) {
  const executorPct = COMMISSION_SPLIT.EXECUTOR_PCT;
  const sourcePct = hasSourceDriver ? COMMISSION_SPLIT.SOURCE_PCT : 0;
  const platformPct = hasSourceDriver
    ? COMMISSION_SPLIT.PLATFORM_PCT
    : COMMISSION_SPLIT.PLATFORM_PCT + COMMISSION_SPLIT.SOURCE_PCT;

  return {
    executor_pct: executorPct,
    executor_amount: parseFloat(((totalPrice * executorPct) / 100).toFixed(2)),
    source_pct: sourcePct,
    source_amount: hasSourceDriver
      ? parseFloat(((totalPrice * sourcePct) / 100).toFixed(2))
      : null,
    platform_pct: platformPct,
    platform_amount: parseFloat(((totalPrice * platformPct) / 100).toFixed(2)),
    total_amount: totalPrice,
  };
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
