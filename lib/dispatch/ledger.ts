// ============================================================
// SLN Driver Earnings Ledger System v1.0
// lib/dispatch/ledger.ts
//
// SINGLE RESPONSIBILITY:
//   - Read locked commission from bookings
//   - Post canonical ledger rows to driver_earnings_ledger
//   - Set bookings.ledger_posted_at
//   - Write audit log entry
//
// SAFETY RULES (spec §22):
//   - Does NOT modify source_driver_id
//   - Does NOT modify executor_driver_id
//   - Does NOT modify dispatch_status
//   - Does NOT recalculate commission logic
//   - Does NOT overwrite lead attribution
//
// IDEMPOTENCY (spec §12):
//   - Checks ledger_posted_at IS NULL before posting
//   - Unique index on (booking_id, earning_role, COALESCE(driver_id, sentinel))
//     prevents duplicate rows even on concurrent calls
// ============================================================

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

// ── Types ────────────────────────────────────────────────────

export type LedgerRole = "source_driver" | "executor_driver" | "platform";
export type LedgerStatus = "pending" | "posted" | "paid" | "voided" | "adjusted";

export interface LedgerRow {
  booking_id: string;
  earning_role: LedgerRole;
  driver_id: string | null;
  gross_booking_amount: number;
  commission_model: string;
  pct_applied: number;
  amount_earned: number;
  currency: string;
  ledger_status: LedgerStatus;
  source_driver_id: string | null;
  executor_driver_id: string | null;
  source_type: string | null;
  source_reference: string | null;
}

export interface PostLedgerResult {
  ok: boolean;
  already_posted: boolean;
  rows_created: number;
  commission_model: string;
  gross_booking_amount: number;
  rows: Array<{
    earning_role: LedgerRole;
    driver_id: string | null;
    pct_applied: number;
    amount_earned: number;
  }>;
  error?: string;
}

// ── Main function ─────────────────────────────────────────────

