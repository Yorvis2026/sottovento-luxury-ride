export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendClientNotification } from "../../../../lib/communication/channel-engine";
import type { CommunicationEvent, TriggerContext } from "../../../../lib/communication/trigger-engine";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// POST /api/admin/communication-approve
// Admin Manual Approval Flow for BM7
// Body: { log_id, action: "approve" | "cancel" | "edit", edited_message? }
// ============================================================
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { log_id, action, edited_message } = body;

  if (!log_id || !action) {
    return NextResponse.json({ error: "Missing log_id or action" }, { status: 400 });
  }

  // Get the pending draft
  const draftRows = await sql`
    SELECT bcl.*, b.client_email, b.client_phone, b.client_name,
           b.pickup_address, b.dropoff_address
    FROM booking_communication_log bcl
    LEFT JOIN bookings b ON b.id = bcl.booking_id
    WHERE bcl.id = ${log_id}
      AND bcl.delivery_status = 'pending'
    LIMIT 1
  `;

  if (draftRows.length === 0) {
    return NextResponse.json({ error: "Draft not found or already processed" }, { status: 404 });
  }

  const draft = draftRows[0];

  if (action === "cancel") {
    await sql`
      UPDATE booking_communication_log
      SET delivery_status = 'cancelled', updated_at = NOW()
      WHERE id = ${log_id}
    `;
    // Log to dispatch_event_log
    await sql`
      INSERT INTO dispatch_event_log (booking_id, event_type, actor_type, actor_id, notes, created_at)
      VALUES (${draft.booking_id}, 'client_notification_cancelled', 'admin', 'admin-panel',
              ${`Draft cancelled: ${draft.message_type}`}, NOW())
    `;
    return NextResponse.json({ success: true, action: "cancelled" });
  }

  if (action === "approve" || action === "edit") {
    // Build context for sending
    const ctx: TriggerContext = {
      bookingId: draft.booking_id,
      event: draft.message_type as CommunicationEvent,
      clientEmail: draft.client_email,
      clientPhone: draft.client_phone,
      clientName: draft.client_name,
    };

    // If edited, update the metadata with the new message
    if (action === "edit" && edited_message) {
      await sql`
        UPDATE booking_communication_log
        SET metadata = metadata || ${JSON.stringify({ edited_message })}::jsonb,
            updated_at = NOW()
        WHERE id = ${log_id}
      `;
    }

    // Send the notification
    const result = await sendClientNotification(
      {
        bookingId: draft.booking_id,
        event: draft.message_type as CommunicationEvent,
        ctx,
        channelPriority: ["email", "sms", "whatsapp"],
        templateUsed: draft.template_used ?? "admin_approved_v1",
        triggerSource: "admin_manual_approval",
        eventReference: String(log_id),
        approvedByAdmin: true,
      },
      sql
    );

    // Mark original draft as approved
    await sql`
      UPDATE booking_communication_log
      SET delivery_status = 'approved', approved_by_admin = TRUE, updated_at = NOW()
      WHERE id = ${log_id}
    `;

    // Log to dispatch_event_log
    await sql`
      INSERT INTO dispatch_event_log (booking_id, event_type, actor_type, actor_id, notes, created_at)
      VALUES (${draft.booking_id}, 'client_notification_approved', 'admin', 'admin-panel',
              ${`Admin approved: ${draft.message_type} via ${result.channel_used}`}, NOW())
    `;

    return NextResponse.json({
      success: result.success,
      action: "approved_and_sent",
      channel_used: result.channel_used,
      delivery_status: result.delivery_status,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
