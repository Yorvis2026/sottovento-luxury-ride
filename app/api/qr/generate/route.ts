import { NextRequest, NextResponse } from "next/server"
import { generateQRUrl, getQRForDriver, getQRForTablet, getQRForPartner, SLN_QR_REGISTRY } from "@/lib/qr/generator"
import type { QRChannelType } from "@/lib/qr/generator"

// ============================================================
// GET /api/qr/generate
//
// Generates attribution-aware QR booking URLs for SLN channels.
//
// Query params:
//   channel  — driver_direct | tablet | partner | campaign | qr_standalone
//   code     — driver code, tablet code, partner code, campaign ID, or QR ID
//   destination? — optional destination preset
//   service?     — optional service preset
//   vehicle?     — optional vehicle preset
//   registry?    — "true" to return the full SLN QR registry
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Return full registry
    if (searchParams.get("registry") === "true") {
      const registry = SLN_QR_REGISTRY.map((config) => {
        const result = generateQRUrl(config)
        return {
          ...result,
          config,
        }
      })
      return NextResponse.json({ registry, count: registry.length })
    }

    const channel = searchParams.get("channel") as QRChannelType | null
    const code = searchParams.get("code")

    if (!channel || !code) {
      return NextResponse.json(
        { error: "Missing required params: channel, code" },
        { status: 400 }
      )
    }

    const validChannels: QRChannelType[] = [
      "driver_direct",
      "tablet",
      "partner",
      "campaign",
      "qr_standalone",
    ]

    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` },
        { status: 400 }
      )
    }

    let result

    // Use specialized generators for common channels
    switch (channel) {
      case "driver_direct":
        result = getQRForDriver(code)
        break
      case "tablet":
        result = getQRForTablet(code)
        break
      case "partner":
        result = getQRForPartner(code)
        break
      default:
        result = generateQRUrl({
          channel,
          code,
          destination: searchParams.get("destination") ?? undefined,
          service: searchParams.get("service") ?? undefined,
          vehicle: searchParams.get("vehicle") ?? undefined,
          utm_source: searchParams.get("utm_source") ?? undefined,
          utm_medium: searchParams.get("utm_medium") ?? undefined,
        })
    }

    return NextResponse.json({
      ...result,
      generated_at: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
