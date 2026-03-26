// ============================================================
// SLN Weekly Payout System v1.0
// lib/payout/weekly-payout.ts
//
// RESPONSIBILITIES:
//   - Preview weekly payout (dry run, no DB writes)
//   - Generate payout batch (creates payout_batches row, marks ledger rows)
//   - Transition batch status: pending_payout → paid → reconciled
//   - Enforce idempotency and anti-duplication guards
//
// PAYOUT LIFECYCLE:
//   Ledger row:    unpaid → pending_payout → paid → reconciled
//   Batch status:  draft  → pending_payout → paid → reconciled
//
// ELIGIBILITY RULES:
//   - Driver must have payouts_enabled = TRUE
//   - Driver must have payout_onboarding_status = 'complete'
//   - Driver must have at least one unpaid earning in the week range
//   - Earnings already assigned to a non-cancelled batch are excluded
// ============================================================

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);

// ── Types ────────────────────────────────────────────────────

export interface WeekRange {
  week_start: string; // ISO string — Monday 00:00 UTC
  week_end:   string; // ISO string — Sunday 23:59:59 UTC
}

export interface PayoutPreviewDriver {
  driver_id:                string;
  driver_code:              string;
  driver_name:              string;
  payouts_enabled:          boolean;
  payout_onboarding_status: string;
  payout_method:            string | null;
  stripe_account_id:        string | null;
  stripe_account_status:    string | null;
  eligible:                 boolean;
  ineligible_reason:        string | null;
  unpaid_earnings_count:    number;
  total_amount:             number;
  currency:                 string;
  earnings:                 PayoutEarningRow[];
}

export interface PayoutEarningRow {
  ledger_id:     string;
  booking_id:    string;
  earning_role:  string;
  amount_earned: number;
  pct_applied:   number;
  posted_at:     string;
  ledger_status: string;
}

export interface PayoutPreviewResult {
  week_start:             string;
  week_end:               string;
  eligible_drivers:       PayoutPreviewDriver[];
  ineligible_drivers:     PayoutPreviewDriver[];
  total_eligible_amount:  number;
  total_eligible_drivers: number;
  preview_at:             string;
}

export interface GenerateBatchResult {
  ok:              boolean;
  batches_created: number;
  batches_skipped: number;
  batches:         GeneratedBatch[];
  errors:          string[];
}

export interface GeneratedBatch {
  batch_id:       string;
  driver_id:      string;
  driver_code:    string;
  driver_name:    string;
  total_amount:   number;
  earnings_count: number;
  status:         string;
  skipped:        boolean;
  skip_reason?:   string;
}

