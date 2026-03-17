"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import TabletKiosk from "@/components/tablet-kiosk"

// ─────────────────────────────────────────────────────────────
// /tablet/[driver_code] — Driver-personalized tablet kiosk
// e.g. /tablet/DRV001 → carousel attributed to driver DRV001
// ─────────────────────────────────────────────────────────────

export default function TabletDriverPage() {
  const params = useParams()
  const driverCode = typeof params.driver_code === "string"
    ? params.driver_code.toUpperCase()
    : null

  return <TabletKiosk driverCode={driverCode} />
}
