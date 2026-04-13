// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/migrate-push-subscriptions — BM-PWA-PUSH-SLN-02
// Creates the driver_push_subscriptions table if it doesn't exist.
// Run once after deploy.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const runtime = 'edge'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    await sql`
      CREATE TABLE IF NOT EXISTS driver_push_subscriptions (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id   UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        endpoint    TEXT        NOT NULL,
        p256dh      TEXT,
        auth        TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (driver_id, endpoint)
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_driver_push_subs_driver_id
      ON driver_push_subscriptions (driver_id)
    `

    return NextResponse.json({ ok: true, message: 'driver_push_subscriptions table ready' })
  } catch (err: unknown) {
    console.error('[migrate-push-subscriptions] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
