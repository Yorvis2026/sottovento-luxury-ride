import { NextRequest, NextResponse } from "next/server"
import { sendCrownMomentPhoto } from "@/lib/email"

// ============================================================
// POST /api/crown-moment/send-photo
// Sends the Crown Moment photo to the client's email
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

    const result = await sendCrownMomentPhoto({
      toEmail: email,
      photoBase64: photoDataUrl,
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
