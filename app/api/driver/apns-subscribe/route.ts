import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
/**
 * POST /api/driver/apns-subscribe
 * BM-SLN-APNS-TOKEN-NATIVE-REGISTER-FIX
 * BM-SLN-APNS-FIELD-ALIAS-FIX
 *
 * Saves the native APNs device token for a driver.
 * Called from the iOS Capacitor shell after PushNotifications.register() fires.
 *
 * Accepts multiple field name aliases for the token to support both
 * the iOS shell payload ({ driver_code, token, push_token, platform })
 * and the canonical payload ({ driver_code, apns_token }).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // BM-SLN-APNS-FIELD-ALIAS-FIX:
    // The iOS Capacitor shell sends { driver_code, token, push_token, platform }
    // while the canonical field name is apns_token.
    // Accept all aliases so both the shell and direct API callers work.
    const driver_code = body.driver_code;
    const apns_token  = body.apns_token || body.token || body.push_token || null;
    const bundle_id   = body.bundle_id   || null;
    const device_id   = body.device_id   || null;
    const environment = body.environment || body.platform || "production";

    console.log("[apns-subscribe] Received registration:", {
      driver_code,
      apns_token: apns_token ? `${String(apns_token).substring(0, 16)}...` : "MISSING",
      environment,
      bundle_id,
    });

    if (!driver_code || !apns_token) {
      console.error("[apns-subscribe] Missing required fields:", { driver_code: !!driver_code, apns_token: !!apns_token });
      return NextResponse.json(
        { ok: false, error: "driver_code and apns_token are required" },
        { status: 400 }
      );
    }

    const sql = neon(process.env.DATABASE_URL!);

    // Upsert: insert or update on conflict (driver_code, apns_token)
    await sql`
      INSERT INTO driver_apns_tokens (driver_code, apns_token, bundle_id, environment, updated_at)
      VALUES (
        ${driver_code},
        ${apns_token},
        ${bundle_id},
        ${environment},
        NOW()
      )
      ON CONFLICT (driver_code, apns_token)
      DO UPDATE SET
        bundle_id   = EXCLUDED.bundle_id,
        environment = EXCLUDED.environment,
        updated_at  = NOW()
    `;

    console.log(`[apns-subscribe] ✅ Token saved for driver ${driver_code}`);
    return NextResponse.json({
      ok: true,
      subscribed: true,
      driver_code,
      token_preview: `${String(apns_token).substring(0, 8)}...`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[apns-subscribe] Error:", msg);

    if (msg.includes("driver_apns_tokens") && msg.includes("does not exist")) {
      return NextResponse.json(
        {
          ok: false,
          error: "DB table driver_apns_tokens not found. Run migration first.",
          hint: "Execute: CREATE TABLE driver_apns_tokens (id SERIAL PRIMARY KEY, driver_code TEXT NOT NULL, apns_token TEXT NOT NULL, bundle_id TEXT, device_id TEXT, environment TEXT DEFAULT 'production', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(driver_code, apns_token))",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
