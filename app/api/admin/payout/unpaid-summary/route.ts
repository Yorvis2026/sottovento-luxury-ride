// ============================================================
// GET /api/admin/payout/unpaid-summary
//
// Returns unpaid earnings summary per driver for admin visibility.
// Shows: unpaid_amount, pending_payout_amount, last_payout_date, payout_ready
//
// Query params:
//   eligible_only — boolean (default false) — only show payout-ready drivers
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
export const runtime = "edge";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const eligibleOnly = searchParams.get("eligible_only") === "true";

    const rows = await sql`
      SELECT
        d.id                                                        AS driver_id,
        d.driver_code,
        d.full_name                                                 AS driver_name,
        COALESCE(d.payouts_enabled, FALSE)                         AS payouts_enabled,
        COALESCE(d.payout_onboarding_status, 'not_started')        AS payout_onboarding_status,
        COALESCE(d.payout_method, 'not_set')                       AS payout_method,
        d.last_payout_date,
        d.stripe_account_id,
        COALESCE(d.stripe_account_status, 'not_connected')         AS stripe_account_status,
        -- Unpaid earnings (not yet in any batch)
        COALESCE(SUM(CASE WHEN del.ledger_status = 'unpaid'         THEN del.amount_earned ELSE 0 END), 0) AS unpaid_amount,
        COUNT(CASE WHEN del.ledger_status = 'unpaid'                THEN 1 END)                            AS unpaid_count,
        -- Pending payout (in a batch, not yet paid)
        COALESCE(SUM(CASE WHEN del.ledger_status = 'pending_payout' THEN del.amount_earned ELSE 0 END), 0) AS pending_payout_amount,
        COUNT(CASE WHEN del.ledger_status = 'pending_payout'        THEN 1 END)                            AS pending_payout_count,
        -- Total paid lifetime
        COALESCE(SUM(CASE WHEN del.ledger_status IN ('paid','reconciled') THEN del.amount_earned ELSE 0 END), 0) AS total_paid_lifetime
      FROM drivers d
      LEFT JOIN driver_earnings_ledger del
        ON del.driver_id = d.id
        AND del.earning_role IN ('source_driver', 'executor_driver')
      WHERE d.driver_status = 'active'
      GROUP BY
        d.id, d.driver_code, d.full_name,
        d.payouts_enabled, d.payout_onboarding_status, d.payout_method,
        d.last_payout_date, d.stripe_account_id, d.stripe_account_status
      HAVING (
        NOT ${eligibleOnly}
        OR (
          COALESCE(d.payouts_enabled, FALSE) = TRUE
          AND COALESCE(d.payout_onboarding_status, 'not_started') = 'complete'
        )
      )
      ORDER BY unpaid_amount DESC, d.full_name
    `;

    const summary = rows.map((r) => ({
      driver_id:                r.driver_id,
      driver_code:              r.driver_code,
      driver_name:              r.driver_name,
      payouts_enabled:          Boolean(r.payouts_enabled),
      payout_onboarding_status: r.payout_onboarding_status,
      payout_method:            r.payout_method,
      payout_ready:             Boolean(r.payouts_enabled) && r.payout_onboarding_status === "complete",
      last_payout_date:         r.last_payout_date,
      stripe_account_id:        r.stripe_account_id,
      stripe_account_status:    r.stripe_account_status,
      unpaid_amount:            Number(r.unpaid_amount),
      unpaid_count:             Number(r.unpaid_count),
      pending_payout_amount:    Number(r.pending_payout_amount),
      pending_payout_count:     Number(r.pending_payout_count),
      total_paid_lifetime:      Number(r.total_paid_lifetime),
    }));

    const totals = {
      total_unpaid_amount:         summary.reduce((s, d) => s + d.unpaid_amount, 0),
      total_pending_payout_amount: summary.reduce((s, d) => s + d.pending_payout_amount, 0),
      drivers_with_unpaid:         summary.filter(d => d.unpaid_amount > 0).length,
      drivers_payout_ready:        summary.filter(d => d.payout_ready).length,
    };

    return NextResponse.json({ totals, drivers: summary });
  } catch (err: any) {
    console.error("[payout/unpaid-summary]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
