import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/driver/apns-subscribe
// BM-SLN-APNS-TOKEN-NATIVE-REGISTER-FIX
// Saves the native APNs device token for a driver to the database.
// Previously this endpoint only logged the payload and discarded the token.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { driver_code, apns_token, device_id, bundle_id } = body;

    console.log("[apns-subscribe] payload received:", {
      driver_code,
      apns_token: apns_token ? apns_token.substring(0, 16) + "..." : "MISSING",
      device_id,
      bundle_id,
    });

    if (!driver_code || !apns_token) {
      console.error("[apns-subscribe] missing driver_code or apns_token");
      return NextResponse.json(
        { ok: false, error: "driver_code and apns_token are required" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Upsert: insert or update the APNs token for this driver
    await sql`
      INSERT INTO driver_apns_tokens (driver_code, apns_token, device_id, bundle_id, updated_at)
      VALUES (
        ${driver_code},
        ${apns_token},
        ${device_id ?? null},
        ${bundle_id ?? "com.sottoventoluxuryride.driver"},
        NOW()
      )
      ON CONFLICT (driver_code)
      DO UPDATE SET
        apns_token = EXCLUDED.apns_token,
        device_id  = EXCLUDED.device_id,
        bundle_id  = EXCLUDED.bundle_id,
        updated_at = NOW()
    `;

    console.log("[apns-subscribe] token saved for driver:", driver_code);

    return NextResponse.json(
      {
        ok: true,
        subscribed: true,
        driver_code,
        timestamp: Date.now(),
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (err) {
    console.error("[apns-subscribe] error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
