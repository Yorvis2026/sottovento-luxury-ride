export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// /api/admin/vehicles — Vehicle Registry for SLN Network
//
// Vehicle Eligibility Gates (VEG v1):
//   - MCO Airport Pickup  → airport_permit_mco_status + city_permit_status
//                           + insurance_status + registration_status + vehicle_status
//   - Port Canaveral Pickup → port_permit_canaveral_status + city_permit_status
//                             + insurance_status + registration_status + vehicle_status
//   - Airport/Port DROPOFF → NO hard gate (no permit required for dropoff)
//
// Permit states: approved | pending | expired | rejected
// Vehicle status: active | inactive | suspended
//
// Data model:
//   vehicles (1 driver → N vehicles)
//     id, driver_id, make, model, year, plate, color, vehicle_type
//     city_permit_status, airport_permit_mco_status, port_permit_canaveral_status
//     insurance_status, registration_status, vehicle_status
//     verified_at, expires_at, notes, created_at, updated_at
// ============================================================

// ── Helper: ensure vehicles table exists ─────────────────────
export async function ensureVehiclesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS vehicles (
      id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id                   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      make                        TEXT NOT NULL,
      model                       TEXT NOT NULL,
      year                        INTEGER,
      plate                       TEXT,
      color                       TEXT,
      vehicle_type                TEXT NOT NULL DEFAULT 'Sedan',
      -- Permit & compliance fields
      city_permit_status          TEXT NOT NULL DEFAULT 'pending',
      airport_permit_mco_status   TEXT NOT NULL DEFAULT 'pending',
      port_permit_canaveral_status TEXT NOT NULL DEFAULT 'pending',
      insurance_status            TEXT NOT NULL DEFAULT 'pending',
      registration_status         TEXT NOT NULL DEFAULT 'pending',
      vehicle_status              TEXT NOT NULL DEFAULT 'active',
      -- Dates
      verified_at                 TIMESTAMPTZ,
      expires_at                  TIMESTAMPTZ,
      -- Meta
      notes                       TEXT,
      is_primary                  BOOLEAN DEFAULT FALSE,
      created_at                  TIMESTAMPTZ DEFAULT NOW(),
      updated_at                  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  // Add assigned_vehicle_id to bookings if not exists
  await sql`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES vehicles(id),
      ADD COLUMN IF NOT EXISTS service_location_type TEXT DEFAULT ''
  `;
  // Add assigned_vehicle_id to drivers (primary vehicle shortcut)
  await sql`
    ALTER TABLE drivers
      ADD COLUMN IF NOT EXISTS primary_vehicle_id UUID REFERENCES vehicles(id)
  `;
}

// ── Eligibility gate logic ────────────────────────────────────
export function checkVehicleEligibility(
  vehicle: Record<string, string | null | undefined>,
  serviceLocationType: string
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Common checks for ALL restricted pickups
  const commonChecks = () => {
    if (vehicle.vehicle_status !== "active")
      reasons.push("inactive_vehicle");
    if (vehicle.city_permit_status !== "approved")
      reasons.push("city_permit_not_approved");
    if (vehicle.insurance_status !== "approved")
      reasons.push("insurance_expired");
    if (vehicle.registration_status !== "approved")
      reasons.push("registration_expired");
  };

  if (serviceLocationType === "airport_pickup_mco") {
    commonChecks();
    if (vehicle.airport_permit_mco_status !== "approved")
      reasons.push("missing_airport_permit_mco");
  } else if (serviceLocationType === "port_pickup_canaveral") {
    commonChecks();
    if (vehicle.port_permit_canaveral_status !== "approved")
      reasons.push("missing_port_permit_canaveral");
  }
  // airport_dropoff_mco and port_dropoff_canaveral: NO hard gate

  return { eligible: reasons.length === 0, reasons };
}

// ── Derive service_location_type from pickup_zone ─────────────
export function deriveServiceLocationType(pickupZone: string): string {
  if (!pickupZone) return "";
  const zone = pickupZone.toUpperCase();
  if (zone === "MCO") return "airport_pickup_mco";
  if (zone === "PORT_CANAVERAL") return "port_pickup_canaveral";
  if (zone === "SFB") return "airport_pickup_sfb"; // future gate
  return "";
}

