import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL_UNPOOLED as string);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/fallback-pool-dispatch
// Bloque Maestro 3 — Fallback Pool Routing Engine
//
// Triggers dispatchFallbackPool() for bookings with:
//   dispatch_status IN (reassignment_needed, urgent_reassignment, critical_driver_failure)
//
// Case A (reassignment_needed):     sequential dispatch, 120s deadline
// Case B (urgent_reassignment):     top-3 simultaneous, first ACCEPT wins
// Case C (critical_driver_failure): admin queue only, no auto-assign
// ─────────────────────────────────────────────────────────────────────────────

const OFFER_DEADLINE_SECONDS = 120; // 2 minutes

async function logEvent(bookingId: string, driverId: string | null, eventType: string, eventData: object) {
  try {
    await sql`
      INSERT INTO dispatch_event_log (booking_id, driver_id, event_type, event_data, created_at)
      VALUES (
        ${bookingId}::uuid,
        ${driverId ? `${driverId}::uuid` : null}::uuid,
        ${eventType},
        ${JSON.stringify(eventData)}::jsonb,
        NOW()
      )
    `;
  } catch (_) {
    // Non-critical — don't fail the main flow
  }
}

async function getCandidateDrivers(booking: any, excludeIds: string[], limit: number) {
  const excluded = excludeIds.length > 0 ? excludeIds : ['00000000-0000-0000-0000-000000000000'];
  const rows = await sql`
    SELECT
      d.id,
      d.driver_code,
      d.full_name,
      d.availability_status,
      -- BM5: Legal Affiliation Priority Layer
      COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER') AS legal_affiliation_type,
      COALESCE(d.reliability_score, 65)::numeric                   AS reliability_score,
      COALESCE(d.driver_tier, 'STANDARD')                          AS driver_tier,
      COALESCE(pc.partner_dispatch_mode, 'CAPTURE_ONLY')           AS company_partner_dispatch_mode
    FROM drivers d
    LEFT JOIN partner_companies pc ON d.company_id = pc.id
    WHERE d.driver_status = 'active'
      AND d.is_eligible = true
      AND (d.license_expires_at IS NULL OR d.license_expires_at > NOW())
      AND (d.insurance_expires_at IS NULL OR d.insurance_expires_at > NOW())
      AND COALESCE(d.availability_status, 'available') = 'available'
      AND d.id NOT IN (
        SELECT unnest(${excluded}::uuid[])
      )
      AND d.id != ${booking.assigned_driver_id || '00000000-0000-0000-0000-000000000000'}::uuid
    ORDER BY
      -- BM5 Fallback Ordering: SOTTOVENTO_LEGAL_FLEET first, then PARTNER_LEGAL (SUBNETWORK_PRIORITY), then GENERAL
      CASE COALESCE(d.legal_affiliation_type, 'GENERAL_NETWORK_DRIVER')
        WHEN 'SOTTOVENTO_LEGAL_FLEET' THEN 1
        WHEN 'PARTNER_LEGAL_FLEET'    THEN 2
        ELSE 3
      END ASC,
      -- Within group: reliability_score DESC (highest DRS first)
      COALESCE(d.reliability_score, 65) DESC,
      d.created_at ASC
    LIMIT ${limit}
  `;
  return rows;
}

async function createFallbackOffer(bookingId: string, driverId: string, caseLevel: string, priorityLevel: string, round: number) {
  const expiresAt = new Date(Date.now() + OFFER_DEADLINE_SECONDS * 1000).toISOString();
  await sql`
    INSERT INTO dispatch_offers (
      booking_id, driver_id, response, offer_round,
      is_source_offer, is_fallback_offer, fallback_case_level, fallback_priority_level,
      sent_at, expires_at, created_at
    ) VALUES (
      ${bookingId}::uuid,
      ${driverId}::uuid,
      'pending',
      ${round},
      false,
      true,
      ${caseLevel},
      ${priorityLevel},
      NOW(),
      ${expiresAt}::timestamptz,
      NOW()
    )
    ON CONFLICT DO NOTHING
  `;
}

