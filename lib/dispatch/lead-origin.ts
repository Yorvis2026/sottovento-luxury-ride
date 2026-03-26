// ============================================================
// SLN Lead Origin Tracking Engine v1.0
// lib/dispatch/lead-origin.ts
//
// This module answers ONLY: "Where did this lead come from?"
//
// It does NOT determine:
//   - who accepted the ride
//   - who executed the ride
//   - who gets paid
//
// Those are handled by dispatch + commission layers.
//
// PRIORITY ORDER (spec §5):
//   1. manual admin override (handled externally)
//   2. explicit ref code  → driver_direct
//   3. tablet_id          → tablet
//   4. qr code            → qr
//   5. campaign params    → campaign
//   6. organic web        → organic_web
//   7. direct web         → direct_web
//   8. unknown            → unknown
//
// IMMUTABILITY (spec §17):
//   Once source_locked_at is set, these fields must NOT be
//   overwritten by dispatch or commission logic.
// ============================================================

import { neon } from "@neondatabase/serverless";

// ── Types ────────────────────────────────────────────────────

export type LeadSourceType =
  | "driver_direct"
  | "tablet"
  | "qr"
  | "direct_web"
  | "organic_web"
  | "manual_admin"
  | "campaign"
  | "hotel_partner"
  | "airbnb_partner"
  | "unknown";

export interface LeadOriginInput {
  // Explicit attribution signals
  ref_code?: string | null;          // e.g. SV-DR-001 — driver referral
  tablet_id?: string | null;         // e.g. TAB-SV-012
  qr_code?: string | null;           // e.g. QR-SV-003
  campaign_id?: string | null;       // e.g. GOOGLE-MCO-DISNEY
  partner_ref?: string | null;       // e.g. HOTEL-HYATT-01, AIRBNB-LAKE-NONA-02

  // Driver linkage
  source_driver_id?: string | null;  // UUID of the driver who owns the ref/qr/tablet

  // URL / session signals
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  landing_page?: string | null;
  referrer?: string | null;

  // Legacy / existing fields
  booking_origin?: string | null;    // 'tablet', 'website', 'app', etc.
  captured_by?: string | null;       // driver code or 'public_site'

  // Explicit override (admin-set, highest priority after manual_admin endpoint)
  explicit_source_type?: LeadSourceType | null;

  // Metadata passthrough (arbitrary evidence)
  extra_metadata?: Record<string, unknown>;
}

export interface LeadOriginResult {
  source_type: LeadSourceType;
  source_driver_id: string | null;
  source_reference: string;
  source_tablet_id: string | null;
  source_campaign_id: string | null;
  source_channel: string;
  source_metadata: Record<string, unknown>;
}

// ── Core resolver ────────────────────────────────────────────

/**
 * resolveLeadOrigin
 *
 * Determines the commercial origin of a booking based on
 * available attribution signals, following the priority order
 * defined in spec §5.
 *
 * This function is PURE — it does not write to DB.
 * Use lockLeadOrigin() to persist the result.
 */
