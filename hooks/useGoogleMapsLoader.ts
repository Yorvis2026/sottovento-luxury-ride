"use client"

import { useState, useEffect } from "react"

// Module-level state to ensure the script is loaded only once
type LoadState = "idle" | "loading" | "ready" | "error"
let moduleState: LoadState = "idle"
const callbacks: Array<(ready: boolean) => void> = []

function notifyAll(ready: boolean) {
  callbacks.forEach((cb) => cb(ready))
  callbacks.length = 0
}

function loadGoogleMaps(apiKey: string): void {
  if (moduleState !== "idle") return
  moduleState = "loading"

  // Use the new Maps JS API bootstrap with callback
  // v=beta enables PlaceAutocompleteElement (new Places API, required for post-March-2025 keys)
  const callbackName = "__googleMapsInitCallback"
  ;(window as unknown as Record<string, unknown>)[callbackName] = () => {
    moduleState = "ready"
    notifyAll(true)
    delete (window as unknown as Record<string, unknown>)[callbackName]
  }

  const script = document.createElement("script")
  // v=beta is required to access PlaceAutocompleteElement for new API keys
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=${callbackName}&loading=async&v=beta`
  script.async = true
  script.defer = true
  script.setAttribute("data-gmaps", "sottovento")
  script.onerror = () => {
    moduleState = "error"
    notifyAll(false)
  }
  document.head.appendChild(script)
}

/**
 * Loads the Google Maps JavaScript API (v=beta) with Places and Geometry libraries.
 * v=beta is required for PlaceAutocompleteElement which works with post-March-2025 API keys.
 * Uses a global callback to guarantee the API is fully ready before returning loaded=true.
 * Safe to call from multiple components — loads only once.
 */
export function useGoogleMapsLoader() {
  const [loaded, setLoaded] = useState<boolean>(
    () => typeof window !== "undefined" && !!window.google?.maps?.places
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Already ready (e.g. HMR reload with Maps already in window)
    if (window.google?.maps?.places) {
      moduleState = "ready"
      setLoaded(true)
      return
    }

    if (moduleState === "ready") {
      setLoaded(true)
      return
    }

    if (moduleState === "error") {
      setError("Google Maps failed to load")
      return
    }

    // Register callback for when loading completes
    callbacks.push((ready) => {
      if (ready) {
        setLoaded(true)
      } else {
        setError("Google Maps failed to load")
      }
    })

    // Trigger load if not already started
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      moduleState = "error"
      setError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured")
      return
    }

    loadGoogleMaps(apiKey)
  }, [])

  return { loaded, error }
}
