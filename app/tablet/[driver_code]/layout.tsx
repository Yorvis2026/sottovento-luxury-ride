import type React from "react"
import type { Metadata, Viewport } from "next"

// ─────────────────────────────────────────────────────────────
// TABLET KIOSK LAYOUT — /tablet/[driver_code]
//
// Uses generateMetadata (SSR) to inject the correct manifest
// BEFORE the page reaches the browser.
//
// Critical for iOS "Add to Home Screen":
// iOS reads the manifest at install time, before JS executes.
// The start_url must be /tablet/{code} — not /tablet — so the
// shortcut always opens the correct driver experience.
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
    // SSR manifest — iOS reads this at install time, start_url is preserved
    manifest: `/api/tablet-manifest?code=${code}`,
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
    robots: { index: false, follow: false },
  }
}

export default function TabletByCodeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
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

        {/* NOTE: manifest is injected by generateMetadata above (SSR) */}
        {/* Do NOT add a static manifest link here — it would conflict */}

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
