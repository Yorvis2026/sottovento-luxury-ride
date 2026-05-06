import { NextRequest, NextResponse } from "next/server";
import { sendApnsToDriver } from "@/lib/push/send-push";

/**
 * POST /api/driver/send-test-push
 * BM-SLN-APNS-TOKEN-NATIVE-REGISTER-FIX
 *
 * Manual test endpoint to verify APNs delivery.
 * Body: { driver_code: string, title?: string, body?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driver_code, title, body: msgBody } = body;

    if (!driver_code) {
      return NextResponse.json({ ok: false, error: "driver_code required" }, { status: 400 });
    }

    console.log(`[send-test-push] Testing APNs for driver ${driver_code}`);

    const result = await sendApnsToDriver(driver_code, {
      offer_id: "test-" + Date.now(),
      offer_type: "source",
      offer_round: 1,
      driver_code,
      booking_id: "test-booking",
      pickup_text: title || "Test Push Notification",
      price: 0,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      deep_link: "/upcoming",
    });

    return NextResponse.json({
      ok: true,
      driver_code,
      apns_result: result,
      message: msgBody || "Test push sent",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[send-test-push] Error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
