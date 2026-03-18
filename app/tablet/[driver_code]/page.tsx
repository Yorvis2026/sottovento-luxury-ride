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
//
// MANIFEST: injected SSR via generateMetadata in layout.tsx
// start_url = /tablet/{code} — iOS reads it before JS runs
// ─────────────────────────────────────────────────────────────

export default function TabletDriverPage() {
  const params = useParams()
  const driverCode = typeof params.driver_code === "string"
    ? params.driver_code.toUpperCase()
    : null

  // Persist driver code in localStorage for fallback recovery
  // (manifest is now injected SSR via generateMetadata in layout.tsx)
  useEffect(() => {
    if (!driverCode) return
    try {
      localStorage.setItem("sottovento_tablet_driver_code", driverCode)
    } catch {}
  }, [driverCode])

  return <TabletKiosk driverCode={driverCode} />
}
