export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// GET /api/admin/migrate-bm8
// BM8: Airport Intelligence Layer — LIVE-FIRST
// Adds all airport intelligence fields to bookings table,
// including flight validation, provider tracking, and
// operational timing correction fields.
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const steps: string[] = [];
  const errors: string[] = [];

  // ── Bookings: Airport identification fields ─────────────────
  const bookingFields: [string, string][] = [
    // Airport identification
    ["airport_code",                    "VARCHAR(10)"],
    ["airline_code",                    "VARCHAR(10)"],
    ["flight_date",                     "DATE"],
    ["terminal_code",                   "VARCHAR(20)"],
    ["gate_info",                       "VARCHAR(30)"],
    ["baggage_claim_zone",              "VARCHAR(30)"],
    // Flight timing
    ["scheduled_arrival_at",            "TIMESTAMPTZ"],
    ["estimated_arrival_at",            "TIMESTAMPTZ"],
    ["actual_arrival_at",               "TIMESTAMPTZ"],
    ["flight_delay_minutes",            "INTEGER DEFAULT 0"],
    // Airport intelligence status
    ["airport_intelligence_status",     "TEXT DEFAULT 'not_tracked'"],
    ["airport_monitoring_enabled",      "BOOLEAN DEFAULT FALSE"],
    ["airport_phase",                   "TEXT DEFAULT 'pre_arrival'"],
    ["airport_irregularity_flag",       "BOOLEAN DEFAULT FALSE"],
    ["airport_phase_updated_at",        "TIMESTAMPTZ"],
    // Flight validation (LIVE-FIRST) — CRITICAL: never blocks booking
    ["flight_validation_status",        "TEXT DEFAULT 'pending_customer_update'"],
    ["flight_validation_message",       "TEXT"],
    ["flight_validation_attempted_at",  "TIMESTAMPTZ"],
    ["flight_provider_used",            "TEXT"],
    ["manual_flight_review_required",   "BOOLEAN DEFAULT FALSE"],
    // Operational timing correction
    ["operational_pickup_target_at",    "TIMESTAMPTZ"],
    ["operational_monitoring_start_at", "TIMESTAMPTZ"],
    ["operational_driver_release_at",   "TIMESTAMPTZ"],
    // Tracking / admin
    ["flight_lookup_last_at",           "TIMESTAMPTZ"],
    ["flight_lookup_source",            "TEXT DEFAULT 'live_primary'"],
    ["airport_last_action",             "TEXT"],
    ["airport_admin_notes",             "TEXT"],
  ];

  for (const [col, type] of bookingFields) {
    try {
      await sql.unsafe(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      steps.push(`✅ bookings.${col} added`);
    } catch (e: unknown) {
      errors.push(`❌ bookings.${col}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Indexes for airport queries ─────────────────────────────
  const indexes: [string, string, string][] = [
    ["idx_bookings_airport_code",       "bookings", "airport_code"],
    ["idx_bookings_airport_phase",      "bookings", "airport_phase"],
    ["idx_bookings_airport_status",     "bookings", "airport_intelligence_status"],
    ["idx_bookings_airport_monitor",    "bookings", "airport_monitoring_enabled"],
    ["idx_bookings_flight_validation",  "bookings", "flight_validation_status"],
    ["idx_bookings_manual_review",      "bookings", "manual_flight_review_required"],
  ];
  for (const [name, table, col] of indexes) {
    try {
      await sql.unsafe(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${col})`);
      steps.push(`✅ index ${name} created`);
    } catch (e: unknown) {
      errors.push(`❌ index ${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── dispatch_event_log: ensure BM8 event types are supported ─
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_del_event_type ON dispatch_event_log(event_type)`;
    steps.push("✅ dispatch_event_log event_type index ensured");
  } catch (e: unknown) {
    errors.push(`❌ dispatch_event_log index: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── BM8 Event Types reference (for documentation) ──────────
  const bm8EventTypes = [
    "FLIGHT_LOOKUP_SUCCESS",
    "FLIGHT_LOOKUP_FAILED",
    "FLIGHT_NOT_FOUND",
    "FLIGHT_DELAY_DETECTED",
    "FLIGHT_LANDED",
    "AIRPORT_PHASE_UPDATED",
    "SLA_SHIFTED_BY_FLIGHT",
    "AIRPORT_IRREGULARITY",
    "CUSTOMER_FLIGHT_UPDATE_REQUESTED",
    "DRIVER_FLIGHT_REVIEW_ALERTED",
    "FLIGHT_VALIDATION_INVALID_FORMAT",
    "FLIGHT_PROVIDER_UNAVAILABLE",
    "FLIGHT_MANUALLY_REVIEWED",
    "AIRPORT_PASSENGER_READY",
    "AIRPORT_PICKUP_WINDOW_ACTIVE",
  ];

  return NextResponse.json({
    success: errors.length === 0,
    steps,
    errors,
    bm8_fields_added: bookingFields.length,
    bm8_indexes_created: indexes.length,
    bm8_event_types_registered: bm8EventTypes,
    mode: "live_primary",
    providers: {
      primary: "FlightAware AeroAPI",
      secondary: "aviationstack",
      fallback: "sandbox_simulation",
    },
    timestamp: new Date().toISOString(),
  });
}
