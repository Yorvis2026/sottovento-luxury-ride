// ============================================================
// BM8: Flight Intelligence Engine — LIVE-FIRST
// Sottovento Luxury Network
//
// Mode: LIVE-FIRST
//   live_primary   → FlightAware AeroAPI
//   live_secondary → aviationstack (fallback)
//   fallback_sandbox → simulation (contingency/testing only)
//
// CRITICAL RULE: Never invalidate a booking due to flight
// validation failure. Always maintain booking continuity.
// ============================================================

// ── Operation Mode ───────────────────────────────────────────
export type AirportIntelligenceMode =
  | "live_primary"
  | "live_secondary"
  | "fallback_sandbox";

// Default: live_primary (production)
export const AIRPORT_INTELLIGENCE_MODE: AirportIntelligenceMode =
  (process.env.AIRPORT_INTELLIGENCE_MODE as AirportIntelligenceMode) ?? "live_primary";

// ── Type Definitions ─────────────────────────────────────────
export type FlightStatus =
  | "on_time"
  | "delayed"
  | "landed"
  | "at_gate"
  | "cancelled"
  | "diverted"
  | "unknown"
  | "not_found";

export type FlightValidationStatus =
  | "verified"
  | "invalid_format"
  | "not_found"
  | "provider_unavailable"
  | "pending_customer_update"
  | "manually_reviewed";

export type AirportIntelligenceStatus =
  | "not_tracked"
  | "scheduled"
  | "delayed"
  | "landed"
  | "at_gate"
  | "baggage_phase"
  | "ready_for_pickup"
  | "cancelled"
  | "diverted"
  | "unknown";

export type AirportPhase =
  | "pre_arrival"
  | "inbound"
  | "landed"
  | "taxiing"
  | "at_gate"
  | "baggage_claim"
  | "passenger_ready"
  | "pickup_window_active"
  | "pickup_completed"
  | "flight_irregularity"
  | "validation_pending";

// Sandbox scenarios (contingency/testing only)
export type SandboxScenario =
  | "on_time"
  | "delayed_30"
  | "delayed_60"
  | "landed"
  | "cancelled"
  | "diverted"
  | "not_found";

export interface FlightLookupInput {
  flight_number: string;
  airline_code?: string | null;
  flight_date?: string | null;   // ISO date YYYY-MM-DD
  airport_code?: string | null;
  sandbox_scenario?: SandboxScenario | null;
  force_mode?: AirportIntelligenceMode | null;
}

export interface FlightLookupResult {
  flight_number: string;
  airline_code: string | null;
  airport_code: string | null;
  terminal_code: string | null;
  gate_info: string | null;
  baggage_claim_zone: string | null;
  flight_status: FlightStatus;
  airport_intelligence_status: AirportIntelligenceStatus;
  airport_phase: AirportPhase;
  flight_validation_status: FlightValidationStatus;
  flight_validation_message: string | null;
  manual_flight_review_required: boolean;
  scheduled_arrival_at: string | null;
  estimated_arrival_at: string | null;
  actual_arrival_at: string | null;
  delay_minutes: number;
  is_irregular: boolean;
  source: "live_primary" | "live_secondary" | "sandbox";
  flight_provider_used: string;
  lookup_at: string;
  raw_data?: Record<string, unknown>;
}

// ── Airport Phase Mapping ────────────────────────────────────
function resolvePhaseFromStatus(
  status: FlightStatus,
  delayMinutes: number,
  minutesToScheduledArrival: number,
  validationStatus: FlightValidationStatus
): AirportPhase {
  if (validationStatus === "provider_unavailable" || validationStatus === "pending_customer_update") {
    return "validation_pending";
  }
  if (status === "cancelled" || status === "diverted") return "flight_irregularity";
  if (status === "not_found" || status === "unknown") return "validation_pending";
  if (status === "landed") return "baggage_claim";
  if (status === "at_gate") return "at_gate";
  if (minutesToScheduledArrival <= 90 && minutesToScheduledArrival > 0) return "inbound";
  return "pre_arrival";
}

