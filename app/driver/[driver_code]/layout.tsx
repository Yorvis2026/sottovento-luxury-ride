import type React from "react"
import type { Metadata, Viewport } from "next"

// ─────────────────────────────────────────────────────────────
// DRIVER PANEL LAYOUT — /driver/[driver_code]
//
// Uses generateMetadata (SSR) to inject the correct manifest
// link in the <head> BEFORE the page reaches the browser.
// This is critical for iOS "Add to Home Screen" — iOS reads
// the manifest at install time, before JS executes.
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

// generateMetadata runs on the SERVER — manifest href is in the
// initial HTML, so iOS reads it correctly before any JS runs.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ driver_code: string }>
}): Promise<Metadata> {
  const { driver_code } = await params
  const code = driver_code?.toUpperCase() ?? "UNKNOWN"

  return {
    title: "Sottovento Driver",
    description: "Driver Dashboard · Sottovento Network",
    applicationName: "Sottovento Driver",
    appleWebApp: {
      capable: true,
      title: "Driver",
      statusBarStyle: "black-translucent",
    },
    // This manifest URL is rendered in the initial HTML by Next.js SSR
    // iOS Safari reads it at "Add to Home Screen" time — start_url is preserved
    manifest: `/api/driver-manifest?code=${code}`,
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
}

export default function DriverByCodeLayout({
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#000000" />

        {/* Icons — also in metadata above, duplicated here for max compatibility */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/sottovento-driver-180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/sottovento-driver-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/sottovento-driver-512.png" />

        {/* NOTE: manifest is injected by generateMetadata above (SSR) */}
        {/* Do NOT add a static manifest link here — it would conflict */}
      </head>
      {/*
        Safe-area side + bottom insets:
        - Left/Right: prevents content from touching notch or Dynamic Island edges
        - Bottom: prevents content from hiding behind the home indicator bar
        - padding-top is NOT applied here — each sticky header handles it individually
          using: paddingTop: max(env(safe-area-inset-top), 16px)
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
