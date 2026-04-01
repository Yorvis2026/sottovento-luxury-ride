import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import type { CommunicationEvent, TriggerContext } from "./trigger-engine";
import { buildMessageContent } from "./trigger-engine";
// ============================================================
// BM7: Channel Priority Engine
// Sottovento Luxury Network
//
// Sends client notifications through the priority channel chain:
// Primary:  WhatsApp (Twilio)
// Fallback: SMS (Twilio)
// Backup:   Email (Resend)
//
// Logs all delivery attempts to booking_communication_log and
// dispatch_event_log.
// ============================================================

export interface SendNotificationParams {
  bookingId: string;
  event: CommunicationEvent;
  ctx: TriggerContext;
  channelPriority: ("email" | "sms" | "whatsapp")[];
  templateUsed: string;
  triggerSource?: string;
  eventReference?: string;
  approvedByAdmin?: boolean;
  createDraftOnly?: boolean;
}

export interface SendResult {
  success: boolean;
  channel_used: string;
  delivery_status: "sent" | "failed" | "pending";
  log_id?: number;
  error?: string;
}

// ── Main Send Function ───────────────────────────────────────
export async function sendClientNotification(
  params: SendNotificationParams,
  sql: ReturnType<typeof neon>
): Promise<SendResult> {
  const content = buildMessageContent(params.event, params.ctx);
  let channelUsed = "none";
  let deliveryStatus: "sent" | "failed" | "pending" = "failed";
  let errorMsg: string | undefined;

  // If draft only, skip actual send and log as pending
  if (params.createDraftOnly) {
    try {
      await sql`
        INSERT INTO booking_communication_log (
          booking_id, message_type, channel, template_used,
          delivery_status, sent_at, approved_by_admin,
          trigger_source, event_reference, metadata
        ) VALUES (
          ${params.bookingId},
          ${params.event},
          ${'email'},
          ${params.templateUsed},
          ${'pending'},
          ${null},
          ${false},
          ${params.triggerSource ?? 'system'},
          ${params.eventReference ?? null},
          ${JSON.stringify({ draft: true, client_email: params.ctx.clientEmail })}
        )
      `;
    } catch { /* non-blocking */ }
    return { success: false, channel_used: 'draft', delivery_status: 'pending' };
  }

  // Try channels in priority order
  for (const channel of params.channelPriority) {
    try {
      if (channel === "whatsapp") {
        const result = await sendWhatsApp(params.ctx, content.shortText);
        if (result.success) {
          channelUsed = "whatsapp";
          deliveryStatus = "sent";
          break;
        }
      } else if (channel === "sms") {
        const result = await sendSMS(params.ctx, content.shortText);
        if (result.success) {
          channelUsed = "sms";
          deliveryStatus = "sent";
          break;
        }
      } else if (channel === "email") {
        const result = await sendEmail(params.ctx, content.subject, content.body);
        if (result.success) {
          channelUsed = "email";
          deliveryStatus = "sent";
          break;
        }
        errorMsg = result.error;
      }
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : String(e);
      continue;
    }
  }

  // Log to booking_communication_log
  let logId: number | undefined;
  try {
    const logRows = await sql`
      INSERT INTO booking_communication_log (
        booking_id, message_type, channel, template_used,
        delivery_status, sent_at, approved_by_admin,
        trigger_source, event_reference,
        metadata
      ) VALUES (
        ${params.bookingId},
        ${params.event},
        ${channelUsed},
        ${params.templateUsed},
        ${deliveryStatus},
        ${deliveryStatus === "sent" ? new Date().toISOString() : null},
        ${params.approvedByAdmin ?? false},
        ${params.triggerSource ?? "system"},
        ${params.eventReference ?? null},
        ${JSON.stringify({
          client_email: params.ctx.clientEmail,
          client_phone: params.ctx.clientPhone,
          error: errorMsg,
          channels_tried: params.channelPriority,
        })}
      )
      RETURNING id
    `;
    logId = logRows[0]?.id;
  } catch {
    // Log failure is non-blocking
  }

  // Log to dispatch_event_log
  try {
    const eventType = deliveryStatus === "sent"
      ? "client_notification_sent"
      : "client_notification_failed";
    await sql`
      INSERT INTO dispatch_event_log (
        booking_id, event_type, actor_type, actor_id,
        notes, event_data, created_at
      ) VALUES (
        ${params.bookingId},
        ${eventType},
        ${"system"},
        ${"bm7-communication-engine"},
        ${`${params.event} via ${channelUsed} — ${deliveryStatus}`},
        ${JSON.stringify({
          message_type: params.event,
          channel: channelUsed,
          delivery_status: deliveryStatus,
          template: params.templateUsed,
          trigger_source: params.triggerSource,
        })},
        ${new Date().toISOString()}
      )
    `;
  } catch {
    // Non-blocking
  }

  // Update bookings.last_client_notification_at
  if (deliveryStatus === "sent") {
    try {
      await sql`
        UPDATE bookings
        SET last_client_notification_at = NOW(),
            last_client_notification_type = ${params.event}
        WHERE id = ${params.bookingId}::uuid
      `;
    } catch {
      // Non-blocking
    }
  }

  return {
    success: deliveryStatus === "sent",
    channel_used: channelUsed,
    delivery_status: deliveryStatus,
    log_id: logId,
    error: errorMsg,
  };
}