async function dispatchFallbackPool(booking: any, dryRun: boolean): Promise<object> {
  const bookingId = booking.id;
  const dispatchStatus = booking.dispatch_status;
  const originalDriverId = booking.assigned_driver_id || booking.original_driver_id;

  // Determine case level
  let caseLevel: string;
  let priorityLevel: string;
  let candidateLimit: number;

  if (dispatchStatus === 'reassignment_needed') {
    caseLevel = 'A';
    priorityLevel = 'normal';
    candidateLimit = 1; // Sequential
  } else if (dispatchStatus === 'urgent_reassignment') {
    caseLevel = 'B';
    priorityLevel = 'urgent';
    candidateLimit = 3; // Top 3 simultaneous
  } else {
    // critical_driver_failure
    caseLevel = 'C';
    priorityLevel = 'critical';
    candidateLimit = 0; // Admin queue only — no auto-assign
  }

  // Case C: no auto-assign — just flag for admin queue
  if (caseLevel === 'C') {
    if (!dryRun) {
      await sql`
        UPDATE bookings
        SET
          fallback_case_level = 'C',
          fallback_trigger_reason = ${dispatchStatus},
          original_driver_id = COALESCE(original_driver_id, ${originalDriverId}::uuid),
          fallback_pool_started_at = NOW(),
          updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;
      await logEvent(bookingId, null, 'fallback_pool_started', {
        case: 'C',
        dispatch_status: dispatchStatus,
        action: 'admin_queue_only',
      });
    }
    return {
      booking_id: bookingId,
      case: 'C',
      action: 'admin_queue_only',
      message: 'Critical failure — dispatcher priority override required. No auto-assign.',
      dispatch_status: dispatchStatus,
    };
  }

  // Get drivers already declined/timed out
  const declinedRows = await sql`
    SELECT DISTINCT driver_id FROM dispatch_offers
    WHERE booking_id = ${bookingId}::uuid
      AND response IN ('declined', 'timeout')
  `;
  const declinedIds = declinedRows.map((r: any) => r.driver_id as string);
  if (originalDriverId) declinedIds.push(originalDriverId);

  // Get candidate drivers
  const candidates = await getCandidateDrivers(booking, declinedIds, candidateLimit);

  if (candidates.length === 0) {
    if (!dryRun) {
      await sql`
        UPDATE bookings
        SET
          dispatch_status = 'pending_dispatch',
          fallback_case_level = ${caseLevel},
          fallback_trigger_reason = ${dispatchStatus},
          original_driver_id = COALESCE(original_driver_id, ${originalDriverId || null}::uuid),
          updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;
      await logEvent(bookingId, null, 'fallback_pool_started', {
        case: caseLevel,
        result: 'no_candidates',
        dispatch_status: dispatchStatus,
      });
    }
    return {
      booking_id: bookingId,
      case: caseLevel,
      action: 'no_candidates_available',
      message: 'No eligible drivers found — released to manual pool',
      candidates_checked: declinedIds.length,
    };
  }

  if (dryRun) {
    return {
      booking_id: bookingId,
      case: caseLevel,
      priority: priorityLevel,
      action: dryRun ? 'dry_run_preview' : 'offers_sent',
      candidates: candidates.map((c: any) => ({
        driver_id: c.id,
        driver_code: c.driver_code,
        driver_name: c.full_name,
      })),
      offer_deadline_seconds: OFFER_DEADLINE_SECONDS,
    };
  }

  // Get current max offer round
  const roundRows = await sql`
    SELECT COALESCE(MAX(offer_round), 0) + 1 AS next_round
    FROM dispatch_offers
    WHERE booking_id = ${bookingId}::uuid
  `;
  const nextRound = roundRows[0]?.next_round || 1;

  // Create offers for all candidates (Case A: 1, Case B: up to 3)
  for (const candidate of candidates) {
    await createFallbackOffer(bookingId, candidate.id, caseLevel, priorityLevel, nextRound);
    await logEvent(bookingId, candidate.id, 'fallback_offer_sent', {
      case: caseLevel,
      priority: priorityLevel,
      round: nextRound,
      driver_code: candidate.driver_code,
      expires_in_seconds: OFFER_DEADLINE_SECONDS,
    });
  }

  // Update booking state
  await sql`
    UPDATE bookings
    SET
      dispatch_status = 'offer_pending',
      fallback_case_level = ${caseLevel},
      fallback_trigger_reason = ${dispatchStatus},
      original_driver_id = COALESCE(original_driver_id, ${originalDriverId || null}::uuid),
      fallback_pool_started_at = COALESCE(fallback_pool_started_at, NOW()),
      fallback_offer_count = COALESCE(fallback_offer_count, 0) + ${candidates.length},
      updated_at = NOW()
    WHERE id = ${bookingId}::uuid
  `;

  await logEvent(bookingId, null, 'fallback_pool_started', {
    case: caseLevel,
    priority: priorityLevel,
    offers_sent: candidates.length,
    candidate_driver_codes: candidates.map((c: any) => c.driver_code),
  });

  return {
    booking_id: bookingId,
    case: caseLevel,
    priority: priorityLevel,
    action: 'offers_sent',
    offers_sent: candidates.length,
    candidates: candidates.map((c: any) => ({
      driver_id: c.id,
      driver_code: c.driver_code,
      driver_name: c.full_name,
    })),
    offer_deadline_seconds: OFFER_DEADLINE_SECONDS,
    new_dispatch_status: 'offer_pending',
  };
}

