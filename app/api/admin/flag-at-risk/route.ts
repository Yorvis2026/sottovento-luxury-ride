import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * POST /api/admin/flag-at-risk
 *
 * Manually flags a booking as at-risk WITHOUT changing status.
 * Used for UI testing: shows the at_risk banner while keeping
 * the booking visible in assigned_ride.
 *
 * Body: { booking_id, escalation_case? }
 */
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { booking_id, escalation_case = 'A' } = body

  if (!booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 })
  }

  const now = new Date()

  await sql`
    UPDATE bookings
    SET
      at_risk_flagged_at   = ${now.toISOString()}::timestamptz,
      risk_source          = 'post_accept_guardrail',
      auto_escalation_case = ${escalation_case},
      auto_escalated_at    = ${now.toISOString()}::timestamptz,
      updated_at           = NOW()
    WHERE id = ${booking_id}
  `

  const [row] = await sql`
    SELECT id, status, dispatch_status, at_risk_flagged_at, risk_source, auto_escalation_case
    FROM bookings WHERE id = ${booking_id}
  `

  return NextResponse.json({
    ok: true,
    booking_id,
    flagged: {
      at_risk_flagged_at: row.at_risk_flagged_at,
      risk_source: row.risk_source,
      auto_escalation_case: row.auto_escalation_case,
      status: row.status,
      dispatch_status: row.dispatch_status,
    },
  })
}
