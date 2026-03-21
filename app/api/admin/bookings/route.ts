import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/bookings — List all bookings with client info + dispatch_status + driver_reported flag
export async function GET() {
  try {
    const rows = await sql`
      SELECT
        b.id,
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
        c.full_name AS client_name,
        c.phone AS client_phone,
        d.full_name AS driver_name,
        d.driver_code AS driver_code,
        -- Check if driver has reported this booking as incomplete/correction
        CASE WHEN EXISTS (
          SELECT 1 FROM audit_logs al
          WHERE al.entity_id = b.id
            AND al.action IN ('driver_reported_incomplete', 'driver_requested_correction', 'driver_rejected_incomplete_ride')
          ORDER BY al.created_at DESC
          LIMIT 1
        ) THEN true ELSE false END AS driver_reported,
        -- Get the most recent driver report action
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
      ORDER BY b.created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ bookings: rows });
  } catch (err: any) {
    // Fallback if audit_logs table doesn't exist yet or dispatch_status column not migrated
    try {
      const rows = await sql`
        SELECT
          b.id,
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
          c.full_name AS client_name,
          c.phone AS client_phone,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        ORDER BY b.created_at DESC
        LIMIT 100
      `;
      return NextResponse.json({ bookings: rows });
    } catch (err2: any) {
      return NextResponse.json({ error: err2.message }, { status: 500 });
    }
  }
}
