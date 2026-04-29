import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("REGISTER DEVICE TOKEN:", body);

    return NextResponse.json({
      success: true,
      message: "Device registered successfully",
    });

  } catch (error) {
    console.error("REGISTER DEVICE ERROR:", error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
