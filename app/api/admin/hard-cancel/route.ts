/**
 * POST /api/admin/hard-cancel
 *
 * BM-CANCEL-STATE-SLN-02 — Section 6: Admin hard cancel (terminal state)
 *
 * Permanently cancels a booking. This is a TERMINAL state — no redispatch possible.
 * Result:
 *   booking_status = 'cancelled_by_admin'
 *   dispatch_status = NULL
 *   assigned_driver_id = NULL
 *
 * Terminal guard: blocks re-cancellation if booking is already in a terminal state.
 *
 * Use this when admin wants to definitively close a booking (refund, no-show, etc).
 */

export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// Terminal states — cannot be hard-cancelled again
const TERMINAL_STATES = ['completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin', 'archived']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { booking_id, reason, admin_note, cancelled_by_role } = body as {
      booking_id: string
      reason?: string
      admin_note?: string
      cancelled_by_role?: string
    }

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id is required" }, { status: 400 })
    }

    // Fetch current booking state
    const rows = await sql`
      SELECT id, status, dispatch_status, assigned_driver_id, pickup_at
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = rows[0]

    // Section 7: Terminal state guard — prevent double-cancel
    if (TERMINAL_STATES.includes(booking.status)) {
      return NextResponse.json(
        {
          error: "Booking is already in a terminal state",
          current_status: booking.status,
          terminal_states: TERMINAL_STATES,
        },
        { status: 409 }
      )
    }

    const cancelTimestamp = new Date().toISOString()
    const cancelledByRole = cancelled_by_role ?? 'admin'
    const cancelReasonCode = reason ?? 'admin_hard_cancel'
    const cancelReasonText = admin_note ?? reason ?? 'Admin hard cancel — booking permanently closed'

    // Determine cancel_stage based on booking status at time of cancellation
    let cancelStage: string
    if (['new', 'quote_sent', 'awaiting_payment', 'confirmed', 'ready_for_dispatch', 'system_reassignment_required'].includes(booking.status)) {
      cancelStage = 'before_assignment'
    } else if (['assigned_not_started', 'reserved', 'offer_pending'].includes(booking.status)) {
      cancelStage = 'assigned'
    } else if (['en_route', 'arrived', 'in_trip', 'in_progress'].includes(booking.status)) {
      cancelStage = 'in_progress'
    } else if (booking.status === 'driver_issue') {
      cancelStage = 'post_driver_issue'
    } else {
      cancelStage = 'before_assignment'
    }

    // Apply hard cancel: terminal state
    await sql`
      UPDATE bookings
      SET
        status             = 'cancelled_by_admin',
        dispatch_status    = NULL,
        assigned_driver_id = NULL,
        cancelled_by       = ${cancelledByRole},
        cancelled_by_type  = 'admin',
        cancel_reason_code = ${cancelReasonCode},
        cancel_reason_text = ${cancelReasonText},
        cancel_stage       = ${cancelStage},
        cancelled_at       = ${cancelTimestamp}::timestamptz,
        updated_at         = NOW()
      WHERE id = ${booking_id}::uuid
    `

    // Audit log
    try {
      await sql`
        INSERT INTO audit_logs (booking_id, action, actor, source, details, created_at)
        VALUES (
          ${booking_id}::uuid,
          'admin_hard_cancel',
          'admin',
          'admin-panel',
          ${JSON.stringify({
            previous_status: booking.status,
            previous_dispatch_status: booking.dispatch_status,
            previous_assigned_driver_id: booking.assigned_driver_id,
            cancel_reason_code: cancelReasonCode,
            cancel_reason_text: cancelReasonText,
            cancel_stage: cancelStage,
            cancelled_by_role: cancelledByRole,
            cancel_timestamp: cancelTimestamp,
            bm_version: 'BM-CANCEL-STATE-SLN-02',
          })},
          NOW()
        )
      `
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      booking_id,
      previous_status: booking.status,
      new_status: 'cancelled_by_admin',
      dispatch_status: null,
      assigned_driver_id: null,
      cancel_stage: cancelStage,
      cancelled_at: cancelTimestamp,
      message: "Booking permanently cancelled (hard cancel — terminal state)",
    })
  } catch (err: any) {
    console.error("[admin/hard-cancel] error:", err?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
