export const dynamic = "force-dynamic"
/**
 * GET /api/admin/dispatch/candidates?booking_id=<uuid>
 *
 * Returns the full ranked candidate pool for a booking using the
 * Smart Dispatch Priority Engine V1.
 *
 * Response shape:
 * {
 *   booking_id: string,
 *   service_location_type: string,
 *   service_type: string,
 *   source_driver_override: boolean,
 *   source_driver_id: string | null,
 *   ranked: RankedCandidate[],
 *   excluded: ExcludedCandidate[],
 *   audit_payload: object
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import {
  runPriorityEngine,
  type DriverCandidate,
  type BookingContext,
  type ServiceType,
} from "@/lib/dispatch/priority-engine";
import {
  deriveServiceLocationType,
  type ServiceLocationType,
} from "@/lib/vehicles/gate";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("booking_id");

    if (!bookingId) {
      return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
    }

    // ── 1. Fetch booking context ──────────────────────────────────────────
    const [booking] = await sql`
      SELECT
        b.id,
        b.pickup_zone,
        COALESCE(b.service_type, 'standard') AS service_type,
        COALESCE(b.source_driver_id::text, NULL) AS source_driver_id
      FROM bookings b
      WHERE b.id = ${bookingId}::uuid
      LIMIT 1
    `;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const slt = deriveServiceLocationType(booking.pickup_zone ?? "") as ServiceLocationType | "";

    const bookingCtx: BookingContext = {
      id:                   booking.id,
      pickup_zone:          booking.pickup_zone ?? "",
      service_type:         (booking.service_type as ServiceType) || "standard",
      source_driver_id:     booking.source_driver_id ?? null,
      service_location_type: slt as ServiceLocationType,
    };

    // ── 2. Fetch all active/provisional drivers with scoring fields ───────
    const driverRows = await sql`
      SELECT
        d.id,
        d.driver_code,
        d.full_name,
        COALESCE(d.driver_status, 'active')                     AS driver_status,
        COALESCE(d.driver_score_total, 75)::integer             AS driver_score_total,
        COALESCE(d.driver_score_tier, 'GOLD')                   AS driver_score_tier,
        COALESCE(d.is_eligible_for_premium_dispatch, false)     AS is_eligible_for_premium_dispatch,
        COALESCE(d.is_eligible_for_airport_priority, false)     AS is_eligible_for_airport_priority,
        COALESCE(d.rides_completed, 0)::integer                 AS rides_completed,
        COALESCE(d.on_time_rides, 0)::integer                   AS on_time_rides,
        COALESCE(d.late_cancel_count, 0)::integer               AS late_cancel_count,
        COALESCE(d.complaint_count, 0)::integer                 AS complaint_count,
        COALESCE(d.availability_status, 'offline')              AS availability_status
      FROM drivers d
      WHERE d.driver_status IN ('active', 'provisional')
        AND d.is_eligible = true
      ORDER BY d.full_name ASC
    `;

    // ── 3. Fetch primary vehicles for all drivers ─────────────────────────
    const driverIds = driverRows.map((d: any) => d.id);
    let vehicleMap: Record<string, any> = {};

    if (driverIds.length > 0) {
      const vehicleRows = await sql`
        SELECT
          v.driver_id,
          v.id,
          v.vehicle_status,
          v.city_permit_status,
          v.airport_permit_mco_status,
          v.port_permit_canaveral_status,
          v.insurance_status,
          v.registration_status,
          v.make,
          v.model,
          v.plate
        FROM vehicles v
        WHERE v.driver_id = ANY(${driverIds}::uuid[])
          AND v.vehicle_status = 'active'
        ORDER BY v.is_primary DESC, v.created_at ASC
      `;
      // Keep only the first (primary) vehicle per driver
      for (const v of vehicleRows) {
        if (!vehicleMap[v.driver_id]) {
          vehicleMap[v.driver_id] = v;
        }
      }
    }

    // ── 4. Fetch recent behavior (last 7 days) from audit_logs ───────────
    let recentBehaviorMap: Record<string, { late_cancel: number; complaint: number; no_response: number }> = {};
    try {
      const recentRows = await sql`
        SELECT
          al.entity_id AS driver_id,
          SUM(CASE WHEN al.action = 'late_cancel_driver'        THEN 1 ELSE 0 END)::integer AS late_cancel,
          SUM(CASE WHEN al.action = 'client_complaint'          THEN 1 ELSE 0 END)::integer AS complaint,
          SUM(CASE WHEN al.action = 'no_response_offer_timeout' THEN 1 ELSE 0 END)::integer AS no_response
        FROM audit_logs al
        WHERE al.entity_type = 'driver'
          AND al.created_at > NOW() - INTERVAL '7 days'
          AND al.action IN ('late_cancel_driver', 'client_complaint', 'no_response_offer_timeout')
        GROUP BY al.entity_id
      `;
      for (const r of recentRows) {
        recentBehaviorMap[r.driver_id] = {
          late_cancel:  r.late_cancel  ?? 0,
          complaint:    r.complaint    ?? 0,
          no_response:  r.no_response  ?? 0,
        };
      }
    } catch {
      // audit_logs may not have these entries yet — non-blocking
    }

    // ── 5. Build DriverCandidate array ────────────────────────────────────
    const candidates: DriverCandidate[] = driverRows.map((d: any) => {
      const behavior = recentBehaviorMap[d.id] ?? { late_cancel: 0, complaint: 0, no_response: 0 };
      return {
        id:                               d.id,
        driver_code:                      d.driver_code,
        full_name:                        d.full_name,
        driver_status:                    d.driver_status,
        driver_score_total:               d.driver_score_total,
        driver_score_tier:                d.driver_score_tier,
        is_eligible_for_premium_dispatch: d.is_eligible_for_premium_dispatch,
        is_eligible_for_airport_priority: d.is_eligible_for_airport_priority,
        rides_completed:                  d.rides_completed,
        on_time_rides:                    d.on_time_rides,
        late_cancel_count:                d.late_cancel_count,
        complaint_count:                  d.complaint_count,
        late_cancel_recent:               behavior.late_cancel,
        complaint_recent:                 behavior.complaint,
        no_response_recent:               behavior.no_response,
        vehicle:                          vehicleMap[d.id] ?? null,
        availability_status:              d.availability_status ?? 'offline',
      };
    });

    // ── 6. Run Priority Engine ────────────────────────────────────────────
    const result = runPriorityEngine(candidates, bookingCtx);

    // ── 7. Persist audit log ──────────────────────────────────────────────
    try {
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'booking',
          ${bookingId}::uuid,
          'dispatch_priority_calculated',
          'system',
          ${JSON.stringify(result.audit_payload)}::jsonb
        )
      `;
    } catch {
      // Non-blocking — audit log persistence failure must never block dispatch
    }

    return NextResponse.json({
      booking_id:             bookingId,
      service_location_type:  slt,
      service_type:           bookingCtx.service_type,
      source_driver_override: result.source_driver_override,
      source_driver_id:       result.source_driver_id,
      ranked:                 result.ranked,
      excluded:               result.excluded,
      audit_payload:          result.audit_payload,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
