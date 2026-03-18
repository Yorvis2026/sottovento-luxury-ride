import type React from "react"
import type { Metadata, Viewport } from "next"

// ─────────────────────────────────────────────────────────────
// TABLET KIOSK LAYOUT — /tablet
// Dedicated layout for in-vehicle iPad experience.
// Overrides root layout to ensure 100% fullscreen PWA behavior
// with no Safari chrome visible when launched from Home Screen.
// ─────────────────────────────────────────────────────────────

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
  interactiveWidget: "resizes-content",
}

export const metadata: Metadata = {
  title: "Sottovento",
  description: "Luxury Transportation · Orlando",
  applicationName: "Sottovento",
  appleWebApp: {
    capable: true,
    title: "Sottovento",
    statusBarStyle: "black-translucent",
    startupImage: [
      // iPad Pro 12.9" (2048x2732)
      {
        url: "/apple-touch-icon.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPad Pro 11" (1668x2388)
      {
        url: "/apple-touch-icon.png",
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      // iPad Air / iPad 10th gen (1640x2360)
      {
        url: "/apple-touch-icon.png",
        media:
          "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  // NO manifest here — defined per-route in [driver_code]/layout.tsx via generateMetadata
  // to ensure iOS uses start_url=/tablet/{code} not /tablet
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  // Prevent search engines from indexing the kiosk route
  robots: { index: false, follow: false },
}

export default function TabletLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/*
        Extra head tags for maximum PWA/kiosk compatibility.
        Next.js metadata API covers most cases, but these ensure
        older iOS Safari versions also respect fullscreen mode.
      */}
      <head>
        {/* Force fullscreen standalone mode on iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sottovento" />

        {/* Prevent any browser chrome on Android / Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Prevent phone number detection (avoids tap-to-call overlay) */}
        <meta name="format-detection" content="telephone=no" />

        {/* Black background during splash / orientation change */}
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-navbutton-color" content="#000000" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Disable text size adjustment on orientation change */}
        <style>{`
          html, body {
            -webkit-text-size-adjust: none;
            text-size-adjust: none;
            overscroll-behavior: none;
            -webkit-overflow-scrolling: auto;
            touch-action: pan-x pan-y;
          }
          /* Prevent rubber-band scroll on iPad */
          body {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
        `}</style>
      </head>
      {children}
    </>
  )
}