function resolveIntelligenceStatus(
  status: FlightStatus,
  delayMinutes: number,
  validationStatus: FlightValidationStatus
): AirportIntelligenceStatus {
  if (validationStatus === "provider_unavailable") return "unknown";
  if (validationStatus === "not_found" || validationStatus === "invalid_format") return "unknown";
  if (status === "cancelled") return "cancelled";
  if (status === "diverted") return "diverted";
  if (status === "landed") return "landed";
  if (status === "at_gate") return "at_gate";
  if (status === "delayed" || delayMinutes > 0) return "delayed";
  if (status === "on_time") return "scheduled";
  return "unknown";
}

// ── Flight Number Format Validation ─────────────────────────
export function validateFlightNumberFormat(flightNumber: string): boolean {
  // Standard IATA format: 2-letter airline code + 1-4 digits (e.g., AA123, UA4567)
  // Also accept 3-letter ICAO codes
  const pattern = /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/i;
  return pattern.test(flightNumber.replace(/\s/g, ""));
}

// ── FlightAware AeroAPI Provider (Primary) ───────────────────
async function lookupFlightAware(
  input: FlightLookupInput
): Promise<FlightLookupResult | null> {
  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) return null;

  try {
    const flightId = input.flight_number.replace(/\s/g, "").toUpperCase();
    const dateParam = input.flight_date ?? new Date().toISOString().split("T")[0];

    // FlightAware AeroAPI v4 endpoint
    const url = `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(flightId)}?start=${dateParam}&end=${dateParam}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(url, {
      headers: {
        "x-apikey": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 404) {
        // Flight not found — not a provider error, flight genuinely not found
        return buildNotFoundResult(input, "live_primary", "FlightAware AeroAPI");
      }
      return null; // Other errors → try secondary
    }

    const data = await res.json();
    const flights = data.flights ?? [];
    if (!flights.length) {
      return buildNotFoundResult(input, "live_primary", "FlightAware AeroAPI");
    }

    const flight = flights[0];
    return parseFlightAwareData(input, flight);
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn("[BM8] FlightAware timeout — trying secondary");
    } else {
      console.warn("[BM8] FlightAware error:", err?.message);
    }
    return null; // Signal to try secondary
  }
}

function parseFlightAwareData(
  input: FlightLookupInput,
  flight: any
): FlightLookupResult {
  const now = new Date();

  const scheduledArrival = flight.scheduled_in ?? flight.scheduled_on ?? null;
  const estimatedArrival = flight.estimated_in ?? flight.estimated_on ?? scheduledArrival;
  const actualArrival = flight.actual_in ?? flight.actual_on ?? null;

  const scheduledDate = scheduledArrival ? new Date(scheduledArrival) : null;
  const estimatedDate = estimatedArrival ? new Date(estimatedArrival) : null;

  let delayMinutes = 0;
  if (scheduledDate && estimatedDate) {
    delayMinutes = Math.max(0, Math.round((estimatedDate.getTime() - scheduledDate.getTime()) / 60000));
  }

  const progressPercent = flight.progress_percent ?? 0;
  const faStatus = (flight.status ?? "").toLowerCase();

  let flightStatus: FlightStatus = "on_time";
  if (faStatus.includes("cancel")) flightStatus = "cancelled";
  else if (faStatus.includes("divert")) flightStatus = "diverted";
  else if (actualArrival) flightStatus = "landed";
  else if (faStatus.includes("arrived") || faStatus.includes("at gate")) flightStatus = "at_gate";
  else if (delayMinutes > 0) flightStatus = "delayed";
  else if (progressPercent > 0) flightStatus = "on_time";

  const minutesToScheduled = scheduledDate
    ? Math.round((scheduledDate.getTime() - now.getTime()) / 60000)
    : 999;

  const validationStatus: FlightValidationStatus = "verified";
  const phase = resolvePhaseFromStatus(flightStatus, delayMinutes, minutesToScheduled, validationStatus);
  const intelligenceStatus = resolveIntelligenceStatus(flightStatus, delayMinutes, validationStatus);

  return {
    flight_number: input.flight_number,
    airline_code: flight.operator_iata ?? input.airline_code ?? null,
    airport_code: flight.destination?.code_iata ?? input.airport_code ?? null,
    terminal_code: flight.terminal_destination ?? null,
    gate_info: flight.gate_destination ?? null,
    baggage_claim_zone: flight.baggage_claim ?? null,
    flight_status: flightStatus,
    airport_intelligence_status: intelligenceStatus,
    airport_phase: phase,
    flight_validation_status: validationStatus,
    flight_validation_message: null,
    manual_flight_review_required: false,
    scheduled_arrival_at: scheduledArrival,
    estimated_arrival_at: estimatedArrival,
    actual_arrival_at: actualArrival,
    delay_minutes: delayMinutes,
    is_irregular: flightStatus === "cancelled" || flightStatus === "diverted",
    source: "live_primary",
    flight_provider_used: "FlightAware AeroAPI",
    lookup_at: now.toISOString(),
    raw_data: { fa_status: faStatus, progress_percent: progressPercent },
  };
}

// ── aviationstack Provider (Secondary) ──────────────────────
async function lookupAviationstack(
  input: FlightLookupInput
): Promise<FlightLookupResult | null> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) return null;

  try {
    const flightIata = input.flight_number.replace(/\s/g, "").toUpperCase();
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(flightIata)}&limit=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const flights = data.data ?? [];
    if (!flights.length) {
      return buildNotFoundResult(input, "live_secondary", "aviationstack");
    }

    return parseAviationstackData(input, flights[0]);
  } catch (err: any) {
    console.warn("[BM8] aviationstack error:", err?.message);
    return null;
  }
}

function parseAviationstackData(
  input: FlightLookupInput,
  flight: any
): FlightLookupResult {
  const now = new Date();
  const arr = flight.arrival ?? {};

  const scheduledArrival = arr.scheduled ?? null;
  const estimatedArrival = arr.estimated ?? scheduledArrival;
  const actualArrival = arr.actual ?? null;

  const scheduledDate = scheduledArrival ? new Date(scheduledArrival) : null;
  const estimatedDate = estimatedArrival ? new Date(estimatedArrival) : null;

  let delayMinutes = arr.delay ?? 0;
  if (!delayMinutes && scheduledDate && estimatedDate) {
    delayMinutes = Math.max(0, Math.round((estimatedDate.getTime() - scheduledDate.getTime()) / 60000));
  }

  const asStatus = (flight.flight_status ?? "").toLowerCase();
  let flightStatus: FlightStatus = "on_time";
  if (asStatus === "cancelled") flightStatus = "cancelled";
  else if (asStatus === "diverted") flightStatus = "diverted";
  else if (asStatus === "landed") flightStatus = "landed";
  else if (asStatus === "active") flightStatus = delayMinutes > 0 ? "delayed" : "on_time";
  else if (asStatus === "scheduled") flightStatus = delayMinutes > 0 ? "delayed" : "on_time";

  const minutesToScheduled = scheduledDate
    ? Math.round((scheduledDate.getTime() - now.getTime()) / 60000)
    : 999;

  const validationStatus: FlightValidationStatus = "verified";
  const phase = resolvePhaseFromStatus(flightStatus, delayMinutes, minutesToScheduled, validationStatus);
  const intelligenceStatus = resolveIntelligenceStatus(flightStatus, delayMinutes, validationStatus);

  return {
    flight_number: input.flight_number,
    airline_code: flight.airline?.iata ?? input.airline_code ?? null,
    airport_code: arr.iata ?? input.airport_code ?? null,
    terminal_code: arr.terminal ?? null,
    gate_info: arr.gate ?? null,
    baggage_claim_zone: arr.baggage ?? null,
    flight_status: flightStatus,
    airport_intelligence_status: intelligenceStatus,
    airport_phase: phase,
    flight_validation_status: validationStatus,
    flight_validation_message: null,
    manual_flight_review_required: false,
    scheduled_arrival_at: scheduledArrival,
    estimated_arrival_at: estimatedArrival,
    actual_arrival_at: actualArrival,
    delay_minutes: delayMinutes,
    is_irregular: flightStatus === "cancelled" || flightStatus === "diverted",
    source: "live_secondary",
    flight_provider_used: "aviationstack",
    lookup_at: now.toISOString(),
    raw_data: { as_status: asStatus },
  };
}

// ── Not Found Result Builder ─────────────────────────────────
function buildNotFoundResult(
  input: FlightLookupInput,
  source: "live_primary" | "live_secondary" | "sandbox",
  providerName: string
): FlightLookupResult {
  const now = new Date();
  return {
    flight_number: input.flight_number,
    airline_code: input.airline_code ?? null,
    airport_code: input.airport_code ?? null,
    terminal_code: null,
    gate_info: null,
    baggage_claim_zone: null,
    flight_status: "not_found",
    airport_intelligence_status: "unknown",
    airport_phase: "validation_pending",
    flight_validation_status: "not_found",
    flight_validation_message:
      "We could not fully validate your flight details yet. Your reservation remains active. Please update your flight information so we can ensure the best pickup experience.",
    manual_flight_review_required: true,
    scheduled_arrival_at: null,
    estimated_arrival_at: null,
    actual_arrival_at: null,
    delay_minutes: 0,
    is_irregular: false,
    source,
    flight_provider_used: providerName,
    lookup_at: now.toISOString(),
    raw_data: { not_found: true },
  };
}

// ── Provider Unavailable Result Builder ──────────────────────
function buildProviderUnavailableResult(input: FlightLookupInput): FlightLookupResult {
  const now = new Date();
  return {
    flight_number: input.flight_number,
    airline_code: input.airline_code ?? null,
    airport_code: input.airport_code ?? null,
    terminal_code: null,
    gate_info: null,
    baggage_claim_zone: null,
    flight_status: "unknown",
    airport_intelligence_status: "unknown",
    airport_phase: "validation_pending",
    flight_validation_status: "provider_unavailable",
    flight_validation_message:
      "We are temporarily unable to verify your flight details automatically. Your reservation remains confirmed and our team will monitor it manually if needed.",
    manual_flight_review_required: true,
    scheduled_arrival_at: null,
    estimated_arrival_at: null,
    actual_arrival_at: null,
    delay_minutes: 0,
    is_irregular: false,
    source: "sandbox",
    flight_provider_used: "none",
    lookup_at: now.toISOString(),
    raw_data: { provider_unavailable: true },
  };
}

// ── Sandbox Simulation Engine (contingency/testing only) ─────
export function simulateFlight(
  input: FlightLookupInput,
  scenario: SandboxScenario,
  basePickupAt?: Date | null
): FlightLookupResult {
  const now = new Date();
  const base = basePickupAt ?? new Date(now.getTime() + 2 * 60 * 60 * 1000);

  let scheduledArrival = new Date(base.getTime() - 30 * 60 * 1000);
  let estimatedArrival: Date | null = null;
  let actualArrival: Date | null = null;
  let flightStatus: FlightStatus = "on_time";
  let delayMinutes = 0;
  let terminalCode: string | null = "B";
  let gateInfo: string | null = "B12";
  let baggageClaim: string | null = "B4";
  let validationStatus: FlightValidationStatus = "verified";
  let validationMessage: string | null = null;
  let manualReview = false;

  switch (scenario) {
    case "on_time":
      flightStatus = "on_time";
      estimatedArrival = scheduledArrival;
      delayMinutes = 0;
      break;
    case "delayed_30":
      flightStatus = "delayed";
      delayMinutes = 30;
      estimatedArrival = new Date(scheduledArrival.getTime() + 30 * 60 * 1000);
      break;
    case "delayed_60":
      flightStatus = "delayed";
      delayMinutes = 60;
      estimatedArrival = new Date(scheduledArrival.getTime() + 60 * 60 * 1000);
      break;
    case "landed":
      flightStatus = "landed";
      actualArrival = new Date(now.getTime() - 10 * 60 * 1000);
      estimatedArrival = scheduledArrival;
      delayMinutes = 0;
      break;
    case "cancelled":
      flightStatus = "cancelled";
      estimatedArrival = null;
      delayMinutes = 0;
      terminalCode = null;
      gateInfo = null;
      break;
    case "diverted":
      flightStatus = "diverted";
      estimatedArrival = null;
      terminalCode = "DIVERTED";
      gateInfo = null;
      delayMinutes = 0;
      break;
    case "not_found":
      flightStatus = "not_found";
      validationStatus = "not_found";
      validationMessage =
        "We could not fully validate your flight details yet. Your reservation remains active. Please update your flight information so we can ensure the best pickup experience.";
      manualReview = true;
      terminalCode = null;
      gateInfo = null;
      baggageClaim = null;
      break;
  }

  const minutesToScheduled = Math.round((scheduledArrival.getTime() - now.getTime()) / 60000);
  const airportPhase = resolvePhaseFromStatus(flightStatus, delayMinutes, minutesToScheduled, validationStatus);
  const intelligenceStatus = resolveIntelligenceStatus(flightStatus, delayMinutes, validationStatus);

  return {
    flight_number: input.flight_number,
    airline_code: input.airline_code ?? "AA",
    airport_code: input.airport_code ?? "MCO",
    terminal_code: terminalCode,
    gate_info: gateInfo,
    baggage_claim_zone: baggageClaim,
    flight_status: flightStatus,
    airport_intelligence_status: intelligenceStatus,
    airport_phase: airportPhase,
    flight_validation_status: validationStatus,
    flight_validation_message: validationMessage,
    manual_flight_review_required: manualReview,
    scheduled_arrival_at: scheduledArrival.toISOString(),
    estimated_arrival_at: estimatedArrival?.toISOString() ?? null,
    actual_arrival_at: actualArrival?.toISOString() ?? null,
    delay_minutes: delayMinutes,
    is_irregular: flightStatus === "cancelled" || flightStatus === "diverted",
    source: "sandbox",
    flight_provider_used: "sandbox_simulation",
    lookup_at: now.toISOString(),
    raw_data: { scenario, simulated: true },
  };
}

// ── Main Flight Lookup Function — LIVE-FIRST ─────────────────
// CRITICAL: Never throws. Always returns a result.
// Booking continuity is guaranteed regardless of provider status.
export async function lookupFlight(
  input: FlightLookupInput,
  basePickupAt?: Date | null
): Promise<FlightLookupResult> {
  const mode = input.force_mode ?? AIRPORT_INTELLIGENCE_MODE;

  // ── Validate flight number format first ──────────────────
  if (!validateFlightNumberFormat(input.flight_number)) {
    const now = new Date();
    return {
      flight_number: input.flight_number,
      airline_code: input.airline_code ?? null,
      airport_code: input.airport_code ?? null,
      terminal_code: null,
      gate_info: null,
      baggage_claim_zone: null,
      flight_status: "unknown",
      airport_intelligence_status: "unknown",
      airport_phase: "validation_pending",
      flight_validation_status: "invalid_format",
      flight_validation_message:
        "We could not fully validate your flight details yet. Your reservation remains active. Please update your flight information so we can ensure the best pickup experience.",
      manual_flight_review_required: true,
      scheduled_arrival_at: null,
      estimated_arrival_at: null,
      actual_arrival_at: null,
      delay_minutes: 0,
      is_irregular: false,
      source: "sandbox",
      flight_provider_used: "none",
      lookup_at: now.toISOString(),
      raw_data: { invalid_format: true },
    };
  }

  // ── Sandbox mode (forced or contingency) ────────────────
  if (mode === "fallback_sandbox") {
    const scenario: SandboxScenario = input.sandbox_scenario ?? "on_time";
    return simulateFlight(input, scenario, basePickupAt);
  }

  // ── LIVE-FIRST: Try primary provider ────────────────────
  if (mode === "live_primary" || mode === "live_secondary") {
    if (mode === "live_primary") {
      try {
        const primaryResult = await lookupFlightAware(input);
        if (primaryResult) {
          console.log(`[BM8] FlightAware OK — ${input.flight_number}`);
          return primaryResult;
        }
      } catch (err) {
        console.warn("[BM8] FlightAware unexpected error:", err);
      }
    }

    // ── Try secondary provider ───────────────────────────
    try {
      const secondaryResult = await lookupAviationstack(input);
      if (secondaryResult) {
        console.log(`[BM8] aviationstack OK — ${input.flight_number}`);
        return secondaryResult;
      }
    } catch (err) {
      console.warn("[BM8] aviationstack unexpected error:", err);
    }
  }

  // ── Both providers failed — check if sandbox keys available ─
  // If sandbox_scenario is provided, use it as contingency
  if (input.sandbox_scenario) {
    console.warn(`[BM8] Both providers failed — using sandbox scenario: ${input.sandbox_scenario}`);
    return simulateFlight(input, input.sandbox_scenario, basePickupAt);
  }

  // ── Both providers failed, no sandbox scenario — provider_unavailable ─
  // BOOKING REMAINS ACTIVE. Manual review required.
  console.warn(`[BM8] Both providers failed for ${input.flight_number} — marking provider_unavailable`);
  return buildProviderUnavailableResult(input);
}

// ── Detect if a booking is an airport pickup ─────────────────
export function isAirportBooking(booking: {
  pickup_address?: string | null;
  dropoff_address?: string | null;
  service_location_type?: string | null;
  trip_type?: string | null;
  flight_number?: string | null;
  airport_code?: string | null;
  airline_code?: string | null;
  pickup_type?: string | null;
}): boolean {
  if (booking.airport_code) return true;
  if (booking.flight_number) return true;
  if (booking.airline_code) return true;
  if (booking.service_location_type === "airport") return true;
  if (booking.trip_type === "airport") return true;
  if (booking.pickup_type === "airport") return true;
  const combined = [
    booking.pickup_address ?? "",
    booking.dropoff_address ?? "",
  ].join(" ").toLowerCase();
  return (
    combined.includes("airport") ||
    combined.includes(" mco") ||
    combined.includes("sfb") ||
    combined.includes("mia") ||
    combined.includes("fll") ||
    combined.includes("pbi") ||
    combined.includes("orlando international") ||
    combined.includes("jeff fuqua")
  );
}

// ── Detect airport code from address ─────────────────────────
export function detectAirportCode(address: string): string | null {
  const lower = address.toLowerCase();
  if (lower.includes("mco") || lower.includes("orlando international") || lower.includes("jeff fuqua")) return "MCO";
  if (lower.includes("sfb") || lower.includes("sanford")) return "SFB";
  if (lower.includes("mia") || lower.includes("miami international")) return "MIA";
  if (lower.includes("fll") || lower.includes("fort lauderdale")) return "FLL";
  if (lower.includes("pbi") || lower.includes("palm beach")) return "PBI";
  return null;
}

// ── Recommended Actions Based on Phase ───────────────────────
export function getRecommendedActions(
  phase: AirportPhase,
  validationStatus: FlightValidationStatus,
  isIrregular: boolean
): string[] {
  const actions: string[] = [];

  if (validationStatus === "not_found" || validationStatus === "invalid_format") {
    actions.push("contact_customer_for_flight_update");
    actions.push("manual_validate");
  }
  if (validationStatus === "provider_unavailable") {
    actions.push("manual_validate");
    actions.push("monitor_manually");
  }
  if (isIrregular) {
    actions.push("escalate_dispatch");
    actions.push("contact_customer");
    actions.push("reassign_if_needed");
  }
  if (phase === "baggage_claim") {
    actions.push("mark_passenger_ready");
  }
  if (phase === "passenger_ready") {
    actions.push("force_pickup_window");
  }
  if (phase === "validation_pending") {
    actions.push("manual_terminal_update");
    actions.push("contact_customer_for_flight_update");
  }

  return actions;
}
