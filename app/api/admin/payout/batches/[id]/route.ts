// ============================================================
// PATCH /api/admin/payout/batches/[id]
//
// Transition a payout batch to the next status.
//
// Body (JSON):
//   action              — "mark_paid" | "mark_reconciled" | "cancel"
//   external_reference  — string (optional, for mark_paid)
//   notes               — string (optional)
//   admin_id            — string (optional)
//
// GET /api/admin/payout/batches/[id]
//   Returns batch details with linked ledger rows.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  markBatchPaid,
  markBatchReconciled,
  cancelBatch,
} from "@/lib/payout/weekly-payout";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
export const runtime = "edge";

// ── GET — batch detail ────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = params.id;

  try {
    const [batch] = await sql`
      SELECT
        pb.id,
        pb.driver_id,
        d.driver_code,
        d.full_name AS driver_name,
        d.payout_method,
        d.payout_onboarding_status,
        d.payouts_enabled,
        d.stripe_account_id,
        d.stripe_account_status,
        pb.week_start,
        pb.week_end,
        pb.total_amount,
        pb.earnings_count,
        pb.currency,
        pb.status,
        pb.payment_method,
        pb.external_reference,
        pb.notes,
        pb.created_by_admin_id,
        pb.executed_at,
        pb.reconciled_at,
        pb.cancelled_at,
        pb.created_at,
        pb.updated_at
      FROM payout_batches pb
      JOIN drivers d ON d.id = pb.driver_id
      WHERE pb.id = ${batchId}::uuid
      LIMIT 1
    `;

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Load linked ledger rows
    const earnings = await sql`
      SELECT
        id,
        booking_id,
        earning_role,
        amount_earned,
        pct_applied,
        commission_model,
        ledger_status,
        posted_at,
        paid_out_at
      FROM driver_earnings_ledger
      WHERE payout_batch_uuid = ${batchId}::uuid
      ORDER BY posted_at ASC
    `;

    return NextResponse.json({ batch, earnings });
  } catch (err: any) {
    console.error("[payout/batches/get]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}

// ── PATCH — transition batch status ──────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = params.id;

  try {
    const body = await req.json().catch(() => ({}));
    const { action, external_reference, notes, admin_id } = body as {
      action:              string;
      external_reference?: string;
      notes?:              string;
      admin_id?:           string;
    };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    let result;
    switch (action) {
      case "mark_paid":
        result = await markBatchPaid(batchId, { external_reference, notes, adminId: admin_id });
        break;
      case "mark_reconciled":
        result = await markBatchReconciled(batchId, { notes, adminId: admin_id });
        break;
      case "cancel":
        result = await cancelBatch(batchId, { notes });
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action '${action}'. Valid: mark_paid | mark_reconciled | cancel` },
          { status: 400 }
        );
    }

    if (!result.ok) {
      return NextResponse.json({ error: result.error, ...result }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[payout/batches/patch]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
