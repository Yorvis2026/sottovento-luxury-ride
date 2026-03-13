import type { ZoneId } from "./zones";

export type VehicleType = "Sedan" | "SUV";
export type ServiceType = "oneway" | "roundtrip";
export type WaitTime = "none" | "2h" | "4h" | "fullday";

type PriceByVehicle = { Sedan: number; SUV: number };

const key = (a: ZoneId, b: ZoneId) => `${a}->${b}` as const;

/** One-way prices */
const PRICES_ONEWAY: Record<string, PriceByVehicle> = {
  // MCO ↔ Core Tourist Zones
  [key("MCO", "DISNEY")]:            { Sedan: 95,  SUV: 120 },
  [key("MCO", "UNIVERSAL_IDRIVE")]:  { Sedan: 95,  SUV: 120 },
  [key("MCO", "DOWNTOWN")]:          { Sedan: 90,  SUV: 110 },
  [key("MCO", "KISSIMMEE")]:         { Sedan: 95,  SUV: 120 },
  [key("MCO", "NORTH_ORLANDO")]:     { Sedan: 100, SUV: 130 },

  // SFB ↔ zones
  [key("SFB", "DOWNTOWN")]:          { Sedan: 90,  SUV: 115 },
  [key("SFB", "NORTH_ORLANDO")]:     { Sedan: 80,  SUV: 105 },
  [key("SFB", "MCO")]:               { Sedan: 110, SUV: 140 },
  [key("SFB", "DISNEY")]:            { Sedan: 110, SUV: 140 },
  [key("SFB", "UNIVERSAL_IDRIVE")]:  { Sedan: 110, SUV: 140 },

  // Port Canaveral
  [key("MCO", "PORT_CANAVERAL")]:              { Sedan: 145, SUV: 180 },
  [key("DISNEY", "PORT_CANAVERAL")]:           { Sedan: 155, SUV: 190 },
  [key("UNIVERSAL_IDRIVE", "PORT_CANAVERAL")]: { Sedan: 155, SUV: 190 },
  [key("DOWNTOWN", "PORT_CANAVERAL")]:         { Sedan: 145, SUV: 180 },
  [key("KISSIMMEE", "PORT_CANAVERAL")]:        { Sedan: 155, SUV: 195 },
  [key("SFB", "PORT_CANAVERAL")]:              { Sedan: 165, SUV: 205 },

  // Between Tourist Zones
  [key("DISNEY", "UNIVERSAL_IDRIVE")]:  { Sedan: 75,  SUV: 100 },
  [key("DISNEY", "DOWNTOWN")]:          { Sedan: 75,  SUV: 100 },
  [key("UNIVERSAL_IDRIVE", "DOWNTOWN")]:{ Sedan: 65,  SUV: 90  },
  [key("DISNEY", "KISSIMMEE")]:         { Sedan: 60,  SUV: 85  },
  [key("UNIVERSAL_IDRIVE", "KISSIMMEE")]:{ Sedan: 75, SUV: 100 },

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

/** Round-trip multiplier map (some routes have explicit RT prices) */
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

/** Waiting time add-ons */
export const WAIT_ADDONS: Record<WaitTime, number> = {
  none:    0,
  "2h":    80,
  "4h":    150,
  fullday: 350,
};

/** Hourly chauffeur packages */
export const HOURLY_PACKAGES = [
  { label: "3 hours (minimum) — $285", hours: 3, price: 285 },
  { label: "5 hours — $450",           hours: 5, price: 450 },
  { label: "8 hours — $720",           hours: 8, price: 720 },
];

export const HOURLY_RATE = 95; // per hour

function getPricePair(pickup: ZoneId, dropoff: ZoneId): PriceByVehicle | null {
  const direct = PRICES_ONEWAY[key(pickup, dropoff)];
  if (direct) return direct;
  const reverse = PRICES_ONEWAY[key(dropoff, pickup)];
  if (reverse) return reverse;
  return null;
}

function getRoundTripPair(pickup: ZoneId, dropoff: ZoneId): PriceByVehicle | null {
  const direct = ROUNDTRIP_EXPLICIT[key(pickup, dropoff)];
  if (direct) return direct;
  const reverse = ROUNDTRIP_EXPLICIT[key(dropoff, pickup)];
  if (reverse) return reverse;
  // Fallback: 1.85x one-way
  const ow = getPricePair(pickup, dropoff);
  if (!ow) return null;
  return {
    Sedan: Math.round(ow.Sedan * 1.85 / 5) * 5,
    SUV:   Math.round(ow.SUV   * 1.85 / 5) * 5,
  };
}

export function getGuaranteedPrice(args: {
  pickupZone: ZoneId;
  dropoffZone: ZoneId;
  vehicle: VehicleType;
  serviceType?: ServiceType;
  waitTime?: WaitTime;
}): number | null {
  const { pickupZone, dropoffZone, vehicle, serviceType = "oneway", waitTime = "none" } = args;

  let pair: PriceByVehicle | null;
  if (serviceType === "roundtrip") {
    pair = getRoundTripPair(pickupZone, dropoffZone);
  } else {
    pair = getPricePair(pickupZone, dropoffZone);
  }

  if (!pair) return null;

  const base = pair[vehicle];
  const waitAddon = WAIT_ADDONS[waitTime] ?? 0;
  return base + waitAddon;
}
