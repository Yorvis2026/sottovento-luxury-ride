// ============================================================
// lib/vehicles/gate.ts
// Vehicle Eligibility Gate (VEG) v1 — SLN Network
//
// Hard eligibility rules for restricted pickup locations.
// Called at two points:
//   1. Admin assigns a driver to a booking (bookings/[id]/route.ts)
//   2. Auto-assign in dispatch route (dispatch/route.ts)
//
// Rules:
//   airport_pickup_mco:
//     - airport_permit_mco_status   = approved
//     - city_permit_status          = approved
//     - insurance_status            = approved
//     - registration_status         = approved
//     - vehicle_status              = active
//
//   port_pickup_canaveral:
//     - port_permit_canaveral_status = approved
//     - city_permit_status           = approved
//     - insurance_status             = approved
//     - registration_status          = approved
//     - vehicle_status               = active
//
//   airport_dropoff_mco / port_dropoff_canaveral:
//     → NO hard gate (dropoffs do not require special permits)
//
//   All other locations:
//     → NO hard gate
// ============================================================

export type PermitStatus   = "approved" | "pending" | "expired" | "rejected";
export type VehicleStatus  = "active" | "inactive" | "suspended";
export type ServiceLocationType =
  | "airport_pickup_mco"
  | "airport_dropoff_mco"
  | "port_pickup_canaveral"
  | "port_dropoff_canaveral"
  | "airport_pickup_sfb"
  | "";

export type ExclusionReason =
  | "missing_airport_permit_mco"
  | "missing_port_permit_canaveral"
  | "city_permit_not_approved"
  | "insurance_expired"
  | "registration_expired"
  | "inactive_vehicle"
  | "no_vehicle_assigned";

export interface VehicleRecord {
  id?: string;
  driver_id?: string;
  vehicle_status:              string;
  city_permit_status:          string;
  airport_permit_mco_status:   string;
  port_permit_canaveral_status: string;
  insurance_status:            string;
  registration_status:         string;
  make?:  string;
  model?: string;
  plate?: string;
}

export interface EligibilityResult {
  eligible:  boolean;
  reasons:   ExclusionReason[];
  gate_type: ServiceLocationType | "none";
}

/**
 * Check if a vehicle is eligible for a specific service location type.
 * Returns { eligible, reasons, gate_type }.
 */
export function checkVehicleEligibility(
  vehicle: VehicleRecord,
  serviceLocationType: string
): EligibilityResult {
  const reasons: ExclusionReason[] = [];
  const locType = serviceLocationType as ServiceLocationType;

  // No gate for dropoffs or non-restricted locations
  if (
    locType === "airport_dropoff_mco" ||
    locType === "port_dropoff_canaveral" ||
    locType === ""
  ) {
    return { eligible: true, reasons: [], gate_type: "none" };
  }

  // Common checks for all restricted pickups
  const runCommonChecks = () => {
    if (vehicle.vehicle_status !== "active")
      reasons.push("inactive_vehicle");
    if (vehicle.city_permit_status !== "approved")
      reasons.push("city_permit_not_approved");
    if (vehicle.insurance_status !== "approved")
      reasons.push("insurance_expired");
    if (vehicle.registration_status !== "approved")
      reasons.push("registration_expired");
  };

  if (locType === "airport_pickup_mco") {
    runCommonChecks();
    if (vehicle.airport_permit_mco_status !== "approved")
      reasons.push("missing_airport_permit_mco");
  } else if (locType === "port_pickup_canaveral") {
    runCommonChecks();
    if (vehicle.port_permit_canaveral_status !== "approved")
      reasons.push("missing_port_permit_canaveral");
  } else if (locType === "airport_pickup_sfb") {
    // Future gate — currently no hard requirement, log for visibility
    runCommonChecks();
  }

  return {
    eligible:  reasons.length === 0,
    reasons,
    gate_type: locType,
  };
}

/**
 * Derive service_location_type from pickup_zone.
 * MCO → airport_pickup_mco
 * PORT_CANAVERAL → port_pickup_canaveral
 * SFB → airport_pickup_sfb
 */
export function deriveServiceLocationType(pickupZone: string): ServiceLocationType {
  if (!pickupZone) return "";
  const z = pickupZone.toUpperCase().trim();
  if (z === "MCO")            return "airport_pickup_mco";
  if (z === "PORT_CANAVERAL") return "port_pickup_canaveral";
  if (z === "SFB")            return "airport_pickup_sfb";
  return "";
}

/**
 * Derive dropoff location type from dropoff_zone.
 * Used to confirm that dropoffs do NOT trigger the hard gate.
 */
export function deriveDropoffLocationType(dropoffZone: string): ServiceLocationType {
  if (!dropoffZone) return "";
  const z = dropoffZone.toUpperCase().trim();
  if (z === "MCO")            return "airport_dropoff_mco";
  if (z === "PORT_CANAVERAL") return "port_dropoff_canaveral";
  return "";
}

/**
 * Check if a booking requires a vehicle eligibility gate check.
 * Returns true only for restricted pickup locations.
 */
export function requiresEligibilityGate(serviceLocationType: string): boolean {
  return (
    serviceLocationType === "airport_pickup_mco" ||
    serviceLocationType === "port_pickup_canaveral" ||
    serviceLocationType === "airport_pickup_sfb"
  );
}
