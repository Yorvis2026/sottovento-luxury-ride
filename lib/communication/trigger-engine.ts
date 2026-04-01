import { neon } from "@neondatabase/serverless";
// ============================================================
// BM7: Communication Trigger Engine
// Sottovento Luxury Network
//
// Evaluates whether a client notification should be sent
// based on the event type, notification matrix, and
// anti-duplicate guard rules.
// ============================================================

export type CommunicationEvent =
  | "driver_assigned"
  | "driver_reassigned"
  | "sla_monitoring"
  | "sla_high_risk"
  | "sla_critical"
  | "smart_reassignment_started"
  | "dispatcher_override_required"
  | "ride_marked_safe"
  | "driver_im_on_my_way"
  | "rescue_assignment_started";

export type NotificationDecision =
  | "YES"          // Always send
  | "NO"           // Never send
  | "CONDITIONAL"  // Send only if conditions met
  | "ADMIN_REVIEW" // Create draft for admin approval
  | "OPTIONAL";    // Send only if admin has enabled it

// ── Notification Matrix (BM7 Spec) ──────────────────────────
const NOTIFICATION_MATRIX: Record<CommunicationEvent, NotificationDecision> = {
  driver_assigned:              "YES",
  driver_reassigned:            "YES",
  sla_monitoring:               "NO",
  sla_high_risk:                "CONDITIONAL",
  sla_critical:                 "YES",
  smart_reassignment_started:   "YES",
  dispatcher_override_required: "ADMIN_REVIEW",
  ride_marked_safe:             "OPTIONAL",
  driver_im_on_my_way:          "YES",
  rescue_assignment_started:    "YES",
};

// ── Anti-duplicate guard window (minutes) ───────────────────
const DUPLICATE_GUARD_MINUTES = 5;
// Events exempt from duplicate guard
const DUPLICATE_EXEMPT: CommunicationEvent[] = ["sla_critical", "driver_reassigned"];

// ── Client Experience Mode: max messages per window ─────────
const CLIENT_EXPERIENCE_MAX_MESSAGES = 2;
const CLIENT_EXPERIENCE_WINDOW_MINUTES = 10;
// Events exempt from client experience throttle
const EXPERIENCE_EXEMPT: CommunicationEvent[] = ["driver_reassigned", "sla_critical"];

export interface TriggerContext {
  bookingId: string;
  event: CommunicationEvent;
  minutesToPickup?: number | null;
  slaHighRiskThreshold?: number | null; // minutes threshold for conditional sla_high_risk
  driverName?: string | null;
  vehicleInfo?: string | null;
  eta?: string | null;
  driverPhone?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientName?: string | null;
}

export interface TriggerResult {
  should_notify: boolean;
  decision: NotificationDecision;
  reason: string;
  template?: string;
  channel_priority: ("email" | "sms" | "whatsapp")[];
  create_draft?: boolean;
  blocked_by_duplicate?: boolean;
  blocked_by_throttle?: boolean;
}

