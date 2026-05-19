// sendPushToDriver() + sendApnsToDriver() — BM-SLN-APNS-HTTP2-FIX
// Sends Web Push (VAPID) AND native APNs to a driver.
// Safe: never throws — logs errors silently so dispatch is never blocked.
// APNs uses http2 module (Node.js native) because Apple requires HTTP/2
// and fetch() does not support HTTP/2 outbound in Vercel serverless.
// ─────────────────────────────────────────────────────────────────────────────
import webpush from 'web-push'
import { neon } from '@neondatabase/serverless'
import { createSign } from 'crypto'
import * as http2 from 'http2'

// VAPID keys — set in Vercel env vars
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:tech@sottoventoluxuryride.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

// APNs config — set in Vercel env vars
const APNS_KEY_ID = process.env.APNS_KEY_ID || ''           // e.g. 884CXG5J98
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || ''         // e.g. XXXXXXXXXX
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'com.sottoventoluxuryride.driver'
const APNS_PRIVATE_KEY = (process.env.APNS_PRIVATE_KEY || '').replace(/\\n/g, '\n')
// APNS_ENV: 'production' or 'sandbox' (default production for App Store builds)
const APNS_ENV = process.env.APNS_ENV || 'production'

export interface PushPayload {
  offer_id: string
  offer_type: 'source' | 'pool'  // source = captador (gold), pool = network (purple)
  offer_round: number
  driver_code: string
  booking_id: string
  pickup_text: string
  price: number
  expires_at: string
  deep_link: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Web Push (VAPID) — for PWA / browser subscriptions
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPushToDriver(driverId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.warn('[sendPushToDriver] VAPID keys not configured — skipping web push')
    return
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const subs = await sql`
      SELECT endpoint, p256dh, auth
      FROM driver_push_subscriptions
      WHERE driver_id = ${driverId}::uuid
    ` as { endpoint: string; p256dh: string | null; auth: string | null }[]

    if (!subs.length) {
      console.log('[sendPushToDriver] No web push subscriptions for driver', driverId)
      return
    }

    const isSource = payload.offer_type === 'source'
    const notifTitle = isSource
      ? `⭐ OFERTA CAPTADOR — $${payload.price}`
      : `🟣 OFERTA DE RED — $${payload.price}`

    const notifBody = `${payload.pickup_text} · Expira en ${Math.round((new Date(payload.expires_at).getTime() - Date.now()) / 60000)} min`

    const pushPayload = JSON.stringify({
      ...payload,
      title: notifTitle,
      body: notifBody,
      sound: 'default',
      badge: 1,
      tag: payload.booking_id,
      renotify: true,
      vibrate: [200, 100, 200],
      icon: '/icons/sottovento-driver-192.png',
      data: {
        url: payload.deep_link,
        offer_id: payload.offer_id,
        offer_type: payload.offer_type,
        booking_id: payload.booking_id,
      },
    })

    await Promise.allSettled(
      subs.map(async (sub) => {
        if (!sub.p256dh || !sub.auth) return
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload
          )
          console.log('[sendPushToDriver] Web push sent to', sub.endpoint.slice(0, 40))
        } catch (err: any) {
          console.error('[sendPushToDriver] Web push error:', err?.statusCode, err?.body)
        }
      })
    )
  } catch (err) {
    console.error('[sendPushToDriver] Fatal error:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Native APNs — for iOS native app (Capacitor)
// Uses HTTP/2 JWT authentication with the .p8 key
// Uses Node.js http2 module (NOT fetch) because Apple requires HTTP/2
// ─────────────────────────────────────────────────────────────────────────────

/** Map dispatch offer_type to driver-app push type (Capacitor data.type) */
function mapOfferTypeToPushType(offerType: string): string {
  if (offerType === 'source') return 'new_ride'
  if (offerType === 'pool') return 'pool_offer'
  if (offerType === 'fallback') return 'dispatch_escalation'
  return 'dispatch_escalation'
}

/** Generate APNs JWT token using ES256 */
function generateApnsJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const claims = Buffer.from(JSON.stringify({ iss: APNS_TEAM_ID, iat: now })).toString('base64url')
  const signingInput = `${header}.${claims}`
  const sign = createSign('SHA256')
  sign.update(signingInput)
  const signature = sign.sign({ key: APNS_PRIVATE_KEY, dsaEncoding: 'ieee-p1363' }).toString('base64url')
  return `${signingInput}.${signature}`
}

/** Send a single APNs push via HTTP/2 using Node.js http2 module */
function sendApnsHttp2(
  host: string,
  deviceToken: string,
  bundleId: string,
  jwt: string,
  apnsPayload: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`)

    client.on('error', (err) => {
      client.destroy()
      reject(err)
    })

    const path = `/3/device/${deviceToken}`
    const req = client.request({
      ':method': 'POST',
      ':path': path,
      ':scheme': 'https',
      ':authority': host,
      'authorization': `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600),
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(apnsPayload).toString(),
    })

    let statusCode = 0
    req.on('response', (headers) => {
      statusCode = headers[':status'] as number
    })

    let body = ''
    req.on('data', (chunk) => { body += chunk })

    req.on('end', () => {
      client.close()
      resolve({ status: statusCode, body })
    })

    req.on('error', (err) => {
      client.destroy()
      reject(err)
    })

    req.write(apnsPayload)
    req.end()
  })
}