export function resolveLeadOrigin(input: LeadOriginInput): LeadOriginResult {
  const {
    ref_code,
    tablet_id,
    qr_code,
    campaign_id,
    partner_ref,
    source_driver_id,
    utm_source,
    utm_campaign,
    utm_medium,
    landing_page,
    referrer,
    booking_origin,
    captured_by,
    explicit_source_type,
    extra_metadata,
  } = input;

  // Build metadata evidence object
  const metadata: Record<string, unknown> = {
    ...(landing_page && { landing_page }),
    ...(utm_source && { utm_source }),
    ...(utm_campaign && { utm_campaign }),
    ...(utm_medium && { utm_medium }),
    ...(referrer && { referrer }),
    ...(tablet_id && { tablet_id }),
    ...(qr_code && { qr_code }),
    ...(campaign_id && { campaign_id }),
    ...(partner_ref && { partner_ref }),
    ...(ref_code && { ref_code }),
    ...(captured_by && { captured_by }),
    ...(booking_origin && { booking_origin }),
    ...(extra_metadata ?? {}),
  };

  // ── PRIORITY 1: Explicit source type (admin-set at creation) ──
  if (explicit_source_type && explicit_source_type !== "unknown") {
    return buildResult(explicit_source_type, input, metadata);
  }

  // ── PRIORITY 2: Explicit ref code → driver_direct ────────────
  // A ref code tied to a driver is the strongest commercial signal
  if (ref_code && source_driver_id) {
    return {
      source_type: "driver_direct",
      source_driver_id,
      source_reference: ref_code,
      source_tablet_id: null,
      source_campaign_id: null,
      source_channel: "referral",
      source_metadata: metadata,
    };
  }

  // Ref code without driver (e.g. partner code that looks like a ref)
  if (ref_code && !source_driver_id) {
    return {
      source_type: "driver_direct",
      source_driver_id: null,
      source_reference: ref_code,
      source_tablet_id: null,
      source_campaign_id: null,
      source_channel: "referral",
      source_metadata: metadata,
    };
  }

  // ── PRIORITY 3: Tablet ID ─────────────────────────────────────
  if (tablet_id || booking_origin === "tablet") {
    const tabId = tablet_id ?? (booking_origin === "tablet" ? "TABLET-UNKNOWN" : null);
    return {
      source_type: "tablet",
      source_driver_id: source_driver_id ?? null,
      source_reference: tabId ?? "TABLET-UNKNOWN",
      source_tablet_id: tabId,
      source_campaign_id: null,
      source_channel: "tablet",
      source_metadata: metadata,
    };
  }

  // ── PRIORITY 4: QR code ───────────────────────────────────────
  if (qr_code) {
    return {
      source_type: "qr",
      source_driver_id: source_driver_id ?? null,
      source_reference: qr_code,
      source_tablet_id: null,
      source_campaign_id: null,
      source_channel: "qr",
      source_metadata: metadata,
    };
  }

  // ── PRIORITY 5: Campaign parameters ──────────────────────────
  if (campaign_id || (utm_source && utm_campaign)) {
    const campRef = campaign_id ?? `${utm_source?.toUpperCase()}-${utm_campaign?.toUpperCase()}`;
    return {
      source_type: "campaign",
      source_driver_id: null,
      source_reference: campRef,
      source_tablet_id: null,
      source_campaign_id: campaign_id ?? campRef,
      source_channel: "campaign",
      source_metadata: metadata,
    };
  }

  // ── PRIORITY 5b: Partner (hotel / airbnb) ────────────────────
  if (partner_ref) {
    const isAirbnb = partner_ref.toLowerCase().includes("airbnb");
    return {
      source_type: isAirbnb ? "airbnb_partner" : "hotel_partner",
      source_driver_id: source_driver_id ?? null,
      source_reference: partner_ref,
      source_tablet_id: null,
      source_campaign_id: null,
      source_channel: "partner",
      source_metadata: metadata,
    };
  }

  // ── PRIORITY 6: Organic web (SEO signals) ────────────────────
  // Organic: utm_medium=organic, or referrer from search engine
  const isOrganic =
    utm_medium === "organic" ||
    (referrer &&
      /google\.|bing\.|yahoo\.|duckduckgo\.|baidu\./.test(referrer));

  if (isOrganic) {
    return {
      source_type: "organic_web",
      source_driver_id: null,
      source_reference: "SEO-ORGANIC",
      source_tablet_id: null,
      source_campaign_id: null,
      source_channel: "organic",
      source_metadata: metadata,
    };
  }

  // ── PRIORITY 7: Direct web ────────────────────────────────────
  // No attribution signals, no campaign, no driver
  if (!source_driver_id && !captured_by?.trim()) {
    return {
      source_type: "direct_web",
      source_driver_id: null,
      source_reference: "WEB-DIRECT",
      source_tablet_id: null,
      source_campaign_id: null,
      source_channel: "website",
      source_metadata: metadata,
    };
  }

  // captured_by present but no ref_code → treat as driver_direct
  if (captured_by && captured_by.trim().toLowerCase() !== "public_site") {
    return {
      source_type: "driver_direct",
      source_driver_id: source_driver_id ?? null,
      source_reference: captured_by.trim().toUpperCase(),
      source_tablet_id: null,
      source_campaign_id: null,
      source_channel: "referral",
      source_metadata: metadata,
    };
  }

  // ── PRIORITY 8: Unknown ───────────────────────────────────────
  return {
    source_type: "unknown",
    source_driver_id: null,
    source_reference: "UNKNOWN",
    source_tablet_id: null,
    source_campaign_id: null,
    source_channel: "unknown",
    source_metadata: metadata,
  };
}

// ── Helper: build result for explicit_source_type ────────────

