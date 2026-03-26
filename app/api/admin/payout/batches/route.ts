// ============================================================
// GET /api/admin/payout/batches
//
// List payout batches (all drivers or filtered).
//
// Query params:
//   driver_id  — UUID (optional)
//   status     — draft | pending_payout | paid | reconciled | cancelled (optional)
//   limit      — number (default 50)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getPayoutBatchHistory } from "@/lib/payout/weekly-payout";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driver_id") ?? undefined;
    const status   = searchParams.get("status")    ?? undefined;
    const limit    = parseInt(searchParams.get("limit") ?? "50", 10);

    const batches = await getPayoutBatchHistory({ driverId, status, limit });

    return NextResponse.json({
      count: batches.length,
      batches,
    });
  } catch (err: any) {
    console.error("[payout/batches/list]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