// ── Main Trigger Evaluation Function ────────────────────────
export async function evaluateCommunicationTrigger(
  ctx: TriggerContext,
  sql: ReturnType<typeof neon>
): Promise<TriggerResult> {
  const decision = NOTIFICATION_MATRIX[ctx.event];

  // Step 1: Check notification matrix
  if (decision === "NO") {
    return {
      should_notify: false,
      decision,
      reason: "Event excluded from notification matrix",
      channel_priority: [],
    };
  }

  if (decision === "ADMIN_REVIEW") {
    return {
      should_notify: false,
      decision,
      reason: "Requires admin approval — draft created",
      channel_priority: ["email", "sms", "whatsapp"],
      create_draft: true,
    };
  }

  if (decision === "OPTIONAL") {
    return {
      should_notify: false,
      decision,
      reason: "Optional notification — not sent by default",
      channel_priority: ["email"],
    };
  }

  // Step 2: Conditional check for sla_high_risk
  if (decision === "CONDITIONAL" && ctx.event === "sla_high_risk") {
    const threshold = ctx.slaHighRiskThreshold ?? 45;
    if (!ctx.minutesToPickup || ctx.minutesToPickup > threshold) {
      return {
        should_notify: false,
        decision,
        reason: `sla_high_risk: minutes_to_pickup (${ctx.minutesToPickup}) > threshold (${threshold})`,
        channel_priority: [],
      };
    }
  }

  // Step 3: Anti-duplicate guard
  if (!DUPLICATE_EXEMPT.includes(ctx.event)) {
    try {
      const recentRows = await sql`
        SELECT id FROM booking_communication_log
        WHERE booking_id = ${ctx.bookingId}
          AND message_type = ${ctx.event}
          AND sent_at > NOW() - INTERVAL '${DUPLICATE_GUARD_MINUTES} minutes'
        LIMIT 1
      `;
      if (recentRows.length > 0) {
        return {
          should_notify: false,
          decision,
          reason: `Anti-duplicate guard: same message_type within ${DUPLICATE_GUARD_MINUTES} min window`,
          channel_priority: [],
          blocked_by_duplicate: true,
        };
      }
    } catch {
      // If table doesn't exist yet, skip the check
    }
  }

  // Step 4: Client Experience Mode throttle
  if (!EXPERIENCE_EXEMPT.includes(ctx.event)) {
    try {
      const recentCount = await sql`
        SELECT COUNT(*) as cnt FROM booking_communication_log
        WHERE booking_id = ${ctx.bookingId}
          AND sent_at > NOW() - INTERVAL '${CLIENT_EXPERIENCE_WINDOW_MINUTES} minutes'
          AND delivery_status IN ('sent', 'delivered')
      `;
      const cnt = Number(recentCount[0]?.cnt ?? 0);
      if (cnt >= CLIENT_EXPERIENCE_MAX_MESSAGES) {
        return {
          should_notify: false,
          decision,
          reason: `Client Experience Mode: ${cnt} messages sent in last ${CLIENT_EXPERIENCE_WINDOW_MINUTES} min (max ${CLIENT_EXPERIENCE_MAX_MESSAGES})`,
          channel_priority: [],
          blocked_by_throttle: true,
        };
      }
    } catch {
      // If table doesn't exist yet, skip the check
    }
  }

  // Step 5: Determine template and channels
  const template = getTemplate(ctx.event);
  const channelPriority = getChannelPriority(ctx.event);

  return {
    should_notify: true,
    decision,
    reason: `Notification approved for event: ${ctx.event}`,
    template,
    channel_priority: channelPriority,
  };
}

// ── Template Selector ────────────────────────────────────────
function getTemplate(event: CommunicationEvent): string {
  const templates: Record<CommunicationEvent, string> = {
    driver_assigned:              "driver_assigned_v1",
    driver_reassigned:            "driver_reassigned_v1",
    sla_monitoring:               "sla_monitoring_v1",
    sla_high_risk:                "sla_high_risk_v1",
    sla_critical:                 "sla_critical_v1",
    smart_reassignment_started:   "smart_reassignment_v1",
    dispatcher_override_required: "dispatcher_override_draft_v1",
    ride_marked_safe:             "ride_marked_safe_v1",
    driver_im_on_my_way:          "driver_on_the_way_v1",
    rescue_assignment_started:    "rescue_assignment_v1",
  };
  return templates[event] ?? "generic_v1";
}

// ── Channel Priority Engine ──────────────────────────────────
function getChannelPriority(event: CommunicationEvent): ("email" | "sms" | "whatsapp")[] {
  // Critical events: WhatsApp + SMS + email backup
  if (["sla_critical", "driver_reassigned", "smart_reassignment_started"].includes(event)) {
    return ["whatsapp", "sms", "email"];
  }
  // Standard events: email primary
  return ["email", "sms", "whatsapp"];
}

