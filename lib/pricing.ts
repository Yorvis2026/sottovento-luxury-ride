import type { ZoneId } from "./zones";

export type VehicleType = "Sedan" | "SUV" | "Luxury SUV" | "Sprinter";
export type ServiceType = "oneway" | "roundtrip";
export type WaitTime = "none" | "2h" | "4h" | "fullday";
export type ExtraStop = "none" | "quick" | "short" | "extended";

// ─── Price resolution result ──────────────────────────────────
export type PriceResolution =
  | { type: "exact_route";  price: number }
  | { type: "zone_to_zone"; price: number }
  | { type: "intra_zone";   price: number }
  | { type: "fallback";     price: number }
  | { type: "out_of_area";  price: null  };

type PriceByVehicle = { Sedan: number; SUV: number; "Luxury SUV"?: number; Sprinter?: number };

const key = (a: ZoneId, b: ZoneId) => `${a}->${b}` as const;

// ============================================================
// LEVEL 1 — EXACT ROUTE LOOKUP (predefined zone-pair prices)
// ============================================================

/** One-way prices */
const PRICES_ONEWAY: Record<string, PriceByVehicle> = {
  // MCO ↔ Core Tourist Zones
  [key("MCO", "DISNEY")]:            { Sedan: 95,  SUV: 120 },
  [key("MCO", "UNIVERSAL_IDRIVE")]:  { Sedan: 95,  SUV: 120 },
  [key("MCO", "DOWNTOWN")]:          { Sedan: 90,  SUV: 110 },
  [key("MCO", "KISSIMMEE")]:         { Sedan: 95,  SUV: 120 },
  [key("MCO", "NORTH_ORLANDO")]:     { Sedan: 100, SUV: 130 },
  [key("MCO", "LAKE_NONA")]:         { Sedan: 65,  SUV: 85  },

  // SFB ↔ zones
  [key("SFB", "DOWNTOWN")]:          { Sedan: 90,  SUV: 115 },
  [key("SFB", "NORTH_ORLANDO")]:     { Sedan: 80,  SUV: 105 },
  [key("SFB", "MCO")]:               { Sedan: 110, SUV: 140 },
  [key("SFB", "DISNEY")]:            { Sedan: 110, SUV: 140 },
  [key("SFB", "UNIVERSAL_IDRIVE")]:  { Sedan: 110, SUV: 140 },
  [key("SFB", "LAKE_NONA")]:         { Sedan: 95,  SUV: 120 },

  // Port Canaveral
  [key("MCO", "PORT_CANAVERAL")]:              { Sedan: 145, SUV: 180 },
  [key("DISNEY", "PORT_CANAVERAL")]:           { Sedan: 155, SUV: 190 },
  [key("UNIVERSAL_IDRIVE", "PORT_CANAVERAL")]: { Sedan: 155, SUV: 190 },
  [key("DOWNTOWN", "PORT_CANAVERAL")]:         { Sedan: 145, SUV: 180 },
  [key("KISSIMMEE", "PORT_CANAVERAL")]:        { Sedan: 155, SUV: 195 },
  [key("SFB", "PORT_CANAVERAL")]:              { Sedan: 165, SUV: 205 },
  [key("NORTH_ORLANDO", "PORT_CANAVERAL")]:    { Sedan: 155, SUV: 195 },

  // Between Tourist Zones
  [key("DISNEY", "UNIVERSAL_IDRIVE")]:   { Sedan: 75,  SUV: 100 },
  [key("DISNEY", "DOWNTOWN")]:           { Sedan: 75,  SUV: 100 },
  [key("UNIVERSAL_IDRIVE", "DOWNTOWN")]: { Sedan: 65,  SUV: 90  },
  [key("DISNEY", "KISSIMMEE")]:          { Sedan: 60,  SUV: 85  },
  [key("UNIVERSAL_IDRIVE", "KISSIMMEE")]:{ Sedan: 75,  SUV: 100 },
  [key("DOWNTOWN", "KISSIMMEE")]:        { Sedan: 65,  SUV: 90  },
  [key("DOWNTOWN", "NORTH_ORLANDO")]:    { Sedan: 65,  SUV: 90  },
  [key("DOWNTOWN", "LAKE_NONA")]:        { Sedan: 65,  SUV: 85  },
  [key("NORTH_ORLANDO", "UNIVERSAL_IDRIVE")]: { Sedan: 75, SUV: 100 },
  [key("NORTH_ORLANDO", "DISNEY")]:      { Sedan: 85,  SUV: 110 },
  [key("NORTH_ORLANDO", "KISSIMMEE")]:   { Sedan: 85,  SUV: 110 },
  [key("LAKE_NONA", "DISNEY")]:          { Sedan: 75,  SUV: 100 },
  [key("LAKE_NONA", "KISSIMMEE")]:       { Sedan: 65,  SUV: 85  },
  [key("LAKE_NONA", "UNIVERSAL_IDRIVE")]:{ Sedan: 85,  SUV: 110 },

  // Kennedy Space Center
  [key("MCO", "KENNEDY")]:              { Sedan: 165, SUV: 210 },
  [key("DISNEY", "KENNEDY")]:           { Sedan: 175, SUV: 220 },
  [key("UNIVERSAL_IDRIVE", "KENNEDY")]: { Sedan: 175, SUV: 220 },
  [key("DOWNTOWN", "KENNEDY")]:         { Sedan: 165, SUV: 210 },
  [key("KISSIMMEE", "KENNEDY")]:        { Sedan: 175, SUV: 220 },
  [key("PORT_CANAVERAL", "KENNEDY")]:   { Sedan: 65,  SUV: 85  },
  [key("SFB", "KENNEDY")]:              { Sedan: 155, SUV: 195 },

  // Tampa
  [key("MCO", "TAMPA")]:               { Sedan: 250, SUV: 320 },
  [key("DISNEY", "TAMPA")]:            { Sedan: 240, SUV: 305 },
  [key("UNIVERSAL_IDRIVE", "TAMPA")]:  { Sedan: 240, SUV: 305 },
  [key("DOWNTOWN", "TAMPA")]:          { Sedan: 250, SUV: 320 },
  [key("KISSIMMEE", "TAMPA")]:         { Sedan: 250, SUV: 320 },
  [key("SFB", "TAMPA")]:               { Sedan: 275, SUV: 350 },

  // Clearwater Beach
  [key("MCO", "CLEARWATER")]:               { Sedan: 275, SUV: 350 },
  [key("DISNEY", "CLEARWATER")]:            { Sedan: 265, SUV: 335 },
  [key("UNIVERSAL_IDRIVE", "CLEARWATER")]:  { Sedan: 265, SUV: 335 },
  [key("DOWNTOWN", "CLEARWATER")]:          { Sedan: 275, SUV: 350 },
  [key("KISSIMMEE", "CLEARWATER")]:         { Sedan: 275, SUV: 350 },
  [key("TAMPA", "CLEARWATER")]:             { Sedan: 80,  SUV: 105 },
  [key("SFB", "CLEARWATER")]:               { Sedan: 295, SUV: 375 },

  // Miami
  [key("MCO", "MIAMI")]:               { Sedan: 610, SUV: 780 },
  [key("DISNEY", "MIAMI")]:            { Sedan: 625, SUV: 795 },
  [key("UNIVERSAL_IDRIVE", "MIAMI")]:  { Sedan: 625, SUV: 795 },
  [key("DOWNTOWN", "MIAMI")]:          { Sedan: 610, SUV: 780 },
  [key("KISSIMMEE", "MIAMI")]:         { Sedan: 625, SUV: 795 },
  [key("PORT_CANAVERAL", "MIAMI")]:    { Sedan: 595, SUV: 760 },
  [key("SFB", "MIAMI")]:               { Sedan: 650, SUV: 830 },
  [key("KENNEDY", "MIAMI")]:           { Sedan: 560, SUV: 715 },
  [key("TAMPA", "MIAMI")]:             { Sedan: 490, SUV: 625 },
};