export interface TransitionResult {
  ok:              boolean;
  batch_id:        string;
  previous_status: string;
  new_status:      string;
  earnings_updated: number;
  error?:          string;
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Returns the ISO week range (Mon 00:00 UTC → Sun 23:59:59 UTC)
 * for the most recent completed week, or for a given date.
 */
export function getWeekRange(referenceDate?: Date): WeekRange {
  const ref = referenceDate ?? new Date();
  // Monday of the week containing ref
  const day = ref.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = (day === 0) ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setUTCDate(ref.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    week_start: monday.toISOString(),
    week_end:   sunday.toISOString(),
  };
}

/**
 * Returns the previous week range (the last completed week).
 */
export function getPreviousWeekRange(): WeekRange {
  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setUTCDate(now.getUTCDate() - 7);
  return getWeekRange(lastWeek);
}

// ── Core Functions ───────────────────────────────────────────

/**
 * Preview the weekly payout for a given week range.
 * DRY RUN — no DB writes.
 * Returns eligible and ineligible drivers with their unpaid earnings.
 */
export async function previewWeeklyPayout(
  range: WeekRange,
  driverIdFilter?: string
): Promise<PayoutPreviewResult> {
  // Load all drivers with payout fields
  const driverRows = await sql`
    SELECT
      id,
      driver_code,
      full_name,
      COALESCE(payouts_enabled, FALSE)            AS payouts_enabled,
      COALESCE(payout_onboarding_status, 'not_started') AS payout_onboarding_status,
      COALESCE(payout_method, 'not_set')          AS payout_method,
      stripe_account_id,
      COALESCE(stripe_account_status, 'not_connected') AS stripe_account_status
    FROM drivers
    WHERE driver_status = 'active'
      AND (${driverIdFilter ?? null}::uuid IS NULL OR id = ${driverIdFilter ?? null}::uuid)
    ORDER BY full_name
  `;

  const eligible:   PayoutPreviewDriver[] = [];
  const ineligible: PayoutPreviewDriver[] = [];

  for (const d of driverRows) {
    const driverId = d.id as string;

    // Load unpaid earnings in the week range (not already in a batch)
    const earningRows = await sql`
      SELECT
        id,
        booking_id,
        earning_role,
        amount_earned,
        pct_applied,
        posted_at,
        ledger_status
      FROM driver_earnings_ledger
      WHERE driver_id = ${driverId}::uuid
        AND earning_role IN ('source_driver', 'executor_driver')
        AND ledger_status = 'unpaid'
        AND payout_batch_uuid IS NULL
        AND posted_at >= ${range.week_start}::timestamptz
        AND posted_at <= ${range.week_end}::timestamptz
      ORDER BY posted_at ASC
    `;

    const earnings: PayoutEarningRow[] = earningRows.map((r) => ({
      ledger_id:     r.id as string,
      booking_id:    r.booking_id as string,
      earning_role:  r.earning_role as string,
      amount_earned: Number(r.amount_earned),
      pct_applied:   Number(r.pct_applied),
      posted_at:     r.posted_at as string,
      ledger_status: r.ledger_status as string,
    }));

    const totalAmount = earnings.reduce((s, e) => s + e.amount_earned, 0);

    // Eligibility check
    const payoutsEnabled = Boolean(d.payouts_enabled);
    const onboardingStatus = d.payout_onboarding_status as string;
    let ineligibleReason: string | null = null;

    if (!payoutsEnabled) {
      ineligibleReason = "payouts_not_enabled";
    } else if (onboardingStatus !== "complete") {
      ineligibleReason = `payout_onboarding_incomplete (status: ${onboardingStatus})`;
    } else if (earnings.length === 0) {
      ineligibleReason = "no_unpaid_earnings_in_range";
    }

    const driverPreview: PayoutPreviewDriver = {
      driver_id:                driverId,
      driver_code:              d.driver_code as string,
      driver_name:              d.full_name as string,
      payouts_enabled:          payoutsEnabled,
      payout_onboarding_status: onboardingStatus,
      payout_method:            d.payout_method as string | null,
      stripe_account_id:        d.stripe_account_id as string | null,
      stripe_account_status:    d.stripe_account_status as string | null,
      eligible:                 ineligibleReason === null,
      ineligible_reason:        ineligibleReason,
      unpaid_earnings_count:    earnings.length,
      total_amount:             totalAmount,
      currency:                 "USD",
      earnings,
    };

    if (ineligibleReason === null) {
      eligible.push(driverPreview);
    } else {
      ineligible.push(driverPreview);
    }
  }

  return {
    week_start:             range.week_start,
    week_end:               range.week_end,
    eligible_drivers:       eligible,
    ineligible_drivers:     ineligible,
    total_eligible_amount:  eligible.reduce((s, d) => s + d.total_amount, 0),
    total_eligible_drivers: eligible.length,
    preview_at:             new Date().toISOString(),
  };
}

/**
 * Generate payout batches for all eligible drivers in the given week range.
 * Creates one payout_batches row per eligible driver.
 * Marks ledger rows as pending_payout and links them to the batch.
 * IDEMPOTENT: skips drivers that already have a non-cancelled batch for the week.
 */
export async function generateWeeklyPayoutBatch(
  range: WeekRange,
  adminId?: string
): Promise<GenerateBatchResult> {
  const preview = await previewWeeklyPayout(range);
  const batches: GeneratedBatch[] = [];
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const driver of preview.eligible_drivers) {
    // Check idempotency: does a non-cancelled batch already exist for this driver+week?
    const existing = await sql`
      SELECT id, status FROM payout_batches
      WHERE driver_id  = ${driver.driver_id}::uuid
        AND week_start = ${range.week_start}::timestamptz
        AND status NOT IN ('cancelled')
      LIMIT 1
    `;

    if (existing.length > 0) {
      batches.push({
        batch_id:       existing[0].id as string,
        driver_id:      driver.driver_id,
        driver_code:    driver.driver_code,
        driver_name:    driver.driver_name,
        total_amount:   driver.total_amount,
        earnings_count: driver.unpaid_earnings_count,
        status:         existing[0].status as string,
        skipped:        true,
        skip_reason:    "batch_already_exists",
      });
      skipped++;
      continue;
    }

    try {
      // Create payout batch
      const [batch] = await sql`
        INSERT INTO payout_batches (
          driver_id, week_start, week_end,
          total_amount, earnings_count, currency,
          status, payment_method, created_by_admin_id
        ) VALUES (
          ${driver.driver_id}::uuid,
          ${range.week_start}::timestamptz,
          ${range.week_end}::timestamptz,
          ${driver.total_amount},
          ${driver.unpaid_earnings_count},
          'USD',
          'pending_payout',
          ${driver.payout_method ?? 'not_set'},
          ${adminId ?? null}
        )
        RETURNING id, status
      `;

      const batchId = batch.id as string;

      // Mark ledger rows as pending_payout and link to batch
      const ledgerIds = driver.earnings.map(e => e.ledger_id);
      if (ledgerIds.length > 0) {
        await sql`
          UPDATE driver_earnings_ledger
          SET
            ledger_status    = 'pending_payout',
            payout_batch_uuid = ${batchId}::uuid,
            updated_at        = NOW()
          WHERE id = ANY(${ledgerIds}::uuid[])
            AND ledger_status = 'unpaid'
            AND payout_batch_uuid IS NULL
        `;
      }

      batches.push({
        batch_id:       batchId,
        driver_id:      driver.driver_id,
        driver_code:    driver.driver_code,
        driver_name:    driver.driver_name,
        total_amount:   driver.total_amount,
        earnings_count: driver.unpaid_earnings_count,
        status:         "pending_payout",
        skipped:        false,
      });
      created++;
    } catch (e: any) {
      errors.push(`driver ${driver.driver_code}: ${e?.message}`);
    }
  }

