export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/admin/sla-queue
// Returns all bookings currently in SLA monitoring/risk/critical
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await sql`
      SELECT
        b.id,
        b.booking_ref,
        b.pickup_at,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_zone,
        b.dropoff_zone,
        b.service_location_type,
        b.trip_type,
        b.status,
        b.dispatch_status,
        b.sla_protection_level,
        b.sla_current_state,
        b.sla_flagged_at,
        b.sla_last_evaluation_at,
        b.sla_trigger_reason,
        b.reassignment_count,
        b.rescue_reassignment_started_at,
        b.dispatcher_override_required,
        b.driver_im_on_my_way_at,
        b.en_route_at,
        b.total_price,
        b.assigned_driver_id,
        b.fallback_offer_count,
        d.driver_code,
        d.full_name AS driver_name,
        d.phone AS driver_phone,
        -- Last system action from dispatch_event_log
        (
          SELECT del.event_type
          FROM dispatch_event_log del
          WHERE del.booking_id = b.id
          ORDER BY del.created_at DESC
          LIMIT 1
        ) AS last_system_action,
        (
          SELECT del.created_at
          FROM dispatch_event_log del
          WHERE del.booking_id = b.id
          ORDER BY del.created_at DESC
          LIMIT 1
        ) AS last_action_at,
        -- Minutes to pickup (computed)
        EXTRACT(EPOCH FROM (b.pickup_at - NOW())) / 60 AS minutes_to_pickup
      FROM bookings b
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE b.sla_current_state IS NOT NULL
        AND b.sla_safe_at IS NULL
        AND b.status NOT IN ('completed', 'cancelled')
        AND b.pickup_at > NOW() - INTERVAL '30 minutes'
      ORDER BY
        CASE b.sla_current_state
          WHEN 'sla_critical'    THEN 1
          WHEN 'sla_high_risk'   THEN 2
          WHEN 'sla_monitoring'  THEN 3
          ELSE 4
        END,
        b.pickup_at ASC
    `;

    return NextResponse.json({
      success: true,
      count: rows.length,
      queue: rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
