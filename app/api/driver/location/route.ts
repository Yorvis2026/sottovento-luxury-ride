export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/driver/location
//
// SLN Driver GPS Heartbeat — SLN-ETA-FEASIBILITY-01
//
// Persists the driver's current GPS coordinates to the drivers
// table so the ride-monitor cron can compute ETA feasibility
// for upcoming rides.
//
// Called by: Driver Panel every 30 seconds (when GPS available)
//
// Body: { driver_code: string, lat: number, lng: number }
//
// Response: { ok: true } or { error: string }
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driver_code, lat, lng } = body;

    if (!driver_code || lat == null || lng == null) {
      return NextResponse.json(
        { error: "driver_code, lat, and lng are required" },
        { status: 400 }
      );
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json(
        { error: "lat and lng must be valid numbers" },
        { status: 400 }
      );
    }

    // Ensure location columns exist (idempotent migration)
    try {
      await sql`
        ALTER TABLE drivers
          ADD COLUMN IF NOT EXISTS last_known_lat    DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS last_known_lng    DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS last_location_at  TIMESTAMPTZ
      `;
    } catch { /* columns may already exist */ }

    // Update driver's last known location
    const result = await sql`
      UPDATE drivers
      SET last_known_lat   = ${latNum},
          last_known_lng   = ${lngNum},
          last_location_at = NOW()
      WHERE driver_code = ${driver_code.toUpperCase()}
        AND driver_status = 'active'
      RETURNING id, driver_code, last_known_lat, last_known_lng, last_location_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Driver not found or not active" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[driver/location]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
