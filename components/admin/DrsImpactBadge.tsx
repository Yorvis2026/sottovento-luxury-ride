/**
 * DrsImpactBadge — BM20-E3: DRS Impact Preview Badge
 *
 * Displays a compact DRS impact preview badge in booking/dispatch list rows.
 * Only renders when a driver is assigned (driverAssigned = true).
 * Returns null for bookings without a driver.
 *
 * Usage:
 *   <DrsImpactBadge impact={-4} driverAssigned={!!booking.assigned_driver_id} />
 *
 * Color logic:
 *   impact < 0  → red   (#f87171 on #3b0000)
 *   impact === 0 → gray  (#6b7280 on #1a1a1a)
 *   impact > 0  → green (#4ade80 on #14532d)  [reserved for future bonuses]
 */

"use client"

interface DrsImpactBadgeProps {
  /** Estimated DRS point change (e.g. -4, -2, 0) */
  impact: number | null | undefined
  /** Badge only renders when a driver is assigned */
  driverAssigned: boolean
  /** Optional: compact mode (smaller font, less padding) */
  compact?: boolean
}

export function DrsImpactBadge({ impact, driverAssigned, compact = false }: DrsImpactBadgeProps) {
  // Rule: only show when driver is assigned
  if (!driverAssigned) return null
  // Don't render if no impact data
  if (impact === null || impact === undefined) return null

  const isNegative = impact < 0
  const isZero     = impact === 0
  const isPositive = impact > 0

  const bg    = isNegative ? "#3b0000" : isZero ? "#1a1a1a" : "#14532d"
  const color = isNegative ? "#f87171" : isZero ? "#6b7280" : "#4ade80"
  const label = impact === 0
    ? "DRS: 0"
    : impact > 0
      ? `DRS +${impact}`
      : `DRS ${impact}`

  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: color,
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        fontFamily: "monospace",
        letterSpacing: "0.06em",
        padding: compact ? "1px 5px" : "2px 7px",
        borderRadius: 4,
        border: `1px solid ${color}30`,
        whiteSpace: "nowrap" as const,
        lineHeight: 1.4,
      }}
    >
      {label}
    </span>
  )
}
