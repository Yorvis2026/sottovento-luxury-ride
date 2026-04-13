// ─────────────────────────────────────────────────────────────────────────────
// sendPushToDriver() — BM-PWA-PUSH-SLN-02
// Sends a Web Push notification to all active subscriptions of a driver.
// Safe: never throws — logs errors silently so dispatch is never blocked.
// ─────────────────────────────────────────────────────────────────────────────
import webpush from 'web-push'
import { neon } from '@neondatabase/serverless'

// VAPID keys — set in Vercel env vars
const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:tech@sottoventoluxuryride.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

export interface PushPayload {
  offer_id:    string
  offer_type:  'source' | 'pool'   // source = captador (gold), pool = network (purple)
  offer_round: number
  driver_code: string
  booking_id:  string
  pickup_text: string
  price:       number
  expires_at:  string
  deep_link:   string
}

export async function sendPushToDriver(driverId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('[sendPushToDriver] VAPID keys not configured — skipping push')
    return
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)

    const subs = await sql`
      SELECT endpoint, p256dh, auth
      FROM driver_push_subscriptions
      WHERE driver_id = ${driverId}::uuid
    ` as { endpoint: string; p256dh: string | null; auth: string | null }[]

    if (!subs.length) return

    const isSource = payload.offer_type === 'source'

    const notifTitle = isSource
      ? `⭐ OFERTA CAPTADOR — $${payload.price}`
      : `🟣 OFERTA DE RED — $${payload.price}`

    const notifBody = `${payload.pickup_text} · Expira en ${Math.round((new Date(payload.expires_at).getTime() - Date.now()) / 60000)} min`

    const pushPayload = JSON.stringify({
      ...payload,
      title: notifTitle,
      body:  notifBody,
    })

    await Promise.allSettled(
      subs.map(async (sub) => {
        if (!sub.p256dh || !sub.auth) return

        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }

        try {
          await webpush.sendNotification(pushSub, pushPayload, {
            TTL: Math.max(30, Math.round((new Date(payload.expires_at).getTime() - Date.now()) / 1000)),
            urgency: 'high',
          })
        } catch (err: unknown) {
          // If subscription expired (410), remove it
          if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
            try {
              await sql`
                DELETE FROM driver_push_subscriptions
                WHERE driver_id = ${driverId}::uuid AND endpoint = ${sub.endpoint}
              `
            } catch {}
          }
          console.warn('[sendPushToDriver] push failed for endpoint:', sub.endpoint, err)
        }
      })
    )
  } catch (err) {
    // Never block dispatch on push failure
    console.error('[sendPushToDriver] fatal error:', err)
  }
}
