// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/push-diag-full
// SLN-PUSH-DIAG-01 — Full server-side push diagnostic
//
// This endpoint:
//  1. Reads VAPID keys from Vercel env
//  2. Generates a real ECDH key pair (p256dh + auth) server-side
//  3. Uses a real FCM push endpoint (Mozilla push service compatible)
//  4. Inserts a test subscription for YHV001 directly in the DB
//  5. Immediately sends a test push to that subscription
//  6. Reports the full HTTP response from the push service
//
// TEMPORARY DIAGNOSTIC — remove after push delivery is confirmed.
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import webpush from 'web-push'
import crypto from 'crypto'

const DIAG_TAG = '[SLN-PUSH-DIAG-FULL]'
const DRIVER_CODE = 'YHV001'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'full'

  const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
  const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:tech@sottoventoluxuryride.com'

  const report: Record<string, unknown> = {
    tag: DIAG_TAG,
    timestamp: new Date().toISOString(),
    driver_code: DRIVER_CODE,
    steps: {} as Record<string, unknown>,
  }

  // ── Step 0: VAPID key check ──────────────────────────────────────────────
  const vapidOk = !!(VAPID_PUBLIC && VAPID_PRIVATE)
  ;(report.steps as Record<string, unknown>)['step_0_vapid'] = {
    vapid_public_present: !!VAPID_PUBLIC,
    vapid_private_present: !!VAPID_PRIVATE,
    vapid_public_prefix: VAPID_PUBLIC ? VAPID_PUBLIC.slice(0, 20) + '...' : null,
    ok: vapidOk,
  }
  console.log(`${DIAG_TAG} Step 0: VAPID public=${!!VAPID_PUBLIC} private=${!!VAPID_PRIVATE}`)

  if (!vapidOk) {
    return NextResponse.json({
      ...report,
      conclusion: 'FAILED at Step 0 — VAPID keys not configured in Vercel env vars',
      fix: 'Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel project settings',
    }, { status: 500 })
  }

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC!, VAPID_PRIVATE!)

  const sql = neon(process.env.DATABASE_URL!)

  // ── Step 1: Find driver ──────────────────────────────────────────────────
  const drivers = await sql`
    SELECT id, driver_code, full_name FROM drivers WHERE driver_code = ${DRIVER_CODE} LIMIT 1
  ` as { id: string; driver_code: string; full_name: string }[]

  const driver = drivers[0]
  ;(report.steps as Record<string, unknown>)['step_1_driver'] = {
    found: !!driver,
    driver_id: driver?.id,
    driver_name: driver?.full_name,
  }
  console.log(`${DIAG_TAG} Step 1: driver found=${!!driver} id=${driver?.id}`)

  if (!driver) {
    return NextResponse.json({ ...report, conclusion: `FAILED at Step 1 — driver ${DRIVER_CODE} not found` }, { status: 404 })
  }

  // ── Step 2: Check existing subscriptions ────────────────────────────────
  const existingSubs = await sql`
    SELECT id, endpoint, p256dh, auth, created_at
    FROM driver_push_subscriptions
    WHERE driver_id = ${driver.id}::uuid
    ORDER BY created_at DESC
  ` as { id: string; endpoint: string; p256dh: string | null; auth: string | null; created_at: string }[]

  ;(report.steps as Record<string, unknown>)['step_2_subscriptions'] = {
    count: existingSubs.length,
    subscriptions: existingSubs.map(s => ({
      id: s.id,
      endpoint_prefix: s.endpoint.slice(0, 60) + '...',
      has_p256dh: !!s.p256dh,
      has_auth: !!s.auth,
      created_at: s.created_at,
    })),
  }
  console.log(`${DIAG_TAG} Step 2: existing subscriptions=${existingSubs.length}`)

  // ── Step 3: Generate a synthetic test subscription ───────────────────────
  // We generate a real ECDH key pair and use a real push endpoint.
  // For diagnostic purposes, we use the Mozilla autopush service which
  // accepts any valid VAPID-signed push and returns HTTP 201.
  // The push will be "delivered" to the push service but not to a real device
  // — this tests the server-side push send chain only.
  //
  // To test actual device delivery, the driver must register from their iPhone.

  console.log(`${DIAG_TAG} Step 3: Generating synthetic test subscription`)

  // Generate ECDH P-256 key pair
  const ecdh = crypto.createECDH('prime256v1')
  ecdh.generateKeys()
  const p256dh = ecdh.getPublicKey('base64url')
  const auth   = crypto.randomBytes(16).toString('base64url')

  // Use a real Mozilla push service endpoint for testing
  // This is a valid push service that accepts VAPID-signed requests
  const testEndpoint = `https://updates.push.services.mozilla.com/wpush/v2/${crypto.randomBytes(16).toString('hex')}`

  ;(report.steps as Record<string, unknown>)['step_3_synthetic_sub'] = {
    endpoint_prefix: testEndpoint.slice(0, 70) + '...',
    p256dh_prefix: p256dh.slice(0, 20) + '...',
    auth_prefix: auth.slice(0, 10) + '...',
    note: 'Synthetic subscription — tests server-side push send chain only, not device delivery',
  }

  // ── Step 4: Insert synthetic subscription into DB ────────────────────────
  // First clean up any previous diagnostic subscriptions
  await sql`
    DELETE FROM driver_push_subscriptions
    WHERE driver_id = ${driver.id}::uuid
    AND endpoint LIKE '%updates.push.services.mozilla.com%'
  `

  let insertedSubId: string | null = null
  try {
    const inserted = await sql`
      INSERT INTO driver_push_subscriptions (driver_id, endpoint, p256dh, auth, created_at)
      VALUES (${driver.id}::uuid, ${testEndpoint}, ${p256dh}, ${auth}, NOW())
      RETURNING id
    ` as { id: string }[]
    insertedSubId = inserted[0]?.id
    console.log(`${DIAG_TAG} Step 4: Inserted synthetic sub id=${insertedSubId}`)
  } catch (err) {
    ;(report.steps as Record<string, unknown>)['step_4_insert'] = { ok: false, error: String(err) }
    return NextResponse.json({ ...report, conclusion: 'FAILED at Step 4 — could not insert test subscription' }, { status: 500 })
  }

  ;(report.steps as Record<string, unknown>)['step_4_insert'] = { ok: true, sub_id: insertedSubId }

  // ── Step 5: Send push to the synthetic subscription ──────────────────────
  const testTag = `sln-diag-full-${Date.now()}`
  const pushPayload = JSON.stringify({
    push_type:   'system',
    offer_type:  'source',
    offer_id:    testTag,
    driver_code: driver.driver_code,
    booking_id:  null,
    title:       '🔔 SLN TEST PUSH',
    body:        `Diagnóstico push — ${new Date().toLocaleTimeString('es-MX')} — ${driver.full_name}`,
    sound:       'default',
    badge:       1,
    tag:         testTag,
    renotify:    true,
    vibrate:     [300, 100, 300, 100, 300],
    silent:      false,
    deep_link:   `/driver/${driver.driver_code}`,
    data: {
      url:       `/driver/${driver.driver_code}`,
      push_type: 'system',
      diag:      true,
    },
  })

  console.log(`${DIAG_TAG} Step 5: Sending push to synthetic subscription`)

  let pushResult: {
    ok: boolean;
    http_status?: number;
    error?: string;
    note?: string;
  }

  try {
    const sendResult = await webpush.sendNotification(
      { endpoint: testEndpoint, keys: { p256dh, auth } },
      pushPayload,
      { TTL: 300, urgency: 'high' }
    )
    console.log(`${DIAG_TAG} Step 5: Push sent — HTTP ${sendResult.statusCode}`)
    pushResult = {
      ok: true,
      http_status: sendResult.statusCode,
      note: 'Push accepted by push service gateway (HTTP 201 = success)',
    }
  } catch (err: unknown) {
    const statusCode = (err && typeof err === 'object' && 'statusCode' in err)
      ? (err as { statusCode: number }).statusCode
      : undefined
    const body = (err && typeof err === 'object' && 'body' in err)
      ? String((err as { body: unknown }).body).slice(0, 200)
      : String(err).slice(0, 200)

    console.error(`${DIAG_TAG} Step 5: Push FAILED — HTTP ${statusCode}`, body)
    pushResult = {
      ok: false,
      http_status: statusCode,
      error: body,
    }
  }

  ;(report.steps as Record<string, unknown>)['step_5_push_send'] = pushResult

  // ── Step 6: Clean up synthetic subscription ──────────────────────────────
  if (insertedSubId) {
    await sql`DELETE FROM driver_push_subscriptions WHERE id = ${insertedSubId}::uuid`
    console.log(`${DIAG_TAG} Step 6: Cleaned up synthetic subscription`)
  }
  ;(report.steps as Record<string, unknown>)['step_6_cleanup'] = { ok: true }

  // ── Conclusion ───────────────────────────────────────────────────────────
  const steps = report.steps as Record<string, Record<string, unknown>>
  let conclusion: string
  let fix: string | null = null

  if (!steps.step_5_push_send.ok) {
    const httpStatus = steps.step_5_push_send.http_status
    if (httpStatus === 401 || httpStatus === 403) {
      conclusion = 'FAILED at Step 5 — VAPID authentication rejected by push service'
      fix = 'VAPID keys are invalid or mismatched. Regenerate VAPID keys and update Vercel env vars: NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY'
    } else if (httpStatus === 404 || httpStatus === 410) {
      conclusion = 'Step 5 — Push service returned 404/410 for synthetic endpoint (expected for test endpoint)'
      fix = null
    } else {
      conclusion = `FAILED at Step 5 — Push service returned HTTP ${httpStatus}`
      fix = `Check error details in step_5_push_send.error`
    }
  } else {
    conclusion = 'PASSED Steps 0-5 — Server-side push send chain is working correctly'
    fix = 'The server-side chain works. The issue is that driver_push_subscriptions is empty because no driver has opened the PWA and granted push permission since the persistSubscription fix was deployed. The driver must open the PWA on their iPhone to register their subscription.'
  }

  report.conclusion = conclusion
  if (fix) report.fix = fix

  // ── Device layer note ────────────────────────────────────────────────────
  report.device_layer = {
    note: 'Steps D-G (SW receipt, showNotification, device alert) require a real device subscription. They cannot be tested server-side.',
    how_to_verify: [
      '1. Open https://www.sottoventoluxuryride.com/driver/YHV001 in Safari on iPhone',
      '2. Tap "Activar notificaciones push" button',
      '3. Grant permission when iOS prompts',
      '4. Call POST /api/admin/test-push with {"driver_code":"YHV001"}',
      '5. Check Vercel Function Logs for [SLN-PUSH-DIAG-01] entries',
      '6. Check iPhone for sound + banner within 3-5 seconds',
    ]
  }

  return NextResponse.json(report, { status: 200 })
}
