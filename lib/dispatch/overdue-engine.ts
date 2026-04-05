// ============================================================
// SOTTOVENTO NETWORK — Overdue / Missed Ride Engine (BM17)
// Detects rides that passed their pickup_at without entering
// live execution, and classifies the incident type.
//
// INVARIANTS:
//   - Rides in LIVE_EXECUTION_STATES are NEVER overdue
//   - Rides in FINALIZED_STATES are NEVER overdue
//   - Only rides in OVERDUE_ELIGIBLE_STATUSES can be overdue
//   - The server clock is the ONLY source of truth for time
// ============================================================

// ── Constants ────────────────────────────────────────────────
/** Ride statuses that indicate live execution — NEVER overdue */
export const LIVE_EXECUTION_STATES = [
  "en_route", "arrived", "in_trip",
] as const;

/** Ride statuses that indicate finalized — NEVER overdue */
export const FINALIZED_STATES = [
  "completed", "cancelled", "no_show", "archived",
] as const;

/** Ride statuses eligible for overdue detection */
export const OVERDUE_ELIGIBLE_STATUSES = [
  "assigned", "accepted", "driver_confirmed",
] as const;

/** dispatch_states eligible for overdue detection */
export const OVERDUE_ELIGIBLE_DISPATCH_STATES = [
  "ASSIGNED", "NEW", null, undefined, "",
] as const;

/** Minutes after pickup_at before the incident flow is triggered (BM17 spec: 15min SLA) */
export const OVERDUE_GRACE_PERIOD_MINUTES = 15;

/** Incident reason codes */
export const INCIDENT_REASON_CODES = [
  "FLIGHT_DELAY",
  "CLIENT_NO_SHOW",
  "CLIENT_RESCHEDULE_REQUEST",
  "DRIVER_UNAVAILABLE",
  "TRAFFIC_DELAY",
  "VEHICLE_ISSUE",
  "ADMIN_RESCHEDULE",
  "OTHER",
] as const;

export type IncidentReasonCode = typeof INCIDENT_REASON_CODES[number];

/** Incident status lifecycle */
export type IncidentStatus =
  | "pending_reason"
  | "driver_reported"
  | "admin_review"
  | "rescheduled"
  | "redispatched"
  | "cancelled"
  | "resolved";

/** Incident owner */
export type IncidentOwner = "driver" | "admin" | "shared";

/** Codes that trigger redispatch when reported by driver */
export const REDISPATCH_TRIGGER_CODES: IncidentReasonCode[] = [
  "DRIVER_UNAVAILABLE",
  "VEHICLE_ISSUE",
];

/** Codes that require admin review before any action */
export const ADMIN_REVIEW_CODES: IncidentReasonCode[] = [
  "FLIGHT_DELAY",
  "CLIENT_RESCHEDULE_REQUEST",
];

/** Codes that go directly to no-show / cancellation flow */
export const NO_SHOW_CODES: IncidentReasonCode[] = [
  "CLIENT_NO_SHOW",
];

// ── Types ────────────────────────────────────────────────────
export interface OverdueResult {
  is_overdue: boolean;
  overdue_execution: boolean;
  overdue_reason_required: boolean;
  overdue_since_minutes: number;
  incident_owner: IncidentOwner | null;
  incident_status: IncidentStatus | null;
  incident_reason_code: IncidentReasonCode | null;
  overdue_activation_condition: string;
}

export interface RideForOverdueCheck {
  pickup_at: Date | string | null;
  status: string;
  dispatch_state?: string | null;
  dispatch_status?: string | null;
  incident_status?: string | null;
  incident_reason_code?: string | null;
  assigned_driver_id?: string | null;
}

// ── Core Detection Function ──────────────────────────────────
/**
 * Evaluates whether a ride is overdue and requires incident reporting.
 * Uses server-side time exclusively — no client clock.
 *
 * ACTIVATION CONDITION (BM17):
 *   pickup_at < NOW()
 *   AND status IN ('assigned', 'accepted', 'driver_confirmed')
 *   AND dispatch_state IN ('ASSIGNED', NULL, 'NEW')
 *   AND NOT status IN ('en_route', 'arrived', 'in_trip', 'completed', 'cancelled', 'archived')
 *   AND minutes_past_pickup > OVERDUE_GRACE_PERIOD_MINUTES
 */
