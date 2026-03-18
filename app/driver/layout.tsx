import type React from "react"
import type { Metadata, Viewport } from "next"

// ─────────────────────────────────────────────────────────────
// DRIVER PANEL LAYOUT — /driver
// Dedicated layout for the Driver Dashboard PWA.
// Uses Sottovento Driver branded icons (black bg, gold crown).
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
  manifest: "/driver-manifest.json",
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

        {/* Manifest */}
        <link rel="manifest" href="/driver-manifest.json" />

        {/* Theme */}
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      {children}
    </>
  )
}
