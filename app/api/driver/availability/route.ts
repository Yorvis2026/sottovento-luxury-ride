export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// Driver Availability Engine — SLN v1
//
// POST /api/driver/availability
//   Sets driver.availability_status manually (toggle)
//   Body: { driver_code: string, status: "available" | "offline" }
//
// GET /api/driver/availability?code=YHV001
//   Returns current availability_status for a driver
//
// Canonical availability_status values:
//   offline   — panel closed OR manually toggled off
//   available — panel open, eligible to receive dispatch offers
//   busy      — currently executing an assigned ride
//
// IMPORTANT: Only "offline" and "available" are manually settable.
// "busy" is set automatically by the system on ride accept/start.
// ============================================================

async function ensureAvailabilityColumn() {
  try {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'offline'
    `;
    // Add check constraint if not exists (idempotent)
    try {
      await sql`
        ALTER TABLE drivers
          ADD CONSTRAINT drivers_availability_status_check
          CHECK (availability_status IN ('offline', 'available', 'busy'))
      `;
    } catch {
      // Constraint may already exist — safe to ignore
    }
  } catch {
    // Column may already exist — safe to ignore
  }
}

// ── GET: return current availability_status ──────────────────
export async function GET(req: NextRequest) {
  try {
    await ensureAvailabilityColumn();
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    const rows = await sql`
      SELECT id, driver_code, full_name, driver_status,
             COALESCE(availability_status, 'offline') AS availability_status
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    return NextResponse.json({ driver: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// ── POST: set availability_status ────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await ensureAvailabilityColumn();
    const body = await req.json();
    const { driver_code, status } = body;

    if (!driver_code || !status) {
      return NextResponse.json(
        { error: "driver_code and status are required" },
        { status: 400 }
      );
    }

    // Only "available" and "offline" are manually settable
    // "busy" is set automatically by the system
    if (!["available", "offline"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'available' or 'offline' (busy is system-controlled)" },
        { status: 400 }
      );
    }

    // Load driver
    const driverRows = await sql`
      SELECT id, driver_code, driver_status, assigned_driver_id,
             COALESCE(availability_status, 'offline') AS availability_status
      FROM drivers
      WHERE driver_code = ${driver_code.toUpperCase()}
      LIMIT 1
    `;
    if (driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const driver = driverRows[0];

    // Guard: cannot go available if driver_status is not active/provisional
    if (status === "available" && !["active", "provisional"].includes(driver.driver_status)) {
      return NextResponse.json(
        { error: `Driver status '${driver.driver_status}' is not eligible to go available` },
        { status: 403 }
      );
    }

    // Guard: cannot manually set offline if driver has an active ride in progress
    // (busy state must be cleared by ride completion)
    if (status === "offline" && driver.availability_status === "busy") {
      // Check if there's actually an active ride in progress
      const activeRideRows = await sql`
        SELECT id, status FROM bookings
        WHERE assigned_driver_id = ${driver.id}::uuid
          AND status IN ('en_route', 'arrived', 'in_trip', 'accepted')
        LIMIT 1
      `;
      if (activeRideRows.length > 0) {
        return NextResponse.json(
          { error: "Cannot go offline while a ride is in progress. Complete the ride first." },
          { status: 409 }
        );
      }
    }

    // Update availability_status
    await sql`
      UPDATE drivers
      SET availability_status = ${status},
          updated_at = NOW()
      WHERE id = ${driver.id}::uuid
    `;

    return NextResponse.json({
      success: true,
      driver_code: driver.driver_code,
      previous_status: driver.availability_status,
      new_status: status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
