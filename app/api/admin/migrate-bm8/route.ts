export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// GET /api/admin/migrate-bm8
// BM8: Airport Intelligence Layer — LIVE-FIRST
// Adds all airport intelligence fields to bookings table.
// Uses sql template literals (not sql.unsafe) for DDL persistence.
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const steps: string[] = [];
  const errors: string[] = [];

  // ── Airport identification fields ───────────────────────────
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airport_code VARCHAR(10)`; steps.push("✅ bookings.airport_code added"); } catch (e) { errors.push(`❌ airport_code: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airline_code VARCHAR(10)`; steps.push("✅ bookings.airline_code added"); } catch (e) { errors.push(`❌ airline_code: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_date DATE`; steps.push("✅ bookings.flight_date added"); } catch (e) { errors.push(`❌ flight_date: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS terminal_code VARCHAR(20)`; steps.push("✅ bookings.terminal_code added"); } catch (e) { errors.push(`❌ terminal_code: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gate_info VARCHAR(30)`; steps.push("✅ bookings.gate_info added"); } catch (e) { errors.push(`❌ gate_info: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS baggage_claim_zone VARCHAR(30)`; steps.push("✅ bookings.baggage_claim_zone added"); } catch (e) { errors.push(`❌ baggage_claim_zone: ${e}`); }

  // ── Flight timing fields ─────────────────────────────────────
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS scheduled_arrival_at TIMESTAMPTZ`; steps.push("✅ bookings.scheduled_arrival_at added"); } catch (e) { errors.push(`❌ scheduled_arrival_at: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS estimated_arrival_at TIMESTAMPTZ`; steps.push("✅ bookings.estimated_arrival_at added"); } catch (e) { errors.push(`❌ estimated_arrival_at: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_arrival_at TIMESTAMPTZ`; steps.push("✅ bookings.actual_arrival_at added"); } catch (e) { errors.push(`❌ actual_arrival_at: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_delay_minutes INTEGER DEFAULT 0`; steps.push("✅ bookings.flight_delay_minutes added"); } catch (e) { errors.push(`❌ flight_delay_minutes: ${e}`); }

  // ── Airport intelligence status fields ───────────────────────
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airport_intelligence_status TEXT DEFAULT 'not_tracked'`; steps.push("✅ bookings.airport_intelligence_status added"); } catch (e) { errors.push(`❌ airport_intelligence_status: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airport_monitoring_enabled BOOLEAN DEFAULT FALSE`; steps.push("✅ bookings.airport_monitoring_enabled added"); } catch (e) { errors.push(`❌ airport_monitoring_enabled: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airport_phase TEXT DEFAULT 'pre_arrival'`; steps.push("✅ bookings.airport_phase added"); } catch (e) { errors.push(`❌ airport_phase: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airport_irregularity_flag BOOLEAN DEFAULT FALSE`; steps.push("✅ bookings.airport_irregularity_flag added"); } catch (e) { errors.push(`❌ airport_irregularity_flag: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airport_phase_updated_at TIMESTAMPTZ`; steps.push("✅ bookings.airport_phase_updated_at added"); } catch (e) { errors.push(`❌ airport_phase_updated_at: ${e}`); }

  // ── Flight validation (LIVE-FIRST) fields ───────────────────
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_validation_status TEXT DEFAULT 'pending_customer_update'`; steps.push("✅ bookings.flight_validation_status added"); } catch (e) { errors.push(`❌ flight_validation_status: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_validation_message TEXT`; steps.push("✅ bookings.flight_validation_message added"); } catch (e) { errors.push(`❌ flight_validation_message: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_validation_attempted_at TIMESTAMPTZ`; steps.push("✅ bookings.flight_validation_attempted_at added"); } catch (e) { errors.push(`❌ flight_validation_attempted_at: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_provider_used TEXT`; steps.push("✅ bookings.flight_provider_used added"); } catch (e) { errors.push(`❌ flight_provider_used: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS manual_flight_review_required BOOLEAN DEFAULT FALSE`; steps.push("✅ bookings.manual_flight_review_required added"); } catch (e) { errors.push(`❌ manual_flight_review_required: ${e}`); }

  // ── Operational timing correction fields ────────────────────
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operational_pickup_target_at TIMESTAMPTZ`; steps.push("✅ bookings.operational_pickup_target_at added"); } catch (e) { errors.push(`❌ operational_pickup_target_at: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operational_monitoring_start_at TIMESTAMPTZ`; steps.push("✅ bookings.operational_monitoring_start_at added"); } catch (e) { errors.push(`❌ operational_monitoring_start_at: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS operational_driver_release_at TIMESTAMPTZ`; steps.push("✅ bookings.operational_driver_release_at added"); } catch (e) { errors.push(`❌ operational_driver_release_at: ${e}`); }

  // ── Tracking / admin fields ──────────────────────────────────
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_lookup_last_at TIMESTAMPTZ`; steps.push("✅ bookings.flight_lookup_last_at added"); } catch (e) { errors.push(`❌ flight_lookup_last_at: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_lookup_source TEXT DEFAULT 'live_primary'`; steps.push("✅ bookings.flight_lookup_source added"); } catch (e) { errors.push(`❌ flight_lookup_source: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airport_last_action TEXT`; steps.push("✅ bookings.airport_last_action added"); } catch (e) { errors.push(`❌ airport_last_action: ${e}`); }
  try { await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS airport_admin_notes TEXT`; steps.push("✅ bookings.airport_admin_notes added"); } catch (e) { errors.push(`❌ airport_admin_notes: ${e}`); }

  // ── Indexes ──────────────────────────────────────────────────
  try { await sql`CREATE INDEX IF NOT EXISTS idx_bookings_airport_code ON bookings(airport_code)`; steps.push("✅ index idx_bookings_airport_code created"); } catch (e) { errors.push(`❌ idx_bookings_airport_code: ${e}`); }
  try { await sql`CREATE INDEX IF NOT EXISTS idx_bookings_airport_phase ON bookings(airport_phase)`; steps.push("✅ index idx_bookings_airport_phase created"); } catch (e) { errors.push(`❌ idx_bookings_airport_phase: ${e}`); }
  try { await sql`CREATE INDEX IF NOT EXISTS idx_bookings_airport_status ON bookings(airport_intelligence_status)`; steps.push("✅ index idx_bookings_airport_status created"); } catch (e) { errors.push(`❌ idx_bookings_airport_status: ${e}`); }
  try { await sql`CREATE INDEX IF NOT EXISTS idx_bookings_airport_monitor ON bookings(airport_monitoring_enabled)`; steps.push("✅ index idx_bookings_airport_monitor created"); } catch (e) { errors.push(`❌ idx_bookings_airport_monitor: ${e}`); }
  try { await sql`CREATE INDEX IF NOT EXISTS idx_bookings_flight_validation ON bookings(flight_validation_status)`; steps.push("✅ index idx_bookings_flight_validation created"); } catch (e) { errors.push(`❌ idx_bookings_flight_validation: ${e}`); }
  try { await sql`CREATE INDEX IF NOT EXISTS idx_bookings_manual_review ON bookings(manual_flight_review_required)`; steps.push("✅ index idx_bookings_manual_review created"); } catch (e) { errors.push(`❌ idx_bookings_manual_review: ${e}`); }

  // ── dispatch_event_log index ─────────────────────────────────
  try { await sql`CREATE INDEX IF NOT EXISTS idx_del_event_type ON dispatch_event_log(event_type)`; steps.push("✅ dispatch_event_log event_type index ensured"); } catch (e) { errors.push(`❌ idx_del_event_type: ${e}`); }

  return NextResponse.json({
    success: errors.length === 0,
    steps,
    errors,
    bm8_fields_added: 27,
    bm8_indexes_created: 6,
    bm8_event_types_registered: [
      "FLIGHT_LOOKUP_SUCCESS", "FLIGHT_LOOKUP_FAILED", "FLIGHT_NOT_FOUND",
      "FLIGHT_DELAY_DETECTED", "FLIGHT_LANDED", "AIRPORT_PHASE_UPDATED",
      "SLA_SHIFTED_BY_FLIGHT", "AIRPORT_IRREGULARITY",
      "CUSTOMER_FLIGHT_UPDATE_REQUESTED", "DRIVER_FLIGHT_REVIEW_ALERTED",
      "FLIGHT_VALIDATION_INVALID_FORMAT", "FLIGHT_PROVIDER_UNAVAILABLE",
      "FLIGHT_MANUALLY_REVIEWED", "AIRPORT_PASSENGER_READY",
      "AIRPORT_PICKUP_WINDOW_ACTIVE"
    ],
    mode: "live_primary",
    providers: {
      primary: "FlightAware AeroAPI",
      secondary: "aviationstack",
      fallback: "sandbox_simulation"
    },
    timestamp: new Date().toISOString()
  });
}
