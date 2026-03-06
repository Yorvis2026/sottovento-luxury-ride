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
