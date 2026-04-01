export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { evaluateCommunicationTrigger } from "../../../../lib/communication/trigger-engine";
import { sendClientNotification } from "../../../../lib/communication/channel-engine";
import type { CommunicationEvent, TriggerContext } from "../../../../lib/communication/trigger-engine";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// POST /api/admin/send-client-notification
// Manually or system-triggered client notification
// Body: {
//   booking_id, event, force?: boolean,
//   driver_name?, vehicle_info?, eta?, driver_phone?
// }
// BM7: Client Communication Escalation Layer
// ============================================================
export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { booking_id, event, force, driver_name, vehicle_info, eta, driver_phone } = body;

  if (!booking_id || !event) {
    return NextResponse.json({ error: "booking_id and event required" }, { status: 400 });
  }

  // Get booking details
  const bookingRows = await sql`
    SELECT booking_id, client_name, client_phone, client_email,
           pickup_address, dropoff_address, pickup_date, pickup_time
    FROM bookings
    WHERE booking_id = ${booking_id}
    LIMIT 1
  `;

  if (bookingRows.length === 0) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const booking = bookingRows[0];

  const ctx: TriggerContext = {
    bookingId: booking_id,
    event: event as CommunicationEvent,
    clientEmail: booking.client_email,
    clientPhone: booking.client_phone,
    clientName: booking.client_name,
    driverName: driver_name ?? null,
    vehicleInfo: vehicle_info ?? null,
    eta: eta ?? null,
    driverPhone: driver_phone ?? null,
  };

  // Evaluate trigger (unless force=true)
  if (!force) {
    const evaluation = await evaluateCommunicationTrigger(ctx, sql);
    if (!evaluation.should_notify) {
      // If admin_review, create a draft
      if (evaluation.create_draft) {
        await sql`
          INSERT INTO booking_communication_log (
            booking_id, message_type, channel, template_used,
            delivery_status, trigger_source, metadata
          ) VALUES (
            ${booking_id}, ${event}, 'pending_review', ${evaluation.template ?? 'draft_v1'},
            'pending', 'admin_manual', ${JSON.stringify({
              reason: evaluation.reason,
              ctx: { driver_name, vehicle_info, eta },
            })}
          )
        `;
        return NextResponse.json({
          success: false,
          action: "draft_created",
          reason: evaluation.reason,
          decision: evaluation.decision,
        });
      }
      return NextResponse.json({
        success: false,
        action: "blocked",
        reason: evaluation.reason,
        decision: evaluation.decision,
        blocked_by_duplicate: evaluation.blocked_by_duplicate,
        blocked_by_throttle: evaluation.blocked_by_throttle,
      });
    }

    // Send the notification
    const result = await sendClientNotification(
      {
        bookingId: booking_id,
        event: event as CommunicationEvent,
        ctx,
        channelPriority: evaluation.channel_priority,
        templateUsed: evaluation.template ?? "generic_v1",
        triggerSource: "admin_manual",
        approvedByAdmin: true,
      },
      sql
    );

    return NextResponse.json({
      success: result.success,
      action: "sent",
      channel_used: result.channel_used,
      delivery_status: result.delivery_status,
      log_id: result.log_id,
      error: result.error,
    });
  }

  // Force send (bypass all guards)
  const result = await sendClientNotification(
    {
      bookingId: booking_id,
      event: event as CommunicationEvent,
      ctx,
      channelPriority: ["email", "sms", "whatsapp"],
      templateUsed: "admin_force_v1",
      triggerSource: "admin_force",
      approvedByAdmin: true,
    },
    sql
  );

  return NextResponse.json({
    success: result.success,
    action: "force_sent",
    channel_used: result.channel_used,
    delivery_status: result.delivery_status,
    log_id: result.log_id,
    error: result.error,
  });
}
