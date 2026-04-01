import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST-ACCEPT INACTIVITY GUARDRAIL — Bloque Maestro 2
 *
 * Detects rides where:
 *   - status IN ('accepted', 'assigned')
 *   - en_route_at IS NULL
 *   - accepted_at IS NOT NULL
 *   - now() - accepted_at > threshold (default 10 min)
 *   - at_risk_flagged_at IS NULL (not already flagged)
 *
 * Then applies A/B/C escalation logic based on pickup_eta_delta.
 *
 * Can be called:
 *   GET  → dry-run (returns what would be escalated, no DB writes)
 *   POST → live run (writes to DB)
 */

function computeCase(pickupAt: Date | null, now: Date): { caseLabel: 'A' | 'B' | 'C'; dispatchStatus: string; priority: string; autoReassignment: string } {
  if (!pickupAt) {
    // No pickup_at → treat as Case A (no urgency)
    return { caseLabel: 'A', dispatchStatus: 'reassignment_needed', priority: 'normal', autoReassignment: 'true' }
  }
  const deltaMs = pickupAt.getTime() - now.getTime()
  const deltaMin = deltaMs / 60000

  if (deltaMin > 45) {
    return { caseLabel: 'A', dispatchStatus: 'reassignment_needed', priority: 'normal', autoReassignment: 'true' }
  } else if (deltaMin > 15) {
    return { caseLabel: 'B', dispatchStatus: 'urgent_reassignment', priority: 'high', autoReassignment: 'conditional' }
  } else {
    return { caseLabel: 'C', dispatchStatus: 'critical_driver_failure', priority: 'critical', autoReassignment: 'false' }
  }
}

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find at-risk rides (dry run)
  const rides = await sql`
    SELECT
      b.id,
      b.status,
      b.dispatch_status,
      b.pickup_at,
      b.accepted_at,
      b.en_route_at,
      b.at_risk_flagged_at,
      b.auto_escalated_at,
      b.auto_escalation_case,
      b.guardrail_threshold_minutes,
      b.assigned_driver_id,
      d.driver_code,
      d.full_name AS driver_name,
      EXTRACT(EPOCH FROM (${now.toISOString()}::timestamptz - b.accepted_at)) / 60 AS minutes_since_accept
    FROM bookings b
    LEFT JOIN drivers d ON d.id = b.assigned_driver_id
    WHERE b.status IN ('accepted', 'assigned')
      AND b.en_route_at IS NULL
      AND b.accepted_at IS NOT NULL
      AND b.at_risk_flagged_at IS NULL
      AND b.auto_escalated_at IS NULL
      AND (${now.toISOString()}::timestamptz - b.accepted_at) > 
          INTERVAL '1 minute' * COALESCE(b.guardrail_threshold_minutes, 10)
    ORDER BY b.accepted_at ASC
  `

  const preview = rides.map((r: any) => {
    const pickupAt = r.pickup_at ? new Date(r.pickup_at) : null
    const { caseLabel, dispatchStatus, priority } = computeCase(pickupAt, now)
    return {
      booking_id: r.id,
      driver_code: r.driver_code,
      driver_name: r.driver_name,
      status: r.status,
      accepted_at: r.accepted_at,
      minutes_since_accept: Math.round(parseFloat(r.minutes_since_accept) * 10) / 10,
      pickup_at: r.pickup_at,
      would_escalate_to_case: caseLabel,
      would_set_dispatch_status: dispatchStatus,
      priority,
    }
  })

  return NextResponse.json({
    mode: 'dry_run',
    server_now: now.toISOString(),
    at_risk_count: rides.length,
    preview,
  })
}

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const processed: any[] = []
  const errors: any[] = []

  // Find at-risk rides
  const rides = await sql`
    SELECT
      b.id,
      b.status,
      b.dispatch_status,
      b.pickup_at,
      b.accepted_at,
      b.en_route_at,
      b.at_risk_flagged_at,
      b.auto_escalated_at,
      b.guardrail_threshold_minutes,
      b.assigned_driver_id,
      d.driver_code
    FROM bookings b
    LEFT JOIN drivers d ON d.id = b.assigned_driver_id
    WHERE b.status IN ('accepted', 'assigned')
      AND b.en_route_at IS NULL
      AND b.accepted_at IS NOT NULL
      AND b.at_risk_flagged_at IS NULL
      AND b.auto_escalated_at IS NULL
      AND (${now.toISOString()}::timestamptz - b.accepted_at) > 
          INTERVAL '1 minute' * COALESCE(b.guardrail_threshold_minutes, 10)
    ORDER BY b.accepted_at ASC
  `

  for (const ride of rides) {
    try {
      const pickupAt = ride.pickup_at ? new Date(ride.pickup_at) : null
      const { caseLabel, dispatchStatus } = computeCase(pickupAt, now)

      await sql`
        UPDATE bookings
        SET
          at_risk_flagged_at    = ${now.toISOString()}::timestamptz,
          risk_source           = 'post_accept_guardrail',
          auto_escalated_at     = ${now.toISOString()}::timestamptz,
          auto_escalation_case  = ${caseLabel},
          status                = 'driver_issue',
          dispatch_status       = ${dispatchStatus},
          updated_at            = ${now.toISOString()}::timestamptz
        WHERE id = ${ride.id}
      `

      processed.push({
        booking_id: ride.id,
        driver_code: ride.driver_code,
        escalation_case: caseLabel,
        new_dispatch_status: dispatchStatus,
        at_risk_flagged_at: now.toISOString(),
        auto_escalated_at: now.toISOString(),
      })
    } catch (err: any) {
      errors.push({ booking_id: ride.id, error: err.message })
    }
  }

  return NextResponse.json({
    mode: 'live_run',
    server_now: now.toISOString(),
    processed_count: processed.length,
    error_count: errors.length,
    processed,
    errors,
  })
}
