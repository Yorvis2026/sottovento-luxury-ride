import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// SLN DISPATCH ENGINE — Cron Job Endpoint
// Runs every 15 seconds via Vercel Cron
// ============================================================
// IDEMPOTENCY GUARANTEE:
// - All updates use WHERE clauses that prevent duplicate transitions
// - Safety checks ensure assigned/cancelled bookings are never touched
// - The dispatch_log records every transition with reason + timestamp
// ============================================================

// Helper: sleep for N milliseconds
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: Request) {
  // Vercel Cron calls via GET — verify cron secret for security
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Self-schedule at 15s, 30s, 45s to simulate every-15-second execution
  // Vercel Cron minimum is 1 minute, so we fire 3 additional runs within the window
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://www.sottoventoluxuryride.com";

  // Fire-and-forget the 3 additional runs with delays
  // We don't await these — they run independently
  ;(async () => {
    for (const delay of [15000, 30000, 45000]) {
      await sleep(delay);
      try {
        await fetch(`${baseUrl}/api/dispatch/engine`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // Ignore errors in self-scheduled runs
      }
    }
  })();

  return runDispatchEngine();
}

export async function POST() {
  // Allow manual trigger from admin panel
  return runDispatchEngine();
}

async function runDispatchEngine() {
  const startedAt = new Date().toISOString();
  const processed: string[] = [];
  let totalProcessed = 0;

  try {
    // ============================================================
    // STEP 0 — ENSURE SCHEMA (idempotent migration)
    // Add required columns if they don't exist
    // ============================================================
    await sql`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS offer_stage TEXT DEFAULT 'source_owner',
      ADD COLUMN IF NOT EXISTS offer_status TEXT DEFAULT 'pending'
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS dispatch_log (
        id SERIAL PRIMARY KEY,
        booking_id TEXT NOT NULL,
        previous_dispatch_status TEXT,
        new_dispatch_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // ============================================================
    // STEP 1 — SELECT EXPIRED OFFERS
    // Find bookings where the offer timer has expired
    // ============================================================
    const expiredOffers = await sql`
      SELECT
        id,
        status,
        dispatch_status,
        offer_stage,
        offer_status,
        offer_expires_at,
        offer_sent_at
      FROM bookings
      WHERE
        dispatch_status IN ('awaiting_source_owner', 'awaiting_sln_member')
        AND offer_expires_at IS NOT NULL
        AND offer_expires_at <= NOW()
        AND offer_status = 'pending'
        AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
      FOR UPDATE SKIP LOCKED
    `;

    processed.push(`📋 Found ${expiredOffers.length} expired offer(s)`);

    // ============================================================
    // STEP 2 — PROCESS SOURCE OWNER EXPIRATION
    // awaiting_source_owner → awaiting_sln_member
    // ============================================================
    const sourceOwnerExpired = expiredOffers.filter(
      (b: any) => b.dispatch_status === "awaiting_source_owner"
    );

    for (const booking of sourceOwnerExpired) {
      // STEP 4 — SAFETY CHECK before update
      const safetyCheck = await sql`
        SELECT id, status, dispatch_status
        FROM bookings
        WHERE id = ${booking.id}
          AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
          AND dispatch_status = 'awaiting_source_owner'
          AND offer_status = 'pending'
        LIMIT 1
      `;

      if (safetyCheck.length === 0) {
        processed.push(`⚠️ Booking ${booking.id.slice(0, 8)} — skipped (safety check failed)`);
        continue;
      }

      // Transition: awaiting_source_owner → awaiting_sln_member
      // Spec: 30-minute window for SLN pool
      await sql`
        UPDATE bookings
        SET
          dispatch_status = 'awaiting_sln_member',
          offer_sent_at = NOW(),
          offer_expires_at = NOW() + INTERVAL '30 minutes',
          offer_stage = 'sln_member',
          offer_status = 'pending',
          updated_at = NOW()
        WHERE id = ${booking.id}
          AND dispatch_status = 'awaiting_source_owner'
          AND offer_status = 'pending'
          AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
      `;

      // STEP 5 — LOG EVENT
      await sql`
        INSERT INTO dispatch_log (
          booking_id,
          previous_dispatch_status,
          new_dispatch_status,
          reason,
          metadata
        ) VALUES (
          ${booking.id},
          'awaiting_source_owner',
          'awaiting_sln_member',
          'expired',
          ${JSON.stringify({
            expired_at: new Date().toISOString(),
            offer_stage_before: booking.offer_stage,
            booking_status: booking.status,
          })}::jsonb
        )
      `;

      processed.push(
        `✅ Booking ${booking.id.slice(0, 8)}: source_owner_offer_expired → awaiting_sln_member`
      );
      totalProcessed++;
    }

    // ============================================================
    // STEP 3 — PROCESS SLN MEMBER EXPIRATION
    // awaiting_sln_member → manual_dispatch_required
    // ============================================================
    const slnMemberExpired = expiredOffers.filter(
      (b: any) => b.dispatch_status === "awaiting_sln_member"
    );

    for (const booking of slnMemberExpired) {
      // STEP 4 — SAFETY CHECK before update
      const safetyCheck = await sql`
        SELECT id, status, dispatch_status
        FROM bookings
        WHERE id = ${booking.id}
          AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
          AND dispatch_status = 'awaiting_sln_member'
          AND offer_status = 'pending'
        LIMIT 1
      `;

      if (safetyCheck.length === 0) {
        processed.push(`⚠️ Booking ${booking.id.slice(0, 8)} — skipped (safety check failed)`);
        continue;
      }

      // Transition: awaiting_sln_member → manual_dispatch_required
      // Clear offer timers as per spec
      await sql`
        UPDATE bookings
        SET
          dispatch_status = 'manual_dispatch_required',
          offer_expires_at = NULL,
          offer_stage = 'manual',
          offer_status = 'pending',
          updated_at = NOW()
        WHERE id = ${booking.id}
          AND dispatch_status = 'awaiting_sln_member'
          AND offer_status = 'pending'
          AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
      `;

      // STEP 5 — LOG EVENT
      await sql`
        INSERT INTO dispatch_log (
          booking_id,
          previous_dispatch_status,
          new_dispatch_status,
          reason,
          metadata
        ) VALUES (
          ${booking.id},
          'awaiting_sln_member',
          'manual_dispatch_required',
          'expired',
          ${JSON.stringify({
            expired_at: new Date().toISOString(),
            offer_stage_before: booking.offer_stage,
            booking_status: booking.status,
          })}::jsonb
        )
      `;

      processed.push(
        `✅ Booking ${booking.id.slice(0, 8)}: sln_member_offer_expired → manual_dispatch_required`
      );
      totalProcessed++;
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    const summary = {
      success: true,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      expired_offers_found: expiredOffers.length,
      transitions_made: totalProcessed,
      source_owner_expired: sourceOwnerExpired.length,
      sln_member_expired: slnMemberExpired.length,
      log: processed,
    };

    return NextResponse.json(summary);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        started_at: startedAt,
        log: processed,
      },
      { status: 500 }
    );
  }
}
