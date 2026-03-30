export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ============================================================
// POST /api/admin/commission-override
//
// Allows admin to manually override commission splits for a
// specific booking. Used for disputes, corrections, or special
// arrangements.
//
// SAFETY (spec §10):
//   - Does NOT modify source_driver_id, executor_driver_id,
//     offered_driver_id, accepted_driver_id, dispatch_status
//   - Only modifies commission amounts and model
//   - Writes override audit trail (reason, timestamp, admin_id)
//
// IDEMPOTENCY:
//   - Can be called multiple times — each call overwrites the
//     previous override and logs a new audit entry
//
// REQUEST BODY:
//   {
//     booking_id:         string (UUID)
//     admin_id:           string (UUID)
//     override_reason:    string
//     platform_pct:       number (0-100)
//     source_pct:         number (0-100)
//     executor_pct:       number (0-100)
//     // platform_pct + source_pct + executor_pct MUST equal 100
//   }
// ============================================================

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

interface OverrideRequest {
  booking_id: string;
  admin_id: string;
  override_reason: string;
  platform_pct: number;
  source_pct: number;
  executor_pct: number;
}

export async function POST(req: NextRequest) {
  let body: OverrideRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { booking_id, admin_id, override_reason, platform_pct, source_pct, executor_pct } = body;

  // ── Validation ────────────────────────────────────────────
  if (!booking_id || !admin_id || !override_reason) {
    return NextResponse.json(
      { error: "booking_id, admin_id, and override_reason are required" },
      { status: 400 }
    );
  }

  const totalPct = (platform_pct ?? 0) + (source_pct ?? 0) + (executor_pct ?? 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    return NextResponse.json(
      { error: `platform_pct + source_pct + executor_pct must equal 100 (got ${totalPct})` },
      { status: 400 }
    );
  }

  try {
    // ── Read booking for amounts ───────────────────────────
    const [booking] = await sql`
      SELECT id, total_price, source_driver_id, executor_driver_id,
             commission_locked_at
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const totalPrice = Number(booking.total_price ?? 0);
    const amt = (pct: number) => parseFloat(((totalPrice * pct) / 100).toFixed(2));

    const now = new Date().toISOString();

    // ── Step 1: Update bookings commission fields ──────────
    await sql`
      UPDATE bookings
      SET
        commission_model        = 'manual_admin_override',
        commission_platform_pct = ${platform_pct},
        commission_source_pct   = ${source_pct},
        commission_executor_pct = ${executor_pct},
        commission_locked_at    = ${now}::timestamptz,
        updated_at              = NOW()
      WHERE id = ${booking_id}::uuid
    `;

    // ── Step 2: Update commissions table ──────────────────
    await sql`
      UPDATE commissions
      SET
        commission_model    = 'manual_admin_override',
        platform_pct        = ${platform_pct},
        platform_amount     = ${amt(platform_pct)},
        source_pct          = ${source_pct},
        source_amount       = ${source_pct > 0 ? amt(source_pct) : null},
        executor_pct        = ${executor_pct},
        executor_amount     = ${amt(executor_pct)},
        status              = 'confirmed',
        override_reason     = ${override_reason},
        override_timestamp  = ${now}::timestamptz,
        override_admin_id   = ${admin_id}::uuid,
        updated_at          = NOW()
      WHERE booking_id = ${booking_id}::uuid
    `;

    // ── Step 3: Log audit trail ────────────────────────────
    await sql`
      INSERT INTO audit_logs (
        entity_type, entity_id, action,
        actor_type, actor_id,
        new_data, created_at
      ) VALUES (
        'booking', ${booking_id}::uuid, 'commission_override',
        'admin', ${admin_id}::uuid,
        ${JSON.stringify({
          commission_model: 'manual_admin_override',
          platform_pct,
          source_pct,
          executor_pct,
          platform_amount: amt(platform_pct),
          source_amount: source_pct > 0 ? amt(source_pct) : null,
          executor_amount: amt(executor_pct),
          override_reason,
          previous_locked_at: booking.commission_locked_at,
        })}::jsonb,
        NOW()
      )
    `;

    console.log(
      `[commission-override] booking=${booking_id} admin=${admin_id} ` +
      `platform=${platform_pct}% source=${source_pct}% executor=${executor_pct}% reason="${override_reason}"`
    );

    return NextResponse.json({
      ok: true,
      booking_id,
      commission_model: 'manual_admin_override',
      platform_pct,
      source_pct,
      executor_pct,
      platform_amount: amt(platform_pct),
      source_amount: source_pct > 0 ? amt(source_pct) : null,
      executor_amount: amt(executor_pct),
      total_amount: totalPrice,
      override_reason,
      override_timestamp: now,
    });
  } catch (err: any) {
    console.error("[commission-override]", err);
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 }
    );
  }
}
