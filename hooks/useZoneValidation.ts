"use client"

import { useCallback } from "react"
import type { ZoneId } from "@/lib/zones"
import { ZONES } from "@/lib/zones"
import { detectZoneFromCoordinates } from "@/lib/geo/utils"

export interface ZoneValidationResult {
  /** Zone detected from geocoded coordinates */
  detectedZone: ZoneId | null
  /** Whether the selected zone matches the detected zone */
  isMatch: boolean
  /** Human-readable warning message when there is a mismatch */
  warningMessage: string | null
  /** Human-readable label of the detected zone */
  detectedZoneLabel: string | null
}

/**
 * Hook that provides zone validation logic.
 * Compares a user-selected zone against the zone detected from geocoded coordinates.
 * Returns a mismatch warning and the corrected zone when they differ.
 */
export function useZoneValidation() {
  const validateZone = useCallback(
    (
      selectedZone: ZoneId | "",
      lat: number,
      lng: number,
      fieldLabel: "pickup" | "dropoff"
    ): ZoneValidationResult => {
      const detectedZone = detectZoneFromCoordinates(lng, lat)

      if (!detectedZone) {
        // Address is outside all defined polygons — cannot contradict the selection
        return {
          detectedZone: null,
          isMatch: true,
          warningMessage: null,
          detectedZoneLabel: null,
        }
      }

      const detectedZoneLabel =
        ZONES.find((z) => z.id === detectedZone)?.label ?? detectedZone

      if (!selectedZone || selectedZone === detectedZone) {
        return {
          detectedZone,
          isMatch: true,
          warningMessage: null,
          detectedZoneLabel,
        }
      }

      // Mismatch detected — build warning message
      const fieldName = fieldLabel === "pickup" ? "Pickup" : "Drop-off"
      return {
        detectedZone,
        isMatch: false,
        warningMessage: `${fieldName} address is in ${detectedZoneLabel}. Zone updated automatically — price adjusted.`,
        detectedZoneLabel,
      }
    },
    []
  )

  return { validateZone }
}