  return {
    ok:              errors.length === 0,
    batches_created: created,
    batches_skipped: skipped,
    batches,
    errors,
  };
}

/**
 * Mark a payout batch as 'paid'.
 * Transitions: pending_payout → paid
 * Also marks all linked ledger rows as 'paid' and sets paid_out_at.
 */
export async function markBatchPaid(
  batchId: string,
  opts?: { external_reference?: string; notes?: string; adminId?: string }
): Promise<TransitionResult> {
  // Load batch
  const [batch] = await sql`
    SELECT id, status, driver_id FROM payout_batches
    WHERE id = ${batchId}::uuid
    LIMIT 1
  `;
  if (!batch) {
    return { ok: false, batch_id: batchId, previous_status: "unknown", new_status: "unknown", earnings_updated: 0, error: "Batch not found" };
  }
  const prevStatus = batch.status as string;
  if (prevStatus !== "pending_payout") {
    return { ok: false, batch_id: batchId, previous_status: prevStatus, new_status: prevStatus, earnings_updated: 0, error: `Cannot transition from '${prevStatus}' to 'paid'. Expected 'pending_payout'.` };
  }

  const now = new Date().toISOString();

  // Update batch
  await sql`
    UPDATE payout_batches
    SET
      status             = 'paid',
      executed_at        = ${now}::timestamptz,
      external_reference = COALESCE(${opts?.external_reference ?? null}, external_reference),
      notes              = COALESCE(${opts?.notes ?? null}, notes),
      updated_at         = NOW()
    WHERE id = ${batchId}::uuid
  `;

  // Update ledger rows
  const updated = await sql`
    UPDATE driver_earnings_ledger
    SET
      ledger_status = 'paid',
      paid_out_at   = ${now}::timestamptz,
      updated_at    = NOW()
    WHERE payout_batch_uuid = ${batchId}::uuid
      AND ledger_status = 'pending_payout'
    RETURNING id
  `;

  // Update driver last_payout_date
  await sql`
    UPDATE drivers
    SET last_payout_date = ${now}::timestamptz, updated_at = NOW()
    WHERE id = ${batch.driver_id}::uuid
  `;

  return {
    ok:               true,
    batch_id:         batchId,
    previous_status:  prevStatus,
    new_status:       "paid",
    earnings_updated: updated.length,
  };
}

/**
 * Mark a payout batch as 'reconciled'.
 * Transitions: paid → reconciled
 * Also marks all linked ledger rows as 'reconciled'.
 */