/** Round-trip explicit prices */
const ROUNDTRIP_EXPLICIT: Record<string, PriceByVehicle> = {
  [key("MCO", "DISNEY")]:            { Sedan: 175, SUV: 220 },
  [key("MCO", "UNIVERSAL_IDRIVE")]:  { Sedan: 175, SUV: 220 },
  [key("MCO", "DOWNTOWN")]:          { Sedan: 165, SUV: 200 },
  [key("MCO", "PORT_CANAVERAL")]:    { Sedan: 270, SUV: 340 },
  [key("MCO", "KENNEDY")]:           { Sedan: 305, SUV: 390 },
  [key("MCO", "TAMPA")]:             { Sedan: 470, SUV: 600 },
  [key("MCO", "CLEARWATER")]:        { Sedan: 510, SUV: 650 },
  [key("MCO", "MIAMI")]:             { Sedan: 1140, SUV: 1450 },
};

// ============================================================
// LEVEL 2 — ZONE-TO-ZONE PRICING (inter-zone fares)
// These cover short urban inter-zone routes not in exact table
// ============================================================

const ZONE_TO_ZONE_FARES: Record<string, PriceByVehicle> = {
  // Downtown ↔ neighbors
  [key("DOWNTOWN", "UNIVERSAL_IDRIVE")]: { Sedan: 75,  SUV: 100 },
  [key("DOWNTOWN", "NORTH_ORLANDO")]:    { Sedan: 65,  SUV: 90  },
  [key("DOWNTOWN", "LAKE_NONA")]:        { Sedan: 65,  SUV: 85  },
  [key("DOWNTOWN", "KISSIMMEE")]:        { Sedan: 65,  SUV: 90  },
  [key("DOWNTOWN", "DISNEY")]:           { Sedan: 75,  SUV: 100 },
  [key("DOWNTOWN", "MCO")]:              { Sedan: 90,  SUV: 110 },

  // North Orlando ↔ neighbors
  [key("NORTH_ORLANDO", "MCO")]:         { Sedan: 100, SUV: 130 },
  [key("NORTH_ORLANDO", "DOWNTOWN")]:    { Sedan: 65,  SUV: 90  },
  [key("NORTH_ORLANDO", "UNIVERSAL_IDRIVE")]: { Sedan: 75, SUV: 100 },
  [key("NORTH_ORLANDO", "DISNEY")]:      { Sedan: 85,  SUV: 110 },
  [key("NORTH_ORLANDO", "KISSIMMEE")]:   { Sedan: 85,  SUV: 110 },

  // Lake Nona ↔ neighbors
  [key("LAKE_NONA", "MCO")]:             { Sedan: 65,  SUV: 85  },
  [key("LAKE_NONA", "DOWNTOWN")]:        { Sedan: 65,  SUV: 85  },
  [key("LAKE_NONA", "DISNEY")]:          { Sedan: 75,  SUV: 100 },
  [key("LAKE_NONA", "KISSIMMEE")]:       { Sedan: 65,  SUV: 85  },
  [key("LAKE_NONA", "UNIVERSAL_IDRIVE")]:{ Sedan: 85,  SUV: 110 },
  [key("LAKE_NONA", "NORTH_ORLANDO")]:   { Sedan: 80,  SUV: 105 },

  // Kissimmee ↔ neighbors
  [key("KISSIMMEE", "DISNEY")]:          { Sedan: 60,  SUV: 85  },
  [key("KISSIMMEE", "UNIVERSAL_IDRIVE")]:{ Sedan: 75,  SUV: 100 },
  [key("KISSIMMEE", "DOWNTOWN")]:        { Sedan: 65,  SUV: 90  },
  [key("KISSIMMEE", "MCO")]:             { Sedan: 95,  SUV: 120 },

  // Universal/IDrive ↔ neighbors
  [key("UNIVERSAL_IDRIVE", "DISNEY")]:   { Sedan: 75,  SUV: 100 },
  [key("UNIVERSAL_IDRIVE", "DOWNTOWN")]: { Sedan: 65,  SUV: 90  },
  [key("UNIVERSAL_IDRIVE", "KISSIMMEE")]:{ Sedan: 75,  SUV: 100 },
  [key("UNIVERSAL_IDRIVE", "MCO")]:      { Sedan: 95,  SUV: 120 },
};

