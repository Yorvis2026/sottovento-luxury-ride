// ============================================================
// SLN Commission Engine v1.0 — lockCommission
//
// PURPOSE:
//   Calculate and lock commission splits when a booking is
//   confirmed. Writes to:
//     - bookings (commission_model, commission_*_pct, commission_locked_at)
//     - commissions (commission_model, executor_driver_id, amounts, status)
//     - booking_financial_attribution_snapshot (audit record)
//
// IDEMPOTENCY (spec §12):
//   - Checks commission_locked_at IS NULL before writing
//   - If already locked, returns existing data without changes
//   - Safe to call multiple times on the same booking
//
// SAFETY (spec §10):
//   - Does NOT modify source_driver_id, executor_driver_id,
//     offered_driver_id, accepted_driver_id, dispatch_status
//   - Only reads attribution + calculates + locks
//
// TRIGGER POINT (spec §11):
//   - Called when booking.status changes to 'confirmed'
//   - Called from: stripe/webhook, respond-offer (accept)
//
// INPUTS:
//   - source_driver_id  (from bookings.source_driver_id)
//   - executor_driver_id (from bookings.executor_driver_id)
//   - total_price
//   - booking_id
// ============================================================

import { neon } from "@neondatabase/serverless";
import { calculateCommissions } from "./engine";

const sql = neon(process.env.DATABASE_URL!);

export interface LockCommissionInput {
  booking_id: string;
  total_price: number;
  source_driver_id: string | null;
  executor_driver_id: string | null;
}

export interface LockCommissionResult {
  locked: boolean;        // true = newly locked, false = already locked (idempotent skip)
  commission_model: string;
  platform_pct: number;
  source_pct: number;
  executor_pct: number;
  platform_amount: number;
  source_amount: number | null;
  executor_amount: number;
  total_amount: number;
  skipped_reason?: string;
}

export async function lockCommission(
  input: LockCommissionInput
): Promise<LockCommissionResult> {
  const { booking_id, total_price, source_driver_id, executor_driver_id } = input;

  // ── Idempotency check (spec §12) ─────────────────────────────
  const existing = await sql`
    SELECT commission_locked_at, commission_model,
           commission_platform_pct, commission_source_pct,
           commission_executor_pct
    FROM bookings
    WHERE id = ${booking_id}::uuid
    LIMIT 1
  `;

  if (existing[0]?.commission_locked_at !== null && existing[0]?.commission_locked_at !== undefined) {
    // Already locked — return existing data without changes
    return {
      locked: false,
      commission_model: existing[0].commission_model ?? 'unknown',
      platform_pct: Number(existing[0].commission_platform_pct ?? 0),
      source_pct: Number(existing[0].commission_source_pct ?? 0),
      executor_pct: Number(existing[0].commission_executor_pct ?? 0),
      platform_amount: 0,
      source_amount: null,
      executor_amount: 0,
      total_amount: total_price,
      skipped_reason: 'commission_already_locked',
    };
  }

  // ── Calculate (spec §4-6) ─────────────────────────────────────
  const calc = calculateCommissions(total_price, source_driver_id, executor_driver_id);

  const now = new Date().toISOString();

  // ── Step 1: Lock commission fields on bookings ────────────────
  await sql`
    UPDATE bookings
    SET
      commission_model         = ${calc.commission_model},
      commission_platform_pct  = ${calc.platform_pct},
      commission_source_pct    = ${calc.source_pct},
      commission_executor_pct  = ${calc.executor_pct},
      commission_locked_at     = ${now}::timestamptz
    WHERE id = ${booking_id}::uuid
      AND commission_locked_at IS NULL
  `;

  // ── Step 2: Update commissions table ─────────────────────────
  // UPSERT: create if not exists (some bookings may not have a commissions row yet)
  await sql`
    INSERT INTO commissions (
      booking_id, source_driver_id, executor_driver_id,
      commission_model,
      executor_pct, executor_amount,
      source_pct,   source_amount,
      platform_pct, platform_amount,
      total_amount, status
    ) VALUES (
      ${booking_id}::uuid,
      ${source_driver_id}::uuid,
      ${executor_driver_id}::uuid,
      ${calc.commission_model},
      ${calc.executor_pct},  ${calc.executor_amount},
      ${calc.source_pct},    ${calc.source_amount ?? null},
      ${calc.platform_pct},  ${calc.platform_amount},
      ${calc.total_amount},  'confirmed'
    )
    ON CONFLICT (booking_id) DO UPDATE SET
      commission_model    = EXCLUDED.commission_model,
      executor_driver_id  = EXCLUDED.executor_driver_id,
      executor_pct        = EXCLUDED.executor_pct,
      executor_amount     = EXCLUDED.executor_amount,
      source_pct          = EXCLUDED.source_pct,
      source_amount       = EXCLUDED.source_amount,
      platform_pct        = EXCLUDED.platform_pct,
      platform_amount     = EXCLUDED.platform_amount,
      total_amount        = EXCLUDED.total_amount,
      status              = 'confirmed',
      updated_at          = NOW()
  `;

  // ── Step 3: Write snapshot (spec §14) ────────────────────────
  await sql`
    INSERT INTO booking_financial_attribution_snapshot (
      booking_id, source_driver_id, executor_driver_id,
      commission_model,
      commission_platform_pct, commission_source_pct, commission_executor_pct,
      total_booking_amount, platform_amount, source_amount, executor_amount
    ) VALUES (
      ${booking_id}::uuid,
      ${source_driver_id}::uuid,
      ${executor_driver_id}::uuid,
      ${calc.commission_model},
      ${calc.platform_pct}, ${calc.source_pct}, ${calc.executor_pct},
      ${calc.total_amount}, ${calc.platform_amount},
      ${calc.source_amount ?? null}, ${calc.executor_amount}
    )
    ON CONFLICT (booking_id) DO NOTHING
  `;

  console.log(
    `[commission-engine] locked — booking=${booking_id} model=${calc.commission_model} ` +
    `platform=${calc.platform_pct}% source=${calc.source_pct}% executor=${calc.executor_pct}%`
  );

  return {
    locked: true,
    commission_model: calc.commission_model,
    platform_pct: calc.platform_pct,
    source_pct: calc.source_pct,
    executor_pct: calc.executor_pct,
    platform_amount: calc.platform_amount,
    source_amount: calc.source_amount,
    executor_amount: calc.executor_amount,
    total_amount: calc.total_amount,
  };
}
