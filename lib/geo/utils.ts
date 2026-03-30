/**
 * Geographic utility functions for Sottovento Luxury Ride.
 *
 * Implements:
 * - Ray-casting point-in-polygon algorithm (zero external dependencies)
 * - Zone detection from lat/lng coordinates
 * - Route distance/duration calculation via Google Maps Distance Matrix API
 */

import type { ZoneId } from "@/lib/zones"
import { ZONE_POLYGONS, type Polygon } from "@/lib/geo/polygons"

// ─── Point-in-polygon (ray casting) ─────────────────────────────────────────
/**
 * Determines whether a point [lng, lat] is inside a polygon.
 * Uses the ray-casting algorithm — works for convex and concave polygons.
 * Polygon coordinates are in [lng, lat] order (GeoJSON standard).
 */
export function pointInPolygon(lng: number, lat: number, polygon: Polygon): boolean {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// ─── Detect zone from coordinates ────────────────────────────────────────────
/**
 * Returns the ZoneId that contains the given coordinates, or null if none match.
 * Iterates through all defined zone polygons using ray-casting.
 */
export function detectZoneFromCoordinates(lng: number, lat: number): ZoneId | null {
  for (const [zoneId, polygon] of Object.entries(ZONE_POLYGONS)) {
    if (polygon && pointInPolygon(lng, lat, polygon)) {
      return zoneId as ZoneId
    }
  }
  return null
}

// ─── Route info ───────────────────────────────────────────────────────────────
export interface RouteInfo {
  distanceMiles: number
  distanceText: string
  durationMinutes: number
  durationText: string
}

interface LatLngLiteral {
  lat: number
  lng: number
}

/**
 * Calculates route distance and duration between two lat/lng points
 * using the Google Maps Distance Matrix API (client-side).
 * Requires the Maps JavaScript API to be loaded with the `places` library.
 */
export function calculateRoute(
  origin: LatLngLiteral,
  destination: LatLngLiteral
): Promise<RouteInfo> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.google?.maps) {
      reject(new Error("Google Maps not loaded"))
      return
    }

    const service = new window.google.maps.DistanceMatrixService()
    service.getDistanceMatrix(
      {
        origins: [origin],
        destinations: [destination],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      },
      (
        response: google.maps.DistanceMatrixResponse | null,
        status: google.maps.DistanceMatrixStatus
      ) => {
        if (status !== "OK" || !response) {
          reject(new Error(`Distance Matrix failed: ${status}`))
          return
        }
        const element = response.rows[0]?.elements[0]
        if (!element || element.status !== "OK") {
          reject(new Error("No route found between the two locations"))
          return
        }

        const distanceMeters = element.distance.value
        const distanceMiles = distanceMeters / 1609.344
        const durationMinutes = Math.ceil(element.duration.value / 60)

        resolve({
          distanceMiles: Math.round(distanceMiles * 10) / 10,
          distanceText: element.distance.text,
          durationMinutes,
          durationText: element.duration.text,
        })
      }
    )
  })
}
