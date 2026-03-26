// ============================================================
// GET  /api/admin/drivers/[id]/payout-onboarding
// PATCH /api/admin/drivers/[id]/payout-onboarding
//
// Manage driver payout onboarding status and method.
//
// PATCH body (JSON):
//   payout_method              — stripe | bank_wire | zelle | check | other
//   payout_onboarding_status   — not_started | pending | complete | suspended
//   payouts_enabled            — boolean
//   payout_notes               — string (admin notes)
//   stripe_account_id          — string (Stripe Connect account ID)
//   stripe_account_status      — not_connected | pending_verification | connected | restricted
//   stripe_bank_last4          — string (masked last 4)
//   stripe_bank_type           — bank_account | debit_card
//   stripe_bank_name           — string
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
export const runtime = "edge";

// ── GET — driver payout onboarding status ────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driverId = params.id;

  try {
    const [driver] = await sql`
      SELECT
        id,
        driver_code,
        full_name,
        driver_status,
        COALESCE(payout_method, 'not_set')                   AS payout_method,
        COALESCE(payout_onboarding_status, 'not_started')    AS payout_onboarding_status,
        COALESCE(payouts_enabled, FALSE)                     AS payouts_enabled,
        last_payout_date,
        payout_notes,
        stripe_account_id,
        COALESCE(stripe_account_status, 'not_connected')     AS stripe_account_status,
        stripe_bank_last4,
        stripe_bank_type,
        stripe_bank_name
      FROM drivers
      WHERE id = ${driverId}::uuid
      LIMIT 1
    `;

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Determine readiness
    const ready = Boolean(driver.payouts_enabled) && driver.payout_onboarding_status === "complete";

    return NextResponse.json({
      driver_id:                driver.id,
      driver_code:              driver.driver_code,
      driver_name:              driver.full_name,
      payout_method:            driver.payout_method,
      payout_onboarding_status: driver.payout_onboarding_status,
      payouts_enabled:          Boolean(driver.payouts_enabled),
      payout_ready:             ready,
      last_payout_date:         driver.last_payout_date,
      payout_notes:             driver.payout_notes,
      stripe: {
        account_id:     driver.stripe_account_id,
        account_status: driver.stripe_account_status,
        bank_last4:     driver.stripe_bank_last4,
        bank_type:      driver.stripe_bank_type,
        bank_name:      driver.stripe_bank_name,
      },
    });
  } catch (err: any) {
    console.error("[driver/payout-onboarding/get]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}

// ── PATCH — update driver payout onboarding ──────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const driverId = params.id;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      payout_method,
      payout_onboarding_status,
      payouts_enabled,
      payout_notes,
      stripe_account_id,
      stripe_account_status,
      stripe_bank_last4,
      stripe_bank_type,
      stripe_bank_name,
    } = body as Record<string, unknown>;

    // Validate onboarding_status if provided
    const validOnboardingStatuses = ["not_started", "pending", "complete", "suspended"];
    if (payout_onboarding_status !== undefined && !validOnboardingStatuses.includes(payout_onboarding_status as string)) {
      return NextResponse.json(
        { error: `Invalid payout_onboarding_status. Valid: ${validOnboardingStatuses.join(" | ")}` },
        { status: 400 }
      );
    }

    // Validate payout_method if provided
    const validMethods = ["stripe", "bank_wire", "zelle", "check", "other", "not_set"];
    if (payout_method !== undefined && !validMethods.includes(payout_method as string)) {
      return NextResponse.json(
        { error: `Invalid payout_method. Valid: ${validMethods.join(" | ")}` },
        { status: 400 }
      );
    }

    // Build update — only update provided fields
    const updates: Record<string, unknown> = {};
    if (payout_method            !== undefined) updates.payout_method            = payout_method;
    if (payout_onboarding_status !== undefined) updates.payout_onboarding_status = payout_onboarding_status;
    if (payouts_enabled          !== undefined) updates.payouts_enabled          = Boolean(payouts_enabled);
    if (payout_notes             !== undefined) updates.payout_notes             = payout_notes;
    if (stripe_account_id        !== undefined) updates.stripe_account_id        = stripe_account_id;
    if (stripe_account_status    !== undefined) updates.stripe_account_status    = stripe_account_status;
    if (stripe_bank_last4        !== undefined) updates.stripe_bank_last4        = stripe_bank_last4;
    if (stripe_bank_type         !== undefined) updates.stripe_bank_type         = stripe_bank_type;
    if (stripe_bank_name         !== undefined) updates.stripe_bank_name         = stripe_bank_name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Apply updates
    await sql`
      UPDATE drivers SET
        payout_method            = COALESCE(${updates.payout_method as string ?? null},            payout_method),
        payout_onboarding_status = COALESCE(${updates.payout_onboarding_status as string ?? null}, payout_onboarding_status),
        payouts_enabled          = COALESCE(${updates.payouts_enabled as boolean ?? null},          payouts_enabled),
        payout_notes             = COALESCE(${updates.payout_notes as string ?? null},             payout_notes),
        stripe_account_id        = COALESCE(${updates.stripe_account_id as string ?? null},        stripe_account_id),
        stripe_account_status    = COALESCE(${updates.stripe_account_status as string ?? null},    stripe_account_status),
        stripe_bank_last4        = COALESCE(${updates.stripe_bank_last4 as string ?? null},        stripe_bank_last4),
        stripe_bank_type         = COALESCE(${updates.stripe_bank_type as string ?? null},         stripe_bank_type),
        stripe_bank_name         = COALESCE(${updates.stripe_bank_name as string ?? null},         stripe_bank_name),
        updated_at               = NOW()
      WHERE id = ${driverId}::uuid
    `;

    // Return updated state
    const [updated] = await sql`
      SELECT
        id, driver_code, full_name,
        COALESCE(payout_method, 'not_set')                AS payout_method,
        COALESCE(payout_onboarding_status, 'not_started') AS payout_onboarding_status,
        COALESCE(payouts_enabled, FALSE)                  AS payouts_enabled,
        payout_notes,
        stripe_account_id,
        COALESCE(stripe_account_status, 'not_connected')  AS stripe_account_status,
        stripe_bank_last4, stripe_bank_type, stripe_bank_name
      FROM drivers WHERE id = ${driverId}::uuid LIMIT 1
    `;

    const ready = Boolean(updated?.payouts_enabled) && updated?.payout_onboarding_status === "complete";

    return NextResponse.json({
      ok: true,
      driver_id:                driverId,
      driver_code:              updated?.driver_code,
      payout_method:            updated?.payout_method,
      payout_onboarding_status: updated?.payout_onboarding_status,
      payouts_enabled:          Boolean(updated?.payouts_enabled),
      payout_ready:             ready,
      payout_notes:             updated?.payout_notes,
      stripe: {
        account_id:     updated?.stripe_account_id,
        account_status: updated?.stripe_account_status,
        bank_last4:     updated?.stripe_bank_last4,
        bank_type:      updated?.stripe_bank_type,
        bank_name:      updated?.stripe_bank_name,
      },
    });
  } catch (err: any) {
    console.error("[driver/payout-onboarding/patch]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
