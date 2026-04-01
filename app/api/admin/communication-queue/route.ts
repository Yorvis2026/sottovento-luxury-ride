export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// GET /api/admin/communication-queue
// Returns the communication queue for admin panel:
// - Pending admin review drafts
// - Recent sent notifications
// BM7: Client Communication Escalation Layer
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get pending drafts (admin_review events)
    const pendingDrafts = await sql`
      SELECT
        bcl.id,
        bcl.booking_id,
        bcl.message_type,
        bcl.channel,
        bcl.template_used,
        bcl.delivery_status,
        bcl.sent_at,
        bcl.approved_by_admin,
        bcl.trigger_source,
        bcl.event_reference,
        bcl.metadata,
        bcl.created_at,
        b.client_name,
        b.client_phone,
        b.client_email,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_date,
        b.pickup_time,
        b.pending_client_notification
      FROM booking_communication_log bcl
      LEFT JOIN bookings b ON b.id = bcl.booking_id::uuid
      WHERE bcl.delivery_status = 'pending'
      ORDER BY bcl.created_at DESC
      LIMIT 50
    `;

    // Get recent sent notifications (last 24h)
    const recentSent = await sql`
      SELECT
        bcl.id,
        bcl.booking_id,
        bcl.message_type,
        bcl.channel,
        bcl.template_used,
        bcl.delivery_status,
        bcl.sent_at,
        bcl.approved_by_admin,
        bcl.trigger_source,
        bcl.metadata,
        b.client_name
      FROM booking_communication_log bcl
      LEFT JOIN bookings b ON b.id = bcl.booking_id::uuid
      WHERE bcl.delivery_status IN ('sent', 'delivered', 'failed')
        AND bcl.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY bcl.created_at DESC
      LIMIT 100
    `;

    // Stats
    const stats = await sql`
      SELECT
        COUNT(*) FILTER (WHERE delivery_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE delivery_status = 'sent' AND created_at > NOW() - INTERVAL '24 hours') as sent_24h,
        COUNT(*) FILTER (WHERE delivery_status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') as failed_24h,
        COUNT(*) FILTER (WHERE delivery_status = 'sent' AND channel = 'email') as sent_email,
        COUNT(*) FILTER (WHERE delivery_status = 'sent' AND channel = 'sms') as sent_sms,
        COUNT(*) FILTER (WHERE delivery_status = 'sent' AND channel = 'whatsapp') as sent_whatsapp
      FROM booking_communication_log
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;

    return NextResponse.json({
      pending_drafts: pendingDrafts,
      recent_sent: recentSent,
      stats: stats[0] ?? {},
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
