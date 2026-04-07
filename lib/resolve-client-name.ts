/**
 * BM20-D — resolveBookingClientName
 *
 * Single source of truth for resolving the display name of a booking's client
 * across all panels (admin, driver, confirmation, dispatch).
 *
 * Priority chain (first non-empty wins):
 *   1. passenger_name      — explicit passenger override (e.g. "Booking for John")
 *   2. client_name_override — manual admin override stored in bookings table
 *   3. client_name          — resolved from clients.full_name via JOIN
 *   4. client_email         — email as fallback identifier
 *   5. "Unknown Client"     — final fallback
 *
 * This prevents "Test 15" (a test client name in clients table) from appearing
 * in production views when a proper passenger_name or override is available.
 */
export function resolveBookingClientName(booking: {
  passenger_name?: string | null
  client_name_override?: string | null
  client_name?: string | null
  client_email?: string | null
}): string {
  const candidates = [
    booking.passenger_name,
    booking.client_name_override,
    booking.client_name,
    booking.client_email,
  ]
  for (const c of candidates) {
    const trimmed = c?.trim()
    if (trimmed && trimmed.length > 0) return trimmed
  }
  return "Unknown Client"
}

/**
 * SQL COALESCE expression for use in raw queries.
 * Returns the SQL snippet that resolves the client name with the same priority chain.
 * Usage: `${clientNameCoalesce} AS client_name`
 *
 * Assumes table aliases:
 *   b = bookings
 *   c = clients (LEFT JOIN)
 */
export const clientNameCoalesce =
  `COALESCE(NULLIF(TRIM(b.passenger_name), ''), NULLIF(TRIM(b.client_name_override), ''), NULLIF(TRIM(c.full_name), ''), b.client_email)`