// GET — dry run: preview what would be dispatched
export async function GET(req: Request) {
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bookings = await sql`
      SELECT id, dispatch_status, assigned_driver_id, original_driver_id,
             pickup_at, vehicle_type, service_type
      FROM bookings
      WHERE dispatch_status IN ('reassignment_needed', 'urgent_reassignment', 'critical_driver_failure')
        AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
      ORDER BY
        CASE dispatch_status
          WHEN 'critical_driver_failure' THEN 1
          WHEN 'urgent_reassignment' THEN 2
          ELSE 3
        END,
        pickup_at ASC
    `;

    if (bookings.length === 0) {
      return NextResponse.json({ mode: 'dry_run', pending_count: 0, preview: [] });
    }

    const preview = await Promise.all(
      bookings.map((b: any) => dispatchFallbackPool(b, true))
    );

    return NextResponse.json({
      mode: 'dry_run',
      pending_count: bookings.length,
      preview,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// POST — live run: execute fallback dispatch
export async function POST(req: Request) {
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey !== 'sln-admin-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const targetBookingId = body.booking_id; // Optional: target a specific booking

  try {
    let bookings;
    if (targetBookingId) {
      bookings = await sql`
        SELECT id, dispatch_status, assigned_driver_id, original_driver_id,
               pickup_at, vehicle_type, service_type
        FROM bookings
        WHERE id = ${targetBookingId}::uuid
          AND dispatch_status IN ('reassignment_needed', 'urgent_reassignment', 'critical_driver_failure')
          AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
        LIMIT 1
      `;
    } else {
      bookings = await sql`
        SELECT id, dispatch_status, assigned_driver_id, original_driver_id,
               pickup_at, vehicle_type, service_type
        FROM bookings
        WHERE dispatch_status IN ('reassignment_needed', 'urgent_reassignment', 'critical_driver_failure')
          AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
        ORDER BY
          CASE dispatch_status
            WHEN 'critical_driver_failure' THEN 1
            WHEN 'urgent_reassignment' THEN 2
            ELSE 3
          END,
          pickup_at ASC
      `;
    }

    if (bookings.length === 0) {
      return NextResponse.json({
        mode: 'live_run',
        processed_count: 0,
        message: 'No bookings requiring fallback dispatch found',
      });
    }

    const results = await Promise.all(
      bookings.map((b: any) => dispatchFallbackPool(b, false))
    );

    return NextResponse.json({
      mode: 'live_run',
      processed_count: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
