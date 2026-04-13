// ─────────────────────────────────────────────────────────────────────────────
// POST /api/driver/push-subscribe — BM-PWA-PUSH-SLN-02
// Registers or updates a Web Push subscription for a driver.
// Body: { driver_id: string, subscription: PushSubscriptionJSON }
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { driver_id, subscription } = body

    if (!driver_id || !subscription?.endpoint) {
      return NextResponse.json({ error: 'driver_id and subscription.endpoint are required' }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Upsert: one row per (driver_id, endpoint) — update keys if subscription rotated
    await sql`
      INSERT INTO driver_push_subscriptions (
        driver_id,
        endpoint,
        p256dh,
        auth,
        created_at,
        updated_at
      ) VALUES (
        ${driver_id}::uuid,
        ${subscription.endpoint},
        ${subscription.keys?.p256dh ?? null},
        ${subscription.keys?.auth ?? null},
        NOW(),
        NOW()
      )
      ON CONFLICT (driver_id, endpoint) DO UPDATE SET
        p256dh     = EXCLUDED.p256dh,
        auth       = EXCLUDED.auth,
        updated_at = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[push-subscribe] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/driver/push-subscribe — remove a subscription (driver unsubscribes)
// Body: { driver_id: string, endpoint: string }
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const { driver_id, endpoint } = body

    if (!driver_id || !endpoint) {
      return NextResponse.json({ error: 'driver_id and endpoint are required' }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    await sql`
      DELETE FROM driver_push_subscriptions
      WHERE driver_id = ${driver_id}::uuid AND endpoint = ${endpoint}
    `

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[push-subscribe DELETE] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
