export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// POST /api/admin/sla-mark-safe
// Marks a booking as safe, clearing SLA monitoring state
// Body: { booking_id, marked_by? }
// ============================================================
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { booking_id, marked_by = "admin" } = await req.json();
    if (!booking_id) {
      return NextResponse.json({ error: "booking_id required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    await sql`
      UPDATE bookings SET
        sla_safe_at               = ${now}::timestamptz,
        sla_safe_by               = ${marked_by},
        sla_current_state         = NULL,
        dispatcher_override_required = FALSE,
        updated_at                = NOW()
      WHERE id = ${booking_id}::uuid
    `;

    // Log the safe event
    try {
      await sql`
        INSERT INTO dispatch_event_log (
          booking_id, event_type, trigger_reason, event_data, created_at
        ) VALUES (
          ${booking_id}::uuid,
          'ride_marked_safe',
          'admin_manual_safe',
          ${JSON.stringify({ marked_by, timestamp: now })}::jsonb,
          NOW()
        )
      `;
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, booking_id, marked_safe_at: now });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
