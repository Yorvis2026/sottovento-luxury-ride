export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

/**
 * GET /api/admin/migrate-bm5
 * Bloque Maestro 5 — Driver Reliability + Legal Priority + Partner Governance
 *
 * Adds to drivers table:
 *   - legal_affiliation_type   (SOTTOVENTO_LEGAL_FLEET | PARTNER_LEGAL_FLEET | GENERAL_NETWORK_DRIVER)
 *   - reliability_score        (0–100, DRS formula)
 *   - driver_tier              (ELITE | PREMIUM | STANDARD | RESTRICTED | OBSERVATION)
 *   - acceptance_rate          (0.0–1.0)
 *   - completion_rate          (0.0–1.0)
 *   - driver_cancel_rate       (0.0–1.0)
 *   - fallback_response_rate   (0.0–1.0)
 *   - on_time_score            (0.0–1.0)
 *   - dispatch_response_score  (0.0–1.0)
 *   - reliability_updated_at   (timestamp of last DRS recalculation)
 *
 * Adds to partner_companies table:
 *   - partner_dispatch_mode    (CAPTURE_ONLY | SUBNETWORK_PRIORITY)
 *   - legal_affiliation_priority_enabled (BOOLEAN)
 *   - subnetwork_priority_enabled (BOOLEAN)
 *   - invited_by_admin         (BOOLEAN)
 */
