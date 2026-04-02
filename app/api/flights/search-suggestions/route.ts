/**
 * BM9 — Flight Suggestion Engine
 * GET /api/flights/search-suggestions
 *
 * Provides real-time flight suggestions as the user types in the booking form.
 * Provider chain: FlightAware AeroAPI → aviationstack → empty (never sandbox)
 * Prioritization: MCO first, then SFB/MIA/FLL/TPA, then global results.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Florida airports for priority sorting
const PRIORITY_1_AIRPORTS = ["MCO"];
const PRIORITY_2_AIRPORTS = ["SFB", "MIA", "FLL", "TPA", "PIE", "MLB"];

interface FlightSuggestion {
  flight_display: string;
  airline_name: string;
  airline_code: string;
  flight_number: string;
  origin_airport: string;
  destination_airport: string;
  scheduled_arrival_at: string | null;
  estimated_arrival_at: string | null;
  terminal_code: string | null;
  status: string;
  provider: string;
  priority_score: number;
}

// Airline IATA code → name mapping (common carriers)
const AIRLINE_NAMES: Record<string, string> = {
  AA: "American Airlines",
  DL: "Delta Air Lines",
  UA: "United Airlines",
  WN: "Southwest Airlines",
  B6: "JetBlue Airways",
  F9: "Frontier Airlines",
  NK: "Spirit Airlines",
  G4: "Allegiant Air",
  AS: "Alaska Airlines",
  HA: "Hawaiian Airlines",
  BA: "British Airways",
  LH: "Lufthansa",
  AF: "Air France",
  KL: "KLM",
  IB: "Iberia",
  AZ: "ITA Airways",
  EK: "Emirates",
  QR: "Qatar Airways",
  TK: "Turkish Airlines",
  AC: "Air Canada",
  WS: "WestJet",
  CM: "Copa Airlines",
  AM: "Aeromexico",
  LA: "LATAM Airlines",
  G3: "GOL Linhas Aéreas",
  AD: "Azul Brazilian Airlines",
  VB: "VivaAerobus",
  Y4: "Volaris",
};

function getAirlineName(code: string): string {
  return AIRLINE_NAMES[code.toUpperCase()] ?? `${code.toUpperCase()} Airlines`;
}

function getPriorityScore(destinationAirport: string, airportBias: string): number {
  const dest = (destinationAirport ?? "").toUpperCase();
  const bias = (airportBias ?? "MCO").toUpperCase();
  if (dest === bias) return 100;
  if (PRIORITY_1_AIRPORTS.includes(dest)) return 90;
  if (PRIORITY_2_AIRPORTS.includes(dest)) return 70;
  return 30;
}

// ── FlightAware AeroAPI Search ───────────────────────────────
async function searchFlightAware(
  query: string,
  airportBias: string,
  date: string,
  limit: number
): Promise<FlightSuggestion[] | null> {
  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) return null;

  try {
    const cleanQuery = query.replace(/\s/g, "").toUpperCase();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // FlightAware AeroAPI v4 — search flights by flight ID prefix
    // Use the /flights/{id} endpoint with a partial match approach
    // For prefix search, we use the scheduled flights endpoint with airline filter
    const url = `https://aeroapi.flightaware.com/aeroapi/flights/search?query=-destination ${airportBias} -ident ${cleanQuery}*&max_pages=1`;

    const res = await fetch(url, {
      headers: {
        "x-apikey": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Try alternate endpoint: search by ident only (global)
      const url2 = `https://aeroapi.flightaware.com/aeroapi/flights/search?query=-ident ${cleanQuery}*&max_pages=1`;
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 8000);
      const res2 = await fetch(url2, {
        headers: { "x-apikey": apiKey, "Accept": "application/json" },
        signal: controller2.signal,
      });
      clearTimeout(timeout2);
      if (!res2.ok) return null;
      const data2 = await res2.json();
      return parseFlightAwareResults(data2.flights ?? [], airportBias, limit);
    }

    const data = await res.json();
    return parseFlightAwareResults(data.flights ?? [], airportBias, limit);
  } catch (err: any) {
    console.warn("[BM9] FlightAware search error:", err?.message);
    return null;
  }
}

function parseFlightAwareResults(
  flights: any[],
  airportBias: string,
  limit: number
): FlightSuggestion[] {
  const results: FlightSuggestion[] = flights.slice(0, limit * 3).map((f) => {
    const ident = f.ident ?? f.fa_flight_id ?? "";
    const airlineCode = ident.replace(/[0-9]/g, "").substring(0, 2).toUpperCase();
    const flightNum = ident.replace(/[^0-9]/g, "");
    const destAirport = f.destination?.code_iata ?? f.destination?.code ?? "";
    const scheduledArrival = f.scheduled_in ?? f.scheduled_on ?? null;
    const estimatedArrival = f.estimated_in ?? f.estimated_on ?? scheduledArrival;
    const faStatus = (f.status ?? "scheduled").toLowerCase();
    let status = "scheduled";
    if (faStatus.includes("cancel")) status = "cancelled";
    else if (faStatus.includes("divert")) status = "diverted";
    else if (faStatus.includes("arrived") || faStatus.includes("gate")) status = "landed";
    else if (faStatus.includes("active") || faStatus.includes("enroute")) status = "in_air";

    return {
      flight_display: `${airlineCode} ${flightNum}`,
      airline_name: getAirlineName(airlineCode),
      airline_code: airlineCode,
      flight_number: flightNum,
      origin_airport: f.origin?.code_iata ?? f.origin?.code ?? "",
      destination_airport: destAirport,
      scheduled_arrival_at: scheduledArrival,
      estimated_arrival_at: estimatedArrival,
      terminal_code: f.terminal_destination ?? null,
      status,
      provider: "flightaware",
      priority_score: getPriorityScore(destAirport, airportBias),
    };
  });

  // Sort by priority score descending
  results.sort((a, b) => b.priority_score - a.priority_score);
  return results.slice(0, limit);
}

// ── aviationstack Search ─────────────────────────────────────
async function searchAviationstack(
  query: string,
  airportBias: string,
  date: string,
  limit: number
): Promise<FlightSuggestion[] | null> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) return null;

  try {
    const cleanQuery = query.replace(/\s/g, "").toUpperCase();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    // Try MCO-biased search first
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(cleanQuery)}&arr_iata=${airportBias}&limit=${limit}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    let flights = data.data ?? [];

    // If no MCO results, try global search
    if (!flights.length) {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 8000);
      const url2 = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(cleanQuery)}&limit=${limit * 2}`;
      const res2 = await fetch(url2, { signal: controller2.signal });
      clearTimeout(timeout2);
      if (!res2.ok) return null;
      const data2 = await res2.json();
      flights = data2.data ?? [];
    }

    if (!flights.length) return [];

    const results: FlightSuggestion[] = flights.map((f: any) => {
      const arr = f.arrival ?? {};
      const dep = f.departure ?? {};
      const destAirport = arr.iata ?? "";
      const asStatus = (f.flight_status ?? "scheduled").toLowerCase();

      return {
        flight_display: `${f.airline?.iata ?? ""} ${f.flight?.number ?? ""}`.trim(),
        airline_name: f.airline?.name ?? getAirlineName(f.airline?.iata ?? ""),
        airline_code: f.airline?.iata ?? "",
        flight_number: f.flight?.number ?? "",
        origin_airport: dep.iata ?? "",
        destination_airport: destAirport,
        scheduled_arrival_at: arr.scheduled ?? null,
        estimated_arrival_at: arr.estimated ?? arr.scheduled ?? null,
        terminal_code: arr.terminal ?? null,
        status: asStatus === "active" ? "in_air" : asStatus,
        provider: "aviationstack",
        priority_score: getPriorityScore(destAirport, airportBias),
      };
    });

    results.sort((a, b) => b.priority_score - a.priority_score);
    return results.slice(0, limit);
  } catch (err: any) {
    console.warn("[BM9] aviationstack search error:", err?.message);
    return null;
  }
}

// ── Main Handler ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("query") ?? "").trim();
  const airportBias = (searchParams.get("airport_bias") ?? "MCO").toUpperCase();
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 20);

  // Minimum query length: 2 characters
  if (query.length < 2) {
    return NextResponse.json({ results: [], provider: "none", message: "Query too short" });
  }

  // Try FlightAware first (primary)
  const faResults = await searchFlightAware(query, airportBias, date, limit);
  if (faResults !== null && faResults.length > 0) {
    return NextResponse.json({
      results: faResults,
      provider: "flightaware",
      airport_bias: airportBias,
      query,
    });
  }

  // Try aviationstack (secondary)
  const asResults = await searchAviationstack(query, airportBias, date, limit);
  if (asResults !== null && asResults.length > 0) {
    return NextResponse.json({
      results: asResults,
      provider: "aviationstack",
      airport_bias: airportBias,
      query,
    });
  }

  // Both providers failed or returned empty — return empty (never sandbox)
  const providerStatus =
    faResults === null && asResults === null
      ? "providers_unavailable"
      : "no_results";

  return NextResponse.json({
    results: [],
    provider: "none",
    provider_status: providerStatus,
    airport_bias: airportBias,
    query,
    message:
      providerStatus === "providers_unavailable"
        ? "Flight data providers are temporarily unavailable. You may enter your flight number manually."
        : "No matching flights found. You may continue entering your flight manually.",
  });
}
