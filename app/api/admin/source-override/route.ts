import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import type { LeadSourceType } from "@/lib/dispatch/lead-origin";

// ============================================================
// POST /api/admin/source-override
//
// Allows admin to manually override the lead origin for a
// specific booking. This is the ONLY mechanism that can change
// source fields after source_locked_at is set (spec §4, §20).
//
// SAFETY (spec §17):
//   - Does NOT modify dispatch_status, assigned_driver_id,
//     executor_driver_id, accepted_driver_id, commission fields
//   - Only modifies source_* fields
//   - Writes override audit trail (reason, timestamp, admin_id)
//   - Writes audit_logs entry for full traceability
//
// REQUEST BODY:
//   {
//     booking_id:          string (UUID)
//     admin_id:            string (UUID)
//     override_reason:     string
//     source_type:         LeadSourceType
//     source_driver_id?:   string (UUID) | null
//     source_reference?:   string
//     source_tablet_id?:   string | null
//     source_campaign_id?: string | null
//     source_channel?:     string
//     source_metadata?:    object
//   }
// ============================================================

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

const VALID_SOURCE_TYPES: LeadSourceType[] = [
  "driver_direct",
  "tablet",
  "qr",
  "direct_web",
  "organic_web",
  "manual_admin",
  "campaign",
  "hotel_partner",
  "airbnb_partner",
  "unknown",
];

const CHANNEL_DEFAULTS: Record<LeadSourceType, string> = {
  driver_direct: "referral",
  tablet: "tablet",
  qr: "qr",
  direct_web: "website",
  organic_web: "organic",
  manual_admin: "admin",
  campaign: "campaign",
  hotel_partner: "partner",
  airbnb_partner: "partner",
  unknown: "unknown",
};

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    booking_id,
    admin_id,
    override_reason,
    source_type,
    source_driver_id,
    source_reference,
    source_tablet_id,
    source_campaign_id,
    source_channel,
    source_metadata,
  } = body as {
    booking_id: string;
    admin_id: string;
    override_reason: string;
    source_type: LeadSourceType;
    source_driver_id?: string | null;
    source_reference?: string;
    source_tablet_id?: string | null;
    source_campaign_id?: string | null;
    source_channel?: string;
    source_metadata?: Record<string, unknown>;
  };

  // ── Validation ────────────────────────────────────────────
  if (!booking_id || !admin_id || !override_reason || !source_type) {
    return NextResponse.json(
      { error: "booking_id, admin_id, override_reason, and source_type are required" },
      { status: 400 }
    );
  }

  if (!VALID_SOURCE_TYPES.includes(source_type)) {
    return NextResponse.json(
      {
        error: `Invalid source_type '${source_type}'. Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    // ── Read current booking state ─────────────────────────
    const [booking] = await sql`
      SELECT id, source_type AS old_source_type,
             source_driver_id AS old_source_driver_id,
             source_reference AS old_source_reference,
             source_locked_at
      FROM bookings
      WHERE id = ${booking_id}::uuid
      LIMIT 1
    `;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const resolvedChannel = (source_channel as string) ?? CHANNEL_DEFAULTS[source_type];
    const resolvedReference =
      (source_reference as string) ??
      (source_type === "direct_web"
        ? "WEB-DIRECT"
        : source_type === "organic_web"
        ? "SEO-ORGANIC"
        : source_type === "manual_admin"
        ? "ADMIN-MANUAL"
        : "UNKNOWN");

    // ── Step 1: Update bookings source fields ──────────────
    await sql`
      UPDATE bookings
      SET
        source_type               = ${source_type},
        source_driver_id          = ${source_driver_id ? `${source_driver_id}::uuid` : null},
        source_reference          = ${resolvedReference},
        source_tablet_id          = ${(source_tablet_id as string | null) ?? null},
        source_campaign_id        = ${(source_campaign_id as string | null) ?? null},
        source_channel            = ${resolvedChannel},
        source_metadata           = ${JSON.stringify(source_metadata ?? {})}::jsonb,
        source_locked_at          = ${now}::timestamptz,
        source_override_reason    = ${override_reason},
        source_override_timestamp = ${now}::timestamptz,
        source_override_admin_id  = ${admin_id}::uuid,
        updated_at                = NOW()
      WHERE id = ${booking_id}::uuid
    `;

    // ── Step 2: Write audit log ────────────────────────────
    await sql`
      INSERT INTO audit_logs (
        entity_type, entity_id, action,
        actor_type, actor_id,
        new_data, created_at
      ) VALUES (
        'booking', ${booking_id}::uuid, 'source_override',
        'admin', ${admin_id}::uuid,
        ${JSON.stringify({
          source_type,
          source_driver_id: source_driver_id ?? null,
          source_reference: resolvedReference,
          source_tablet_id: source_tablet_id ?? null,
          source_campaign_id: source_campaign_id ?? null,
          source_channel: resolvedChannel,
          override_reason,
          previous_source_type: booking.old_source_type,
          previous_source_driver_id: booking.old_source_driver_id,
          previous_source_reference: booking.old_source_reference,
          previous_locked_at: booking.source_locked_at,
        })}::jsonb,
        NOW()
      )
    `;

    console.log(
      `[source-override] booking=${booking_id} admin=${admin_id} ` +
        `${booking.old_source_type} → ${source_type} reason="${override_reason}"`
    );

    return NextResponse.json({
      ok: true,
      booking_id,
      source_type,
      source_driver_id: source_driver_id ?? null,
      source_reference: resolvedReference,
      source_tablet_id: source_tablet_id ?? null,
      source_campaign_id: source_campaign_id ?? null,
      source_channel: resolvedChannel,
      override_reason,
      override_timestamp: now,
      previous_source_type: booking.old_source_type,
    });
  } catch (err: any) {
    console.error("[source-override]", err);
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 }
    );
  }
}
