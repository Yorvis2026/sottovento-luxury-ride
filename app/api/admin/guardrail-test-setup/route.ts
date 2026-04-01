import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/admin/guardrail-test-setup
 *
 * Sets up a booking for guardrail testing:
 * - Sets accepted_at to X minutes ago (default: 15 min ago)
 * - Sets pickup_at to Y minutes from now (default: 60 min from now)
 * - Resets at_risk_flagged_at, auto_escalated_at, auto_escalation_case
 * - Sets status = 'accepted', dispatch_status = 'assigned'
 * - Clears en_route_at
 *
 * Body: { booking_id, accepted_minutes_ago?, pickup_minutes_from_now? }
 */
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { booking_id, accepted_minutes_ago = 15, pickup_minutes_from_now = 60 } = body

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  const now = new Date()
  const acceptedAt = new Date(now.getTime() - accepted_minutes_ago * 60 * 1000)
  const pickupAt = new Date(now.getTime() + pickup_minutes_from_now * 60 * 1000)

  await sql`
    UPDATE bookings
    SET
      status                = 'accepted',
      dispatch_status       = 'assigned',
      accepted_at           = ${acceptedAt.toISOString()}::timestamptz,
      pickup_at             = ${pickupAt.toISOString()}::timestamptz,
      en_route_at           = NULL,
      at_risk_flagged_at    = NULL,
      risk_source           = NULL,
      auto_escalated_at     = NULL,
      auto_escalation_case  = NULL,
      driver_exit_reason    = NULL,
      driver_exit_comment   = NULL,
      driver_exit_at        = NULL,
      driver_exit_case      = NULL,
      updated_at            = NOW()
    WHERE id = ${booking_id}
  `

  // Verify
  const [row] = await sql`
    SELECT
      id, status, dispatch_status,
      accepted_at, pickup_at, en_route_at,
      at_risk_flagged_at, auto_escalated_at, auto_escalation_case,
      EXTRACT(EPOCH FROM (NOW() - accepted_at)) / 60 AS minutes_since_accept,
      EXTRACT(EPOCH FROM (pickup_at - NOW())) / 60 AS minutes_until_pickup
    FROM bookings
    WHERE id = ${booking_id}
  `

  return NextResponse.json({
    ok: true,
    booking_id,
    setup: {
      accepted_at: row.accepted_at,
      pickup_at: row.pickup_at,
      status: row.status,
      dispatch_status: row.dispatch_status,
      minutes_since_accept: Math.round(parseFloat(row.minutes_since_accept) * 10) / 10,
      minutes_until_pickup: Math.round(parseFloat(row.minutes_until_pickup) * 10) / 10,
    },
    guardrail_will_fire: parseFloat(row.minutes_since_accept) >= 10,
    expected_case: (() => {
      const minUntil = parseFloat(row.minutes_until_pickup)
      if (minUntil > 45) return 'A'
      if (minUntil > 15) return 'B'
      return 'C'
    })(),
  })
}
