import { NextRequest, NextResponse } from "next/server"

// ─────────────────────────────────────────────────────────────
// GET /api/tablet-manifest?code=YHV001
//
// Returns a dynamic PWA manifest with start_url = /tablet/{code}
// This ensures the iPad Home Screen shortcut always opens the
// correct driver-attributed carousel without query params.
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase()

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 })
  }

  const manifest = {
    name: "Sottovento",
    short_name: "Sottovento",
    description: "Luxury Transportation · Orlando",
    start_url: `/tablet/${code}`,
    id: `/tablet/${code}`,
    display: "fullscreen",
    display_override: ["fullscreen", "standalone", "minimal-ui"],
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "any",
    scope: "/",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["travel", "lifestyle"],
    lang: "en-US",
  }

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
