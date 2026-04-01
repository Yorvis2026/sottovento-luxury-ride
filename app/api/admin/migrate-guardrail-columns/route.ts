import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  // 1. bookings: accepted_at (when driver accepted the offer)
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`
    results.accepted_at = 'added'
  } catch (err: any) {
    results.accepted_at_error = err.message
  }

  // 2. bookings: risk_source (e.g. 'post_accept_guardrail')
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS risk_source TEXT`
    results.risk_source = 'added'
  } catch (err: any) {
    results.risk_source_error = err.message
  }

  // 3. bookings: auto_escalated_at (when auto-escalation fired)
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_escalated_at TIMESTAMPTZ`
    results.auto_escalated_at = 'added'
  } catch (err: any) {
    results.auto_escalated_at_error = err.message
  }

  // 4. bookings: auto_escalation_case (A, B, or C)
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS auto_escalation_case TEXT`
    results.auto_escalation_case = 'added'
  } catch (err: any) {
    results.auto_escalation_case_error = err.message
  }

  // 5. bookings: guardrail_threshold_minutes (configurable per booking, default 10)
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guardrail_threshold_minutes INTEGER DEFAULT 10`
    results.guardrail_threshold_minutes = 'added'
  } catch (err: any) {
    results.guardrail_threshold_minutes_error = err.message
  }

  // Verify columns exist
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'bookings'
    AND column_name IN (
      'accepted_at', 'risk_source', 'auto_escalated_at',
      'auto_escalation_case', 'at_risk_flagged_at',
      'guardrail_threshold_minutes'
    )
    ORDER BY column_name
  `

  return NextResponse.json({
    migration: 'guardrail_columns_v1',
    results,
    verified_columns: cols.map((c: any) => ({ name: c.column_name, type: c.data_type })),
  })
}
