/**
 * calcPreviewImpact — BM20-E3: DRS Impact Preview Helper
 *
 * Computes an estimated DRS (Driver Reliability Score) impact for a given
 * action type BEFORE the action is executed. This is a read-only preview —
 * it does NOT modify the actual DRS, metrics engine, BM19, or BM4.
 *
 * Impact table (SLN v1) — aligned with BM19 / BM4 architecture:
 *
 *   driver_cancel       → −4
 *   driver_reject       → −2
 *   driver_timeout      → −2
 *   late_accept         → −1
 *   fallback_auto_route → −1
 *   admin_cancel        →  0
 *   client_cancel       →  0
 *
 * Rule: Only return a preview when a driver is assigned (driver_id != null).
 *       If no driver is assigned, returns null (badge hidden).
 *
 * Usage:
 *   const preview = calcPreviewImpact("driver_cancel", booking)
 *   // { impactPoints: -4, impactReason: "driver_cancel" }
 */

export type DrsActionType =
  | "driver_cancel"
  | "driver_reject"
  | "driver_timeout"
  | "late_accept"
  | "fallback_auto_route"
  | "admin_cancel"
  | "client_cancel"

export interface DrsPreviewResult {
  impactPoints: number
  impactReason: DrsActionType
}

/** SLN v1 impact table — read-only, does NOT touch real DRS */
const DRS_IMPACT_TABLE: Record<DrsActionType, number> = {
  driver_cancel:       -4,
  driver_reject:       -2,
  driver_timeout:      -2,
  late_accept:         -1,
  fallback_auto_route: -1,
  admin_cancel:         0,
  client_cancel:        0,
}

/**
 * Infer the most likely DRS action type from a booking's cancellation context.
 * Used by endpoints to auto-derive the action without requiring explicit input.
 *
 * Priority order:
 *   1. cancelled_by_type = "driver"   → driver_cancel
 *   2. cancelled_by_type = "admin"    → admin_cancel
 *   3. cancelled_by_type = "client"   → client_cancel
 *   4. dispatch_status = "driver_rejected" → driver_reject
 *   5. dispatch_status = "driver_timeout"  → driver_timeout
 *   6. status = "driver_issue"             → driver_reject
 *   7. fallback                            → admin_cancel (safe default)
 */
export function inferDrsActionType(booking: {
  cancelled_by_type?: string | null
  dispatch_status?: string | null
  status?: string | null
}): DrsActionType {
  const cbt = booking.cancelled_by_type ?? ""
  const ds  = booking.dispatch_status ?? ""
  const s   = booking.status ?? ""

  if (cbt === "driver")                       return "driver_cancel"
  if (cbt === "admin")                        return "admin_cancel"
  if (cbt === "client" || cbt === "passenger") return "client_cancel"
  if (ds === "driver_rejected")               return "driver_reject"
  if (ds === "driver_timeout" || ds === "expired") return "driver_timeout"
  if (s === "driver_issue" || s === "driver_issue_final") return "driver_reject"
  return "admin_cancel" // safe default — 0 impact
}

/**
 * Calculate DRS preview impact for a given action and booking context.
 *
 * @param actionType - The action being previewed
 * @param booking    - Booking object; must have assigned_driver_id to return a result
 * @returns DrsPreviewResult | null — null when no driver is assigned
 */
export function calcPreviewImpact(
  actionType: DrsActionType,
  booking: { assigned_driver_id?: string | null }
): DrsPreviewResult | null {
  // Rule: only show preview when a driver is assigned
  if (!booking.assigned_driver_id) return null

  const impactPoints = DRS_IMPACT_TABLE[actionType] ?? 0

  return {
    impactPoints,
    impactReason: actionType,
  }
}

/**
 * Convenience: auto-infer action type from booking context and return preview.
 * Used by endpoints to attach drs_preview_impact without extra input.
 *
 * @param booking - Full booking row from DB
 * @returns DrsPreviewResult | null
 */
export function calcPreviewImpactAuto(booking: {
  assigned_driver_id?: string | null
  cancelled_by_type?: string | null
  dispatch_status?: string | null
  status?: string | null
}): DrsPreviewResult | null {
  if (!booking.assigned_driver_id) return null
  const actionType = inferDrsActionType(booking)
  return calcPreviewImpact(actionType, booking)
}