export async function sendApnsToDriver(driverCode: string, payload: PushPayload): Promise<void> {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_PRIVATE_KEY) {
    console.warn('[sendApnsToDriver] APNs credentials not configured — skipping native push')
    console.warn('[sendApnsToDriver] Missing:', {
      APNS_KEY_ID: !!APNS_KEY_ID,
      APNS_TEAM_ID: !!APNS_TEAM_ID,
      APNS_PRIVATE_KEY: !!APNS_PRIVATE_KEY,
    })
    return
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Get all APNs tokens for this driver
    const tokens = await sql`
      SELECT apns_token, bundle_id
      FROM driver_apns_tokens
      WHERE driver_code = ${driverCode}
      ORDER BY updated_at DESC
    ` as { apns_token: string; bundle_id: string | null }[]

    if (!tokens.length) {
      console.log('[sendApnsToDriver] No APNs tokens for driver', driverCode)
      return
    }

    console.log(`[sendApnsToDriver] Sending to ${tokens.length} device(s) for driver ${driverCode}`)

    const isSource = payload.offer_type === 'source'
    const alertTitle = isSource
      ? `⭐ New Ride Offer — $${payload.price}`
      : `🟣 Network Offer — $${payload.price}`
    const alertBody = `${payload.pickup_text} · Expires in ${Math.round((new Date(payload.expires_at).getTime() - Date.now()) / 60000)} min`

    const apnsHost = APNS_ENV === 'sandbox'
      ? 'api.sandbox.push.apple.com'
      : 'api.push.apple.com'

    const jwt = generateApnsJwt()

    await Promise.allSettled(
      tokens.map(async (row) => {
        const deviceToken = row.apns_token
        const bundleId = row.bundle_id || APNS_BUNDLE_ID

        const apnsPayloadObj = {
          aps: {
            alert: {
              title: alertTitle,
              body: alertBody,
            },
            sound: 'default',
            badge: 1,
            category: 'RIDE_OFFER',
          },
          driver_code: driverCode,
          type: mapOfferTypeToPushType(payload.offer_type),
          offer_id: payload.offer_id,
          offer_type: payload.offer_type,
          booking_id: payload.booking_id,
          deep_link: payload.deep_link,
          price: payload.price,
          expires_at: payload.expires_at,
        }
        const apnsPayload = JSON.stringify(apnsPayloadObj)

        console.log('[sendApnsToDriver] APNs outbound', JSON.stringify({
          driver_code: driverCode,
          APNS_ENV,
          APNS_BUNDLE_ID,
          apns_topic: bundleId,
          apnsPayload: apnsPayloadObj,
        }))

        try {
          const { status, body: responseBody } = await sendApnsHttp2(
            apnsHost,
            deviceToken,
            bundleId,
            jwt,
            apnsPayload
          )

          if (status === 200) {
            console.log(`[sendApnsToDriver] ✅ APNs delivered — device: ${deviceToken.slice(0, 16)}… status: 200`)
          } else {
            console.error(`[sendApnsToDriver] ❌ APNs error — status: ${status} device: ${deviceToken.slice(0, 16)}… body: ${responseBody}`)

            // Remove invalid tokens from DB
            if (status === 410 || responseBody.includes('BadDeviceToken') || responseBody.includes('Unregistered')) {
              console.warn(`[sendApnsToDriver] Removing invalid token for driver ${driverCode}`)
              try {
                await sql`DELETE FROM driver_apns_tokens WHERE apns_token = ${deviceToken}`
              } catch {}
            }
          }
        } catch (http2Err) {
          console.error(`[sendApnsToDriver] HTTP/2 error for device ${deviceToken.slice(0, 16)}:`, http2Err)
        }
      })
    )
  } catch (err) {
    console.error('[sendApnsToDriver] Fatal error:', err)
  }
}