// ============================================================
// GET /api/admin/vehicles — List all vehicles with eligibility
// ============================================================
export async function GET(req: NextRequest) {
  try {
    await ensureVehiclesTable();

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driver_id");
    const eligibilityFilter = searchParams.get("eligible_for"); // 'mco' | 'port_canaveral'

    const rows = driverId
      ? await sql`
          SELECT v.*, d.full_name AS driver_name, d.driver_code, d.driver_status
          FROM vehicles v
          JOIN drivers d ON v.driver_id = d.id
          WHERE v.driver_id = ${driverId}::uuid
          ORDER BY v.is_primary DESC, v.created_at DESC
        `
      : await sql`
          SELECT v.*, d.full_name AS driver_name, d.driver_code, d.driver_status
          FROM vehicles v
          JOIN drivers d ON v.driver_id = d.id
          ORDER BY d.full_name, v.is_primary DESC, v.created_at DESC
        `;

    // Annotate each vehicle with computed eligibility
    const annotated = rows.map((v: any) => {
      const mcoGate  = checkVehicleEligibility(v, "airport_pickup_mco");
      const portGate = checkVehicleEligibility(v, "port_pickup_canaveral");
      return {
        ...v,
        eligible_for_mco_pickup:  mcoGate.eligible,
        eligible_for_port_pickup: portGate.eligible,
        mco_exclusion_reasons:    mcoGate.reasons,
        port_exclusion_reasons:   portGate.reasons,
      };
    });

    // Optional filter
    const filtered = eligibilityFilter === "mco"
      ? annotated.filter((v: any) => v.eligible_for_mco_pickup)
      : eligibilityFilter === "port_canaveral"
        ? annotated.filter((v: any) => v.eligible_for_port_pickup)
        : annotated;

    // Summary stats
    const stats = {
      total:                     annotated.length,
      eligible_for_mco:          annotated.filter((v: any) => v.eligible_for_mco_pickup).length,
      eligible_for_port:         annotated.filter((v: any) => v.eligible_for_port_pickup).length,
      with_expired_permits:      annotated.filter((v: any) =>
        [v.city_permit_status, v.airport_permit_mco_status, v.port_permit_canaveral_status,
         v.insurance_status, v.registration_status].some(s => s === "expired")).length,
      with_pending_permits:      annotated.filter((v: any) =>
        [v.city_permit_status, v.airport_permit_mco_status, v.port_permit_canaveral_status,
         v.insurance_status, v.registration_status].some(s => s === "pending")).length,
      inactive:                  annotated.filter((v: any) => v.vehicle_status !== "active").length,
    };

    return NextResponse.json({ vehicles: filtered, stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// POST /api/admin/vehicles — Register a new vehicle
// ============================================================
export async function POST(req: NextRequest) {
  try {
    await ensureVehiclesTable();

    const body = await req.json();
    const {
      driver_id, company_id, make, model, year, plate, color, vehicle_type,
      city_permit_status, airport_permit_mco_status, port_permit_canaveral_status,
      insurance_status, registration_status, vehicle_status,
      verified_at, expires_at, notes, is_primary,
    } = body;

    // A vehicle must belong to either driver_id or company_id (or both, but at least one)
    if (!driver_id && !company_id) {
      return NextResponse.json(
        { error: "Either driver_id or company_id is required" },
        { status: 400 }
      );
    }
    if (!make || !model) {
      return NextResponse.json(
        { error: "make and model are required" },
        { status: 400 }
      );
    }

    // If is_primary, unset other primary vehicles for this driver
    if (is_primary && driver_id) {
      await sql`
        UPDATE vehicles SET is_primary = FALSE
        WHERE driver_id = ${driver_id}::uuid
      `;
    }

    const rows = await sql`
      INSERT INTO vehicles (
        driver_id, make, model, year, plate, color, vehicle_type,
        city_permit_status, airport_permit_mco_status, port_permit_canaveral_status,
        insurance_status, registration_status, vehicle_status,
        verified_at, expires_at, notes, is_primary
      ) VALUES (
        ${driver_id ? `${driver_id}::uuid` : null},
        ${make},
        ${model},
        ${year ?? null},
        ${plate ?? null},
        ${color ?? null},
        ${vehicle_type ?? "Sedan"},
        ${city_permit_status ?? "pending"},
        ${airport_permit_mco_status ?? "pending"},
        ${port_permit_canaveral_status ?? "pending"},
        ${insurance_status ?? "pending"},
        ${registration_status ?? "pending"},
        ${vehicle_status ?? "active"},
        ${verified_at ? `${verified_at}::timestamptz` : null},
        ${expires_at ? `${expires_at}::timestamptz` : null},
        ${notes ?? null},
        ${is_primary ?? false}
      )
      RETURNING *
    `;

    const vehicle = rows[0];

    // If primary, update driver.primary_vehicle_id (only when driver-owned)
    if (is_primary && vehicle && driver_id) {
      await sql`
        UPDATE drivers SET primary_vehicle_id = ${vehicle.id}::uuid
        WHERE id = ${driver_id}::uuid
      `;
    }

    // Compute eligibility
    const mcoGate  = checkVehicleEligibility(vehicle, "airport_pickup_mco");
    const portGate = checkVehicleEligibility(vehicle, "port_pickup_canaveral");

    // Audit log
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'vehicle',
          ${vehicle.id}::uuid,
          'vehicle_registered',
          'admin',
          ${JSON.stringify({
            driver_id:  driver_id ?? null,
            company_id: company_id ?? null,
            ownership:  company_id ? 'company_owned' : 'driver_owned',
            make, model, year, plate,
            vehicle_type: vehicle_type ?? "Sedan",
            city_permit_status:           city_permit_status ?? "pending",
            airport_permit_mco_status:    airport_permit_mco_status ?? "pending",
            port_permit_canaveral_status: port_permit_canaveral_status ?? "pending",
            insurance_status:             insurance_status ?? "pending",
            registration_status:          registration_status ?? "pending",
            vehicle_status:               vehicle_status ?? "active",
            eligible_for_mco_pickup:      mcoGate.eligible,
            eligible_for_port_pickup:     portGate.eligible,
            timestamp: new Date().toISOString(),
          })}::jsonb
        )
      `;
    } catch { /* non-blocking */ }

    // ── Audit log: company vehicle relationship ────────────────────
    if (company_id) {
      try {
        await sql`
          INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
          VALUES (
            'vehicle',
            ${vehicle.id}::uuid,
            'vehicle_assigned_to_company',
            'admin',
            ${JSON.stringify({
              vehicle_id: vehicle.id,
              company_id,
              driver_id:  driver_id ?? null,
              ownership:  'company_owned',
              action:     'company_relationship_created',
              timestamp:  new Date().toISOString(),
            })}::jsonb
          )
        `;
      } catch { /* non-blocking */ }
    }

    return NextResponse.json(
      {
        vehicle: {
          ...vehicle,
          eligible_for_mco_pickup:  mcoGate.eligible,
          eligible_for_port_pickup: portGate.eligible,
          mco_exclusion_reasons:    mcoGate.reasons,
          port_exclusion_reasons:   portGate.reasons,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
