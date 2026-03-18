"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import TabletKiosk from "@/components/tablet-kiosk"

// ─────────────────────────────────────────────────────────────
// /tablet/[driver_code] — Driver-personalized tablet kiosk
// e.g. /tablet/YHV001 → carousel attributed to driver YHV001
//
// INSTALL URL: https://www.sottoventoluxuryride.com/tablet/YHV001
// iOS preserves path params reliably; always use this URL for
// "Add to Home Screen" to ensure correct driver attribution.
// ─────────────────────────────────────────────────────────────

export default function TabletDriverPage() {
  const params = useParams()
  const driverCode = typeof params.driver_code === "string"
    ? params.driver_code.toUpperCase()
    : null

  // Inject dynamic manifest with start_url = /tablet/{code}
  // This ensures the Home Screen shortcut always opens the correct driver carousel
  useEffect(() => {
    if (!driverCode) return

    // Remove existing manifest links
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove())

    // Inject tablet manifest with driver-specific start_url
    const manifest = document.createElement("link")
    manifest.rel = "manifest"
    manifest.href = `/api/tablet-manifest?code=${driverCode}`
    document.head.appendChild(manifest)

    // Persist driver code for fallback
    try {
      localStorage.setItem("sottovento_tablet_driver_code", driverCode)
    } catch {}
  }, [driverCode])

  return <TabletKiosk driverCode={driverCode} />
}