export async function postBookingLedger(
  booking_id: string
): Promise<PostLedgerResult> {
  // ── Step 1: Load booking with all required fields ─────────
  const bookingRows = await sql`
    SELECT
      id,
      total_price,
      commission_model,
      commission_platform_pct,
      commission_source_pct,
      commission_executor_pct,
      commission_locked_at,
      ledger_posted_at,
      source_driver_id,
      executor_driver_id,
      source_type,
      source_reference,
      currency
    FROM bookings
    WHERE id = ${booking_id}
    LIMIT 1
  `;

  if (bookingRows.length === 0) {
    return {
      ok: false,
      already_posted: false,
      rows_created: 0,
      commission_model: "unknown",
      gross_booking_amount: 0,
      rows: [],
      error: `Booking not found: ${booking_id}`,
    };
  }

  const b = bookingRows[0];

  // ── Step 2: Verify commission is locked ───────────────────
  if (!b.commission_locked_at) {
    return {
      ok: false,
      already_posted: false,
      rows_created: 0,
      commission_model: b.commission_model ?? "unknown",
      gross_booking_amount: Number(b.total_price ?? 0),
      rows: [],
      error: "Commission not yet locked. Ledger posting requires commission_locked_at IS NOT NULL.",
    };
  }

  // ── Step 3: Idempotency check ─────────────────────────────
  if (b.ledger_posted_at) {
    return {
      ok: true,
      already_posted: true,
      rows_created: 0,
      commission_model: b.commission_model ?? "unknown",
      gross_booking_amount: Number(b.total_price ?? 0),
      rows: [],
    };
  }

  const gross = Number(b.total_price ?? 0);
  const model = b.commission_model ?? "platform_direct_assign";
  const platformPct = Number(b.commission_platform_pct ?? 20);
  const sourcePct = Number(b.commission_source_pct ?? 0);
  const executorPct = Number(b.commission_executor_pct ?? 75);
  const sourceDriverId: string | null = b.source_driver_id ?? null;
  const executorDriverId: string | null = b.executor_driver_id ?? null;
  const sourceType: string | null = b.source_type ?? null;
  const sourceReference: string | null = b.source_reference ?? null;
  const currency: string = b.currency ?? "USD";

  // ── Step 4: Build ledger rows per commission model ────────
  const rowsToInsert: LedgerRow[] = [];

  const round2 = (n: number) => Math.round(n * 100) / 100;

  if (model === "self_capture_execute") {
    // CASE A: source = executor — 2 rows only
    rowsToInsert.push({
      booking_id,
      earning_role: "source_driver",
      driver_id: sourceDriverId,
      gross_booking_amount: gross,
      commission_model: model,
      pct_applied: sourcePct,
      amount_earned: round2(gross * sourcePct / 100),
      currency,
      ledger_status: "posted",
      source_driver_id: sourceDriverId,
      executor_driver_id: executorDriverId,
      source_type: sourceType,
      source_reference: sourceReference,
    });
    rowsToInsert.push({
      booking_id,
      earning_role: "platform",
      driver_id: null,
      gross_booking_amount: gross,
      commission_model: model,
      pct_applied: platformPct,
      amount_earned: round2(gross * platformPct / 100),
      currency,
      ledger_status: "posted",
      source_driver_id: sourceDriverId,
      executor_driver_id: executorDriverId,
      source_type: sourceType,
      source_reference: sourceReference,
    });
  } else if (model === "network_reassigned_execute") {
    // CASE B: source ≠ executor — 3 rows
    rowsToInsert.push({
      booking_id,
      earning_role: "source_driver",
      driver_id: sourceDriverId,
      gross_booking_amount: gross,
      commission_model: model,
      pct_applied: sourcePct,
      amount_earned: round2(gross * sourcePct / 100),
      currency,
      ledger_status: "posted",
      source_driver_id: sourceDriverId,
      executor_driver_id: executorDriverId,
      source_type: sourceType,
      source_reference: sourceReference,
    });
    rowsToInsert.push({
      booking_id,
      earning_role: "executor_driver",
      driver_id: executorDriverId,
      gross_booking_amount: gross,
      commission_model: model,
      pct_applied: executorPct,
      amount_earned: round2(gross * executorPct / 100),
      currency,
      ledger_status: "posted",
      source_driver_id: sourceDriverId,
      executor_driver_id: executorDriverId,
      source_type: sourceType,
      source_reference: sourceReference,
    });
    rowsToInsert.push({
      booking_id,
      earning_role: "platform",
      driver_id: null,
      gross_booking_amount: gross,
      commission_model: model,
      pct_applied: platformPct,
      amount_earned: round2(gross * platformPct / 100),
      currency,
      ledger_status: "posted",
      source_driver_id: sourceDriverId,
      executor_driver_id: executorDriverId,
      source_type: sourceType,
      source_reference: sourceReference,
    });
  } else {
    // CASE C: platform_direct_assign — 2 rows (no source_driver row)
    rowsToInsert.push({
      booking_id,
      earning_role: "executor_driver",
      driver_id: executorDriverId,
      gross_booking_amount: gross,
      commission_model: model,
      pct_applied: executorPct,
      amount_earned: round2(gross * executorPct / 100),
      currency,
      ledger_status: "posted",
      source_driver_id: sourceDriverId,
      executor_driver_id: executorDriverId,
      source_type: sourceType,
      source_reference: sourceReference,
    });
    rowsToInsert.push({
      booking_id,
      earning_role: "platform",
      driver_id: null,
      gross_booking_amount: gross,
      commission_model: model,
      pct_applied: platformPct,
      amount_earned: round2(gross * platformPct / 100),
      currency,
      ledger_status: "posted",
      source_driver_id: sourceDriverId,
      executor_driver_id: executorDriverId,
      source_type: sourceType,
      source_reference: sourceReference,
    });
  }

  // ── Step 5: Insert ledger rows (idempotent via ON CONFLICT DO NOTHING) ──
  let rowsCreated = 0;
  for (const row of rowsToInsert) {
    // Idempotency: check if a row already exists for this booking+role+driver
    // before inserting. This avoids relying on ON CONFLICT with a functional
    // expression (COALESCE), which requires exact index match in PostgreSQL.
    const driverIdForCheck = row.driver_id ?? null;
    const existing = await sql`
      SELECT 1 FROM driver_earnings_ledger
      WHERE booking_id   = ${row.booking_id}::uuid
        AND earning_role = ${row.earning_role}
        AND (
          (driver_id IS NULL AND ${driverIdForCheck}::uuid IS NULL)
          OR driver_id = ${driverIdForCheck}::uuid
        )
      LIMIT 1
    `;
    if (existing.length > 0) continue; // already posted — skip

    const inserted = await sql`
      INSERT INTO driver_earnings_ledger (
        booking_id, earning_role, driver_id,
        gross_booking_amount, commission_model,
        pct_applied, amount_earned, currency, ledger_status,
        source_driver_id, executor_driver_id,
        source_type, source_reference,
        posted_at
      ) VALUES (
        ${row.booking_id}::uuid,
        ${row.earning_role},
        ${row.driver_id ?? null},
        ${row.gross_booking_amount},
        ${row.commission_model},
        ${row.pct_applied},
        ${row.amount_earned},
        ${row.currency},
        ${row.ledger_status},
        ${row.source_driver_id ?? null},
        ${row.executor_driver_id ?? null},
        ${row.source_type},
        ${row.source_reference},
        NOW()
      )
      RETURNING id
    `;
    if (inserted.length > 0) rowsCreated++;
  }

  // ── Step 6: Set ledger_posted_at on booking ───────────────
  if (rowsCreated > 0) {
    await sql`
      UPDATE bookings
        SET ledger_posted_at = NOW()
      WHERE id = ${booking_id}::uuid
        AND ledger_posted_at IS NULL
    `;
  }

  // ── Step 7: Audit log ─────────────────────────────────────
  try {
    const totalDriverAmount = rowsToInsert
      .filter(r => r.earning_role !== "platform")
      .reduce((s, r) => s + r.amount_earned, 0);
    const platformRow = rowsToInsert.find(r => r.earning_role === "platform");

    await sql`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, actor_type, new_data
      ) VALUES (
        'booking',
        ${booking_id}::uuid,
        'ledger_posted',
        'system',
        ${JSON.stringify({
          commission_model: model,
          rows_created_count: rowsCreated,
          total_platform_amount: platformRow?.amount_earned ?? 0,
          total_driver_amount: round2(totalDriverAmount),
          posted_at: new Date().toISOString(),
        })}::jsonb
      )
    `;
  } catch {
    // Audit log failure is non-blocking
  }

  return {
    ok: true,
    already_posted: false,
    rows_created: rowsCreated,
    commission_model: model,
    gross_booking_amount: gross,
    rows: rowsToInsert.map(r => ({
      earning_role: r.earning_role,
      driver_id: r.driver_id,
      pct_applied: r.pct_applied,
      amount_earned: r.amount_earned,
    })),
  };
}