// ============================================================
// LEVEL 3 — INTRA-ZONE / SAME-ZONE PRICING
// ============================================================

export const INTRA_ZONE_FARE: Record<VehicleType, number> = {
  Sedan: 45,
  SUV:   65,
  "Luxury SUV": 95,
  Sprinter: 160,
};

// ============================================================
// LEVEL 4 — GLOBAL FALLBACK (serviceable but no exact match)
// ============================================================

export const FALLBACK_FARE: Record<VehicleType, number> = {
  Sedan: 95,
  SUV:   120,
  "Luxury SUV": 145,
  Sprinter: 220,
};

// ============================================================
// SERVICE AREA — zones we can service
// ============================================================

const SERVICE_AREA_ZONES = new Set<ZoneId>([
  "MCO", "DISNEY", "UNIVERSAL_IDRIVE", "DOWNTOWN", "KISSIMMEE",
  "NORTH_ORLANDO", "SFB", "PORT_CANAVERAL", "KENNEDY",
  "TAMPA", "CLEARWATER", "MIAMI", "LAKE_NONA",
]);

export function isInServiceArea(zone: ZoneId): boolean {
  return SERVICE_AREA_ZONES.has(zone);
}

// ============================================================
// MINIMUM FARES (applied as floor after add-ons)
// ============================================================

