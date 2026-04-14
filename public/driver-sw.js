// ─────────────────────────────────────────────────────────────────────────────
// SLN Driver Service Worker — BM-PWA-PUSH-SLN-02
//                           + SLN-PUSH-ACK-01
//                           + SLN-PUSH-DIAG-01 (diagnostic logging)
// Handles: install, activate, push, notificationclick
// Anti-duplicate: tracks shown offer_ids in memory
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'sln-driver-sw-v4-push-diag'  // SLN-PUSH-DIAG-01: bump version to force SW update
const shownOfferIds = new Set()
const DIAG_TAG = '[SLN-PUSH-DIAG-01]'

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`${DIAG_TAG} SW install — cache: ${CACHE_NAME}`)
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`${DIAG_TAG} SW activate — claiming clients`)
  event.waitUntil(clients.claim())
})

// ── Push ─────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log(`${DIAG_TAG} push event received — has data: ${!!event.data}`)

  if (!event.data) {
    console.warn(`${DIAG_TAG} push event has no data — skipping`)
    return
  }

  let payload
  try {
    payload = event.data.json()
    console.log(`${DIAG_TAG} push payload parsed — push_type: ${payload.push_type || 'n/a'} offer_id: ${payload.offer_id || 'n/a'} title: ${payload.title || 'n/a'}`)
  } catch (err) {
    console.warn(`${DIAG_TAG} push payload JSON parse failed — using text fallback`, err)
    payload = { title: 'Nueva oferta', body: event.data.text(), offer_type: 'source' }
  }

  const {
    offer_id,
    offer_type = 'source',   // 'source' | 'pool'
    push_type,
    title,
    body,
    driver_code,
    booking_id,
    deep_link,
  } = payload

  // ── [SLN-PUSH-DIAG-01] Diagnostic push path — skip anti-duplicate guard ──
  const isDiagnostic = push_type === 'system' || payload.data?.diag === true
  if (isDiagnostic) {
    console.log(`${DIAG_TAG} Diagnostic push detected — skipping anti-duplicate guard`)
  }

  // Anti-duplicate: skip if we already showed this offer_id (not for diagnostic)
  if (!isDiagnostic && offer_id && shownOfferIds.has(offer_id)) {
    console.log(`${DIAG_TAG} Duplicate offer_id "${offer_id}" — skipping showNotification`)
    return
  }
  if (offer_id) shownOfferIds.add(offer_id)

  const isSource = offer_type === 'source'

  const notifTitle = title || (isSource ? '⭐ OFERTA CAPTADOR' : '🟣 OFERTA DE RED')
  const notifBody  = body  || (isSource ? 'Nueva solicitud prioritaria — toca para ver' : 'Nueva oferta de la red — toca para ver')

  // SLN-PUSH-DELIVERY-ACTIVATION-01: Use payload sound/badge if present
  const notifOptions = {
    body: notifBody,
    icon:  '/icons/sottovento-driver-192.png',
    badge: '/icons/sottovento-driver-192.png',
    tag:   payload.tag || offer_id || `sln-offer-${Date.now()}`,
    renotify: true,              // SLN-PUSH-DELIVERY-ACTIVATION-01: always re-alert even if same tag
    requireInteraction: true,    // keeps notification visible until tapped
    vibrate: payload.vibrate || [300, 100, 300, 100, 300],
    silent: false,               // ensure sound is never suppressed
    data: {
      deep_link: deep_link || (driver_code ? `/driver/${driver_code}` : '/driver'),
      offer_id,
      offer_type,
      booking_id,
      driver_code,
      // [SLN-PUSH-ACK-01] Persist push_type so acknowledgment can be typed correctly
      push_type: payload.data?.type || payload.push_type || 'dispatch_offer',
      notification_tag: payload.tag || offer_id || null,
      url: payload.data?.url || (driver_code ? `/driver/${driver_code}` : '/driver'),
    },
    actions: [
      { action: 'view', title: isSource ? '⭐ Ver oferta' : '🟣 Ver oferta' },
      { action: 'dismiss', title: 'Ignorar' },
    ],
  }

  console.log(`${DIAG_TAG} Calling showNotification — title: "${notifTitle}" tag: "${notifOptions.tag}"`)

  event.waitUntil(
    self.registration.showNotification(notifTitle, notifOptions)
      .then(() => {
        console.log(`${DIAG_TAG} showNotification() completed successfully`)
      })
      .catch((err) => {
        console.error(`${DIAG_TAG} showNotification() FAILED:`, err)
      })
  )
})

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  console.log(`${DIAG_TAG} notificationclick — action: "${event.action}" tag: "${event.notification.tag}"`)
  event.notification.close()

  if (event.action === 'dismiss') {
    console.log(`${DIAG_TAG} notificationclick: user dismissed`)
    return
  }

  const notifData = event.notification.data || {}
  const { deep_link, driver_code, booking_id, offer_id, push_type, notification_tag } = notifData
  const targetUrl = deep_link || '/driver'

  console.log(`${DIAG_TAG} notificationclick: navigating to "${targetUrl}"`)

  // ── [SLN-PUSH-ACK-01] Send acknowledgment telemetry ──────────────────────
  // Fire-and-forget: acknowledgment failure must never block app focus/open.
  // Uses fetch() from the service worker context (available in all modern browsers).
  const ackPayload = {
    driver_code:      driver_code   || null,
    push_type:        push_type     || 'unknown',
    booking_id:       booking_id    || null,
    offer_id:         offer_id      || null,
    notification_tag: notification_tag || event.notification.tag || null,
    acknowledged_at:  new Date().toISOString(),
    source:           'notificationclick',
  }

  // Only send ack if we have a driver_code to associate it with
  if (ackPayload.driver_code) {
    event.waitUntil(
      fetch('/api/driver/push-ack', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(ackPayload),
        // keepalive ensures the request completes even if the SW is about to terminate
        keepalive: true,
      })
      .then((res) => {
        if (!res.ok) {
          console.warn('[SLN-PUSH-ACK-01] ack failed:', res.status)
        } else {
          console.log(`${DIAG_TAG} push-ack sent successfully`)
        }
      })
      .catch((err) => {
        // Non-blocking: log but never throw
        console.warn('[SLN-PUSH-ACK-01] ack fetch error:', err)
      })
      .then(() => {
        // After ack (or ack failure), proceed with focus/open
        return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          // If the app is already open, focus it and navigate
          for (const client of windowClients) {
            if (client.url.includes('/driver') && 'focus' in client) {
              console.log(`${DIAG_TAG} notificationclick: focusing existing window`)
              client.focus()
              client.postMessage({ type: 'SLN_PUSH_OFFER_CLICK', deep_link: targetUrl })
              return
            }
          }
          // Otherwise open a new window
          console.log(`${DIAG_TAG} notificationclick: opening new window`)
          if (clients.openWindow) {
            return clients.openWindow(targetUrl)
          }
        })
      })
    )
  } else {
    // No driver_code: skip ack, just focus/open as before
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes('/driver') && 'focus' in client) {
            client.focus()
            client.postMessage({ type: 'SLN_PUSH_OFFER_CLICK', deep_link: targetUrl })
            return
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl)
        }
      })
    )
  }
})
