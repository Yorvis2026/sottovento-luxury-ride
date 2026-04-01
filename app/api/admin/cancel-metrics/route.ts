export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// GET /api/admin/cancel-metrics
//
// Returns comprehensive cancellation metrics for admin dashboard.
//
// Verified columns (from information_schema.columns):
//   bookings: id, status, pickup_address, dropoff_address, pickup_at,
//             cancelled_at, cancellation_reason, cancelled_by,
//             cancellation_fee, total_price, assigned_driver_id, client_id,
//             cancelled_by_type, cancelled_by_id, cancel_reason_code,
//             cancel_reason_text, cancel_stage, affects_driver_metrics,
//             affects_payout
//
// NOTE: cancel_responsibility does NOT exist. Use cancelled_by_type instead.
// ============================================================

export async function GET() {
  try {
    // ── Aggregate counts ──────────────────────────────────────
    const counts = await sql`
      SELECT
        -- Time windows
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND cancelled_at >= NOW() - INTERVAL '24 hours'
        ) AS last_24h,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND cancelled_at >= DATE_TRUNC('day', NOW())
        ) AS today,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND cancelled_at >= DATE_TRUNC('week', NOW())
        ) AS this_week,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND cancelled_at >= DATE_TRUNC('month', NOW())
        ) AS this_month,
        COUNT(*) FILTER (
          WHERE status = 'cancelled' OR cancelled_at IS NOT NULL
        ) AS total,
        -- By type breakdown (using cancelled_by_type, fallback via cancelled_by text)
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND COALESCE(cancelled_by_type,
              CASE
                WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
                WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
                WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
                ELSE 'system'
              END, 'system') = 'client'
        ) AS by_client,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND COALESCE(cancelled_by_type,
              CASE
                WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
                WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
                WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
                ELSE 'system'
              END, 'system') = 'driver'
        ) AS by_driver,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND COALESCE(cancelled_by_type,
              CASE
                WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
                WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
                WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
                ELSE 'system'
              END, 'system') = 'admin'
        ) AS by_admin,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND COALESCE(cancelled_by_type,
              CASE
                WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
                WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
                WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
                ELSE 'system'
              END, 'system') = 'system'
        ) AS by_system,
        -- Stage breakdown
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND COALESCE(cancel_stage, 'before_assignment') = 'before_assignment'
        ) AS stage_before_assignment,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND cancel_stage = 'assigned'
        ) AS stage_assigned,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND cancel_stage = 'in_progress'
        ) AS stage_in_progress,
        COUNT(*) FILTER (
          WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
            AND cancel_stage = 'post_driver_issue'
        ) AS stage_post_driver_issue
      FROM bookings
    `

    // ── Recent cancelled list (last 50) ───────────────────────
    const recent = await sql`
      SELECT
        b.id AS booking_id,
        b.status,
        COALESCE(b.pickup_address, '') AS pickup_address,
        COALESCE(b.dropoff_address, '') AS dropoff_address,
        b.pickup_at,
        b.cancelled_at,
        -- Attribution: prefer new column, fallback to cancelled_by text
        COALESCE(b.cancelled_by_type,
          CASE
            WHEN b.cancelled_by ILIKE '%admin%' OR b.cancelled_by ILIKE '%dispatch%' THEN 'admin'
            WHEN b.cancelled_by ILIKE '%driver%' THEN 'driver'
            WHEN b.cancelled_by ILIKE '%client%' OR b.cancelled_by ILIKE '%passenger%' THEN 'client'
            ELSE 'system'
          END, 'system') AS cancelled_by_type,
        b.cancelled_by_id,
        -- Reason code: prefer new column, fallback to cancellation_reason
        COALESCE(b.cancel_reason_code,
          UPPER(REPLACE(COALESCE(b.cancellation_reason, 'UNKNOWN'), ' ', '_'))
        ) AS cancel_reason_code,
        -- Reason text: prefer new column, fallback to cancellation_reason
        COALESCE(b.cancel_reason_text,
          CASE UPPER(REPLACE(COALESCE(b.cancellation_reason, ''), ' ', '_'))
            WHEN 'PASSENGER_NO_SHOW'                THEN 'Passenger no-show'
            WHEN 'PASSENGER_CANCELLED'              THEN 'Client cancelled'
            WHEN 'PASSENGER_UNREACHABLE'            THEN 'Passenger unreachable'
            WHEN 'PASSENGER_FLIGHT_DELAY'           THEN 'Flight delay'
            WHEN 'PASSENGER_TOOK_DIFFERENT_VEHICLE' THEN 'Passenger took different vehicle'
            WHEN 'WRONG_PICKUP_LOCATION'            THEN 'Wrong pickup location'
            WHEN 'SAFETY_CONCERN'                   THEN 'Safety concern'
            WHEN 'VEHICLE_ISSUE'                    THEN 'Vehicle issue'
            WHEN 'DRIVER_EMERGENCY'                 THEN 'Driver emergency'
            WHEN 'DISPATCH_REQUEST'                 THEN 'Dispatch cancelled'
            WHEN 'OTHER'                            THEN 'Other reason'
            ELSE COALESCE(b.cancellation_reason, 'Unknown')
          END
        ) AS cancel_reason_text,
        COALESCE(b.cancel_stage, 'before_assignment') AS cancel_stage,
        COALESCE(b.affects_driver_metrics, FALSE) AS affects_driver_metrics,
        COALESCE(b.affects_payout, FALSE) AS affects_payout,
        b.total_price,
        COALESCE(b.cancellation_fee, 0) AS cancellation_fee,
        -- Driver info
        d.driver_code AS assigned_driver_code,
        d.full_name AS assigned_driver_name,
        -- Client info
        COALESCE(cl.full_name, '') AS client_name
      FROM bookings b
      LEFT JOIN drivers d ON d.id = b.assigned_driver_id
      LEFT JOIN clients cl ON cl.id = b.client_id
      WHERE b.status = 'cancelled' OR b.cancelled_at IS NOT NULL
      ORDER BY COALESCE(b.cancelled_at, b.updated_at) DESC NULLS LAST
      LIMIT 50
    `

    const c = counts[0]
    return NextResponse.json({
      counts: {
        last_24h:    Number(c.last_24h ?? 0),
        today:       Number(c.today ?? 0),
        this_week:   Number(c.this_week ?? 0),
        this_month:  Number(c.this_month ?? 0),
        total:       Number(c.total ?? 0),
      },
      breakdown: {
        by_client: Number(c.by_client ?? 0),
        by_driver: Number(c.by_driver ?? 0),
        by_admin:  Number(c.by_admin ?? 0),
        by_system: Number(c.by_system ?? 0),
      },
      stage_breakdown: {
        before_assignment:  Number(c.stage_before_assignment ?? 0),
        assigned:           Number(c.stage_assigned ?? 0),
        in_progress:        Number(c.stage_in_progress ?? 0),
        post_driver_issue:  Number(c.stage_post_driver_issue ?? 0),
      },
      recent_list: recent,
      generated_at: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