export const MINIMUM_FARE: Record<VehicleType, number> = {
  Sedan: 45,
  SUV:   65,
  "Luxury SUV": 95,
  Sprinter: 160,
};

// ============================================================
// ADD-ONS
// ============================================================

/** Waiting time add-ons */
export const WAIT_ADDONS: Record<WaitTime, number> = {
  none:    0,
  "2h":    80,
  "4h":    150,
  fullday: 350,
};

/** Extra stop add-ons */
export const EXTRA_STOP_ADDONS: Record<ExtraStop, number> = {
  none:     0,
  quick:    15,   // 10 min
  short:    25,   // 20 min
  extended: 40,   // 40 min
};

export const EXTRA_STOP_LABELS: Record<ExtraStop, string> = {
  none:     "No extra stop",
  quick:    "Quick stop (10 min) +$15",
  short:    "Short stop (20 min) +$25",
  extended: "Extended stop (40 min) +$40",
};

/** Vehicle upgrade add-on (Sedan → SUV) */
export const UPGRADE_ADDON = 35;

/** Hourly chauffeur packages */
export const HOURLY_PACKAGES = [
  { label: "3 hours (minimum) — $285", hours: 3, price: 285 },
  { label: "5 hours — $450",           hours: 5, price: 450 },
  { label: "8 hours — $720",           hours: 8, price: 720 },
];

export const HOURLY_RATE = 95; // per hour

// ============================================================
// INTERNAL HELPERS
// ============================================================

// ── Luxury multipliers for Luxury SUV and Sprinter ──────────
const LUXURY_MULTIPLIER: Partial<Record<VehicleType, number>> = {
  "Luxury SUV": 1.45,  // ~45% premium over SUV
  Sprinter: 2.0,        // ~2x SUV price
};

function getExactPair(pickup: ZoneId, dropoff: ZoneId, table: Record<string, PriceByVehicle>): PriceByVehicle | null {
  const direct = table[key(pickup, dropoff)];
  if (direct) return direct;
  const reverse = table[key(dropoff, pickup)];
  if (reverse) return reverse;
  return null;
}

// ============================================================
// CORE: HIERARCHICAL PRICE RESOLUTION
// ============================================================

/**
 * Resolves a price using the 4-level hierarchy:
 *   1. Exact route lookup
 *   2. Zone-to-zone pricing
 *   3. Intra-zone / same-zone pricing
 *   4. Global fallback (if both zones are in service area)
 *
 * Returns a PriceResolution with type and price (or null if out of area).
 */
