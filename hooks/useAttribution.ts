"use client"

// ============================================================
// SLN Attribution Hook v1.0
// hooks/useAttribution.ts
//
// Captures, persists, and restores attribution parameters
// across the entire booking funnel.
//
// Priority order (mirrors lead-origin.ts spec §5):
//   1. URL params (highest — always override stored)
//   2. sessionStorage (same session, survives page reload)
//   3. localStorage (cross-session, 30-day TTL)
//   4. Empty defaults (organic/direct)
//
// Parameters tracked:
//   ref      — driver referral code (e.g. YHV001)
//   driver   — driver code alias (same as ref in most flows)
//   tablet   — tablet kiosk code (e.g. TAB-SV-012)
//   qr       — QR code identifier (e.g. QR-SV-003)
//   partner  — partner reference (e.g. HOTEL-HYATT-01)
//   campaign — campaign ID (e.g. GOOGLE-MCO-DISNEY)
//   utm_source, utm_medium, utm_campaign — UTM params
//   package  — service package preset
//   service  — service type preset
// ============================================================

import { useEffect, useState, useCallback } from "react"

export interface AttributionData {
  // Core SLN attribution
  ref: string
  driver: string
  tablet: string
  qr: string
  partner: string
  campaign: string
  // UTM
  utm_source: string
  utm_medium: string
  utm_campaign: string
  // Booking presets
  package: string
  service: string
  // Derived
  source_channel: "driver_direct" | "tablet" | "qr" | "partner" | "campaign" | "organic" | "direct"
  captured_at: string
  landing_page: string
}

const STORAGE_KEY = "sln_attribution_v1"
const SESSION_KEY = "sln_attribution_session_v1"
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const DEFAULT_ATTRIBUTION: AttributionData = {
  ref: "",
  driver: "",
  tablet: "",
  qr: "",
  partner: "",
  campaign: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  package: "",
  service: "",
  source_channel: "organic",
  captured_at: "",
  landing_page: "",
}

function deriveChannel(params: Partial<AttributionData>): AttributionData["source_channel"] {
  if (params.ref || params.driver) return "driver_direct"
  if (params.tablet) return "tablet"
  if (params.qr) return "qr"
  if (params.partner) return "partner"
  if (params.campaign || params.utm_campaign) return "campaign"
  if (params.utm_source) return "direct"
  return "organic"
}

function readFromStorage(): (AttributionData & { _ts?: number }) | null {
  try {
    // sessionStorage first (same session)
    const session = sessionStorage.getItem(SESSION_KEY)
    if (session) {
      const parsed = JSON.parse(session)
      return parsed
    }
    // localStorage fallback (cross-session with TTL)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const ts = parsed._ts ?? 0
      if (Date.now() - ts < TTL_MS) {
        return parsed
      }
      // Expired — clean up
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage not available (SSR or private mode)
  }
  return null
}

function writeToStorage(data: AttributionData): void {
  try {
    const payload = { ...data, _ts: Date.now() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Storage not available
  }
}

function parseUrlParams(): Partial<AttributionData> | null {
  if (typeof window === "undefined") return null
  try {
    const params = new URLSearchParams(window.location.search)
    // Also check hash params (e.g. /#booking?ref=YHV001)
    const hash = window.location.hash
    const hashQuery = hash.includes("?") ? hash.split("?")[1] : ""
    const hashParams = new URLSearchParams(hashQuery)

    const get = (key: string) =>
      params.get(key) || hashParams.get(key) || ""

    const ref = get("ref")
    const driver = get("driver")
    const tablet = get("tablet")
    const qr = get("qr")
    const partner = get("partner")
    const campaign = get("campaign")
    const utm_source = get("utm_source")
    const utm_medium = get("utm_medium")
    const utm_campaign = get("utm_campaign")
    const pkg = get("package")
    const service = get("service")

    const hasAnyParam = ref || driver || tablet || qr || partner || campaign ||
      utm_source || utm_medium || utm_campaign || pkg || service

    if (!hasAnyParam) return null

    return {
      ref,
      driver,
      tablet,
      qr,
      partner,
      campaign,
      utm_source,
      utm_medium,
      utm_campaign,
      package: pkg,
      service,
    }
  } catch {
    return null
  }
}

export function useAttribution(): AttributionData {
  const [attribution, setAttribution] = useState<AttributionData>(DEFAULT_ATTRIBUTION)

  const resolve = useCallback(() => {
    const urlParams = parseUrlParams()
    const stored = readFromStorage()

    let resolved: AttributionData

    if (urlParams && Object.values(urlParams).some(Boolean)) {
      // URL params always win — fresh attribution signal
      resolved = {
        ...DEFAULT_ATTRIBUTION,
        ...urlParams,
        source_channel: deriveChannel(urlParams),
        captured_at: new Date().toISOString(),
        landing_page: typeof window !== "undefined" ? window.location.href : "",
      }
      writeToStorage(resolved)
    } else if (stored) {
      // Restore from storage (session or local)
      resolved = {
        ...DEFAULT_ATTRIBUTION,
        ...stored,
      }
    } else {
      // No attribution — organic/direct
      resolved = {
        ...DEFAULT_ATTRIBUTION,
        source_channel: "organic",
        captured_at: new Date().toISOString(),
        landing_page: typeof window !== "undefined" ? window.location.href : "",
      }
    }

    setAttribution(resolved)
  }, [])

  useEffect(() => {
    resolve()
  }, [resolve])

  return attribution
}

// ── Utility: build Stripe metadata from attribution ──────────
export function buildAttributionMetadata(
  attr: AttributionData
): Record<string, string> {
  return {
    // Core SLN fields
    source_ref: attr.ref || attr.driver || "",
    source_tablet: attr.tablet || "",
    source_qr: attr.qr || "",
    source_partner: attr.partner || "",
    source_campaign: attr.campaign || attr.utm_campaign || "",
    source_channel: attr.source_channel,
    // UTM
    utm_source: attr.utm_source || "",
    utm_medium: attr.utm_medium || "",
    utm_campaign: attr.utm_campaign || "",
    // Booking presets
    booking_package: attr.package || "",
    booking_service: attr.service || "",
    // Audit trail
    attribution_captured_at: attr.captured_at || "",
    attribution_landing_page: attr.landing_page?.substring(0, 500) || "",
    // Legacy fields (backward compat with existing webhook)
    captured_by: attr.ref || attr.driver || attr.tablet || "public_site",
    booking_origin: attr.tablet
      ? "tablet"
      : attr.qr
      ? "qr"
      : attr.ref || attr.driver
      ? "driver_referral"
      : "website",
  }
}
