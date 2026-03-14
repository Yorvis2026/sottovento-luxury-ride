import { NextRequest, NextResponse } from "next/server";
import { sendTestSMS } from "@/lib/dispatch/sms";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const result = await sendTestSMS(phone);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test SMS sent to ${phone}`,
        sid: result.sid,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
