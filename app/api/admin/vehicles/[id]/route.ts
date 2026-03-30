export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { checkVehicleEligibility } from "../route";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/admin/vehicles/[id] — Get single vehicle with eligibility
// ============================================================
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const rows = await sql`
      SELECT v.*, d.full_name AS driver_name, d.driver_code, d.driver_status
      FROM vehicles v
      JOIN drivers d ON v.driver_id = d.id
      WHERE v.id = ${id}::uuid
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    const v = rows[0];
    const mcoGate  = checkVehicleEligibility(v, "airport_pickup_mco");
    const portGate = checkVehicleEligibility(v, "port_pickup_canaveral");
    return NextResponse.json({
      vehicle: {
        ...v,
        eligible_for_mco_pickup:  mcoGate.eligible,
        eligible_for_port_pickup: portGate.eligible,
        mco_exclusion_reasons:    mcoGate.reasons,
        port_exclusion_reasons:   portGate.reasons,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// PATCH /api/admin/vehicles/[id] — Update permit statuses
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const PERMIT_FIELDS = [
      "city_permit_status",
      "airport_permit_mco_status",
      "port_permit_canaveral_status",
      "insurance_status",
      "registration_status",
      "vehicle_status",
      "verified_at",
      "expires_at",
      "notes",
      "is_primary",
      "make",
      "model",
      "year",
      "plate",
      "color",
      "vehicle_type",
    ];

    const VALID_PERMIT_STATUSES = ["approved", "pending", "expired", "rejected"];
    const VALID_VEHICLE_STATUSES = ["active", "inactive", "suspended"];

    // Validate permit status values
    for (const field of ["city_permit_status", "airport_permit_mco_status",
      "port_permit_canaveral_status", "insurance_status", "registration_status"]) {
      if (body[field] && !VALID_PERMIT_STATUSES.includes(body[field])) {
        return NextResponse.json(
          { error: `Invalid value for ${field}: ${body[field]}. Must be one of: ${VALID_PERMIT_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
    }
    if (body.vehicle_status && !VALID_VEHICLE_STATUSES.includes(body.vehicle_status)) {
      return NextResponse.json(
        { error: `Invalid vehicle_status: ${body.vehicle_status}. Must be one of: ${VALID_VEHICLE_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Load current vehicle
    const current = await sql`SELECT * FROM vehicles WHERE id = ${id}::uuid LIMIT 1`;
    if (current.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    const prev = current[0];

    // If setting as primary, unset others for this driver
    if (body.is_primary) {
      await sql`
        UPDATE vehicles SET is_primary = FALSE
        WHERE driver_id = ${prev.driver_id}::uuid AND id != ${id}::uuid
      `;
    }

    // Build update — only update fields that are present in body
    const updates: Record<string, unknown> = {};
    for (const field of PERMIT_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    updates.updated_at = new Date().toISOString();

    // Execute update using dynamic SQL
    const rows = await sql`
      UPDATE vehicles SET
        city_permit_status           = COALESCE(${updates.city_permit_status as string ?? null}, city_permit_status),
        airport_permit_mco_status    = COALESCE(${updates.airport_permit_mco_status as string ?? null}, airport_permit_mco_status),
        port_permit_canaveral_status = COALESCE(${updates.port_permit_canaveral_status as string ?? null}, port_permit_canaveral_status),
        insurance_status             = COALESCE(${updates.insurance_status as string ?? null}, insurance_status),
        registration_status          = COALESCE(${updates.registration_status as string ?? null}, registration_status),
        vehicle_status               = COALESCE(${updates.vehicle_status as string ?? null}, vehicle_status),
        verified_at                  = COALESCE(${updates.verified_at ? `${updates.verified_at}::timestamptz` : null}, verified_at),
        expires_at                   = COALESCE(${updates.expires_at ? `${updates.expires_at}::timestamptz` : null}, expires_at),
        notes                        = COALESCE(${updates.notes as string ?? null}, notes),
        is_primary                   = COALESCE(${updates.is_primary as boolean ?? null}, is_primary),
        make                         = COALESCE(${updates.make as string ?? null}, make),
        model                        = COALESCE(${updates.model as string ?? null}, model),
        year                         = COALESCE(${updates.year as number ?? null}, year),
        plate                        = COALESCE(${updates.plate as string ?? null}, plate),
        color                        = COALESCE(${updates.color as string ?? null}, color),
        vehicle_type                 = COALESCE(${updates.vehicle_type as string ?? null}, vehicle_type),
        updated_at                   = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    const updated = rows[0];

    // If primary, update driver.primary_vehicle_id
    if (body.is_primary) {
      await sql`
        UPDATE drivers SET primary_vehicle_id = ${id}::uuid
        WHERE id = ${prev.driver_id}::uuid
      `;
    }

    // Compute new eligibility
    const mcoGate  = checkVehicleEligibility(updated, "airport_pickup_mco");
    const portGate = checkVehicleEligibility(updated, "port_pickup_canaveral");

    // Audit log: record what changed and new eligibility
    const changedFields = Object.keys(updates).filter(
      k => k !== "updated_at" && String(updates[k]) !== String((prev as any)[k])
    );
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'vehicle',
          ${id}::uuid,
          'vehicle_permit_updated',
          'admin',
          ${JSON.stringify({
            changed_fields:           changedFields,
            previous:                 Object.fromEntries(changedFields.map(f => [f, (prev as any)[f]])),
            updated:                  Object.fromEntries(changedFields.map(f => [f, updates[f]])),
            eligible_for_mco_pickup:  mcoGate.eligible,
            eligible_for_port_pickup: portGate.eligible,
            mco_exclusion_reasons:    mcoGate.reasons,
            port_exclusion_reasons:   portGate.reasons,
            timestamp:                new Date().toISOString(),
          })}::jsonb
        )
      `;
    } catch { /* non-blocking */ }

    return NextResponse.json({
      vehicle: {
        ...updated,
        eligible_for_mco_pickup:  mcoGate.eligible,
        eligible_for_port_pickup: portGate.eligible,
        mco_exclusion_reasons:    mcoGate.reasons,
        port_exclusion_reasons:   portGate.reasons,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/admin/vehicles/[id] — Remove a vehicle
// ============================================================
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const rows = await sql`
      DELETE FROM vehicles WHERE id = ${id}::uuid RETURNING id, driver_id, make, model, plate
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'vehicle', ${id}::uuid, 'vehicle_deleted', 'admin',
          ${JSON.stringify({ deleted: rows[0], timestamp: new Date().toISOString() })}::jsonb
        )
      `;
    } catch { /* non-blocking */ }
    return NextResponse.json({ success: true, deleted: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
