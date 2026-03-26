// ============================================================
// GET /api/admin/payout/preview
//
// Preview the weekly payout — DRY RUN, no DB writes.
//
// Query params:
//   week_start  — ISO date (optional, defaults to previous week Monday)
//   week_end    — ISO date (optional, defaults to previous week Sunday)
//   driver_id   — UUID (optional, filter to one driver)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import {
  previewWeeklyPayout,
  getPreviousWeekRange,
  type WeekRange,
} from "@/lib/payout/weekly-payout";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("x-admin-key");
  if (auth !== "SLN_ADMIN_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get("week_start");
    const weekEndParam   = searchParams.get("week_end");
    const driverIdParam  = searchParams.get("driver_id") ?? undefined;

    let range: WeekRange;
    if (weekStartParam && weekEndParam) {
      range = { week_start: weekStartParam, week_end: weekEndParam };
    } else {
      range = getPreviousWeekRange();
    }

    const preview = await previewWeeklyPayout(range, driverIdParam);
    return NextResponse.json(preview);
  } catch (err: any) {
    console.error("[payout/preview]", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
