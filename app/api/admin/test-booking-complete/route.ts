export const dynamic = "force-dynamic"
// ============================================================
// POST /api/admin/test-booking-complete
//
// SLN Financial Close — End-to-End Test Endpoint
//
// PURPOSE:
//   1. Create a test booking with a real driver (YHV001 or passed driver_code)
//   2. Set it to 'completed'
//   3. Trigger lockCommission + postBookingLedger
//   4. Return full verification of ledger rows, commission lock, and
//      Driver Earnings API response
//
// CLEANUP:
//   Pass { cleanup: true } to delete the test booking + ledger rows after test.
//
// AUTH:
//   Requires header: x-admin-key: SLN_ADMIN_2026
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { lockCommission } from "@/lib/dispatch/commission-engine";
import { postBookingLedger } from "@/lib/dispatch/ledger";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const driverCode: string = body.driver_code ?? "YHV001";
  const cleanup: boolean = body.cleanup === true;
  const totalPrice: number = Number(body.total_price ?? 250);

  const steps: Record<string, unknown> = {};
  let testBookingId: string | null = null;

  try {
    // ── Step 1: Resolve driver ────────────────────────────────
    const [driver] = await sql`
      SELECT id, driver_code, full_name
      FROM drivers
      WHERE driver_code = ${driverCode.toUpperCase()}
      LIMIT 1
    `;
    if (!driver) {
      return NextResponse.json({ error: `Driver not found: ${driverCode}` }, { status: 404 });
    }
    steps.driver = { id: driver.id, code: driver.driver_code, name: driver.full_name };

    // ── Step 2: Create test client ────────────────────────────
    const [client] = await sql`
      INSERT INTO clients (full_name, phone, source_driver_id, source_type)
      VALUES ('Test Client SLN', '+1-000-000-0000', ${driver.id}::uuid, 'direct')
      RETURNING id, full_name
    `;
    steps.client = { id: client.id, name: client.full_name };

    // ── Step 3: Create test booking (in_progress → will be completed) ──
    const [booking] = await sql`
      INSERT INTO bookings (
        client_id,
        source_driver_id,
        executor_driver_id,
        assigned_driver_id,
        source_type,
        pickup_address,
        dropoff_address,
        pickup_at,
        vehicle_type,
        service_type,
        trip_type,
        total_price,
        currency,
        status,
        payment_status
      ) VALUES (
        ${client.id}::uuid,
        ${driver.id}::uuid,
        ${driver.id}::uuid,
        ${driver.id}::uuid,
        'direct',
        'MCO Airport — Test',
        'Oviedo FL — Test',
        NOW() - INTERVAL '2 hours',
        'SUV',
        'transfer',
        'oneway',
        ${totalPrice},
        'USD',
        'in_progress',
        'paid'
      )
      RETURNING id, status, total_price, source_driver_id, executor_driver_id
    `;
    testBookingId = booking.id;
    steps.booking_created = {
      id: booking.id,
      status: booking.status,
      total_price: Number(booking.total_price),
      source_driver_id: booking.source_driver_id,
      executor_driver_id: booking.executor_driver_id,
    };

    // ── Step 4: Mark booking as completed ────────────────────
    await sql`
      UPDATE bookings
      SET status = 'completed', updated_at = NOW()
      WHERE id = ${testBookingId}::uuid
    `;
    steps.booking_completed = "ok";

    // ── Step 5: Lock commission (idempotent) ──────────────────
    const lockResult = await lockCommission({
      booking_id: testBookingId!,
      total_price: totalPrice,
      source_driver_id: driver.id,
      executor_driver_id: driver.id,
    });
    steps.commission_locked = lockResult;

    // ── Step 6: Post ledger (idempotent) ──────────────────────
    const ledgerResult = await postBookingLedger(testBookingId!);
    steps.ledger_posted = ledgerResult;

    // ── Step 7: Verify commission_locked_at on booking ────────
    const [verifyBooking] = await sql`
      SELECT
        id, status, commission_locked_at, ledger_posted_at,
        commission_model, commission_platform_pct,
        commission_source_pct, commission_executor_pct
      FROM bookings
      WHERE id = ${testBookingId}::uuid
    `;
    steps.booking_verified = {
      status: verifyBooking.status,
      commission_locked_at: verifyBooking.commission_locked_at,
      ledger_posted_at: verifyBooking.ledger_posted_at,
      commission_model: verifyBooking.commission_model,
      platform_pct: verifyBooking.commission_platform_pct,
      source_pct: verifyBooking.commission_source_pct,
      executor_pct: verifyBooking.commission_executor_pct,
    };

    // ── Step 8: Verify ledger rows ────────────────────────────
    const ledgerRows = await sql`
      SELECT earning_role, driver_id, amount_earned, pct_applied, ledger_status
      FROM driver_earnings_ledger
      WHERE booking_id = ${testBookingId}::uuid
      ORDER BY earning_role
    `;
    steps.ledger_rows = ledgerRows.map(r => ({
      earning_role: r.earning_role,
      driver_id: r.driver_id,
      amount_earned: Number(r.amount_earned),
      pct_applied: Number(r.pct_applied),
      ledger_status: r.ledger_status,
    }));

    // ── Step 9: Verify Driver Earnings API reflects balance ───
    const [summaryRow] = await sql`
      SELECT
        COALESCE(SUM(amount_earned) FILTER (WHERE ledger_status = 'posted'), 0) AS unpaid_balance,
        COALESCE(SUM(amount_earned), 0) AS total_lifetime_earnings
      FROM driver_earnings_ledger
      WHERE driver_id = ${driver.id}::uuid
        AND earning_role IN ('source_driver', 'executor_driver')
    `;
    steps.driver_summary_after = {
      unpaid_balance: Number(summaryRow.unpaid_balance),
      total_lifetime_earnings: Number(summaryRow.total_lifetime_earnings),
      currency: "USD",
    };

    // ── Step 10: Optional cleanup ─────────────────────────────
    if (cleanup) {
      await sql`DELETE FROM driver_earnings_ledger WHERE booking_id = ${testBookingId}::uuid`;
      await sql`DELETE FROM commissions WHERE booking_id = ${testBookingId}::uuid`;
      await sql`DELETE FROM bookings WHERE id = ${testBookingId}::uuid`;
      await sql`DELETE FROM clients WHERE id = ${client.id}::uuid`;
      steps.cleanup = "done — test data removed";
    }

    // ── Result ────────────────────────────────────────────────
    const success =
      verifyBooking.commission_locked_at !== null &&
      verifyBooking.ledger_posted_at !== null &&
      ledgerRows.length > 0;

    return NextResponse.json({
      ok: success,
      test_booking_id: cleanup ? null : testBookingId,
      driver_code: driverCode,
      total_price: totalPrice,
      steps,
      verdict: success
        ? "PASS — commission locked, ledger posted, balance visible"
        : "FAIL — check steps for details",
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Best-effort cleanup on error
    if (testBookingId) {
      try {
        await sql`DELETE FROM driver_earnings_ledger WHERE booking_id = ${testBookingId}::uuid`;
        await sql`DELETE FROM commissions WHERE booking_id = ${testBookingId}::uuid`;
        await sql`DELETE FROM bookings WHERE id = ${testBookingId}::uuid`;
      } catch { /* ignore */ }
    }
    return NextResponse.json({ ok: false, error: msg, steps }, { status: 500 });
  }
}
