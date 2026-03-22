import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

/**
 * GET /api/admin/bookings
 * Supports ?view=active|completed|cancelled|archived|all (default: active)
 *
 * Uses separate parameterized queries per view to avoid sql.unsafe() issues.
 * Falls back to a minimal query if new columns are not yet migrated.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawView = url.searchParams.get("view") ?? "active";

  // Validate view param — default to "active" if invalid
  const VALID_VIEWS = ["active", "completed", "cancelled", "archived", "all"];
  const safeView = VALID_VIEWS.includes(rawView.toLowerCase().trim()) ? rawView.toLowerCase().trim() : "active";

  try {
    let rows: any[];

    if (safeView === "active") {
      rows = await sql`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
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
        WHERE b.status = ANY(ARRAY['new','needs_review','ready_for_dispatch','assigned','driver_confirmed','in_progress','driver_issue','pending_dispatch','pending','pending_payment'])
        ORDER BY b.created_at DESC
        LIMIT 200
      `;
    } else if (safeView === "completed") {
      rows = await sql`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
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
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status = 'completed'
        ORDER BY b.created_at DESC
        LIMIT 200
      `;
    } else if (safeView === "cancelled") {
      rows = await sql`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
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
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status = 'cancelled'
        ORDER BY b.created_at DESC
        LIMIT 200
      `;
    } else if (safeView === "archived") {
      rows = await sql`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
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
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status = 'archived'
        ORDER BY b.created_at DESC
        LIMIT 200
      `;
    } else {
      // all
      rows = await sql`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
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
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        ORDER BY b.created_at DESC
        LIMIT 200
      `;
    }

    return NextResponse.json({
      bookings: Array.isArray(rows) ? rows : [],
      view: safeView,
      total: Array.isArray(rows) ? rows.length : 0,
    });

  } catch (err: any) {
    // Graceful fallback — minimal query without new columns
    try {
      const rows = await sql`
        SELECT
          b.id,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passengers, 1) AS passenger_count,
          0 AS luggage_count,
          'unknown' AS lead_source,
          '' AS captured_by_driver_code,
          '' AS cancellation_reason,
          '' AS cancelled_by,
          'manual_admin' AS booking_origin,
          c.full_name AS client_name,
          c.phone AS client_phone,
          c.email AS client_email,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status != 'archived'
        ORDER BY b.created_at DESC
        LIMIT 200
      `;
      return NextResponse.json({
        bookings: Array.isArray(rows) ? rows : [],
        view: "fallback",
        total: Array.isArray(rows) ? rows.length : 0,
      });
    } catch (err2: any) {
      // Last resort — return empty array, never crash
      return NextResponse.json({ bookings: [], view: "error", total: 0, error: err2.message }, { status: 200 });
    }
  }
}
