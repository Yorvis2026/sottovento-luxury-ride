import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {

    const body = await req.json();

    console.log("APNS subscribe payload:", body);

    return NextResponse.json({
      ok: true,
      subscribed: true,
      timestamp: Date.now()
    });

  } catch (err) {

    console.error("apns-subscribe error:", err);

    return NextResponse.json({
      ok: false,
      error: "invalid payload"
    }, { status: 400 });

  }
}
