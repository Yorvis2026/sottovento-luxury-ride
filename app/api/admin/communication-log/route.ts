export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// GET /api/admin/communication-log?booking_id=XXX
// Returns the Client Communication Timeline for a specific booking
// BM7: Client Communication Escalation Layer
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = req.nextUrl.searchParams.get("booking_id");
  if (!bookingId) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  }

  try {
    const logs = await sql`
      SELECT
        id,
        booking_id,
        message_type,
        channel,
        template_used,
        delivery_status,
        sent_at,
        approved_by_admin,
        trigger_source,
        event_reference,
        metadata,
        created_at
      FROM booking_communication_log
      WHERE booking_id = ${bookingId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      booking_id: bookingId,
      timeline: logs,
      total: logs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
