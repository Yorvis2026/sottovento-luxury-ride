/**
 * Driver Reputation Scoring Engine V1
 * Sottovento Luxury Network (SLN)
 *
 * Handles:
 *   - Score tier classification (BRONZE → PLATINUM)
 *   - Provisional driver window (first 10 rides OR 30 days)
 *   - Accelerated score impact during provisional window
 *   - Premium dispatch & airport priority eligibility
 *   - Contribution bonus for source-generating affiliates
 *   - Automatic provisional exit with full score recalculation
 *   - Audit logging for every score event
 */

// ─── TIER THRESHOLDS ──────────────────────────────────────────────────────────
export type ScoreTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export function getTierFromScore(score: number): ScoreTier {
  if (score >= 90) return "PLATINUM";
  if (score >= 75) return "GOLD";
  if (score >= 55) return "SILVER";
  return "BRONZE";
}

export const TIER_COLORS: Record<ScoreTier, { bg: string; text: string }> = {
  PLATINUM: { bg: "#1a1a2e", text: "#e2e8f0" },
  GOLD:     { bg: "#2a1a00", text: "#c9a84c" },
  SILVER:   { bg: "#1a1a1a", text: "#94a3b8" },
  BRONZE:   { bg: "#1c0a00", text: "#b45309" },
};

// ─── PROVISIONAL DEFAULTS ─────────────────────────────────────────────────────
export const PROVISIONAL_DEFAULTS = {
  driver_score_total:               75,
  driver_score_tier:                "GOLD" as ScoreTier,
  driver_status:                    "provisional",
  provisional_completed_rides:      0,
  is_eligible_for_premium_dispatch: false,
  is_eligible_for_airport_priority: false,
} as const;

export const PROVISIONAL_WINDOW_DAYS  = 30;
export const PROVISIONAL_RIDE_THRESHOLD = 10;

// ─── SCORE EVENTS ─────────────────────────────────────────────────────────────
export type ScoreEventType =
  // Positive
  | "completed_ride_on_time"
  | "high_acceptance_behavior"
  | "positive_rating_event"
  | "source_lead_generated"
  | "onboarding_contribution_bonus"
  // Negative
  | "late_cancel_driver"
  | "driver_cancel_1h_to_4h"
  | "no_response_offer_timeout"
  | "client_complaint"
  | "driver_fault_no_show";

/**
 * Base score deltas (applied during normal/post-provisional window).
 * During provisional window, these are MULTIPLIED by PROVISIONAL_MULTIPLIER.
 */
export const BASE_SCORE_DELTAS: Record<ScoreEventType, number> = {
  // Positive
  completed_ride_on_time:        +2,
  high_acceptance_behavior:      +2,
  positive_rating_event:         +3,
  source_lead_generated:         +2,
  onboarding_contribution_bonus: +5,
  // Negative
  late_cancel_driver:            -8,
  driver_cancel_1h_to_4h:        -5,
  no_response_offer_timeout:     -4,
  client_complaint:              -10,
  driver_fault_no_show:          -12,
};

/**
 * During provisional window, score impact is accelerated (4× for positives, 2× for negatives).
 * This allows rapid calibration in both directions.
 */
export function getProvisionalDelta(event: ScoreEventType): number {
  const base = BASE_SCORE_DELTAS[event];
  if (base > 0) return base * 4;   // Accelerated positive: 4×
  return base * 2;                  // Accelerated negative: 2×
}

// ─── ELIGIBILITY CHECKS ───────────────────────────────────────────────────────
export interface EligibilityInput {
  provisional_completed_rides: number;
  has_late_driver_cancellation: boolean;
  has_active_complaint:         boolean;
  on_time_rate:                 number; // 0–100
}

export function checkPremiumDispatchEligibility(input: EligibilityInput): boolean {
  return (
    input.provisional_completed_rides >= 3 &&
    !input.has_late_driver_cancellation &&
    !input.has_active_complaint
  );
}

export function checkAirportPriorityEligibility(input: EligibilityInput): boolean {
  return (
    input.provisional_completed_rides >= 5 &&
    input.on_time_rate >= 90 &&
    !input.has_active_complaint
  );
}

// ─── PROVISIONAL EXIT LOGIC ───────────────────────────────────────────────────
export type ProvisionalExitReason = "ride_threshold" | "day_threshold";

export interface ProvisionalExitCheck {
  should_exit:  boolean;
  exit_reason?: ProvisionalExitReason;
}

export function checkProvisionalExit(
  provisional_completed_rides: number,
  provisional_ends_at: Date | string | null,
): ProvisionalExitCheck {
  if (provisional_completed_rides >= PROVISIONAL_RIDE_THRESHOLD) {
    return { should_exit: true, exit_reason: "ride_threshold" };
  }
  if (provisional_ends_at) {
    const endsAt = new Date(provisional_ends_at);
    if (new Date() >= endsAt) {
      return { should_exit: true, exit_reason: "day_threshold" };
    }
  }
  return { should_exit: false };
}

// ─── SCORE CLAMP ─────────────────────────────────────────────────────────────
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

// ─── FULL SCORE RECALCULATION (on provisional exit) ──────────────────────────
/**
 * Recalculates the final score on provisional exit.
 * Takes the current score and applies a normalization toward the tier midpoint
 * to avoid extreme values caused by accelerated scoring during provisional window.
 */
export function recalculateExitScore(currentScore: number): {
  final_score: number;
  final_tier:  ScoreTier;
} {
  // Normalize: blend current score with tier midpoint (70% current, 30% midpoint)
  const tier = getTierFromScore(currentScore);
  const midpoints: Record<ScoreTier, number> = {
    PLATINUM: 95,
    GOLD:     82,
    SILVER:   65,
    BRONZE:   40,
  };
  const midpoint = midpoints[tier];
  const finalScore = clampScore(Math.round(currentScore * 0.7 + midpoint * 0.3));
  return {
    final_score: finalScore,
    final_tier:  getTierFromScore(finalScore),
  };
}
