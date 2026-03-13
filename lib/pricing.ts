import type { ZoneId } from "./zones";

export type VehicleType = "Sedan" | "SUV";

type PriceByVehicle = { Sedan: number; SUV: number };

const key = (a: ZoneId, b: ZoneId) => `${a}->${b}` as const;

const PRICES: Record<string, PriceByVehicle> = {
  // MCO to Core Tourist Zones
  [key("MCO", "DISNEY")]: { Sedan: 95, SUV: 135 },
  [key("MCO", "UNIVERSAL_IDRIVE")]: { Sedan: 95, SUV: 135 },
  [key("MCO", "DOWNTOWN")]: { Sedan: 90, SUV: 125 },
  [key("MCO", "KISSIMMEE")]: { Sedan: 105, SUV: 145 },
  [key("MCO", "NORTH_ORLANDO")]: { Sedan: 110, SUV: 150 },

  // Sanford Airport
  [key("SFB", "DOWNTOWN")]: { Sedan: 95, SUV: 135 },
  [key("SFB", "NORTH_ORLANDO")]: { Sedan: 85, SUV: 120 },
  [key("SFB", "MCO")]: { Sedan: 125, SUV: 165 },

  // Port Canaveral
  [key("MCO", "PORT_CANAVERAL")]: { Sedan: 165, SUV: 210 },
  [key("DISNEY", "PORT_CANAVERAL")]: { Sedan: 185, SUV: 230 },
  [key("UNIVERSAL_IDRIVE", "PORT_CANAVERAL")]: { Sedan: 190, SUV: 235 },
  [key("DOWNTOWN", "PORT_CANAVERAL")]: { Sedan: 175, SUV: 220 },
  [key("KISSIMMEE", "PORT_CANAVERAL")]: { Sedan: 195, SUV: 240 },

  // Between Tourist Zones (non-airport)
  [key("DISNEY", "UNIVERSAL_IDRIVE")]: { Sedan: 85, SUV: 115 },
  [key("DISNEY", "DOWNTOWN")]: { Sedan: 85, SUV: 115 },
  [key("UNIVERSAL_IDRIVE", "DOWNTOWN")]: { Sedan: 75, SUV: 105 },
  [key("DISNEY", "KISSIMMEE")]: { Sedan: 70, SUV: 95 },
  [key("UNIVERSAL_IDRIVE", "KISSIMMEE")]: { Sedan: 85, SUV: 115 },

  // Kennedy Space Center / Cape Canaveral
  [key("MCO", "KENNEDY")]: { Sedan: 145, SUV: 185 },
  [key("DISNEY", "KENNEDY")]: { Sedan: 195, SUV: 245 },
  [key("UNIVERSAL_IDRIVE", "KENNEDY")]: { Sedan: 195, SUV: 245 },
  [key("DOWNTOWN", "KENNEDY")]: { Sedan: 175, SUV: 220 },
  [key("KISSIMMEE", "KENNEDY")]: { Sedan: 200, SUV: 250 },
  [key("PORT_CANAVERAL", "KENNEDY")]: { Sedan: 75, SUV: 100 },
  [key("SFB", "KENNEDY")]: { Sedan: 165, SUV: 210 },

  // Tampa / Downtown Tampa
  [key("MCO", "TAMPA")]: { Sedan: 185, SUV: 235 },
  [key("DISNEY", "TAMPA")]: { Sedan: 175, SUV: 220 },
  [key("UNIVERSAL_IDRIVE", "TAMPA")]: { Sedan: 175, SUV: 220 },
  [key("DOWNTOWN", "TAMPA")]: { Sedan: 185, SUV: 235 },
  [key("KISSIMMEE", "TAMPA")]: { Sedan: 185, SUV: 235 },
  [key("SFB", "TAMPA")]: { Sedan: 220, SUV: 275 },

  // Clearwater Beach
  [key("MCO", "CLEARWATER")]: { Sedan: 210, SUV: 265 },
  [key("DISNEY", "CLEARWATER")]: { Sedan: 200, SUV: 250 },
  [key("UNIVERSAL_IDRIVE", "CLEARWATER")]: { Sedan: 200, SUV: 250 },
  [key("DOWNTOWN", "CLEARWATER")]: { Sedan: 210, SUV: 265 },
  [key("KISSIMMEE", "CLEARWATER")]: { Sedan: 210, SUV: 265 },
  [key("TAMPA", "CLEARWATER")]: { Sedan: 95, SUV: 125 },

  // Miami / Miami Beach
  [key("MCO", "MIAMI")]: { Sedan: 295, SUV: 375 },
  [key("DISNEY", "MIAMI")]: { Sedan: 310, SUV: 395 },
  [key("UNIVERSAL_IDRIVE", "MIAMI")]: { Sedan: 310, SUV: 395 },
  [key("DOWNTOWN", "MIAMI")]: { Sedan: 295, SUV: 375 },
  [key("KISSIMMEE", "MIAMI")]: { Sedan: 310, SUV: 395 },
  [key("PORT_CANAVERAL", "MIAMI")]: { Sedan: 295, SUV: 375 },
  [key("SFB", "MIAMI")]: { Sedan: 330, SUV: 420 },
  [key("KENNEDY", "MIAMI")]: { Sedan: 265, SUV: 335 },
};

// Hace la tabla "bidireccional" automáticamente
function getPricePair(pickup: ZoneId, dropoff: ZoneId): PriceByVehicle | null {
  const direct = PRICES[key(pickup, dropoff)];
  if (direct) return direct;
  const reverse = PRICES[key(dropoff, pickup)];
  if (reverse) return reverse;
  return null;
}

export function getGuaranteedPrice(args: {
  pickupZone: ZoneId;
  dropoffZone: ZoneId;
  vehicle: VehicleType;
}): number | null {
  const pair = getPricePair(args.pickupZone, args.dropoffZone);
  if (!pair) return null;
  return pair[args.vehicle];
}