export function evaluateOverdue(ride: RideForOverdueCheck, serverNow: Date = new Date()): OverdueResult {
  const NOT_OVERDUE: OverdueResult = {
    is_overdue: false,
    overdue_execution: false,
    overdue_reason_required: false,
    overdue_since_minutes: 0,
    incident_owner: null,
    incident_status: null,
    incident_reason_code: null,
    overdue_activation_condition: "NOT_OVERDUE",
  };

  // Guard 1: Live execution states are NEVER overdue
  if (LIVE_EXECUTION_STATES.includes(ride.status as any)) {
    return { ...NOT_OVERDUE, overdue_activation_condition: "EXCLUDED_LIVE_EXECUTION" };
  }

  // Guard 2: Finalized states are NEVER overdue
  if (FINALIZED_STATES.includes(ride.status as any)) {
    return { ...NOT_OVERDUE, overdue_activation_condition: "EXCLUDED_FINALIZED" };
  }

  // Guard 3: Only eligible statuses can be overdue
  if (!OVERDUE_ELIGIBLE_STATUSES.includes(ride.status as any)) {
    return { ...NOT_OVERDUE, overdue_activation_condition: "NOT_ELIGIBLE_STATUS" };
  }

  // Guard 4: Only eligible dispatch_states can be overdue
  const ds = ride.dispatch_state ?? null;
  const isEligibleDispatchState = OVERDUE_ELIGIBLE_DISPATCH_STATES.includes(ds as any);
  if (!isEligibleDispatchState) {
    return { ...NOT_OVERDUE, overdue_activation_condition: "NOT_ELIGIBLE_DISPATCH_STATE" };
  }

  // Guard 5: pickup_at must exist and be in the past
  if (!ride.pickup_at) {
    return { ...NOT_OVERDUE, overdue_activation_condition: "NO_PICKUP_AT" };
  }
  const pickupAt = new Date(ride.pickup_at);
  const minutesPast = Math.floor((serverNow.getTime() - pickupAt.getTime()) / 60000);

  if (minutesPast <= OVERDUE_GRACE_PERIOD_MINUTES) {
    return { ...NOT_OVERDUE, overdue_activation_condition: "WITHIN_GRACE_PERIOD" };
  }

  // ── OVERDUE CONFIRMED ────────────────────────────────────────
  // Determine incident owner based on context
  let incidentOwner: IncidentOwner = "shared";
  if (ride.assigned_driver_id) {
    incidentOwner = "driver"; // driver had the ride — primary owner
  } else {
    incidentOwner = "admin"; // no driver assigned — admin owns it
  }

  // Determine incident status
  let incidentStatus: IncidentStatus = "pending_reason";
  if (ride.incident_status) {
    incidentStatus = ride.incident_status as IncidentStatus;
  }

  // Determine incident reason code (if already reported)
  const incidentReasonCode = ride.incident_reason_code as IncidentReasonCode | null ?? null;

  return {
    is_overdue: true,
    overdue_execution: true,
    overdue_reason_required: incidentStatus === "pending_reason",
    overdue_since_minutes: minutesPast,
    incident_owner: incidentOwner,
    incident_status: incidentStatus,
    incident_reason_code: incidentReasonCode,
    overdue_activation_condition: "OVERDUE_CONFIRMED",
  };
}

// ── Redispatch Decision ──────────────────────────────────────
/**
 * Determines the action to take after a driver reports an incident reason.
 */
export function getIncidentAction(reasonCode: IncidentReasonCode): {
  action: "redispatch" | "admin_review" | "no_show_flow" | "reschedule_required";
  description: string;
} {
  if (REDISPATCH_TRIGGER_CODES.includes(reasonCode)) {
    return {
      action: "redispatch",
      description: "Driver cannot execute. Trigger controlled redispatch.",
    };
  }
  if (ADMIN_REVIEW_CODES.includes(reasonCode)) {
    return {
      action: "admin_review",
      description: "Requires admin review and new pickup time before any action.",
    };
  }
  if (NO_SHOW_CODES.includes(reasonCode)) {
    return {
      action: "no_show_flow",
      description: "Client no-show. Move to admin confirmation for no-show/cancellation.",
    };
  }
  // OTHER, TRAFFIC_DELAY, ADMIN_REASSIGNED
  return {
    action: "admin_review",
    description: "Generic incident. Requires admin review.",
  };
}

// ── Time Source Hardening ────────────────────────────────────
/**
 * Builds the server-side time context for API responses.
 * This is the ONLY source of truth for time in the system.
 * The client device ONLY renders — it never decides logic.
 */
export function buildServerTimeContext(pickupAt?: Date | string | null): {
  server_now: string;
  server_timezone: string;
  pickup_at_canonical: string | null;
  minutes_until_pickup: number | null;
  pickup_is_past: boolean;
} {
  const serverNow = new Date();
  const serverNowISO = serverNow.toISOString();

  let pickupAtCanonical: string | null = null;
  let minutesUntilPickup: number | null = null;
  let pickupIsPast = false;

  if (pickupAt) {
    const pickupDate = new Date(pickupAt);
    pickupAtCanonical = pickupDate.toISOString();
    const diffMs = pickupDate.getTime() - serverNow.getTime();
    minutesUntilPickup = Math.round(diffMs / 60000);
    pickupIsPast = diffMs < 0;
  }

  return {
    server_now: serverNowISO,
    server_timezone: "America/New_York",
    pickup_at_canonical: pickupAtCanonical,
    minutes_until_pickup: minutesUntilPickup,
    pickup_is_past: pickupIsPast,
  };
}