export async function markBatchReconciled(
  batchId: string,
  opts?: { notes?: string; adminId?: string }
): Promise<TransitionResult> {
  const [batch] = await sql`
    SELECT id, status FROM payout_batches
    WHERE id = ${batchId}::uuid
    LIMIT 1
  `;
  if (!batch) {
    return { ok: false, batch_id: batchId, previous_status: "unknown", new_status: "unknown", earnings_updated: 0, error: "Batch not found" };
  }
  const prevStatus = batch.status as string;
  if (prevStatus !== "paid") {
    return { ok: false, batch_id: batchId, previous_status: prevStatus, new_status: prevStatus, earnings_updated: 0, error: `Cannot transition from '${prevStatus}' to 'reconciled'. Expected 'paid'.` };
  }

  const now = new Date().toISOString();

  await sql`
    UPDATE payout_batches
    SET
      status        = 'reconciled',
      reconciled_at = ${now}::timestamptz,
      notes         = COALESCE(${opts?.notes ?? null}, notes),
      updated_at    = NOW()
    WHERE id = ${batchId}::uuid
  `;

  const updated = await sql`
    UPDATE driver_earnings_ledger
    SET
      ledger_status = 'reconciled',
      updated_at    = NOW()
    WHERE payout_batch_uuid = ${batchId}::uuid
      AND ledger_status = 'paid'
    RETURNING id
  `;

  return {
    ok:               true,
    batch_id:         batchId,
    previous_status:  prevStatus,
    new_status:       "reconciled",
    earnings_updated: updated.length,
  };
}

/**
 * Cancel a payout batch (only from draft or pending_payout).
 * Returns ledger rows to 'unpaid' and clears payout_batch_uuid.
 */
export async function cancelBatch(
  batchId: string,
  opts?: { notes?: string }
): Promise<TransitionResult> {
  const [batch] = await sql`
    SELECT id, status FROM payout_batches
    WHERE id = ${batchId}::uuid
    LIMIT 1
  `;
  if (!batch) {
    return { ok: false, batch_id: batchId, previous_status: "unknown", new_status: "unknown", earnings_updated: 0, error: "Batch not found" };
  }
  const prevStatus = batch.status as string;
  if (!["draft", "pending_payout"].includes(prevStatus)) {
    return { ok: false, batch_id: batchId, previous_status: prevStatus, new_status: prevStatus, earnings_updated: 0, error: `Cannot cancel batch in status '${prevStatus}'.` };
  }

  await sql`
    UPDATE payout_batches
    SET
      status       = 'cancelled',
      cancelled_at = NOW(),
      notes        = COALESCE(${opts?.notes ?? null}, notes),
      updated_at   = NOW()
    WHERE id = ${batchId}::uuid
  `;

  // Return ledger rows to unpaid
  const updated = await sql`
    UPDATE driver_earnings_ledger
    SET
      ledger_status     = 'unpaid',
      payout_batch_uuid = NULL,
      updated_at        = NOW()
    WHERE payout_batch_uuid = ${batchId}::uuid
      AND ledger_status IN ('pending_payout')
    RETURNING id
  `;

  return {
    ok:               true,
    batch_id:         batchId,
    previous_status:  prevStatus,
    new_status:       "cancelled",
    earnings_updated: updated.length,
  };
}

/**
 * Get payout batch history for a driver (or all drivers).
 */
export async function getPayoutBatchHistory(opts?: {
  driverId?: string;
  status?: string;
  limit?: number;
}) {
  const limit = opts?.limit ?? 50;
  const rows = await sql`
    SELECT
      pb.id,
      pb.driver_id,
      d.driver_code,
      d.full_name AS driver_name,
      pb.week_start,
      pb.week_end,
      pb.total_amount,
      pb.earnings_count,
      pb.currency,
      pb.status,
      pb.payment_method,
      pb.external_reference,
      pb.notes,
      pb.executed_at,
      pb.reconciled_at,
      pb.cancelled_at,
      pb.created_at
    FROM payout_batches pb
    JOIN drivers d ON d.id = pb.driver_id
    WHERE (${opts?.driverId ?? null}::uuid IS NULL OR pb.driver_id = ${opts?.driverId ?? null}::uuid)
      AND (${opts?.status ?? null}::text IS NULL OR pb.status = ${opts?.status ?? null})
    ORDER BY pb.created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}
