// ============================================================
// SLN QR Code Generator v1.0
// lib/qr/generator.ts
//
// Generates attribution-aware booking URLs for QR codes
// across all SLN channels:
//   - driver_direct: /driver/[code] → QR with ref=CODE
//   - tablet:        /tablet/[code] → QR with tablet=CODE
//   - partner:       /partner/[code] → QR with partner=CODE
//   - campaign:      /#booking?campaign=ID&utm_*
//   - qr_standalone: /#booking?qr=QR-SV-XXX (generic QR)
//
// All URLs are fully qualified for reliable QR scanning.
// ============================================================

const BASE_URL = "https://www.sottoventoluxuryride.com"

export type QRChannelType =
  | "driver_direct"
  | "tablet"
  | "partner"
  | "campaign"
  | "qr_standalone"

export interface QRCodeConfig {
  channel: QRChannelType
  code: string               // driver code, tablet code, partner code, campaign ID, or QR ID
  destination?: string       // optional: preselect dropoff destination
  service?: string           // optional: preselect service type
  vehicle?: string           // optional: preselect vehicle class
  utm_source?: string
  utm_medium?: string
  label?: string             // human-readable label for the QR
}

export interface QRCodeResult {
  url: string
  shortLabel: string
  channel: QRChannelType
  code: string
  attribution: Record<string, string>
}

/**
 * generateQRUrl
 *
 * Builds a fully-qualified, attribution-tagged booking URL
 * for a given QR channel configuration.
 */
export function generateQRUrl(config: QRCodeConfig): QRCodeResult {
  const {
    channel,
    code,
    destination,
    service,
    vehicle,
    utm_source,
    utm_medium,
  } = config

  const url = new URL(`${BASE_URL}/#booking`)
  const attribution: Record<string, string> = {}

  switch (channel) {
    case "driver_direct":
      url.searchParams.set("ref", code.toUpperCase())
      attribution.ref = code.toUpperCase()
      attribution.source_channel = "driver_direct"
      break

    case "tablet":
      url.searchParams.set("tablet", code.toUpperCase())
      attribution.tablet = code.toUpperCase()
      attribution.source_channel = "tablet"
      break

    case "partner":
      url.searchParams.set("partner", code.toUpperCase())
      attribution.partner = code.toUpperCase()
      attribution.source_channel = "partner"
      break

    case "campaign":
      url.searchParams.set("campaign", code.toUpperCase())
      attribution.campaign = code.toUpperCase()
      attribution.source_channel = "campaign"
      break

    case "qr_standalone":
      url.searchParams.set("qr", code.toUpperCase())
      attribution.qr = code.toUpperCase()
      attribution.source_channel = "qr"
      break
  }

  // Optional preselection params
  if (destination) {
    url.searchParams.set("destination", destination)
    attribution.destination = destination
  }
  if (service) {
    url.searchParams.set("service", service)
    attribution.service = service
  }
  if (vehicle) {
    url.searchParams.set("package", vehicle)
    attribution.package = vehicle
  }

  // UTM params
  if (utm_source) {
    url.searchParams.set("utm_source", utm_source)
    attribution.utm_source = utm_source
  }
  if (utm_medium) {
    url.searchParams.set("utm_medium", utm_medium)
    attribution.utm_medium = utm_medium
  }

  const shortLabel = config.label ?? buildShortLabel(channel, code)

  return {
    url: url.toString(),
    shortLabel,
    channel,
    code,
    attribution,
  }
}

function buildShortLabel(channel: QRChannelType, code: string): string {
  const map: Record<QRChannelType, string> = {
    driver_direct: `Driver · ${code}`,
    tablet:        `Tablet · ${code}`,
    partner:       `Partner · ${code}`,
    campaign:      `Campaign · ${code}`,
    qr_standalone: `QR · ${code}`,
  }
  return map[channel] ?? code
}

// ── Pre-defined SLN QR codes ─────────────────────────────────
// These are the canonical QR codes for the SLN network.
// Add new codes here as the network grows.

export const SLN_QR_REGISTRY: QRCodeConfig[] = [
  // ── Standalone QR codes (physical materials) ──────────────
  {
    channel: "qr_standalone",
    code: "QR-SV-001",
    label: "Business Card QR",
    utm_source: "print",
    utm_medium: "business_card",
  },
  {
    channel: "qr_standalone",
    code: "QR-SV-002",
    label: "Flyer QR — Airport",
    destination: "Orlando International Airport (MCO)",
    utm_source: "print",
    utm_medium: "flyer",
  },
  {
    channel: "qr_standalone",
    code: "QR-SV-003",
    label: "Flyer QR — Disney",
    destination: "Walt Disney World Resort",
    utm_source: "print",
    utm_medium: "flyer",
  },
  {
    channel: "qr_standalone",
    code: "QR-SV-004",
    label: "Hotel Lobby QR",
    utm_source: "hotel",
    utm_medium: "lobby_display",
  },
  {
    channel: "qr_standalone",
    code: "QR-SV-005",
    label: "Vehicle Interior QR",
    utm_source: "vehicle",
    utm_medium: "interior_card",
  },
  // ── Campaign QR codes ─────────────────────────────────────
  {
    channel: "campaign",
    code: "GOOGLE-MCO-2026",
    label: "Google Ads — MCO",
    destination: "Orlando International Airport (MCO)",
    utm_source: "google",
    utm_medium: "cpc",
  },
  {
    channel: "campaign",
    code: "META-DISNEY-2026",
    label: "Meta Ads — Disney",
    destination: "Walt Disney World Resort",
    utm_source: "meta",
    utm_medium: "social",
  },
]

/**
 * getQRForDriver
 * Generates the personal QR booking URL for a driver.
 */
export function getQRForDriver(driverCode: string): QRCodeResult {
  return generateQRUrl({
    channel: "driver_direct",
    code: driverCode,
    label: `My Referral QR · ${driverCode}`,
    utm_source: "driver_referral",
    utm_medium: "qr",
  })
}

/**
 * getQRForTablet
 * Generates the tablet kiosk URL with driver attribution.
 */
export function getQRForTablet(driverCode: string): QRCodeResult {
  const url = `${BASE_URL}/tablet/${driverCode.toUpperCase()}`
  return {
    url,
    shortLabel: `Tablet · ${driverCode}`,
    channel: "tablet",
    code: driverCode,
    attribution: {
      tablet: driverCode.toUpperCase(),
      source_channel: "tablet",
    },
  }
}

/**
 * getQRForPartner
 * Generates the partner booking URL with partner attribution.
 */
export function getQRForPartner(partnerCode: string): QRCodeResult {
  return generateQRUrl({
    channel: "partner",
    code: partnerCode,
    label: `Partner · ${partnerCode}`,
    utm_source: "partner",
    utm_medium: "qr",
  })
}
