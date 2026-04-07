/**
 * BM20-E — Refund Automation Decision Engine
 *
 * Evaluates refund decision based on cancellation context.
 * Does NOT execute any payment reversal (Stripe/Square).
 * That is deferred to BM20-F.
 *
 * Rules:
 *   1. Admin cancel            → full / pending
 *   2. Driver cancel           → full / pending
 *   3. Client cancel > 24h    → full / pending
 *   4. Client cancel 12–24h   → partial / pending
 *   5. Client cancel < 12h    → none / not_required
 *   6. Invalid/missing state   → manual_review / manual_review
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RefundDecision = 'full' | 'partial' | 'none' | 'manual_review'

export type RefundStatus =
  | 'pending'
  | 'processed'
  | 'not_required'
  | 'manual_review'
  | 'failed'

export type RefundReasonCode =
  | 'admin_cancelled'
  | 'driver_cancelled'
  | 'client_cancelled_24h'
  | 'client_cancelled_12_24h'
  | 'client_cancelled_under_12h'
  | 'invalid_booking_state'

export interface RefundEvaluation {
  decision: RefundDecision
  status: RefundStatus
  reason: RefundReasonCode
  calculated_at: string // ISO 8601
  hours_before_pickup: number | null
}

export interface RefundBookingInput {
  /** Who cancelled: 'admin' | 'driver' | 'client' | 'system' */
  cancelled_by_type?: string | null
  /** ISO datetime string of the scheduled pickup */
  pickup_datetime?: string | null
  /** ISO datetime string when the booking was cancelled */
  cancelled_at?: string | null
  /** Stripe / Square payment intent ID — used for manual_review check */
  payment_intent_id?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS_FULL_REFUND = 24    // > 24h before pickup → full refund
const HOURS_PARTIAL_REFUND = 12 // 12–24h before pickup → partial refund
// < 12h → no refund

// ─── Helper ───────────────────────────────────────────────────────────────────

function hoursBeforePickup(
  pickupDatetime: string,
  cancelledAt: string,
): number {
  const pickup = new Date(pickupDatetime).getTime()
  const cancelled = new Date(cancelledAt).getTime()
  const diffMs = pickup - cancelled
  return diffMs / (1000 * 60 * 60) // convert ms → hours
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function evaluateRefundDecision(
  booking: RefundBookingInput,
): RefundEvaluation {
  const now = new Date().toISOString()

  // ── Rule 6: Invalid / missing state ────────────────────────────────────────
  const cancelledBy = (booking.cancelled_by_type ?? '').toLowerCase().trim()
  const hasPickup = !!booking.pickup_datetime
  const hasCancelledAt = !!booking.cancelled_at
  const validSources = ['admin', 'driver', 'client', 'system']

  if (!hasPickup || !hasCancelledAt || !validSources.includes(cancelledBy)) {
    return {
      decision: 'manual_review',
      status: 'manual_review',
      reason: 'invalid_booking_state',
      calculated_at: now,
      hours_before_pickup: null,
    }
  }

  // ── Rule 1: Admin cancel ────────────────────────────────────────────────────
  if (cancelledBy === 'admin') {
    return {
      decision: 'full',
      status: 'pending',
      reason: 'admin_cancelled',
      calculated_at: now,
      hours_before_pickup: hoursBeforePickup(
        booking.pickup_datetime!,
        booking.cancelled_at!,
      ),
    }
  }

  // ── Rule 2: Driver cancel ───────────────────────────────────────────────────
  if (cancelledBy === 'driver') {
    return {
      decision: 'full',
      status: 'pending',
      reason: 'driver_cancelled',
      calculated_at: now,
      hours_before_pickup: hoursBeforePickup(
        booking.pickup_datetime!,
        booking.cancelled_at!,
      ),
    }
  }

  // ── Rules 3–5: Client (or system) cancel — time-based ──────────────────────
  const hours = hoursBeforePickup(booking.pickup_datetime!, booking.cancelled_at!)

  if (hours > HOURS_FULL_REFUND) {
    // Rule 3: > 24h → full
    return {
      decision: 'full',
      status: 'pending',
      reason: 'client_cancelled_24h',
      calculated_at: now,
      hours_before_pickup: hours,
    }
  }

  if (hours >= HOURS_PARTIAL_REFUND) {
    // Rule 4: 12–24h → partial
    return {
      decision: 'partial',
      status: 'pending',
      reason: 'client_cancelled_12_24h',
      calculated_at: now,
      hours_before_pickup: hours,
    }
  }

  // Rule 5: < 12h → none
  return {
    decision: 'none',
    status: 'not_required',
    reason: 'client_cancelled_under_12h',
    calculated_at: now,
    hours_before_pickup: hours,
  }
}

// ─── Test Harness (for unit validation) ──────────────────────────────────────

export function runBM20ETests(): void {
  const base = {
    pickup_datetime: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(), // 30h from now
    cancelled_at: new Date().toISOString(),
    payment_intent_id: 'pi_test_123',
  }

  const tests: Array<{ label: string; input: RefundBookingInput; expected: RefundDecision }> = [
    {
      label: 'Test 1 — admin cancel → full',
      input: { ...base, cancelled_by_type: 'admin' },
      expected: 'full',
    },
    {
      label: 'Test 2 — driver cancel → full',
      input: { ...base, cancelled_by_type: 'driver' },
      expected: 'full',
    },
    {
      label: 'Test 3 — client cancel > 24h → full',
      input: { ...base, cancelled_by_type: 'client' },
      expected: 'full',
    },
    {
      label: 'Test 4 — client cancel 18h → partial',
      input: {
        ...base,
        cancelled_by_type: 'client',
        pickup_datetime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      },
      expected: 'partial',
    },
    {
      label: 'Test 5 — client cancel 2h → none',
      input: {
        ...base,
        cancelled_by_type: 'client',
        pickup_datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
      expected: 'none',
    },
  ]

  let allPassed = true
  for (const t of tests) {
    const result = evaluateRefundDecision(t.input)
    const passed = result.decision === t.expected
    if (!passed) allPassed = false
    console.log(
      `[BM20-E] ${passed ? 'PASS' : 'FAIL'} ${t.label} → got: ${result.decision} (expected: ${t.expected})`,
    )
  }
  console.log(`[BM20-E] Tests: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`)
}
