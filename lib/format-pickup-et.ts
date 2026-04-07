/**
 * BM20-D — formatBookingPickupET
 *
 * Single source of truth for rendering a booking pickup datetime in
 * America/New_York (Eastern Time) across all panels:
 *   - Admin panel (reservas, dispatch, booking detail)
 *   - Driver panel (offer screen, upcoming, assigned)
 *   - Booking confirmation page
 *   - Cancel audit / overdue engine
 *
 * Rules:
 *   1. Storage = UTC (PostgreSQL timestamptz)
 *   2. Display = America/New_York
 *   3. Never use new Date(ambiguous_string) without explicit timezone
 *   4. If input already carries an offset (ISO 8601 with ±HH:MM), use it directly
 *
 * @param pickupAt  ISO 8601 string from DB (e.g. "2026-04-07T17:30:00.000Z")
 *                  or legacy string without offset (treated as ET for backward compat)
 * @param format    "short" | "long" | "time_only" | "date_only" | "full"
 * @returns         Formatted string in ET, e.g. "Apr 7, 2026 at 1:30 PM ET"
 */
export function formatBookingPickupET(
  pickupAt: string | null | undefined,
  format: "short" | "long" | "time_only" | "date_only" | "full" = "long"
): string {
  if (!pickupAt) return "—"

  let date: Date

  // If the string has no timezone indicator (no Z, no +, no - after the time part),
  // it is a legacy naive string stored WITHOUT offset — treat as ET (backward compat).
  // New bookings (post BM20-D) will always have an explicit offset.
  const hasOffset = /[Zz]$/.test(pickupAt) || /[+-]\d{2}:\d{2}$/.test(pickupAt)
  if (!hasOffset) {
    // Legacy naive string: "2026-04-07T13:30:00" — interpret as ET
    // We append the current ET offset to avoid UTC misinterpretation.
    const etOffset = getEasternOffsetForDate(pickupAt)
    date = new Date(`${pickupAt}${etOffset}`)
  } else {
    date = new Date(pickupAt)
  }

  if (isNaN(date.getTime())) return pickupAt ?? "—"

  const tz = "America/New_York"

  switch (format) {
    case "time_only":
      return date.toLocaleTimeString("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) + " ET"

    case "date_only":
      return date.toLocaleDateString("en-US", {
        timeZone: tz,
        month: "short",
        day: "numeric",
        year: "numeric",
      })

    case "short":
      // "Apr 7 · 1:30 PM"
      return (
        date.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" }) +
        " · " +
        date.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
      )

    case "full":
      // "Monday, April 7, 2026 at 1:30 PM ET"
      return (
        date.toLocaleDateString("en-US", {
          timeZone: tz,
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }) +
        " at " +
        date.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }) +
        " ET"
      )

    case "long":
    default:
      // "Apr 7, 2026 at 1:30 PM ET"
      return (
        date.toLocaleDateString("en-US", {
          timeZone: tz,
          month: "short",
          day: "numeric",
          year: "numeric",
        }) +
        " at " +
        date.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }) +
        " ET"
      )
  }
}

/**
 * Returns the ISO offset string for America/New_York at a given naive datetime.
 * Handles EDT (-04:00) and EST (-05:00) automatically across DST boundaries.
 * Used for backward-compat legacy strings without timezone info.
 */
function getEasternOffsetForDate(naiveDateStr: string): string {
  // Use noon UTC on the same date to determine the ET offset for that day
  const datePart = naiveDateStr.split("T")[0] ?? naiveDateStr.substring(0, 10)
  const probe = new Date(`${datePart}T12:00:00Z`)
  const etParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(probe)
  const get = (t: string) => etParts.find(p => p.type === t)?.value ?? "00"
  const etAsUtc = new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`
  )
  const offsetMs = probe.getTime() - etAsUtc.getTime()
  const offsetH = Math.round(offsetMs / 3600000)
  const sign = offsetH >= 0 ? "-" : "+"
  const absH = Math.abs(offsetH).toString().padStart(2, "0")
  return `${sign}${absH}:00`
}

/**
 * Convenience: format just the time portion in ET.
 * e.g. "1:30 PM ET"
 */
export function formatPickupTimeET(pickupAt: string | null | undefined): string {
  return formatBookingPickupET(pickupAt, "time_only")
}

/**
 * Convenience: format just the date portion in ET.
 * e.g. "Apr 7, 2026"
 */
export function formatPickupDateET(pickupAt: string | null | undefined): string {
  return formatBookingPickupET(pickupAt, "date_only")
}
