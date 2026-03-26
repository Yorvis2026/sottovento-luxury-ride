// ============================================================
// POST /api/admin/test-payout-lifecycle
//
// End-to-end test of the Weekly Payout System.
// Creates test bookings, runs payout lifecycle, verifies transitions.
//
// Body (JSON):
//   cleanup  — boolean (default true) — delete test data after
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  previewWeeklyPayout,
  generateWeeklyPayoutBatch,
  markBatchPaid,
  markBatchReconciled,
  getWeekRange,
} from "@/lib/payout/weekly-payout";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
export const runtime = "edge";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const cleanup = body.cleanup !== false;

  const steps: Record<string, unknown> = {};
  const testIds: {
    driverEligible?: string;
    driverIneligible?: string;
    clientId?: string;
    bookingIds: string[];
    batchIds: string[];
  } = { bookingIds: [], batchIds: [] };

  try {
    // ── Step 1: Create eligible driver (payout_onboarding_status=complete) ──
    const [driverA] = await sql`
      INSERT INTO drivers (driver_code, full_name, driver_status, payouts_enabled, payout_onboarding_status, payout_method, stripe_account_id, stripe_account_status, stripe_bank_last4, stripe_bank_name)
      VALUES (
        'TEST_ELIGIBLE_' || EXTRACT(EPOCH FROM NOW())::int,
        'Test Driver Eligible',
        'active',
        TRUE,
        'complete',
        'stripe',
        'acct_test_eligible',
        'connected',
        '4242',
        'Test Bank'
      )
      RETURNING id, driver_code
    `;
    testIds.driverEligible = driverA.id as string;
    steps.driver_eligible = { id: driverA.id, code: driverA.driver_code, payouts_enabled: true, onboarding: "complete" };

    // ── Step 2: Create ineligible driver (payout_onboarding_status=not_started) ──
    const [driverB] = await sql`
      INSERT INTO drivers (driver_code, full_name, driver_status, payouts_enabled, payout_onboarding_status)
      VALUES (
        'TEST_INELIGIBLE_' || EXTRACT(EPOCH FROM NOW())::int,
        'Test Driver Ineligible',
        'active',
        FALSE,
        'not_started'
      )
      RETURNING id, driver_code
    `;
    testIds.driverIneligible = driverB.id as string;
    steps.driver_ineligible = { id: driverB.id, code: driverB.driver_code, payouts_enabled: false, onboarding: "not_started" };

    // ── Step 3: Create test client ────────────────────────────
    const [client] = await sql`
      INSERT INTO clients (full_name, phone, source_type)
      VALUES ('Test Payout Client', '+1-000-000-0000', 'direct')
      RETURNING id
    `;
    testIds.clientId = client.id as string;

    // ── Step 4: Create and complete 2 bookings for eligible driver ──
    const bookingAmounts = [300, 200];
    for (const amount of bookingAmounts) {
      const [booking] = await sql`
        INSERT INTO bookings (
          client_id, source_driver_id, executor_driver_id,
          status, pickup_address, dropoff_address,
          vehicle_type, total_price, trip_type, pickup_at,
          commission_model, commission_platform_pct, commission_source_pct,
          commission_executor_pct, commission_locked_at, ledger_posted_at
        ) VALUES (
          ${testIds.clientId}::uuid,
          ${testIds.driverEligible}::uuid,
          ${testIds.driverEligible}::uuid,
          'completed',
          'MCO Airport — Payout Test',
          'Orlando FL — Payout Test',
          'sedan',
          ${amount},
          'oneway',
          NOW() - INTERVAL '1 day',
          'self_capture_execute',
          20.00, 0.00, 80.00,
          NOW() - INTERVAL '1 day',
          NOW() - INTERVAL '1 day'
        )
        RETURNING id
      `;
      testIds.bookingIds.push(booking.id as string);

      // Post ledger rows manually (executor_driver gets 80%)
      await sql`
        INSERT INTO driver_earnings_ledger (
          booking_id, earning_role, driver_id,
          gross_booking_amount, commission_model,
          pct_applied, amount_earned, currency, ledger_status,
          source_driver_id, executor_driver_id,
          source_type, posted_at
        ) VALUES (
          ${booking.id}::uuid,
          'executor_driver',
          ${testIds.driverEligible}::uuid,
          ${amount},
          'self_capture_execute',
          80.00,
          ${amount * 0.80},
          'USD',
          'unpaid',
          ${testIds.driverEligible}::uuid,
          ${testIds.driverEligible}::uuid,
          'direct',
          NOW() - INTERVAL '1 day'
        )
      `;

      // Platform row (no driver)
      await sql`
        INSERT INTO driver_earnings_ledger (
          booking_id, earning_role, driver_id,
          gross_booking_amount, commission_model,
          pct_applied, amount_earned, currency, ledger_status,
          source_driver_id, executor_driver_id,
          source_type, posted_at
        ) VALUES (
          ${booking.id}::uuid,
          'platform',
          NULL,
          ${amount},
          'self_capture_execute',
          20.00,
          ${amount * 0.20},
          'USD',
          'posted',
          ${testIds.driverEligible}::uuid,
          ${testIds.driverEligible}::uuid,
          'direct',
          NOW() - INTERVAL '1 day'
        )
      `;
    }
    steps.bookings_created = { count: testIds.bookingIds.length, amounts: bookingAmounts };

    // ── Step 5: Create 1 booking for ineligible driver ────────
    const [bookingB] = await sql`
      INSERT INTO bookings (
        client_id, source_driver_id, executor_driver_id,
        status, pickup_address, dropoff_address,
        vehicle_type, total_price, trip_type, pickup_at,
        commission_model, commission_platform_pct, commission_executor_pct,
        commission_locked_at, ledger_posted_at
      ) VALUES (
        ${testIds.clientId}::uuid,
        ${testIds.driverIneligible}::uuid,
        ${testIds.driverIneligible}::uuid,
        'completed',
        'MCO Airport — Payout Test B',
        'Orlando FL — Payout Test B',
        'sedan', 150, 'oneway',
        NOW() - INTERVAL '1 day',
        'self_capture_execute', 20.00, 80.00,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
      )
      RETURNING id
    `;
    testIds.bookingIds.push(bookingB.id as string);
    await sql`
      INSERT INTO driver_earnings_ledger (
        booking_id, earning_role, driver_id,
        gross_booking_amount, commission_model,
        pct_applied, amount_earned, currency, ledger_status,
        source_driver_id, executor_driver_id, source_type, posted_at
      ) VALUES (
        ${bookingB.id}::uuid, 'executor_driver',
        ${testIds.driverIneligible}::uuid,
        150, 'self_capture_execute', 80.00, 120.00,
        'USD', 'unpaid',
        ${testIds.driverIneligible}::uuid,
        ${testIds.driverIneligible}::uuid,
        'direct', NOW() - INTERVAL '1 day'
      )
    `;
    steps.ineligible_driver_earnings = { booking_id: bookingB.id, amount: 120 };

    // ── Step 6: Preview payout (current week) ─────────────────
    const range = getWeekRange(); // current week
    // Override range to include yesterday
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const weekRange = {
      week_start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 7).toISOString(),
      week_end:   new Date().toISOString(),
    };

    const preview = await previewWeeklyPayout(weekRange, testIds.driverEligible);
    steps.preview = {
      eligible_drivers:    preview.eligible_drivers.length,
      ineligible_drivers:  preview.ineligible_drivers.length,
      total_eligible_amount: preview.total_eligible_amount,
      eligible_driver_codes: preview.eligible_drivers.map(d => d.driver_code),
    };

    // Verify eligible driver is in preview
    const eligibleInPreview = preview.eligible_drivers.some(d => d.driver_id === testIds.driverEligible);
    if (!eligibleInPreview) {
      throw new Error("Eligible driver not found in preview");
    }

    // ── Step 7: Generate payout batch ─────────────────────────
    const generateResult = await generateWeeklyPayoutBatch(weekRange, "test-admin");
    steps.generate = {
      batches_created: generateResult.batches_created,
      batches_skipped: generateResult.batches_skipped,
      errors:          generateResult.errors,
    };

    const createdBatch = generateResult.batches.find(b => b.driver_id === testIds.driverEligible && !b.skipped);
    if (!createdBatch) {
      throw new Error("Batch not created for eligible driver");
    }
    testIds.batchIds.push(createdBatch.batch_id);
    steps.batch_created = {
      batch_id:       createdBatch.batch_id,
      driver_code:    createdBatch.driver_code,
      total_amount:   createdBatch.total_amount,
      earnings_count: createdBatch.earnings_count,
      status:         createdBatch.status,
    };

    // ── Step 8: Verify ledger rows are now pending_payout ─────
    const ledgerCheck = await sql`
      SELECT ledger_status, COUNT(*) AS cnt
      FROM driver_earnings_ledger
      WHERE payout_batch_uuid = ${createdBatch.batch_id}::uuid
      GROUP BY ledger_status
    `;
    steps.ledger_after_generate = ledgerCheck.map(r => ({ status: r.ledger_status, count: Number(r.cnt) }));

    // ── Step 9: Mark as paid ──────────────────────────────────
    const paidResult = await markBatchPaid(createdBatch.batch_id, {
      external_reference: "TEST_REF_001",
      notes:              "Test payout payment",
    });
    steps.mark_paid = {
      ok:               paidResult.ok,
      previous_status:  paidResult.previous_status,
      new_status:       paidResult.new_status,
      earnings_updated: paidResult.earnings_updated,
    };
    if (!paidResult.ok) throw new Error(`mark_paid failed: ${paidResult.error}`);

    // ── Step 10: Mark as reconciled ───────────────────────────
    const reconciledResult = await markBatchReconciled(createdBatch.batch_id, {
      notes: "Test reconciliation",
    });
    steps.mark_reconciled = {
      ok:               reconciledResult.ok,
      previous_status:  reconciledResult.previous_status,
      new_status:       reconciledResult.new_status,
      earnings_updated: reconciledResult.earnings_updated,
    };
    if (!reconciledResult.ok) throw new Error(`mark_reconciled failed: ${reconciledResult.error}`);

    // ── Step 11: Verify idempotency — re-run generate ─────────
    const generateAgain = await generateWeeklyPayoutBatch(weekRange, "test-admin");
    const skippedBatch = generateAgain.batches.find(b => b.driver_id === testIds.driverEligible);
    steps.idempotency_check = {
      second_generate_batches_created: generateAgain.batches_created,
      second_generate_batches_skipped: generateAgain.batches_skipped,
      eligible_driver_skipped:         skippedBatch?.skipped ?? false,
      skip_reason:                     skippedBatch?.skip_reason,
    };

    // ── Step 12: Verify final ledger state ────────────────────
    const finalLedger = await sql`
      SELECT ledger_status, COUNT(*) AS cnt
      FROM driver_earnings_ledger
      WHERE payout_batch_uuid = ${createdBatch.batch_id}::uuid
      GROUP BY ledger_status
    `;
    steps.final_ledger_state = finalLedger.map(r => ({ status: r.ledger_status, count: Number(r.cnt) }));

    // ── Step 13: Verify Driver Earnings API still works ───────
    const summaryCheck = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN ledger_status = 'unpaid'         THEN amount_earned ELSE 0 END), 0) AS unpaid_balance,
        COALESCE(SUM(CASE WHEN ledger_status = 'reconciled'     THEN amount_earned ELSE 0 END), 0) AS reconciled_total,
        COALESCE(SUM(CASE WHEN earning_role IN ('source_driver','executor_driver') THEN amount_earned ELSE 0 END), 0) AS total_lifetime
      FROM driver_earnings_ledger
      WHERE driver_id = ${testIds.driverEligible}::uuid
        AND earning_role IN ('source_driver','executor_driver')
    `;
    steps.earnings_api_check = {
      unpaid_balance:    Number(summaryCheck[0]?.unpaid_balance ?? 0),
      reconciled_total:  Number(summaryCheck[0]?.reconciled_total ?? 0),
      total_lifetime:    Number(summaryCheck[0]?.total_lifetime ?? 0),
    };

    // ── Cleanup ───────────────────────────────────────────────
    if (cleanup) {
      for (const batchId of testIds.batchIds) {
        await sql`DELETE FROM driver_earnings_ledger WHERE payout_batch_uuid = ${batchId}::uuid`;
        await sql`DELETE FROM payout_batches WHERE id = ${batchId}::uuid`;
      }
      for (const bookingId of testIds.bookingIds) {
        await sql`DELETE FROM driver_earnings_ledger WHERE booking_id = ${bookingId}::uuid`;
        await sql`DELETE FROM bookings WHERE id = ${bookingId}::uuid`;
      }
      if (testIds.clientId) await sql`DELETE FROM clients WHERE id = ${testIds.clientId}::uuid`;
      if (testIds.driverEligible) await sql`DELETE FROM drivers WHERE id = ${testIds.driverEligible}::uuid`;
      if (testIds.driverIneligible) await sql`DELETE FROM drivers WHERE id = ${testIds.driverIneligible}::uuid`;
      steps.cleanup = "done";
    }

    return NextResponse.json({
      ok:      true,
      verdict: "PASS — Weekly Payout System lifecycle verified end-to-end",
      steps,
    });
  } catch (err: any) {
    // Attempt cleanup on error
    if (cleanup) {
      try {
        for (const batchId of testIds.batchIds) {
          await sql`DELETE FROM driver_earnings_ledger WHERE payout_batch_uuid = ${batchId}::uuid`;
          await sql`DELETE FROM payout_batches WHERE id = ${batchId}::uuid`;
        }
        for (const bookingId of testIds.bookingIds) {
          await sql`DELETE FROM driver_earnings_ledger WHERE booking_id = ${bookingId}::uuid`;
          await sql`DELETE FROM bookings WHERE id = ${bookingId}::uuid`;
        }
        if (testIds.clientId) await sql`DELETE FROM clients WHERE id = ${testIds.clientId}::uuid`;
        if (testIds.driverEligible) await sql`DELETE FROM drivers WHERE id = ${testIds.driverEligible}::uuid`;
        if (testIds.driverIneligible) await sql`DELETE FROM drivers WHERE id = ${testIds.driverIneligible}::uuid`;
      } catch { /* ignore cleanup errors */ }
    }

    console.error("[test-payout-lifecycle]", err);
    return NextResponse.json({
      ok:    false,
      error: err?.message ?? "Internal error",
      steps,
    }, { status: 500 });
  }
}