function buildResult(
  sourceType: LeadSourceType,
  input: LeadOriginInput,
  metadata: Record<string, unknown>
): LeadOriginResult {
  const { ref_code, tablet_id, qr_code, campaign_id, partner_ref, source_driver_id } = input;

  const channelMap: Record<LeadSourceType, string> = {
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

  const refMap: Record<LeadSourceType, string> = {
    driver_direct: ref_code ?? "DRIVER-DIRECT",
    tablet: tablet_id ?? "TABLET-UNKNOWN",
    qr: qr_code ?? "QR-UNKNOWN",
    direct_web: "WEB-DIRECT",
    organic_web: "SEO-ORGANIC",
    manual_admin: "ADMIN-MANUAL",
    campaign: campaign_id ?? "CAMPAIGN-UNKNOWN",
    hotel_partner: partner_ref ?? "HOTEL-UNKNOWN",
    airbnb_partner: partner_ref ?? "AIRBNB-UNKNOWN",
    unknown: "UNKNOWN",
  };

  return {
    source_type: sourceType,
    source_driver_id: source_driver_id ?? null,
    source_reference: refMap[sourceType],
    source_tablet_id: sourceType === "tablet" ? (tablet_id ?? null) : null,
    source_campaign_id: sourceType === "campaign" ? (campaign_id ?? null) : null,
    source_channel: channelMap[sourceType],
    source_metadata: metadata,
  };
}

// ── DB writer: lockLeadOrigin ─────────────────────────────────

/**
 * lockLeadOrigin
 *
 * Persists the resolved lead origin to the bookings table and
 * creates a snapshot in lead_origin_snapshots.
 *
 * IDEMPOTENT: Will NOT overwrite if source_locked_at is already set.
 * Returns { locked: true } if newly locked, { locked: false } if already locked.
 */
export async function lockLeadOrigin(
  bookingId: string,
  origin: LeadOriginResult
): Promise<{ locked: boolean; already_locked?: boolean }> {
  const db = neon(process.env.DATABASE_URL_UNPOOLED!);

  // Check if already locked
  const [existing] = await db`
    SELECT source_locked_at FROM bookings WHERE id = ${bookingId}::uuid LIMIT 1
  `;

  if (!existing) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  if (existing.source_locked_at) {
    // Already locked — do not overwrite (spec §4)
    return { locked: false, already_locked: true };
  }

  const now = new Date().toISOString();

  // Write to bookings
  await db`
    UPDATE bookings
    SET
      source_type        = ${origin.source_type},
      source_driver_id   = ${origin.source_driver_id ? `${origin.source_driver_id}::uuid` : null},
      source_reference   = ${origin.source_reference},
      source_tablet_id   = ${origin.source_tablet_id},
      source_campaign_id = ${origin.source_campaign_id},
      source_channel     = ${origin.source_channel},
      source_metadata    = ${JSON.stringify(origin.source_metadata)}::jsonb,
      source_locked_at   = ${now}::timestamptz,
      updated_at         = NOW()
    WHERE id = ${bookingId}::uuid
      AND source_locked_at IS NULL
  `;

  // Write snapshot (ON CONFLICT DO NOTHING — first lock is canonical)
  try {
    await db`
      INSERT INTO lead_origin_snapshots (
        booking_id, source_type, source_driver_id,
        source_reference, source_tablet_id, source_campaign_id,
        source_channel, source_metadata, created_at
      ) VALUES (
        ${bookingId}::uuid,
        ${origin.source_type},
        ${origin.source_driver_id ? `${origin.source_driver_id}::uuid` : null},
        ${origin.source_reference},
        ${origin.source_tablet_id},
        ${origin.source_campaign_id},
        ${origin.source_channel},
        ${JSON.stringify(origin.source_metadata)}::jsonb,
        NOW()
      )
      ON CONFLICT (booking_id) DO NOTHING
    `;
  } catch {
    // Snapshot failure is non-blocking — booking lock already written
    console.warn("[lockLeadOrigin] snapshot insert failed for", bookingId);
  }

  return { locked: true };
}

// ── Guard: guardLeadOriginImmutability ────────────────────────

/**
 * guardLeadOriginImmutability
 *
 * Call this before any UPDATE that might touch source_* fields.
 * Returns true if the update is safe (source not yet locked).
 * Returns false if source is locked and update should be blocked.
 *
 * Dispatch and commission code must call this before mutating
 * any source_* fields.
 */
export function guardLeadOriginImmutability(
  sourceLocked: boolean | null | undefined
): boolean {
  return !sourceLocked;
}
