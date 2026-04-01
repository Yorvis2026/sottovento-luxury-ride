export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

/**
 * POST /api/admin/recalculate-driver-scores
 * GET  /api/admin/recalculate-driver-scores?driver_id=<uuid>  (single driver)
 *
 * Bloque Maestro 5 — Driver Reliability Score Engine
 *
 * DRS Formula (0–100):
 *   acceptance_rate        * 25
 *   completion_rate        * 25
 *   (1 - driver_cancel_rate) * 20
 *   fallback_response_rate * 15
 *   on_time_score          * 10
 *   dispatch_response_score * 5
 *
 * Tier Classification:
 *   >= 90  ELITE
 *   >= 80  PREMIUM
 *   >= 65  STANDARD
 *   >= 50  RESTRICTED
 *   <  50  OBSERVATION
 *
 * Triggers:
 *   - Manual admin refresh
 *   - After fallback event (called by fallback-pool-dispatch)
 *   - After cancellation event (called by cancel-ride)
 *   - After ride completion (called by complete-ride)
 *   - Daily cron (scheduled externally)
 */

function classifyTier(score: number): string {
  if (score >= 90) return "ELITE"
  if (score >= 80) return "PREMIUM"
  if (score >= 65) return "STANDARD"
  if (score >= 50) return "RESTRICTED"
  return "OBSERVATION"
}