// ── WhatsApp Sender (Twilio) ─────────────────────────────────
async function sendWhatsApp(
  ctx: TriggerContext,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    return { success: false, error: "Twilio WhatsApp not configured" };
  }
  if (!ctx.clientPhone) {
    return { success: false, error: "No client phone number" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: `whatsapp:${from}`,
      To: `whatsapp:${ctx.clientPhone}`,
      Body: message,
    });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (response.ok) {
      return { success: true };
    }
    const err = await response.text();
    return { success: false, error: `Twilio WhatsApp error: ${err}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── SMS Sender (Twilio) ──────────────────────────────────────
async function sendSMS(
  ctx: TriggerContext,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;

  if (!accountSid || !authToken || !from) {
    return { success: false, error: "Twilio SMS not configured" };
  }
  if (!ctx.clientPhone) {
    return { success: false, error: "No client phone number" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: from,
      To: ctx.clientPhone,
      Body: message,
    });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (response.ok) {
      return { success: true };
    }
    const err = await response.text();
    return { success: false, error: `Twilio SMS error: ${err}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Email Sender (Resend) ────────────────────────────────────
async function sendEmail(
  ctx: TriggerContext,
  subject: string,
  bodyText: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Resend API key not configured" };
  }
  if (!ctx.clientEmail) {
    return { success: false, error: "No client email address" };
  }

  try {
    const resend = new Resend(apiKey);
    const htmlBody = buildEmailHtml(ctx, bodyText);
    const result = await resend.emails.send({
      from: "Sottovento Luxury Ride <bookings@sottoventoluxuryride.com>",
      to: ctx.clientEmail,
      subject,
      html: htmlBody,
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Email HTML Template ──────────────────────────────────────
function buildEmailHtml(ctx: TriggerContext, bodyText: string): string {
  const clientName = ctx.clientName ?? "Valued Guest";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Georgia',serif;">
  <div style="max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);padding:40px 40px 32px;border-bottom:1px solid #b8960c;">
      <p style="color:#b8960c;letter-spacing:0.4em;text-transform:uppercase;font-size:10px;margin:0 0 8px;">Sottovento Luxury Ride</p>
      <p style="color:#888;font-size:12px;margin:0;letter-spacing:0.1em;">Premium Black Car Service · Orlando, FL</p>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      <p style="color:#b8960c;font-size:13px;margin:0 0 16px;letter-spacing:0.2em;text-transform:uppercase;">Dear ${clientName},</p>
      <p style="color:#e5e5e5;font-size:15px;line-height:1.7;margin:0 0 24px;">${bodyText}</p>
      ${ctx.driverName ? `
      <div style="background:#111;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#b8960c;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin:0 0 12px;">Chauffeur Details</p>
        ${ctx.driverName ? `<p style="color:#e5e5e5;font-size:14px;margin:4px 0;"><span style="color:#888;">Name:</span> ${ctx.driverName}</p>` : ""}
        ${ctx.vehicleInfo ? `<p style="color:#e5e5e5;font-size:14px;margin:4px 0;"><span style="color:#888;">Vehicle:</span> ${ctx.vehicleInfo}</p>` : ""}
        ${ctx.eta ? `<p style="color:#e5e5e5;font-size:14px;margin:4px 0;"><span style="color:#888;">ETA:</span> ${ctx.eta}</p>` : ""}
        ${ctx.driverPhone ? `<p style="color:#e5e5e5;font-size:14px;margin:4px 0;"><span style="color:#888;">Contact:</span> ${ctx.driverPhone}</p>` : ""}
      </div>
      ` : ""}
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">If you have any questions, please contact us at <a href="mailto:contact@sottoventoluxuryride.com" style="color:#b8960c;text-decoration:none;">contact@sottoventoluxuryride.com</a></p>
    </div>
    <!-- Footer -->
    <div style="padding:24px 40px;border-top:1px solid #222;text-align:center;">
      <p style="color:#555;font-size:11px;margin:0;letter-spacing:0.2em;text-transform:uppercase;">Sottovento Luxury Ride · Orlando, FL · sottoventoluxuryride.com</p>
    </div>
  </div>
</body>
</html>`;
}
