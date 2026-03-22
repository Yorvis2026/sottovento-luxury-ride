import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * GET /api/admin/bookings
 * Supports ?view=active|completed|cancelled|archived|all (default: active)
 * Supports ?status=<single_status>
 * Supports ?date=today|week|month|all
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "active";
  const status_filter = url.searchParams.get("status") ?? null;
  const date_filter = url.searchParams.get("date") ?? "all";

  const ACTIVE_STATES = "new,needs_review,ready_for_dispatch,assigned,driver_confirmed,in_progress,driver_issue";

  let whereClause: string;
  if (status_filter) {
    whereClause = `b.status = '${status_filter.replace(/'/g, "''")}'`;
  } else if (view === "active") {
    whereClause = `b.status = ANY(ARRAY['${ACTIVE_STATES.split(",").join("','")}'])`;
  } else if (view === "completed") {
    whereClause = `b.status = 'completed'`;
  } else if (view === "cancelled") {
    whereClause = `b.status = 'cancelled'`;
  } else if (view === "archived") {
    whereClause = `b.status = 'archived'`;
  } else {
    whereClause = `1=1`;
  }

  let dateClause = "";
  if (date_filter === "today") {
    dateClause = `AND DATE(b.pickup_at) = CURRENT_DATE`;
  } else if (date_filter === "week") {
    dateClause = `AND b.pickup_at >= DATE_TRUNC('week', NOW())`;
  } else if (date_filter === "month") {
    dateClause = `AND b.pickup_at >= DATE_TRUNC('month', NOW())`;
  }

  try {
    const rows = await sql.unsafe(`
      SELECT
        b.id,
        COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
        b.pickup_zone,
        b.dropoff_zone,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at,
        b.vehicle_type,
        b.total_price,
        b.status,
        b.dispatch_status,
        b.payment_status,
        b.assigned_driver_id,
        b.created_at,
        b.updated_at,
        COALESCE(b.notes, '') AS notes,
        COALESCE(b.flight_number, '') AS flight_number,
        COALESCE(b.passenger_count, 1) AS passenger_count,
        COALESCE(b.luggage_count, 0) AS luggage_count,
        COALESCE(b.lead_source, 'unknown') AS lead_source,
        COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
        COALESCE(b.cancellation_reason, '') AS cancellation_reason,
        COALESCE(b.cancelled_by, '') AS cancelled_by,
        COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
        c.full_name AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        d.full_name AS driver_name,
        d.driver_code AS driver_code,
        d.phone AS driver_phone,
        CASE WHEN EXISTS (
          SELECT 1 FROM audit_logs al
          WHERE al.entity_id = b.id
            AND al.action IN ('driver_reported_incomplete', 'driver_requested_correction', 'driver_rejected_incomplete_ride')
        ) THEN true ELSE false END AS driver_reported,
        (
          SELECT al.action FROM audit_logs al
          WHERE al.entity_id = b.id
            AND al.action IN ('driver_reported_incomplete', 'driver_requested_correction', 'driver_rejected_incomplete_ride')
          ORDER BY al.created_at DESC
          LIMIT 1
        ) AS driver_report_action
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE ${whereClause}
      ${dateClause}
      ORDER BY b.created_at DESC
      LIMIT 200
    `);
    return NextResponse.json({ bookings: rows, view, total: rows.length });
  } catch (err: any) {
    // Graceful fallback
    try {
      const rows = await sql`
        SELECT
          b.id,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          c.full_name AS client_name, c.phone AS client_phone,
          d.full_name AS driver_name, d.driver_code AS driver_code,
          false AS driver_reported, NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status NOT IN ('archived')
        ORDER BY b.created_at DESC
        LIMIT 200
      `;
      return NextResponse.json({ bookings: rows, view: "fallback", total: rows.length });
    } catch (err2: any) {
      return NextResponse.json({ error: err2.message }, { status: 500 });
    }
  }
}
