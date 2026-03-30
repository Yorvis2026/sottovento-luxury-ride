"use client"

import { useState, useCallback } from "react"
import { calculateRoute, type RouteInfo } from "@/lib/geo/utils"

export type RouteStatus = "idle" | "loading" | "success" | "error"

export interface RouteCalculatorState {
  status: RouteStatus
  route: RouteInfo | null
  error: string | null
}

/**
 * Hook that manages route distance/duration calculation state.
 * Calls the Google Maps Distance Matrix API (client-side).
 * Triggered externally when both pickup and dropoff coordinates are available.
 */
export function useRouteCalculator() {
  const [state, setState] = useState<RouteCalculatorState>({
    status: "idle",
    route: null,
    error: null,
  })

  const calculate = useCallback(
    async (
      pickup: { lat: number; lng: number },
      dropoff: { lat: number; lng: number }
    ) => {
      // Guard: ensure Google Maps is available before calling
      if (typeof window === "undefined" || !window.google?.maps) {
        setState({ status: "error", route: null, error: "Google Maps not available" })
        return
      }

      setState({ status: "loading", route: null, error: null })
      try {
        const route = await calculateRoute(pickup, dropoff)
        setState({ status: "success", route, error: null })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Route calculation failed"
        setState({ status: "error", route: null, error: message })
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({ status: "idle", route: null, error: null })
  }, [])

  return { ...state, calculate, reset }
}