async function recalculateDriver(driverId: string) {
  // 1. Fetch raw stats from bookings and dispatch_offers
  const stats = await sql`
    SELECT
      -- Total offers sent to this driver
      COUNT(DISTINCT o.id) FILTER (WHERE o.driver_id = d.id)                   AS total_offers,
      -- Accepted offers
      COUNT(DISTINCT o.id) FILTER (WHERE o.driver_id = d.id AND o.response = 'accepted') AS accepted_offers,
      -- Completed rides (as executing driver)
      COUNT(DISTINCT b.id) FILTER (
        WHERE b.assigned_driver_id = d.id AND b.status = 'completed'
      )                                                                          AS completed_rides,
      -- Cancelled by driver
      COUNT(DISTINCT b.id) FILTER (
        WHERE b.assigned_driver_id = d.id
          AND b.status = 'cancelled'
          AND b.cancelled_by_type = 'driver'
      )                                                                          AS driver_cancelled,
      -- Total assigned rides
      COUNT(DISTINCT b.id) FILTER (
        WHERE b.assigned_driver_id = d.id
          AND b.status IN ('completed', 'cancelled', 'archived')
      )                                                                          AS total_assigned,
      -- On-time rides
      COALESCE(d.on_time_rides, 0)                                               AS on_time_rides,
      -- Fallback offers (is_fallback_offer = true)
      COUNT(DISTINCT o.id) FILTER (
        WHERE o.driver_id = d.id AND o.is_fallback_offer = true
      )                                                                          AS fallback_offers,
      -- Fallback accepted
      COUNT(DISTINCT o.id) FILTER (
        WHERE o.driver_id = d.id AND o.is_fallback_offer = true AND o.response = 'accepted'
      )                                                                          AS fallback_accepted,
      -- Dispatch response: offers responded to (accepted or declined, not timed out)
      COUNT(DISTINCT o.id) FILTER (
        WHERE o.driver_id = d.id AND o.response IN ('accepted','declined')
      )                                                                          AS responded_offers
    FROM drivers d
    LEFT JOIN dispatch_offers o ON o.driver_id = d.id
    LEFT JOIN bookings b ON b.assigned_driver_id = d.id
    WHERE d.id = ${driverId}::uuid
    GROUP BY d.id, d.on_time_rides
  `

  if (!stats || stats.length === 0) return null

  const s = stats[0]
  const totalOffers      = Number(s.total_offers) || 0
  const acceptedOffers   = Number(s.accepted_offers) || 0
  const completedRides   = Number(s.completed_rides) || 0
  const driverCancelled  = Number(s.driver_cancelled) || 0
  const totalAssigned    = Number(s.total_assigned) || 0
  const onTimeRides      = Number(s.on_time_rides) || 0
  const fallbackOffers   = Number(s.fallback_offers) || 0
  const fallbackAccepted = Number(s.fallback_accepted) || 0
  const respondedOffers  = Number(s.responded_offers) || 0

  // 2. Compute rates
  const acceptanceRate       = totalOffers > 0 ? acceptedOffers / totalOffers : 0.75
  const completionRate       = totalAssigned > 0 ? completedRides / totalAssigned : 0.90
  const driverCancelRate     = totalAssigned > 0 ? driverCancelled / totalAssigned : 0.05
  const fallbackResponseRate = fallbackOffers > 0 ? fallbackAccepted / fallbackOffers : 0.80
  const onTimeScore          = completedRides > 0 ? onTimeRides / completedRides : 0.85
  const dispatchResponseScore = totalOffers > 0 ? respondedOffers / totalOffers : 0.85

  // 3. DRS Formula
  const rawScore =
    (acceptanceRate * 25) +
    (completionRate * 25) +
    ((1 - driverCancelRate) * 20) +
    (fallbackResponseRate * 15) +
    (onTimeScore * 10) +
    (dispatchResponseScore * 5)

  const reliabilityScore = Math.round(Math.min(100, Math.max(0, rawScore)) * 100) / 100
  const driverTier = classifyTier(reliabilityScore)

  // 4. Persist to DB
  await sql`
    UPDATE drivers
    SET
      acceptance_rate         = ${acceptanceRate},
      completion_rate         = ${completionRate},
      driver_cancel_rate      = ${driverCancelRate},
      fallback_response_rate  = ${fallbackResponseRate},
      on_time_score           = ${onTimeScore},
      dispatch_response_score = ${dispatchResponseScore},
      reliability_score       = ${reliabilityScore},
      driver_tier             = ${driverTier},
      reliability_updated_at  = NOW()
    WHERE id = ${driverId}::uuid
  `

  return {
    driver_id:              driverId,
    acceptance_rate:        Math.round(acceptanceRate * 1000) / 10,
    completion_rate:        Math.round(completionRate * 1000) / 10,
    driver_cancel_rate:     Math.round(driverCancelRate * 1000) / 10,
    fallback_response_rate: Math.round(fallbackResponseRate * 1000) / 10,
    on_time_score:          Math.round(onTimeScore * 1000) / 10,
    dispatch_response_score: Math.round(dispatchResponseScore * 1000) / 10,
    reliability_score:      reliabilityScore,
    driver_tier:            driverTier,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const driverId = searchParams.get("driver_id")

  try {
    if (driverId) {
      // Single driver recalculation
      const result = await recalculateDriver(driverId)
      if (!result) return NextResponse.json({ error: "Driver not found" }, { status: 404 })
      return NextResponse.json({ success: true, driver: result })
    }

    // All active drivers
    const drivers = await sql`
      SELECT id FROM drivers
      WHERE driver_status IN ('active', 'provisional')
      ORDER BY created_at ASC
    `

    const results = []
    const errors  = []

    for (const d of drivers) {
      try {
        const r = await recalculateDriver(d.id)
        if (r) results.push(r)
      } catch (err: any) {
        errors.push({ driver_id: d.id, error: err.message })
      }
    }

    // Tier summary
    const tierCounts = results.reduce((acc: Record<string, number>, r) => {
      acc[r.driver_tier] = (acc[r.driver_tier] ?? 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      processed: results.length,
      errors: errors.length,
      tier_distribution: tierCounts,
      drivers: results,
      updated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const driverId = body.driver_id

    if (driverId) {
      const result = await recalculateDriver(driverId)
      if (!result) return NextResponse.json({ error: "Driver not found" }, { status: 404 })
      return NextResponse.json({ success: true, driver: result })
    }

    // Recalculate all
    const drivers = await sql`
      SELECT id FROM drivers
      WHERE driver_status IN ('active', 'provisional')
      ORDER BY created_at ASC
    `

    const results = []
    const errors  = []

    for (const d of drivers) {
      try {
        const r = await recalculateDriver(d.id)
        if (r) results.push(r)
      } catch (err: any) {
        errors.push({ driver_id: d.id, error: err.message })
      }
    }

    const tierCounts = results.reduce((acc: Record<string, number>, r) => {
      acc[r.driver_tier] = (acc[r.driver_tier] ?? 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      processed: results.length,
      errors: errors.length,
      tier_distribution: tierCounts,
      drivers: results,
      updated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
