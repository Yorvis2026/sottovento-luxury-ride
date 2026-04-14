// ─────────────────────────────────────────────────────────────────────────────
// createDispatchOfferAndNotify() — SLN-ARCHITECTURE-REFINE-01
//
// Central orchestrator for all dispatch offer creation.
// Guarantees:
//   1. Terminal state protection — aborts if booking is already accepted/closed
//   2. Atomic supersession — marks all previous pending offers as 'superseded'
//   3. Soft idempotency — conditional INSERT prevents duplicate pending offers
//      for the same (booking_id, driver_id) when response='pending' already exists
//   4. Authoritative TTL — expires_at calculated here, not in each endpoint
//   5. Push decoupled from DB — push fires only if a new row was inserted
//
// DOES NOT modify: service worker, subscription flow, DB schema, UI components.
// ─────────────────────────────────────────────────────────────────────────────

import { sendPushToDriver } from '@/lib/push/send-push'

// Authoritative offer window policy (minutes) per round
const OFFER_WINDOW_MINUTES: Record<number, number> = {
  1: 10,
  2: 5,
  3: 3,
}
const DEFAULT_OFFER_WINDOW_MINUTES = 5

export interface CreateOfferParams {
  booking_id:       string
  driver_id:        string
  driver_code:      string
  offer_round:      number
  offer_type:       'source' | 'pool'
  is_source_offer?: boolean
  is_fallback_offer?: boolean
  is_rescue_offer?: boolean
  pickup_text:      string
  price:            number
  // Optional overrides
  window_minutes?:  number   // override TTL (e.g. smart-reassign rescue = 3 min)
  // Neon sql tagged-template function — passed in so orchestrator stays stateless
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql:              any
}

export interface CreateOfferResult {
  offer_id:    string | null   // null if idempotency guard blocked the insert
  expires_at:  string          // ISO string of the calculated expiry
  was_created: boolean         // false if a pending offer already existed
}

export async function createDispatchOfferAndNotify(
  params: CreateOfferParams
): Promise<CreateOfferResult> {
  const {
    booking_id,
    driver_id,
    driver_code,
    offer_round,
    offer_type,
    is_source_offer  = false,
    is_fallback_offer = false,
    is_rescue_offer  = false,
    pickup_text,
    price,
    window_minutes,
    sql,
  } = params

  // ── 1. Calculate authoritative TTL ───────────────────────────────────────
  const ttlMinutes = window_minutes ?? OFFER_WINDOW_MINUTES[offer_round] ?? DEFAULT_OFFER_WINDOW_MINUTES
  const expiresAt  = new Date(Date.now() + ttlMinutes * 60 * 1000)
  const expiresAtISO = expiresAt.toISOString()

  // ── 2. Terminal state protection ─────────────────────────────────────────
  // Abort if the booking is already in a closed state.
  // This prevents creating offers for rides that are already accepted or completed.
  const terminalRows = await sql`
    SELECT id FROM bookings
    WHERE id = ${booking_id}::uuid
      AND status NOT IN (
        'completed', 'cancelled', 'archived', 'no_show',
        'in_trip', 'en_route', 'arrived', 'accepted'
      )
      AND dispatch_state != 'ASSIGNED'
    LIMIT 1
  `
  if (!terminalRows.length) {
    console.warn('[orchestrator] Booking is in terminal/closed state — aborting offer creation', { booking_id })
    return { offer_id: null, expires_at: expiresAtISO, was_created: false }
  }

  // ── 3. Atomic supersession of existing pending offers ────────────────────
  // Ensures only one pending offer exists per booking at any time.
  await sql`
    UPDATE dispatch_offers
    SET response = 'superseded', responded_at = NOW()
    WHERE booking_id = ${booking_id}::uuid
      AND response = 'pending'
  `

  // ── 4. Soft-idempotent INSERT ─────────────────────────────────────────────
  // Uses WHERE NOT EXISTS to prevent duplicate inserts if the same
  // (booking_id, driver_id) with response='pending' was just created
  // (e.g. cron double-fire, concurrent requests).
  // Note: After step 3, any previously pending offer is now 'superseded',
  // so this guard primarily protects against true concurrent race conditions
  // where step 3 and step 4 run simultaneously in two requests.
  const newOfferRows = await sql`
    INSERT INTO dispatch_offers (
      booking_id, driver_id,
      offer_round, round_number,
      is_source_offer, is_fallback_offer, is_rescue_offer,
      response, sent_at, expires_at, created_at
    )
    SELECT
      ${booking_id}::uuid,
      ${driver_id}::uuid,
      ${offer_round},
      ${offer_round},
      ${is_source_offer},
      ${is_fallback_offer},
      ${is_rescue_offer},
      'pending',
      NOW(),
      ${expiresAtISO}::timestamptz,
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM dispatch_offers
      WHERE booking_id = ${booking_id}::uuid
        AND driver_id  = ${driver_id}::uuid
        AND response   = 'pending'
    )
    RETURNING id::text
  `

  const newOfferId = newOfferRows[0]?.id ?? null

  if (!newOfferId) {
    // Idempotency guard fired — a pending offer already exists for this driver+booking
    console.warn('[orchestrator] Idempotency guard: pending offer already exists — skipping push', {
      booking_id,
      driver_id,
    })
    return { offer_id: null, expires_at: expiresAtISO, was_created: false }
  }

  // ── 5. Fire push notification (only if new offer was created) ────────────
  // Non-blocking — never interrupts dispatch flow.
  // Push uses booking_id as tag → iOS replaces previous lockscreen alert.
  sendPushToDriver(driver_id, {
    offer_id:    newOfferId,
    offer_type,
    offer_round,
    driver_code,
    booking_id,
    pickup_text: pickup_text.slice(0, 60),
    price,
    expires_at:  expiresAtISO,
    deep_link:   `/driver/${driver_code}`,
  }).catch(() => null)

  return { offer_id: newOfferId, expires_at: expiresAtISO, was_created: true }
}
