import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// BM-SLN-APNS-CORS-FIX
// CORS headers required for iOS WKWebView (capacitor://localhost origin)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const driver_code: string | undefined = body.driver_code;
    const apns_token: string | undefined =
      body.apns_token || body.token || body.push_token || undefined;
    const bundle_id: string | null = body.bundle_id || null;
    const device_id: string | null = body.device_id || null;
    const environment: string = body.environment || body.platform || "production";

    console.log("[apns-subscribe] Received registration:", {
      driver_code,
      apns_token: apns_token ? String(apns_token).substring(0, 16) + "..." : "MISSING",
      environment,
    });

    if (!driver_code || !apns_token) {
      return NextResponse.json(
        { ok: false, error: "driver_code and apns_token are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    await sql`
      INSERT INTO driver_apns_tokens
        (driver_code, apns_token, bundle_id, device_id, environment, updated_at)
      VALUES (
        ${driver_code},
        ${apns_token},
        ${bundle_id},
        ${device_id},
        ${environment},
        NOW()
      )
      ON CONFLICT (driver_code, apns_token)
      DO UPDATE SET
        bundle_id   = EXCLUDED.bundle_id,
        device_id   = EXCLUDED.device_id,
        environment = EXCLUDED.environment,
        updated_at  = NOW()
    `;

    console.log("[apns-subscribe] Token saved for driver " + driver_code);

    return NextResponse.json(
      {
        ok: true,
        subscribed: true,
        driver_code,
        token_preview: String(apns_token).substring(0, 8) + "...",
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[apns-subscribe] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
