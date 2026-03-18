import { NextRequest, NextResponse } from "next/server"

// ─────────────────────────────────────────────────────────────
// GET /api/driver-manifest?code=YHV001
//
// Returns a dynamic PWA manifest with start_url = /driver/{code}
// This ensures the Home Screen shortcut always opens the correct
// driver panel without relying on query params.
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase()

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 })
  }

  const manifest = {
    name: "Sottovento Driver",
    short_name: "Driver",
    description: "Driver Dashboard · Sottovento Network",
    start_url: `/driver/${code}`,
    id: `/driver/${code}`,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    scope: "/",
    icons: [
      {
        src: "/icons/sottovento-driver-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/sottovento-driver-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/sottovento-driver-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["travel", "business"],
    lang: "en-US",
  }

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