export function resolvePrice(args: {
  pickupZone: ZoneId;
  dropoffZone: ZoneId;
  vehicle: VehicleType;
  serviceType?: ServiceType;
}): PriceResolution {
  const { pickupZone, dropoffZone, vehicle, serviceType = "oneway" } = args;

  // ── Luxury SUV / Sprinter: resolve as SUV then apply multiplier ──
  const luxMultiplier = LUXURY_MULTIPLIER[vehicle];
  if (luxMultiplier) {
    const baseResolution = resolvePrice({ pickupZone, dropoffZone, vehicle: "SUV", serviceType });
    if (baseResolution.price === null) return baseResolution;
    return { ...baseResolution, price: Math.round(baseResolution.price * luxMultiplier / 5) * 5 };
  }


  // ── Service area check ───────────────────────────────────
  if (!isInServiceArea(pickupZone) || !isInServiceArea(dropoffZone)) {
    return { type: "out_of_area", price: null };
  }

  // ── Level 1: Exact route ─────────────────────────────────
  if (serviceType === "roundtrip") {
    const rtPair = getExactPair(pickupZone, dropoffZone, ROUNDTRIP_EXPLICIT);
    if (rtPair) return { type: "exact_route", price: rtPair[vehicle] };
    // Fallback: 1.85x one-way
    const owPair = getExactPair(pickupZone, dropoffZone, PRICES_ONEWAY);
    if (owPair) {
      const rtPrice = Math.round(owPair[vehicle] * 1.85 / 5) * 5;
      return { type: "exact_route", price: rtPrice };
    }
  } else {
    const owPair = getExactPair(pickupZone, dropoffZone, PRICES_ONEWAY);
    if (owPair) return { type: "exact_route", price: owPair[vehicle] };
  }

  // ── Level 2: Zone-to-zone ────────────────────────────────
  const z2zPair = getExactPair(pickupZone, dropoffZone, ZONE_TO_ZONE_FARES);
  if (z2zPair) {
    const price = serviceType === "roundtrip"
      ? Math.round(z2zPair[vehicle] * 1.85 / 5) * 5
      : z2zPair[vehicle];
    return { type: "zone_to_zone", price };
  }

  // ── Level 3: Intra-zone (same zone) ─────────────────────
  if (pickupZone === dropoffZone) {
    const price = serviceType === "roundtrip"
      ? Math.round(INTRA_ZONE_FARE[vehicle] * 1.85 / 5) * 5
      : INTRA_ZONE_FARE[vehicle];
    return { type: "intra_zone", price };
  }

  // ── Level 4: Global fallback ─────────────────────────────
  const price = serviceType === "roundtrip"
    ? Math.round(FALLBACK_FARE[vehicle] * 1.85 / 5) * 5
    : FALLBACK_FARE[vehicle];
  return { type: "fallback", price };
}

// ============================================================
// PUBLIC API: getGuaranteedPrice (backward-compatible)
// ============================================================

export function getGuaranteedPrice(args: {
  pickupZone: ZoneId;
  dropoffZone: ZoneId;
  vehicle: VehicleType;
  serviceType?: ServiceType;
  waitTime?: WaitTime;
  extraStop?: ExtraStop;
  upgrade?: boolean;
}): number | null {
  const {
    pickupZone,
    dropoffZone,
    vehicle,
    serviceType = "oneway",
    waitTime = "none",
    extraStop = "none",
    upgrade = false,
  } = args;

  // Effective vehicle after upgrade
  const effectiveVehicle: VehicleType = upgrade && vehicle === "Sedan" ? "SUV" : vehicle;

  const resolution = resolvePrice({ pickupZone, dropoffZone, vehicle: effectiveVehicle, serviceType });
  if (resolution.price === null) return null;

  const base = resolution.price;
  const waitAddon = WAIT_ADDONS[waitTime] ?? 0;
  const stopAddon = EXTRA_STOP_ADDONS[extraStop] ?? 0;
  const upgradeAddon = upgrade && vehicle === "Sedan" ? UPGRADE_ADDON : 0;

  const total = base + waitAddon + stopAddon + upgradeAddon;

  // Apply minimum fare
  const minFare = MINIMUM_FARE[effectiveVehicle];
  return Math.max(total, minFare);
}

// ============================================================
// PUBLIC API: getPriceResolutionWithAddons
// Returns both the resolution type and the final price
// ============================================================

export function getPriceResolutionWithAddons(args: {
  pickupZone: ZoneId;
  dropoffZone: ZoneId;
  vehicle: VehicleType;
  serviceType?: ServiceType;
  waitTime?: WaitTime;
  extraStop?: ExtraStop;
  upgrade?: boolean;
}): { resolution: PriceResolution; finalPrice: number | null } {
  const {
    pickupZone,
    dropoffZone,
    vehicle,
    serviceType = "oneway",
    waitTime = "none",
    extraStop = "none",
    upgrade = false,
  } = args;

  const effectiveVehicle: VehicleType = upgrade && vehicle === "Sedan" ? "SUV" : vehicle;
  const resolution = resolvePrice({ pickupZone, dropoffZone, vehicle: effectiveVehicle, serviceType });

  if (resolution.price === null) {
    return { resolution, finalPrice: null };
  }

  const waitAddon = WAIT_ADDONS[waitTime] ?? 0;
  const stopAddon = EXTRA_STOP_ADDONS[extraStop] ?? 0;
  const upgradeAddon = upgrade && vehicle === "Sedan" ? UPGRADE_ADDON : 0;
  const total = resolution.price + waitAddon + stopAddon + upgradeAddon;
  const minFare = MINIMUM_FARE[effectiveVehicle];
  const finalPrice = Math.max(total, minFare);

  return { resolution, finalPrice };
}
