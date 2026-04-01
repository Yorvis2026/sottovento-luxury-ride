export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// GET /api/admin/airport-load?airport_code=MCO
// BM8 Annex: Airport Load Awareness Widget
//
// Returns summarized airport load context for a given airport:
//   - arrivals_next_30m, arrivals_next_60m, arrivals_next_120m
//   - delayed_flights_count, cancelled_flights_count, diverted_flights_count
//   - airport_load_level: low | moderate | high | peak
//   - terminal_congestion_hint
//   - delay_pressure_index
//
// Calculation strategy:
//   - Uses bookings in the DB with scheduled/estimated arrival times
//     in the relevant windows to estimate load from real data.
//   - If no real data available, uses sandbox simulation based on
//     time-of-day patterns (MCO peak hours: 7-9am, 12-2pm, 5-8pm).
//   - Designed to be operationally useful and stable, not military-precise.
// ============================================================

// ── Load level thresholds ────────────────────────────────────
// Based on arrivals_next_60m count (from DB or simulation)
function computeLoadLevel(arrivals60m: number, delayedCount: number): "low" | "moderate" | "high" | "peak" {
  const delayPressure = delayedCount > 5 ? 1 : delayedCount > 2 ? 0.5 : 0;
  const effective = arrivals60m + delayPressure * 5;
  if (effective >= 25) return "peak";
  if (effective >= 15) return "high";
  if (effective >= 7) return "moderate";
  return "low";
}

// ── Delay Pressure Index (0-100) ────────────────────────────
function computeDelayPressureIndex(arrivals60m: number, delayed: number, cancelled: number): number {
  if (arrivals60m === 0) return 0;
  const delayRatio = delayed / Math.max(arrivals60m, 1);
  const cancelRatio = cancelled / Math.max(arrivals60m, 1);
  const raw = Math.min(100, Math.round((delayRatio * 60 + cancelRatio * 40) * 100));
  return raw;
}

// ── Terminal congestion hint ─────────────────────────────────
function computeTerminalHint(loadLevel: string, terminalBreakdown: Record<string, number>): string | null {
  if (loadLevel === "low") return null;
  const entries = Object.entries(terminalBreakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const [topTerminal, topCount] = entries[0];
  if (topCount === 0) return null;
  if (loadLevel === "peak") return `Terminal ${topTerminal} — highest congestion (${topCount} arrivals)`;
  if (loadLevel === "high") return `Terminal ${topTerminal} — elevated activity`;
  return null;
}

// ── Sandbox simulation (time-of-day pattern) ────────────────
// Used when no real flight data is available in the DB.
// MCO typical patterns: peaks at 7-9am, 12-2pm, 5-8pm
function sandboxSimulate(airportCode: string): {
  arrivals_next_30m: number;
  arrivals_next_60m: number;
  arrivals_next_120m: number;
  delayed_flights_count: number;
  cancelled_flights_count: number;
  diverted_flights_count: number;
  terminal_breakdown: Record<string, number>;
  source: string;
} {
  const hour = new Date().getHours();
  // Peak hours
  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 17 && hour <= 20);
  const isHigh = (hour >= 10 && hour <= 11) || (hour >= 15 && hour <= 16) || (hour >= 21 && hour <= 22);
  const isLow = hour >= 23 || hour <= 5;

  let base30 = 4, base60 = 9, base120 = 18;
  if (isPeak) { base30 = 12; base60 = 26; base120 = 48; }
  else if (isHigh) { base30 = 8; base60 = 17; base120 = 33; }
  else if (isLow) { base30 = 1; base60 = 3; base120 = 6; }

  // MCO-specific: Terminal B and C are busiest
  const terminals: Record<string, number> = airportCode === "MCO"
    ? { "A": Math.round(base60 * 0.2), "B": Math.round(base60 * 0.4), "C": Math.round(base60 * 0.3), "D": Math.round(base60 * 0.1) }
    : { "Main": base60 };

  return {
    arrivals_next_30m: base30,
    arrivals_next_60m: base60,
    arrivals_next_120m: base120,
    delayed_flights_count: isPeak ? 4 : isHigh ? 2 : 1,
    cancelled_flights_count: isPeak ? 2 : 0,
    diverted_flights_count: 0,
    terminal_breakdown: terminals,
    source: "sandbox_simulation",
  };
}