export async function GET() {
  const steps: string[] = []
  const run = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn()
      steps.push(`✅ ${label}`)
    } catch (err: any) {
      steps.push(`❌ ${label}: ${err.message}`)
    }
  }

  // ── 1. Add BM5 columns to drivers ──────────────────────────────────────────
  await run("Add legal_affiliation_type to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS legal_affiliation_type TEXT
          DEFAULT 'GENERAL_NETWORK_DRIVER'
          CHECK (legal_affiliation_type IN (
            'SOTTOVENTO_LEGAL_FLEET',
            'PARTNER_LEGAL_FLEET',
            'GENERAL_NETWORK_DRIVER'
          ))
    `
  })

  await run("Add reliability_score to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS reliability_score NUMERIC(5,2) DEFAULT 65.00
    `
  })

  await run("Add driver_tier (BM5) to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS driver_tier TEXT
          DEFAULT 'STANDARD'
          CHECK (driver_tier IN ('ELITE','PREMIUM','STANDARD','RESTRICTED','OBSERVATION'))
    `
  })

  await run("Add acceptance_rate to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS acceptance_rate NUMERIC(5,4) DEFAULT 0.75
    `
  })

  await run("Add completion_rate to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5,4) DEFAULT 0.90
    `
  })

  await run("Add driver_cancel_rate to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS driver_cancel_rate NUMERIC(5,4) DEFAULT 0.05
    `
  })

  await run("Add fallback_response_rate to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS fallback_response_rate NUMERIC(5,4) DEFAULT 0.80
    `
  })

  await run("Add on_time_score to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS on_time_score NUMERIC(5,4) DEFAULT 0.85
    `
  })

  await run("Add dispatch_response_score to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS dispatch_response_score NUMERIC(5,4) DEFAULT 0.85
    `
  })

  await run("Add reliability_updated_at to drivers", async () => {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS reliability_updated_at TIMESTAMPTZ
    `
  })

  // ── 2. Add BM5 columns to partner_companies ────────────────────────────────
  await run("Add partner_dispatch_mode to partner_companies", async () => {
    await sql`
      ALTER TABLE partner_companies
        ADD COLUMN IF NOT EXISTS partner_dispatch_mode TEXT
          DEFAULT 'CAPTURE_ONLY'
          CHECK (partner_dispatch_mode IN ('CAPTURE_ONLY','SUBNETWORK_PRIORITY'))
    `
  })

  await run("Add legal_affiliation_priority_enabled to partner_companies", async () => {
    await sql`
      ALTER TABLE partner_companies
        ADD COLUMN IF NOT EXISTS legal_affiliation_priority_enabled BOOLEAN DEFAULT FALSE
    `
  })

  await run("Add subnetwork_priority_enabled to partner_companies", async () => {
    await sql`
      ALTER TABLE partner_companies
        ADD COLUMN IF NOT EXISTS subnetwork_priority_enabled BOOLEAN DEFAULT FALSE
    `
  })

  await run("Add invited_by_admin to partner_companies", async () => {
    await sql`
      ALTER TABLE partner_companies
        ADD COLUMN IF NOT EXISTS invited_by_admin BOOLEAN DEFAULT TRUE
    `
  })

  // ── 3. Backfill legal_affiliation_type for existing drivers ────────────────
  await run("Backfill legal_affiliation_type for existing drivers", async () => {
    await sql`
      UPDATE drivers
      SET legal_affiliation_type = 'GENERAL_NETWORK_DRIVER'
      WHERE legal_affiliation_type IS NULL
    `
  })

  // ── 4. Compute initial reliability_score from existing data ───────────────
  await run("Compute initial reliability_score from existing ride data", async () => {
    await sql`
      UPDATE drivers d
      SET
        acceptance_rate = CASE
          WHEN COALESCE(d.rides_completed, 0) + COALESCE(d.late_cancel_count, 0) > 0
          THEN LEAST(1.0, COALESCE(d.rides_completed, 0)::numeric /
               NULLIF(COALESCE(d.rides_completed, 0) + COALESCE(d.late_cancel_count, 0), 0))
          ELSE 0.75
        END,
        completion_rate = CASE
          WHEN COALESCE(d.rides_completed, 0) > 0
          THEN LEAST(1.0, COALESCE(d.rides_completed, 0)::numeric /
               NULLIF(COALESCE(d.rides_completed, 0) + COALESCE(d.complaint_count, 0), 0))
          ELSE 0.90
        END,
        driver_cancel_rate = CASE
          WHEN COALESCE(d.rides_completed, 0) + COALESCE(d.late_cancel_count, 0) > 0
          THEN LEAST(1.0, COALESCE(d.late_cancel_count, 0)::numeric /
               NULLIF(COALESCE(d.rides_completed, 0) + COALESCE(d.late_cancel_count, 0), 0))
          ELSE 0.05
        END,
        on_time_score = CASE
          WHEN COALESCE(d.rides_completed, 0) > 0
          THEN LEAST(1.0, COALESCE(d.on_time_rides, 0)::numeric /
               NULLIF(COALESCE(d.rides_completed, 0), 0))
          ELSE 0.85
        END
      WHERE d.driver_status IN ('active', 'provisional')
    `
  })

  // ── 5. Compute reliability_score using DRS formula ─────────────────────────
  await run("Compute reliability_score (DRS formula)", async () => {
    await sql`
      UPDATE drivers
      SET
        reliability_score = ROUND(
          LEAST(100, GREATEST(0,
            (COALESCE(acceptance_rate, 0.75) * 25) +
            (COALESCE(completion_rate, 0.90) * 25) +
            ((1 - COALESCE(driver_cancel_rate, 0.05)) * 20) +
            (COALESCE(fallback_response_rate, 0.80) * 15) +
            (COALESCE(on_time_score, 0.85) * 10) +
            (COALESCE(dispatch_response_score, 0.85) * 5)
          ))::numeric, 2
        ),
        reliability_updated_at = NOW()
    `
  })

  // ── 6. Classify driver_tier from reliability_score ─────────────────────────
  await run("Classify driver_tier from reliability_score", async () => {
    await sql`
      UPDATE drivers
      SET driver_tier = CASE
        WHEN reliability_score >= 90 THEN 'ELITE'
        WHEN reliability_score >= 80 THEN 'PREMIUM'
        WHEN reliability_score >= 65 THEN 'STANDARD'
        WHEN reliability_score >= 50 THEN 'RESTRICTED'
        ELSE 'OBSERVATION'
      END
    `
  })

  // ── 7. Verification counts ─────────────────────────────────────────────────
  const counts = await sql`
    SELECT
      COUNT(*) AS total_drivers,
      COUNT(*) FILTER (WHERE driver_tier = 'ELITE') AS elite,
      COUNT(*) FILTER (WHERE driver_tier = 'PREMIUM') AS premium,
      COUNT(*) FILTER (WHERE driver_tier = 'STANDARD') AS standard,
      COUNT(*) FILTER (WHERE driver_tier = 'RESTRICTED') AS restricted,
      COUNT(*) FILTER (WHERE driver_tier = 'OBSERVATION') AS observation,
      COUNT(*) FILTER (WHERE legal_affiliation_type = 'SOTTOVENTO_LEGAL_FLEET') AS sottovento_fleet,
      COUNT(*) FILTER (WHERE legal_affiliation_type = 'PARTNER_LEGAL_FLEET') AS partner_fleet,
      COUNT(*) FILTER (WHERE legal_affiliation_type = 'GENERAL_NETWORK_DRIVER') AS general_network
    FROM drivers
  `

  const partnerCounts = await sql`
    SELECT
      COUNT(*) AS total_companies,
      COUNT(*) FILTER (WHERE partner_dispatch_mode = 'CAPTURE_ONLY') AS capture_only,
      COUNT(*) FILTER (WHERE partner_dispatch_mode = 'SUBNETWORK_PRIORITY') AS subnetwork_priority
    FROM partner_companies
  `

  return NextResponse.json({
    success: true,
    steps,
    driver_verification: counts[0],
    partner_verification: partnerCounts[0],
    message: `BM5 Migration complete. ${counts[0]?.total_drivers ?? 0} drivers processed.`
  })
}
