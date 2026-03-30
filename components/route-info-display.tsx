"use client"

import type { RouteInfo } from "@/lib/geo/utils"
import type { RouteStatus } from "@/hooks/useRouteCalculator"

const GOLD = "#C9A84C"

interface RouteInfoDisplayProps {
  status: RouteStatus
  route: RouteInfo | null
  error: string | null
}

/**
 * Displays route distance and duration information.
 * Shows loading state while calculating, error state on failure.
 */
export function RouteInfoDisplay({ status, route, error }: RouteInfoDisplayProps) {
  if (status === "idle") return null

  if (status === "loading") {
    return (
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
          style={{ borderColor: `${GOLD}60`, borderTopColor: "transparent" }}
        />
        <p className="text-white/50 text-sm">Calculating route...</p>
      </div>
    )
  }

  if (status === "error" || error) {
    return (
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          backgroundColor: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "rgba(252,165,165,0.8)",
        }}
      >
        ⚠ Could not calculate route. Please verify the addresses.
      </div>
    )
  }

  if (status === "success" && route) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: `${GOLD}0A`, border: `1px solid ${GOLD}30` }}
      >
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Route Summary</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-white font-light" style={{ fontSize: 24, color: GOLD }}>
              {route.distanceMiles} mi
            </p>
            <p className="text-white/40 text-xs mt-1">Estimated Distance</p>
          </div>
          <div className="text-center">
            <p className="text-white font-light" style={{ fontSize: 24, color: GOLD }}>
              {route.durationText}
            </p>
            <p className="text-white/40 text-xs mt-1">Estimated Duration</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
