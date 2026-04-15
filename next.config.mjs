/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // ── [SLN-SW-SCOPE-FIX-01] Service-Worker-Allowed header ──────────────────
  // The driver service worker is served from /driver-sw.js (root path) but
  // registered with scope: '/driver/'. Per the W3C Service Worker spec, a SW
  // can only control paths within its own path prefix unless the server
  // explicitly grants a wider scope via the Service-Worker-Allowed header.
  //
  // Without this header, Safari on iOS silently rejects the SW registration
  // when scope: '/driver/' is requested for a file at /driver-sw.js.
  // This causes navigator.serviceWorker.ready to never resolve, which means
  // pushManager.subscribe() never executes and no push subscription is created.
  //
  // Fix: add Service-Worker-Allowed: / to the /driver-sw.js response so the
  // browser accepts the scope: '/driver/' registration.
  // cache-bust: 20260327-alert-layer-v2
  async headers() {
    return [
      {
        source: '/driver-sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
