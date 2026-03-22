import type React from "react"
import type { Metadata, Viewport } from "next"

// ─────────────────────────────────────────────────────────────
// DRIVER PANEL LAYOUT — /driver (parent)
//
// This is the parent layout for ALL /driver/* routes.
// It does NOT define a manifest — each child route defines
// its own via generateMetadata so the start_url is correct.
//
// /driver/[driver_code]/layout.tsx handles the manifest for
// the path-based route with the correct start_url per driver.
// ─────────────────────────────────────────────────────────────

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
}

export const metadata: Metadata = {
  title: "Sottovento Driver",
  description: "Driver Dashboard · Sottovento Network",
  applicationName: "Sottovento Driver",
  appleWebApp: {
    capable: true,
    title: "Driver",
    statusBarStyle: "black-translucent",
  },
  // NO manifest here — defined per-route in [driver_code]/layout.tsx
  icons: {
    apple: [
      {
        url: "/icons/sottovento-driver-180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    icon: [
      {
        url: "/icons/sottovento-driver-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/sottovento-driver-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  robots: { index: false, follow: false },
}

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <head>
        {/* iOS PWA — standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Driver" />

        {/* Driver Panel icon — black bg, gold crown */}
        <link rel="apple-touch-icon" href="/icons/sottovento-driver-180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/sottovento-driver-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/sottovento-driver-512.png" />

        {/* NO manifest link here — defined per-route in [driver_code]/layout.tsx */}

        {/* Theme */}
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      {/*
        Safe-area wrapper:
        - padding-left/right: max(env(safe-area-inset-left/right), 0px)
          → prevents content from touching notch/Dynamic Island edges
        - padding-bottom: max(env(safe-area-inset-bottom), 0px)
          → prevents content from hiding behind home indicator
        - overflow-x: hidden → prevents horizontal scroll on safe-area devices
        Note: padding-top is handled per-header (sticky headers use safe-area-top)
      */}
      <div
        style={{
          paddingLeft:   "env(safe-area-inset-left,   0px)",
          paddingRight:  "env(safe-area-inset-right,  0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          overflowX:     "hidden",
          minHeight:     "100dvh",
        }}
      >
        {children}
      </div>
    </>
  )
}
