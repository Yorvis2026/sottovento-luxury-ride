// ─────────────────────────────────────────────────────────────────────────────
// SLN Driver Service Worker — BM-PWA-PUSH-SLN-02
// Handles: install, activate, push, notificationclick
// Anti-duplicate: tracks shown offer_ids in memory
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'sln-driver-sw-v3-push-delivery'  // SLN-PUSH-DELIVERY-ACTIVATION-01
const shownOfferIds = new Set()

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// ── Push ─────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Nueva oferta', body: event.data.text(), offer_type: 'source' }
  }

  const {
    offer_id,
    offer_type = 'source',   // 'source' | 'pool'
    title,
    body,
    driver_code,
    booking_id,
    deep_link,
  } = payload

  // Anti-duplicate: skip if we already showed this offer_id
  if (offer_id && shownOfferIds.has(offer_id)) return
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
      url: payload.data?.url || (driver_code ? `/driver/${driver_code}` : '/driver'),
    },
    actions: [
      { action: 'view', title: isSource ? '⭐ Ver oferta' : '🟣 Ver oferta' },
      { action: 'dismiss', title: 'Ignorar' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(notifTitle, notifOptions)
  )
})

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const { deep_link } = event.notification.data || {}
  const targetUrl = deep_link || '/driver'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes('/driver') && 'focus' in client) {
          client.focus()
          client.postMessage({ type: 'SLN_PUSH_OFFER_CLICK', deep_link: targetUrl })
          return
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
