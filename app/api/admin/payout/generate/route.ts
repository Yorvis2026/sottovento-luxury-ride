// ============================================================
// POST /api/admin/payout/generate
//
// Generate weekly payout batches for all eligible drivers.
// IDEMPOTENT: skips drivers that already have a batch for the week.
//
// Body (JSON):
//   week_start   — ISO date string (optional, defaults to previous week)
//   week_end     — ISO date string (optional)
//   admin_id     — string (optional, for audit trail)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import {
  generateWeeklyPayoutBatch,
  getPreviousWeekRange,
  type WeekRange,
} from "@/lib/payout/weekly-payout";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { week_start, week_end, admin_id } = body as {
      week_start?: string;
      week_end?:   string;
      admin_id?:   string;
    };

    let range: WeekRange;
    if (week_start && week_end) {
      range = { week_start, week_end };
    } else {
      range = getPreviousWeekRange();
    }

    const result = await generateWeeklyPayoutBatch(range, admin_id);
    return NextResponse.json({
      ...result,
      week_start: range.week_start,
      week_end:   range.week_end,
    });
  } catch (err: any) {
    console.error("[payout/generate]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