// ── Message Content Builder ──────────────────────────────────
export function buildMessageContent(
  event: CommunicationEvent,
  ctx: TriggerContext
): { subject: string; body: string; shortText: string } {
  const brand = "Sottovento Luxury Ride";

  switch (event) {
    case "driver_assigned":
      return {
        subject: `${brand} — Your Chauffeur Has Been Assigned`,
        body: `Your chauffeur has been assigned. You will receive live updates as your service approaches.`,
        shortText: `Your chauffeur has been assigned. Live updates will follow. — ${brand}`,
      };

    case "driver_reassigned":
      return {
        subject: `${brand} — Service Update`,
        body: `Your service has been updated to ensure the best experience. Your new chauffeur details are now available.${ctx.driverName ? ` Chauffeur: ${ctx.driverName}.` : ""}${ctx.vehicleInfo ? ` Vehicle: ${ctx.vehicleInfo}.` : ""}${ctx.eta ? ` ETA: ${ctx.eta}.` : ""}`,
        shortText: `Your service has been updated. New chauffeur details available. — ${brand}`,
      };

    case "sla_high_risk":
      return {
        subject: `${brand} — Service Monitoring Active`,
        body: `We are actively monitoring your upcoming service to ensure everything runs smoothly. Our team is on standby to guarantee your experience.`,
        shortText: `We are actively monitoring your service. — ${brand}`,
      };

    case "sla_critical":
      return {
        subject: `${brand} — Service Update`,
        body: `Our dispatch team is actively managing your service to ensure timely execution. We will keep you updated in real time.`,
        shortText: `Our dispatch team is managing your service in real time. — ${brand}`,
      };

    case "smart_reassignment_started":
      return {
        subject: `${brand} — Service Optimization in Progress`,
        body: `Your service is being optimized to maintain schedule reliability. Updated chauffeur details will follow shortly.`,
        shortText: `Your service is being optimized. Updated details will follow. — ${brand}`,
      };

    case "driver_im_on_my_way":
      return {
        subject: `${brand} — Your Chauffeur Is On The Way`,
        body: `Your chauffeur is now on the way.${ctx.eta ? ` Estimated arrival: ${ctx.eta}.` : ""}`,
        shortText: `Your chauffeur is on the way. — ${brand}`,
      };

    case "rescue_assignment_started":
      return {
        subject: `${brand} — Service Update`,
        body: `Our team has initiated a priority assignment to ensure your service runs on schedule. You will receive confirmation shortly.`,
        shortText: `Priority assignment initiated. Confirmation to follow. — ${brand}`,
      };

    case "ride_marked_safe":
      return {
        subject: `${brand} — Service Confirmed`,
        body: `Your service is confirmed and on track. Your chauffeur is prepared and ready.`,
        shortText: `Your service is confirmed and on track. — ${brand}`,
      };

    default:
      return {
        subject: `${brand} — Service Update`,
        body: `We have an update regarding your upcoming service. Our team is ensuring everything is in order.`,
        shortText: `Service update from ${brand}.`,
      };
  }
}

// ── High-Level triggerCommunication Helper ───────────────────
// Called from BM6 endpoints (smart-reassign, sla-evaluate, driver-im-on-my-way)
// Fetches booking + client data, evaluates trigger, and sends notification.
// ─────────────────────────────────────────────────────────────
import { neon } from "@neondatabase/serverless";
import { sendClientNotification } from "./channel-engine";

export interface TriggerCommunicationInput {
  booking_id: string;
  event_type: CommunicationEvent;
  trigger_source: string;
  metadata?: Record<string, unknown>;
  db: ReturnType<typeof neon>;
}

export async function triggerCommunication(input: TriggerCommunicationInput): Promise<void> {
  const { booking_id, event_type, trigger_source, metadata = {}, db } = input;

  try {
    // Fetch booking + client data
    const rows = await db`
      SELECT
        b.id,
        b.client_id,
        b.pickup_at,
        b.pickup_address,
        b.dropoff_address,
        b.pending_client_notification,
        b.client_communication_opt_in,
        b.sla_protection_level,
        cl.full_name  AS client_name,
        cl.email      AS client_email,
        cl.phone      AS client_phone,
        d.full_name   AS driver_name,
        d.phone       AS driver_phone
      FROM bookings b
      LEFT JOIN clients cl ON cl.id = b.client_id::uuid
      LEFT JOIN drivers d  ON d.id  = b.assigned_driver_id::uuid
      WHERE b.id = ${booking_id}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) return;

    const booking = rows[0];

    // Check opt-in (default true if null)
    if (booking.client_communication_opt_in === false) return;

    // Build context
    const minutesToPickup = booking.pickup_at
      ? (new Date(booking.pickup_at).getTime() - Date.now()) / 60000
      : null;

    const ctx: TriggerContext = {
      bookingId: booking_id,
      event: event_type,
      minutesToPickup,
      clientEmail: booking.client_email ?? null,
      clientPhone: booking.client_phone ?? null,
      clientName: booking.client_name ?? null,
      driverName: (metadata.new_driver_name as string) ?? booking.driver_name ?? null,
      driverPhone: (metadata.new_driver_phone as string) ?? booking.driver_phone ?? null,
    };

    // Evaluate trigger
    const result = await evaluateCommunicationTrigger(ctx, db);

    if (!result.should_notify && !result.create_draft) return;

    // Send or create draft
    await sendClientNotification(
      {
        bookingId: booking_id,
        event: event_type,
        ctx,
        channelPriority: result.channel_priority,
        templateUsed: result.template ?? "generic_v1",
        triggerSource: trigger_source,
        eventReference: trigger_source,
        approvedByAdmin: false,
        createDraftOnly: result.create_draft ?? false,
      },
      db
    );
  } catch {
    // Non-blocking — never throw from communication layer
  }
}
