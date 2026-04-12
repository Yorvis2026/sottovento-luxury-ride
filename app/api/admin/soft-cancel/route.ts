/**
 * POST /api/admin/soft-cancel
 *
 * BM-CANCEL-STATE-SLN-02 — Section 5: Admin soft cancel
 *
 * Releases a booking back to the dispatch pool WITHOUT marking it as terminal.
 * Result:
 *   booking_status = 'ready_for_dispatch'
 *   dispatch_status = 'reassignment_needed'
 *   assigned_driver_id = NULL
 *
 * This is a REDISPATCHABLE state — the booking stays alive.
 * Use this when admin wants to release a booking from a driver and re-queue it.
 *
 * Terminal guard: blocks execution if booking is already in a terminal state
 * (completed, cancelled_by_passenger, cancelled_by_admin, cancelled).
 */

export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// Terminal states — cannot be soft-cancelled
const TERMINAL_STATES = ['completed', 'cancelled', 'cancelled_by_passenger', 'cancelled_by_admin', 'archived']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { booking_id, reason, admin_note } = body as {
      booking_id: string
      reason?: string
      admin_note?: string
    }

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id is required" }, { status: 400 })
    }

    // Fetch current booking state
    const rows = await sql`
      SELECT id, status, dispatch_status, assigned_driver_id
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = rows[0]

    // Section 7: Terminal state guard
    if (TERMINAL_STATES.includes(booking.status)) {
      return NextResponse.json(
        {
          error: "Cannot soft-cancel a terminal booking",
          current_status: booking.status,
          terminal_states: TERMINAL_STATES,
        },
        { status: 409 }
      )
    }

    // Apply soft cancel: release to dispatch pool
    await sql`
      UPDATE bookings
      SET
        status             = 'ready_for_dispatch',
        dispatch_status    = 'reassignment_needed',
        assigned_driver_id = NULL,
        cancelled_by       = 'admin_soft_cancel',
        cancelled_by_type  = 'admin',
        cancel_reason_code = ${reason ?? 'admin_soft_cancel'},
        cancel_reason_text = ${admin_note ?? reason ?? 'Admin soft cancel — booking released to dispatch pool'},
        updated_at         = NOW()
      WHERE id = ${booking_id}::uuid
    `

    // Audit log
    try {
      await sql`
        INSERT INTO audit_logs (booking_id, action, actor, source, details, created_at)
        VALUES (
          ${booking_id}::uuid,
          'admin_soft_cancel',
          'admin',
          'admin-panel',
          ${JSON.stringify({
            previous_status: booking.status,
            previous_dispatch_status: booking.dispatch_status,
            previous_assigned_driver_id: booking.assigned_driver_id,
            reason: reason ?? 'admin_soft_cancel',
            admin_note: admin_note ?? null,
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
      new_status: 'ready_for_dispatch',
      dispatch_status: 'reassignment_needed',
      assigned_driver_id: null,
      message: "Booking released to dispatch pool (soft cancel — redispatchable)",
    })
  } catch (err: any) {
    console.error("[admin/soft-cancel] error:", err?.message)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
