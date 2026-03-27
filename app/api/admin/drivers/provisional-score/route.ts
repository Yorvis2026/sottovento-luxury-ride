import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  ScoreEventType,
  BASE_SCORE_DELTAS,
  getProvisionalDelta,
  checkPremiumDispatchEligibility,
  checkAirportPriorityEligibility,
  checkProvisionalExit,
  recalculateExitScore,
  clampScore,
  getTierFromScore,
  PROVISIONAL_RIDE_THRESHOLD,
} from "@/lib/scoring/engine";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * POST /api/admin/drivers/provisional-score
 *
 * Applies a score event to a driver (provisional or active).
 * During provisional window, accelerated multipliers are used.
 * Automatically handles provisional exit when thresholds are met.
 *
 * Body:
 *   {
 *     driver_id:          string,   // UUID
 *     event_type:         ScoreEventType,
 *     booking_id?:        string,   // optional reference
 *     notes?:             string,   // optional context
 *     is_affiliate?:      boolean,  // for onboarding_contribution_bonus
 *   }
 */

const VALID_EVENTS: ScoreEventType[] = [
  "completed_ride_on_time",
  "high_acceptance_behavior",
  "positive_rating_event",
  "source_lead_generated",
  "onboarding_contribution_bonus",
  "late_cancel_driver",
  "driver_cancel_1h_to_4h",
  "no_response_offer_timeout",
  "client_complaint",
  "driver_fault_no_show",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driver_id, event_type, booking_id, notes, is_affiliate } = body;

    // ── Validation ────────────────────────────────────────────
    if (!driver_id || !event_type) {
      return NextResponse.json(
        { error: "driver_id and event_type are required" },
        { status: 400 }
      );
    }
    if (!VALID_EVENTS.includes(event_type as ScoreEventType)) {
      return NextResponse.json(
        { error: `Invalid event_type. Valid values: ${VALID_EVENTS.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Ensure all scoring columns exist ─────────────────────
    try {
      await sql`
        ALTER TABLE drivers
          ADD COLUMN IF NOT EXISTS driver_score_total               INTEGER     DEFAULT 75,
          ADD COLUMN IF NOT EXISTS driver_score_tier                TEXT        DEFAULT 'GOLD',
          ADD COLUMN IF NOT EXISTS provisional_started_at           TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS provisional_ends_at              TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS provisional_completed_rides      INTEGER     DEFAULT 0,
          ADD COLUMN IF NOT EXISTS provisional_exit_reason          TEXT,
          ADD COLUMN IF NOT EXISTS is_eligible_for_premium_dispatch BOOLEAN     DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS is_eligible_for_airport_priority BOOLEAN     DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS on_time_rides                    INTEGER     DEFAULT 0,
          ADD COLUMN IF NOT EXISTS late_cancel_count                INTEGER     DEFAULT 0,
          ADD COLUMN IF NOT EXISTS complaint_count                  INTEGER     DEFAULT 0,
          ADD COLUMN IF NOT EXISTS contribution_bonus_granted       BOOLEAN     DEFAULT FALSE
      `;
    } catch {
      // Columns may already exist — safe to ignore
    }

    // ── Load driver ───────────────────────────────────────────
    const driverRows = await sql`
      SELECT
        id,
        driver_status,
        COALESCE(driver_score_total, 75)               AS driver_score_total,
        COALESCE(driver_score_tier, 'GOLD')            AS driver_score_tier,
        provisional_started_at,
        provisional_ends_at,
        COALESCE(provisional_completed_rides, 0)       AS provisional_completed_rides,
        COALESCE(is_eligible_for_premium_dispatch, FALSE) AS is_eligible_for_premium_dispatch,
        COALESCE(is_eligible_for_airport_priority, FALSE) AS is_eligible_for_airport_priority,
        COALESCE(on_time_rides, 0)                     AS on_time_rides,
        COALESCE(rides_completed, 0)                   AS rides_completed,
        COALESCE(late_cancel_count, 0)                 AS late_cancel_count,
        COALESCE(complaint_count, 0)                   AS complaint_count,
        COALESCE(contribution_bonus_granted, FALSE)    AS contribution_bonus_granted
      FROM drivers
      WHERE id = ${driver_id}::uuid
      LIMIT 1
    `;

    if (driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driver = driverRows[0];
    const isProvisional = driver.driver_status === "provisional";

    // ── Guard: onboarding_contribution_bonus can only be granted once ─────
    if (event_type === "onboarding_contribution_bonus") {
      if (driver.contribution_bonus_granted) {
        return NextResponse.json(
          { error: "Contribution bonus has already been granted to this driver" },
          { status: 409 }
        );
      }
      if (!is_affiliate) {
        return NextResponse.json(
          { error: "is_affiliate must be true to grant contribution bonus" },
          { status: 400 }
        );
      }
    }

    // ── Compute score delta ───────────────────────────────────
    const scoreDelta = isProvisional
      ? getProvisionalDelta(event_type as ScoreEventType)
      : BASE_SCORE_DELTAS[event_type as ScoreEventType];

    const previousScore = Number(driver.driver_score_total);
    const newScore      = clampScore(previousScore + scoreDelta);
    const newTier       = getTierFromScore(newScore);

    // ── Update counters based on event type ──────────────────
    let onTimeRidesDelta     = 0;
    let lateCancelDelta      = 0;
    let complaintDelta       = 0;
    let provisionalRidesDelta = 0;

    if (event_type === "completed_ride_on_time") {
      onTimeRidesDelta      = 1;
      provisionalRidesDelta = 1;
    }
    if (event_type === "late_cancel_driver") {
      lateCancelDelta = 1;
    }
    if (event_type === "client_complaint") {
      complaintDelta = 1;
    }

    const newProvisionalRides = Number(driver.provisional_completed_rides) + provisionalRidesDelta;
    const newOnTimeRides      = Number(driver.on_time_rides) + onTimeRidesDelta;
    const newLateCancelCount  = Number(driver.late_cancel_count) + lateCancelDelta;
    const newComplaintCount   = Number(driver.complaint_count) + complaintDelta;

    // ── Recalculate eligibility ───────────────────────────────
    const totalRides = Number(driver.rides_completed) + (provisionalRidesDelta > 0 ? 1 : 0);
    const onTimeRate = totalRides > 0
      ? Math.round((newOnTimeRides / totalRides) * 100)
      : 0;

    const eligibilityInput = {
      provisional_completed_rides:  newProvisionalRides,
      has_late_driver_cancellation: newLateCancelCount > 0,
      has_active_complaint:         newComplaintCount > 0,
      on_time_rate:                 onTimeRate,
    };

    const newPremiumEligible  = checkPremiumDispatchEligibility(eligibilityInput);
    const newAirportEligible  = checkAirportPriorityEligibility(eligibilityInput);

    // ── Check provisional exit ────────────────────────────────
    const exitCheck = isProvisional
      ? checkProvisionalExit(newProvisionalRides, driver.provisional_ends_at)
      : { should_exit: false };

    let finalScore      = newScore;
    let finalTier       = newTier;
    let newDriverStatus = driver.driver_status;
    let exitReason: string | null = null;

    if (exitCheck.should_exit && exitCheck.exit_reason) {
      // Recalculate score on exit (normalize from accelerated provisional scoring)
      const exitResult = recalculateExitScore(newScore);
      finalScore      = exitResult.final_score;
      finalTier       = exitResult.final_tier;
      newDriverStatus = "active";
      exitReason      = exitCheck.exit_reason;
    }

    // ── Persist to DB ─────────────────────────────────────────
    const bonusGranted = event_type === "onboarding_contribution_bonus" ? true : driver.contribution_bonus_granted;

    await sql`
      UPDATE drivers
      SET
        driver_score_total               = ${finalScore},
        driver_score_tier                = ${finalTier},
        driver_status                    = ${newDriverStatus},
        provisional_completed_rides      = ${newProvisionalRides},
        provisional_exit_reason          = ${exitReason},
        is_eligible_for_premium_dispatch = ${newPremiumEligible},
        is_eligible_for_airport_priority = ${newAirportEligible},
        on_time_rides                    = ${newOnTimeRides},
        late_cancel_count                = ${newLateCancelCount},
        complaint_count                  = ${newComplaintCount},
        contribution_bonus_granted       = ${bonusGranted},
        updated_at                       = NOW()
      WHERE id = ${driver_id}::uuid
    `;

    // ── Audit log ─────────────────────────────────────────────
    const auditData = {
      event_type,
      is_provisional:           isProvisional,
      score_delta:              scoreDelta,
      previous_score:           previousScore,
      new_score:                finalScore,
      previous_tier:            driver.driver_score_tier,
      new_tier:                 finalTier,
      provisional_rides:        newProvisionalRides,
      premium_eligible:         newPremiumEligible,
      airport_eligible:         newAirportEligible,
      on_time_rate:             onTimeRate,
      provisional_exit:         exitCheck.should_exit,
      provisional_exit_reason:  exitReason,
      booking_id:               booking_id ?? null,
      notes:                    notes ?? null,
      contribution_bonus:       event_type === "onboarding_contribution_bonus",
      timestamp:                new Date().toISOString(),
    };

    try {
      await sql`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, new_data
        ) VALUES (
          'driver',
          ${driver_id}::uuid,
          ${"provisional_score_event:" + event_type},
          'system',
          ${JSON.stringify(auditData)}::jsonb
        )
      `;
    } catch {
      // Audit log failure is non-blocking
    }

    // ── Provisional exit audit log ────────────────────────────
    if (exitCheck.should_exit) {
      try {
        await sql`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, actor_type, new_data
          ) VALUES (
            'driver',
            ${driver_id}::uuid,
            'provisional_exit_recalculation',
            'system',
            ${JSON.stringify({
              exit_reason:         exitReason,
              pre_exit_score:      newScore,
              post_exit_score:     finalScore,
              final_tier:          finalTier,
              provisional_rides:   newProvisionalRides,
              threshold_rides:     PROVISIONAL_RIDE_THRESHOLD,
              timestamp:           new Date().toISOString(),
            })}::jsonb
          )
        `;
      } catch {
        // Non-blocking
      }
    }

    // ── Response ──────────────────────────────────────────────
    return NextResponse.json({
      success:                         true,
      driver_id,
      event_type,
      is_provisional:                  isProvisional,
      score_delta:                     scoreDelta,
      previous_score:                  previousScore,
      new_score:                       finalScore,
      previous_tier:                   driver.driver_score_tier,
      new_tier:                        finalTier,
      driver_status:                   newDriverStatus,
      provisional_completed_rides:     newProvisionalRides,
      is_eligible_for_premium_dispatch: newPremiumEligible,
      is_eligible_for_airport_priority: newAirportEligible,
      on_time_rate:                    onTimeRate,
      provisional_exit:                exitCheck.should_exit,
      provisional_exit_reason:         exitReason,
    });

  } catch (err: any) {
    console.error("[drivers/provisional-score]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
