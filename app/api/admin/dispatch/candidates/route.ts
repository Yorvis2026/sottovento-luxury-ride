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
import {
  checkScheduleConflict,
  BM16_CONFIG,
  type ScheduledRide,
} from "@/lib/dispatch/schedule-conflict";

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
    }    // ── 5. BM16: Fetch future committed bookings per driver for conflict check ───
    // Fetch the proposed booking's pickup_at for conflict evaluation
    let proposedPickupAt: Date | null = null;
    let proposedDurationMin: number | null = null;
    let proposedPickupLat: number | null = null;
    let proposedPickupLng: number | null = null;
    let proposedDropoffLat: number | null = null;
    let proposedDropoffLng: number | null = null;
    let proposedPickupAddress = '';
    let proposedDropoffAddress = '';
    try {
      const [proposedBooking] = await sql`
        SELECT pickup_at, estimated_duration_minutes,
               pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
               pickup_address, dropoff_address
        FROM bookings WHERE id = ${bookingId}::uuid LIMIT 1
      `;
      if (proposedBooking?.pickup_at) {
        proposedPickupAt = new Date(proposedBooking.pickup_at);
        proposedDurationMin = proposedBooking.estimated_duration_minutes ?? null;
        proposedPickupLat = proposedBooking.pickup_lat ?? null;
        proposedPickupLng = proposedBooking.pickup_lng ?? null;
        proposedDropoffLat = proposedBooking.dropoff_lat ?? null;
        proposedDropoffLng = proposedBooking.dropoff_lng ?? null;
        proposedPickupAddress = proposedBooking.pickup_address ?? '';
        proposedDropoffAddress = proposedBooking.dropoff_address ?? '';
      }
    } catch { /* non-blocking */ }

    // Fetch future committed bookings for all candidate drivers
    const driverIds = driverRows.map((d: any) => d.id);
    let driverFutureBookingsMap: Record<string, ScheduledRide[]> = {};
    if (proposedPickupAt && driverIds.length > 0) {
      try {
        const lookaheadHours = BM16_CONFIG.CONFLICT_LOOKAHEAD_HOURS;
        const futureBookingRows = await sql`
          SELECT
            b.id AS booking_id,
            b.assigned_driver_id::text AS driver_id,
            b.pickup_at,
            b.estimated_duration_minutes,
            b.pickup_lat, b.pickup_lng,
            b.dropoff_lat, b.dropoff_lng,
            b.pickup_address, b.dropoff_address,
            b.status, b.dispatch_status
          FROM bookings b
          WHERE b.assigned_driver_id = ANY(${driverIds}::uuid[])
            AND b.status IN ('accepted', 'assigned')
            AND b.dispatch_status NOT IN (
              'offer_pending', 'reassignment_required', 'pool_offer',
              'completed', 'cancelled', 'archived', 'no_show',
              'system_cleanup_legacy'
            )
            AND b.status NOT IN ('completed', 'cancelled', 'archived', 'no_show', 'en_route', 'arrived', 'in_trip')
            AND b.pickup_at > NOW() - INTERVAL '2 hours'
            AND b.pickup_at <= NOW() + (${lookaheadHours} || ' hours')::interval
            AND b.id != ${bookingId}::uuid
          ORDER BY b.pickup_at ASC
        `;
        for (const row of futureBookingRows) {
          const dId = row.driver_id;
          if (!driverFutureBookingsMap[dId]) driverFutureBookingsMap[dId] = [];
          driverFutureBookingsMap[dId].push({
            booking_id: row.booking_id,
            pickup_at: new Date(row.pickup_at),
            estimated_duration_minutes: row.estimated_duration_minutes ?? null,
            pickup_lat: row.pickup_lat ?? null,
            pickup_lng: row.pickup_lng ?? null,
            dropoff_lat: row.dropoff_lat ?? null,
            dropoff_lng: row.dropoff_lng ?? null,
            pickup_address: row.pickup_address ?? '',
            dropoff_address: row.dropoff_address ?? '',
            status: row.status,
            dispatch_status: row.dispatch_status ?? row.status,
          });
        }
      } catch { /* non-blocking */ }
    }

    // ── 5. Build DriverCandidate array ──────────────────────────────────────
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

    // ── 5b. BM16: Apply schedule conflict filter ────────────────────────────
    // Exclude drivers with strong schedule conflicts from the candidate pool.
    // Borderline conflicts are logged but driver remains eligible.
    const scheduleExcluded: Array<{ driver_id: string; driver_code: string; reason: string }> = [];
    let filteredCandidates = candidates;

    if (proposedPickupAt) {
      const proposedRide: ScheduledRide = {
        booking_id: bookingId,
        pickup_at: proposedPickupAt,
        estimated_duration_minutes: proposedDurationMin,
        pickup_lat: proposedPickupLat,
        pickup_lng: proposedPickupLng,
        dropoff_lat: proposedDropoffLat,
        dropoff_lng: proposedDropoffLng,
        pickup_address: proposedPickupAddress,
        dropoff_address: proposedDropoffAddress,
        status: 'pending',
        dispatch_status: 'pending_dispatch',
      };

      filteredCandidates = candidates.filter((c) => {
        const existingRides = driverFutureBookingsMap[c.id] ?? [];
        if (existingRides.length === 0) return true; // no future rides — always eligible

        const conflictResult = checkScheduleConflict(c.id, proposedRide, existingRides);

        if (conflictResult.has_strong_conflict) {
          // [BM16_DRIVER_EXCLUDED_BY_SCHEDULE] log
          console.log('[BM16_DRIVER_EXCLUDED_BY_SCHEDULE]', JSON.stringify({
            driver_id: c.id,
            driver_code: c.driver_code,
            booking_id: bookingId,
            conflict_pairs: conflictResult.conflict_pairs,
            exclusion_reason: conflictResult.exclusion_reason,
            ts: new Date().toISOString(),
          }));
          scheduleExcluded.push({
            driver_id: c.id,
            driver_code: c.driver_code,
            reason: conflictResult.exclusion_reason ?? 'BM16_STRONG_CONFLICT',
          });
          return false;
        }

        if (conflictResult.has_borderline_conflict) {
          // [BM16_CONFLICT_DETECTED] borderline — driver remains eligible but logged
          console.log('[BM16_CONFLICT_DETECTED]', JSON.stringify({
            driver_id: c.id,
            driver_code: c.driver_code,
            booking_id: bookingId,
            severity: 'borderline',
            conflict_pairs: conflictResult.conflict_pairs,
            ts: new Date().toISOString(),
          }));
        }

        return true; // eligible
      });
    }

    // ── 6. Run Priority Engine ────────────────────────────────────────────
    // BM16: Use filteredCandidates (schedule-conflict excluded drivers removed)
    const result = runPriorityEngine(filteredCandidates, bookingCtx);

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
      // BM16: Schedule conflict exclusions
      schedule_excluded:      scheduleExcluded,
      bm16_conflict_check: {
        applied: proposedPickupAt !== null,
        proposed_pickup_at: proposedPickupAt?.toISOString() ?? null,
        drivers_evaluated: candidates.length,
        drivers_excluded_by_schedule: scheduleExcluded.length,
        conflict_lookahead_hours: BM16_CONFIG.CONFLICT_LOOKAHEAD_HOURS,
        min_turn_buffer_minutes: BM16_CONFIG.MIN_TURN_BUFFER_MINUTES,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