export async function GET(req: NextRequest) {
  // Allow both admin panel (x-admin-key) and driver panel (no key, public summary)
  const airportCode = req.nextUrl.searchParams.get("airport_code") ?? "MCO";
  const isAdmin = req.headers.get("x-admin-key") === "sln-admin-2024";

  try {
    const now = new Date();
    const in30m = new Date(now.getTime() + 30 * 60 * 1000);
    const in60m = new Date(now.getTime() + 60 * 60 * 1000);
    const in120m = new Date(now.getTime() + 120 * 60 * 1000);

    // ── Query real bookings data ─────────────────────────────
    const rows = await sql`
      SELECT
        airport_code,
        terminal_code,
        airport_intelligence_status,
        scheduled_arrival_at,
        estimated_arrival_at,
        actual_arrival_at,
        flight_delay_minutes
      FROM bookings
      WHERE status NOT IN ('completed', 'cancelled', 'archived')
        AND (
          LOWER(airport_code) = LOWER(${airportCode})
          OR LOWER(pickup_address) LIKE ${`%${airportCode.toLowerCase()}%`}
          OR LOWER(pickup_address) LIKE '%airport%'
        )
        AND (
          scheduled_arrival_at IS NOT NULL
          OR estimated_arrival_at IS NOT NULL
        )
    `;

    let arrivals30 = 0, arrivals60 = 0, arrivals120 = 0;
    let delayedCount = 0, cancelledCount = 0, divertedCount = 0;
    const terminalBreakdown: Record<string, number> = {};

    for (const row of rows) {
      const arrivalTime = row.actual_arrival_at
        ? new Date(row.actual_arrival_at)
        : row.estimated_arrival_at
        ? new Date(row.estimated_arrival_at)
        : row.scheduled_arrival_at
        ? new Date(row.scheduled_arrival_at)
        : null;

      if (arrivalTime) {
        if (arrivalTime <= in30m && arrivalTime >= now) arrivals30++;
        if (arrivalTime <= in60m && arrivalTime >= now) arrivals60++;
        if (arrivalTime <= in120m && arrivalTime >= now) arrivals120++;

        // Terminal breakdown
        const terminal = row.terminal_code ?? "Unknown";
        if (arrivalTime <= in60m && arrivalTime >= now) {
          terminalBreakdown[terminal] = (terminalBreakdown[terminal] ?? 0) + 1;
        }
      }

      const status = row.airport_intelligence_status ?? "";
      if (status === "delayed" || (row.flight_delay_minutes && row.flight_delay_minutes > 0)) delayedCount++;
      if (status === "cancelled") cancelledCount++;
      if (status === "diverted") divertedCount++;
    }

    // ── Fallback to sandbox if no real data ─────────────────
    let source = "live_db";
    if (arrivals60 === 0 && rows.length === 0) {
      const sim = sandboxSimulate(airportCode);
      arrivals30 = sim.arrivals_next_30m;
      arrivals60 = sim.arrivals_next_60m;
      arrivals120 = sim.arrivals_next_120m;
      delayedCount = sim.delayed_flights_count;
      cancelledCount = sim.cancelled_flights_count;
      divertedCount = sim.diverted_flights_count;
      Object.assign(terminalBreakdown, sim.terminal_breakdown);
      source = sim.source;
    }

    const loadLevel = computeLoadLevel(arrivals60, delayedCount);
    const delayPressureIndex = computeDelayPressureIndex(arrivals60, delayedCount, cancelledCount);
    const terminalCongestionHint = computeTerminalHint(loadLevel, terminalBreakdown);

    // ── Driver summary (compact) ─────────────────────────────
    const driverSummary = {
      airport_code: airportCode,
      arrivals_next_60m: arrivals60,
      arrivals_next_120m: arrivals120,
      airport_load_level: loadLevel,
      terminal_congestion_hint: terminalCongestionHint,
      delay_pressure_index: delayPressureIndex,
      source,
    };

    if (!isAdmin) {
      return NextResponse.json(driverSummary);
    }

    // ── Admin detail (full breakdown) ────────────────────────
    return NextResponse.json({
      ...driverSummary,
      arrivals_next_30m: arrivals30,
      arrivals_next_120m: arrivals120,
      delayed_flights_count: delayedCount,
      cancelled_flights_count: cancelledCount,
      diverted_flights_count: divertedCount,
      terminal_load_summary: terminalBreakdown,
      bookings_tracked: rows.length,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
