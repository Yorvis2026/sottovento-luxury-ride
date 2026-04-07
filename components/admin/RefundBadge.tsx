/**
 * RefundBadge — BM20-E2: Refund Preview Badge
 *
 * Displays a compact refund decision badge in booking/dispatch list rows.
 * Only renders when cancelled_at is set (booking is cancelled).
 * Returns null for active bookings.
 *
 * Usage:
 *   <RefundBadge decision={booking.refund_decision} cancelledAt={booking.cancelled_at} />
 */

"use client"

export type RefundDecision = "full" | "partial" | "none" | "manual_review" | null | undefined

interface RefundBadgeProps {
  /** Engine decision: full | partial | none | manual_review */
  decision: RefundDecision
  /** ISO timestamp — badge only renders when this is set */
  cancelledAt?: string | null
  /** Optional: compact mode (smaller font, less padding) */
  compact?: boolean
}

const REFUND_BADGE_MAP: Record<string, { bg: string; color: string; label: string }> = {
  full:          { bg: "#14532d", color: "#4ade80", label: "REFUND: FULL" },
  partial:       { bg: "#3b2200", color: "#fbbf24", label: "REFUND: PARTIAL" },
  none:          { bg: "#1a1a1a", color: "#6b7280", label: "REFUND: NONE" },
  manual_review: { bg: "#1e3a5f", color: "#60a5fa", label: "REFUND: REVIEW" },
}

export function RefundBadge({ decision, cancelledAt, compact = false }: RefundBadgeProps) {
  // Only show when booking is cancelled (cancelled_at is set)
  if (!cancelledAt) return null
  // Don't render if no engine decision yet
  if (!decision) return null

  const style = REFUND_BADGE_MAP[decision] ?? REFUND_BADGE_MAP["manual_review"]

  return (
    <span
      style={{
        display: "inline-block",
        background: style.bg,
        color: style.color,
        fontSize: compact ? 9 : 10,
        fontWeight: 700,
        fontFamily: "monospace",
        letterSpacing: "0.06em",
        padding: compact ? "1px 5px" : "2px 7px",
        borderRadius: 4,
        border: `1px solid ${style.color}30`,
        whiteSpace: "nowrap" as const,
        lineHeight: 1.4,
      }}
    >
      {style.label}
    </span>
  )
}
