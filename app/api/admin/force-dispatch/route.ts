import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

/**
 * POST /api/admin/force-dispatch
 *
 * Force-dispatch a specific booking (or all eligible bookings) that are:
 *   - payment_status = paid
 *   - dispatch_status = needs_review OR ready (stuck)
 *   - captured_by_driver_code IS NOT NULL
 *
 * This endpoint corrects bookings that were misclassified due to:
 *   1. pickup_address being null (zone-only tablet bookings)
 *   2. Field name mismatch between /api/checkout and webhook
 *
 * Body (optional):
 *   { booking_id: "uuid" }  — target a specific booking
 *   {}                      — process ALL eligible bookings
 *
 * Security: requires x-admin-secret header
 */
export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret") || ""
  const validSecret = process.env.ADMIN_SECRET || "sln-admin-2026"
  if (adminSecret !== validSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { booking_id?: string } = {}
  try {
    body = await req.json()
  } catch { /* no body */ }

  const results: Record<string, unknown>[] = []

  try {
    // Find eligible bookings
    const eligibleBookings = body.booking_id
      ? await sql`
          SELECT
            b.id, b.status, b.dispatch_status, b.payment_status,
            b.captured_by_driver_code, b.pickup_zone, b.dropoff_zone,
            b.pickup_address, b.dropoff_address, b.vehicle_type,
            b.pickup_at, b.total_price,
            d.id AS driver_db_id, d.driver_code, d.full_name AS driver_name,
            d.status AS driver_status, d.eligible AS driver_eligible
          FROM bookings b
          LEFT JOIN drivers d ON UPPER(TRIM(d.driver_code)) = UPPER(TRIM(b.captured_by_driver_code))
          WHERE b.id = ${body.booking_id}::uuid
            AND b.payment_status = 'paid'
          LIMIT 1
        `
      : await sql`
          SELECT
            b.id, b.status, b.dispatch_status, b.payment_status,
            b.captured_by_driver_code, b.pickup_zone, b.dropoff_zone,
            b.pickup_address, b.dropoff_address, b.vehicle_type,
            b.pickup_at, b.total_price,
            d.id AS driver_db_id, d.driver_code, d.full_name AS driver_name,
            d.status AS driver_status, d.eligible AS driver_eligible
          FROM bookings b
          LEFT JOIN drivers d ON UPPER(TRIM(d.driver_code)) = UPPER(TRIM(b.captured_by_driver_code))
          WHERE b.payment_status = 'paid'
            AND b.dispatch_status IN ('needs_review', 'ready', 'ready_for_dispatch')
            AND b.captured_by_driver_code IS NOT NULL
            AND b.captured_by_driver_code != 'public_site'
            AND b.status NOT IN ('completed', 'cancelled', 'archived', 'in_trip', 'en_route')
          ORDER BY b.created_at DESC
          LIMIT 20
        `

    if (eligibleBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No eligible bookings found for force-dispatch",
        processed: 0,
        results: [],
      })
    }

    for (const booking of eligibleBookings) {
      const bookingId = booking.id as string
      const capturedBy = (booking.captured_by_driver_code as string || "").trim().toUpperCase()
      const driverDbId = booking.driver_db_id as string | null
      const driverEligible = booking.driver_eligible as boolean
      const driverStatus = booking.driver_status as string

      // Determine location evidence
      const pickupEvidence = (booking.pickup_address as string || "").trim()
        || (booking.pickup_zone as string || "").trim()
      const dropoffEvidence = (booking.dropoff_address as string || "").trim()
        || (booking.dropoff_zone as string || "").trim()
      const vehicleType = (booking.vehicle_type as string || "").trim()

      const hasLocationEvidence = !!(pickupEvidence && dropoffEvidence)
      const hasVehicle = !!vehicleType

      if (!hasLocationEvidence || !hasVehicle) {
        results.push({
          booking_id: bookingId.slice(0, 8),
          action: "skipped",
          reason: `Missing: ${!hasLocationEvidence ? "location" : ""} ${!hasVehicle ? "vehicle" : ""}`.trim(),
        })
        continue
      }

      const offerExpiresAt = new Date(Date.now() + 120 * 1000).toISOString()

      // Case 1: Captured driver is known, active, and eligible → assign as offer_pending
      if (driverDbId && driverStatus === "active" && driverEligible) {
        const updated = await sql`
          UPDATE bookings
          SET
            status = 'offer_pending',
            dispatch_status = 'offer_pending',
            assigned_driver_id = ${driverDbId}::uuid,
            offer_status = 'pending',
            offer_stage = 'source_owner',
            offer_expires_at = ${offerExpiresAt}::timestamptz,
            updated_at = NOW()
          WHERE id = ${bookingId}::uuid
            AND payment_status = 'paid'
            AND status NOT IN ('completed', 'cancelled', 'archived', 'in_trip', 'en_route', 'accepted')
          RETURNING id, status, dispatch_status, assigned_driver_id
        `

        if (updated.length > 0) {
          // Audit log
          try {
            await sql`
              INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
              VALUES (
                ${bookingId}::uuid,
                'booking',
                'force_dispatch_applied',
                ${JSON.stringify({
                  reason: "force_dispatch_endpoint",
                  driver_code: capturedBy,
                  driver_id: driverDbId,
                  pickup_evidence: pickupEvidence,
                  dropoff_evidence: dropoffEvidence,
                  previous_dispatch_status: booking.dispatch_status,
                })},
                NOW()
              )
            `
          } catch { /* non-blocking */ }

          results.push({
            booking_id: bookingId.slice(0, 8),
            action: "dispatched",
            new_status: "offer_pending",
            assigned_to: capturedBy,
            driver_name: booking.driver_name,
            pickup: pickupEvidence,
            dropoff: dropoffEvidence,
          })
        } else {
          results.push({
            booking_id: bookingId.slice(0, 8),
            action: "no_update",
            reason: "booking_in_terminal_state_or_already_processed",
          })
        }
      } else {
        // Case 2: Driver not found or not eligible → escalate to ready_for_dispatch for pool
        const updated = await sql`
          UPDATE bookings
          SET
            status = 'new',
            dispatch_status = 'ready_for_dispatch',
            offer_status = 'pending',
            offer_stage = 'sln_member',
            offer_expires_at = ${offerExpiresAt}::timestamptz,
            updated_at = NOW()
          WHERE id = ${bookingId}::uuid
            AND payment_status = 'paid'
            AND status NOT IN ('completed', 'cancelled', 'archived', 'in_trip', 'en_route', 'accepted')
          RETURNING id, status, dispatch_status
        `

        if (updated.length > 0) {
          results.push({
            booking_id: bookingId.slice(0, 8),
            action: "escalated_to_pool",
            new_status: "ready_for_dispatch",
            reason: driverDbId
              ? `driver_${capturedBy}_not_eligible`
              : `driver_${capturedBy}_not_found`,
            pickup: pickupEvidence,
            dropoff: dropoffEvidence,
          })
        } else {
          results.push({
            booking_id: bookingId.slice(0, 8),
            action: "no_update",
            reason: "booking_in_terminal_state_or_already_processed",
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
