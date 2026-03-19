import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { sendCrownMomentPhoto } from "@/lib/email"

// ============================================================
// POST /api/crown-moment/send-photo
// 1. Uploads photo to Vercel Blob (public CDN URL)
// 2. Sends Crown Moment email with the public image URL
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, photoDataUrl, frameName } = body

    if (!email || !photoDataUrl) {
      return NextResponse.json(
        { error: "email and photoDataUrl are required" },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // ── STEP 1: Upload photo to Vercel Blob for a permanent public URL ──
    let photoUrl: string | null = null

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN
    if (blobToken) {
      try {
        // Convert base64 data URL to Buffer
        const base64Data = photoDataUrl.replace(/^data:image\/\w+;base64,/, "")
        const imageBuffer = Buffer.from(base64Data, "base64")

        // Generate a unique filename
        const timestamp = Date.now()
        const filename = `crown-moment/${timestamp}.jpg`

        const blob = await put(filename, imageBuffer, {
          access: "public",
          contentType: "image/jpeg",
          token: blobToken,
        })
        photoUrl = blob.url
      } catch (uploadErr) {
        console.warn("[api/crown-moment] Blob upload failed, falling back to attachment:", uploadErr)
      }
    }

    // ── STEP 2: Send email with public URL (or attachment fallback) ──
    const result = await sendCrownMomentPhoto({
      toEmail: email,
      photoBase64: photoDataUrl,
      photoUrl: photoUrl ?? undefined,
      frameName: frameName ?? "Crown Moment",
    })

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send email", detail: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("[api/crown-moment/send-photo]", err)
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    )
  }
}
