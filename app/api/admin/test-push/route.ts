// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/test-push
// SLN-PUSH-DIAG-01 — Isolated push diagnostic endpoint
//
// Purpose: Send a real OS-level push notification to a driver's registered
//          subscription WITHOUT any booking, dispatch, TTL, or ride state.
//          Used to isolate and verify the push presentation layer on iPhone PWA.
//
// TEMPORARY DIAGNOSTIC — remove after push delivery is confirmed in production.
//
// Body: { driver_code: string, secret?: string }
// Secret guard: PUSH_DIAG_SECRET env var (optional but recommended)
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import webpush from 'web-push'

const DIAG_TAG = '[SLN-PUSH-DIAG-01]'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { driver_code, secret } = body as { driver_code?: string; secret?: string }

  // ── Optional secret guard ────────────────────────────────────────────────
  const expectedSecret = process.env.PUSH_DIAG_SECRET
  if (expectedSecret && secret !== expectedSecret) {
    console.warn(`${DIAG_TAG} Unauthorized test-push attempt`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!driver_code) {
    return NextResponse.json({ error: 'driver_code is required' }, { status: 400 })
  }

  // ── VAPID check ──────────────────────────────────────────────────────────
  const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
  const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:tech@sottoventoluxuryride.com'

  console.log(`${DIAG_TAG} VAPID_PUBLIC present: ${!!VAPID_PUBLIC}`)
  console.log(`${DIAG_TAG} VAPID_PRIVATE present: ${!!VAPID_PRIVATE}`)

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error(`${DIAG_TAG} VAPID keys missing — cannot send push`)
    return NextResponse.json({
      error: 'VAPID keys not configured',
      diag: { vapid_public: !!VAPID_PUBLIC, vapid_private: !!VAPID_PRIVATE }
    }, { status: 500 })
  }

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

  const sql = neon(process.env.DATABASE_URL!)

  // ── Step A: Look up driver ───────────────────────────────────────────────
  console.log(`${DIAG_TAG} Step A: Looking up driver "${driver_code}"`)
  const driverRows = await sql`
    SELECT id, driver_code, full_name FROM drivers WHERE driver_code = ${driver_code} LIMIT 1
  ` as { id: string; driver_code: string; full_name: string }[]

  if (!driverRows.length) {
    console.warn(`${DIAG_TAG} Step A: Driver not found — "${driver_code}"`)
    return NextResponse.json({ error: 'Driver not found', driver_code }, { status: 404 })
  }

  const driver = driverRows[0]
  console.log(`${DIAG_TAG} Step A: Driver found — id=${driver.id} name="${driver.full_name}"`)

  // ── Step B: Check subscriptions ──────────────────────────────────────────
  console.log(`${DIAG_TAG} Step B: Querying driver_push_subscriptions for driver_id=${driver.id}`)
  const subs = await sql`
    SELECT id, endpoint, p256dh, auth, created_at
    FROM driver_push_subscriptions
    WHERE driver_id = ${driver.id}::uuid
    ORDER BY created_at DESC
  ` as { id: string; endpoint: string; p256dh: string | null; auth: string | null; created_at: string }[]

  console.log(`${DIAG_TAG} Step B: Found ${subs.length} subscription(s)`)

  if (!subs.length) {
    console.warn(`${DIAG_TAG} Step B: No subscriptions found — push cannot be delivered`)
    return NextResponse.json({
      ok: false,
      driver_code,
      driver_id: driver.id,
      subscriptions_found: 0,
      message: 'No push subscriptions registered for this driver. Driver must open the PWA and grant push permission first.',
      diag: {
        step_a_driver_found: true,
        step_b_subscriptions_found: 0,
        step_c_push_sent: false,
      }
    }, { status: 200 })
  }

  // ── Step C: Build minimal diagnostic push payload ────────────────────────
  // push_type = 'system' so the SW can identify this as a diagnostic push
  const now = new Date()
  const testTag = `sln-diag-${now.getTime()}`

  const pushPayload = JSON.stringify({
    // Identification
    push_type:   'system',
    offer_type:  'source',   // SW uses this for title/icon fallback
    offer_id:    testTag,    // unique — bypasses SW anti-duplicate guard
    driver_code: driver.driver_code,
    booking_id:  null,

    // Presentation
    title:   '🔔 SLN TEST PUSH',
    body:    `Diagnóstico push — ${now.toLocaleTimeString('es-MX')} — ${driver.full_name}`,
    sound:   'default',
    badge:   1,
    tag:     testTag,
    renotify: true,
    vibrate: [300, 100, 300, 100, 300],
    silent:  false,

    // Navigation
    deep_link: `/driver/${driver.driver_code}`,
    data: {
      url:       `/driver/${driver.driver_code}`,
      push_type: 'system',
      diag:      true,
    },
  })

  console.log(`${DIAG_TAG} Step C: Sending diagnostic push to ${subs.length} subscription(s)`)
  console.log(`${DIAG_TAG} Step C: Payload tag="${testTag}" title="🔔 SLN TEST PUSH"`)

  // ── Step D: Send push to each subscription ───────────────────────────────
  const results: {
    sub_id: string;
    endpoint_prefix: string;
    success: boolean;
    status_code?: number;
    error?: string;
  }[] = []

  for (const sub of subs) {
    const endpointPrefix = sub.endpoint.slice(0, 60) + '...'

    if (!sub.p256dh || !sub.auth) {
      console.warn(`${DIAG_TAG} Step D: Skipping sub ${sub.id} — missing p256dh or auth`)
      results.push({ sub_id: sub.id, endpoint_prefix: endpointPrefix, success: false, error: 'missing_keys' })
      continue
    }

    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }

    try {
      await webpush.sendNotification(pushSub, pushPayload, {
        TTL: 300,         // 5 minutes — diagnostic push
        urgency: 'high',  // highest delivery priority
      })
      console.log(`${DIAG_TAG} Step D: ✓ Push sent successfully to sub ${sub.id}`)
      results.push({ sub_id: sub.id, endpoint_prefix: endpointPrefix, success: true })
    } catch (err: unknown) {
      const statusCode = (err && typeof err === 'object' && 'statusCode' in err)
        ? (err as { statusCode: number }).statusCode
        : undefined

      console.error(`${DIAG_TAG} Step D: ✗ Push failed for sub ${sub.id} — HTTP ${statusCode}`, err)

      // Remove expired subscriptions (410 Gone)
      if (statusCode === 410) {
        try {
          await sql`DELETE FROM driver_push_subscriptions WHERE id = ${sub.id}::uuid`
          console.log(`${DIAG_TAG} Step D: Removed expired subscription ${sub.id} (HTTP 410)`)
        } catch {}
      }

      results.push({
        sub_id: sub.id,
        endpoint_prefix: endpointPrefix,
        success: false,
        status_code: statusCode,
        error: String(err),
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  console.log(`${DIAG_TAG} Step D: ${successCount}/${subs.length} pushes delivered successfully`)

  // ── Step E: Log diagnostic result to audit_logs ──────────────────────────
  try {
    await sql`
      INSERT INTO audit_logs (event_type, actor_type, actor_id, metadata, created_at)
      VALUES (
        'push_diag_test',
        'admin',
        ${driver.id}::uuid,
        ${JSON.stringify({
          driver_code: driver.driver_code,
          subscriptions_found: subs.length,
          pushes_sent: successCount,
          tag: testTag,
          results,
        })}::jsonb,
        NOW()
      )
    `
    console.log(`${DIAG_TAG} Step E: Diagnostic result logged to audit_logs`)
  } catch {
    // Non-blocking — audit log failure must not affect response
  }

  // ── Response ─────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok: successCount > 0,
    driver_code: driver.driver_code,
    driver_id:   driver.id,
    driver_name: driver.full_name,
    subscriptions_found: subs.length,
    pushes_attempted: subs.length,
    pushes_delivered: successCount,
    payload_tag: testTag,
    payload_title: '🔔 SLN TEST PUSH',
    diag: {
      step_a_driver_found:       true,
      step_b_subscriptions_found: subs.length,
      step_c_push_sent:          successCount > 0,
      step_d_results:            results,
    },
    device_expectation: successCount > 0
      ? 'Sound alert + lockscreen/banner notification should appear on iPhone within 3–5 seconds. Tap to open the Driver Panel.'
      : 'Push delivery failed — check step_d_results for error details.',
  })
}
