export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { PROVISIONAL_DEFAULTS, PROVISIONAL_WINDOW_DAYS } from "@/lib/scoring/engine";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ─── Helper: ensure all scoring columns exist ─────────────────────────────────
async function ensureScoringColumns() {
  try {
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS driver_score_total               INTEGER     DEFAULT 75,
        ADD COLUMN IF NOT EXISTS driver_score_tier                TEXT        DEFAULT 'GOLD',
        ADD COLUMN IF NOT EXISTS provisional_started_at           TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS provisional_ends_at              TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS provisional_completed_rides      INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS provisional_exit_reason          TEXT,
        ADD COLUMN IF NOT EXISTS is_eligible_for_premium_dispatch BOOLEAN     DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_eligible_for_airport_priority BOOLEAN     DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS on_time_rides                    INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS late_cancel_count                INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS complaint_count                  INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS contribution_bonus_granted       BOOLEAN     DEFAULT FALSE
    `;
  } catch {
    // Columns may already exist — safe to ignore
  }
}

// ============================================================
// GET /api/admin/drivers — List all drivers with scoring fields
// ============================================================
export async function GET() {
  try {
    await ensureScoringColumns();

    const rows = await sql`
      SELECT
        id,
        driver_code,
        full_name,
        phone,
        email,
        driver_status,
        is_eligible,
        created_at,
        COALESCE(driver_score_total, 75)                      AS driver_score_total,
        COALESCE(driver_score_tier, 'GOLD')                   AS driver_score_tier,
        provisional_started_at,
        provisional_ends_at,
        COALESCE(provisional_completed_rides, 0)              AS provisional_completed_rides,
        provisional_exit_reason,
        COALESCE(is_eligible_for_premium_dispatch, FALSE)     AS is_eligible_for_premium_dispatch,
        COALESCE(is_eligible_for_airport_priority, FALSE)     AS is_eligible_for_airport_priority,
        COALESCE(rides_completed, 0)                          AS rides_completed,
        COALESCE(on_time_rides, 0)                            AS on_time_rides,
        COALESCE(late_cancel_count, 0)                        AS late_cancel_count,
        COALESCE(complaint_count, 0)                          AS complaint_count,
        COALESCE(contribution_bonus_granted, FALSE)           AS contribution_bonus_granted
      FROM drivers
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ drivers: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// POST /api/admin/drivers — Create a new driver
//
// Provisional Driver Logic (SLN Network V1):
//   - All new approved drivers enter with driver_status = 'provisional'
//   - driver_score_total = 75 (GOLD tier entry point)
//   - 30-day window OR first 10 completed rides (whichever comes first)
//   - Accelerated score impact during provisional window
//   - Optional +5 contribution bonus for source-generating affiliates
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, phone, email, driver_code, is_affiliate, company_id } = body;

    if (!full_name || !phone || !driver_code) {
      return NextResponse.json(
        { error: "full_name, phone and driver_code are required" },
        { status: 400 }
      );
    }

    // Check if driver_code already exists
    const existing = await sql`
      SELECT id FROM drivers WHERE UPPER(driver_code) = UPPER(${driver_code}) LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Driver code "${driver_code}" is already in use` },
        { status: 409 }
      );
    }

    await ensureScoringColumns();

    // ── Provisional window timestamps ─────────────────────────
    const provisionalStartedAt = new Date().toISOString();
    const provisionalEndsAt    = new Date(
      Date.now() + PROVISIONAL_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // ── Contribution bonus for source-generating affiliates ───
    const initialScore = is_affiliate
      ? PROVISIONAL_DEFAULTS.driver_score_total + 5
      : PROVISIONAL_DEFAULTS.driver_score_total;

    const rows = await sql`
      INSERT INTO drivers (
        driver_code,
        full_name,
        phone,
        email,
        driver_status,
        is_eligible,
        driver_score_total,
        driver_score_tier,
        provisional_started_at,
        provisional_ends_at,
        provisional_completed_rides,
        is_eligible_for_premium_dispatch,
        is_eligible_for_airport_priority,
        contribution_bonus_granted,
        company_id,
        created_at,
        updated_at
      ) VALUES (
        ${driver_code},
        ${full_name},
        ${phone},
        ${email ?? null},
        ${PROVISIONAL_DEFAULTS.driver_status},
        true,
        ${initialScore},
        ${PROVISIONAL_DEFAULTS.driver_score_tier},
        ${provisionalStartedAt}::timestamptz,
        ${provisionalEndsAt}::timestamptz,
        ${PROVISIONAL_DEFAULTS.provisional_completed_rides},
        ${PROVISIONAL_DEFAULTS.is_eligible_for_premium_dispatch},
        ${PROVISIONAL_DEFAULTS.is_eligible_for_airport_priority},
        ${is_affiliate ? true : false},
        ${company_id ? `${company_id}::uuid` : null},
        NOW(),
        NOW()
      )
      RETURNING
        id, driver_code, full_name, phone, email,
        driver_status, is_eligible, created_at,
        driver_score_total, driver_score_tier,
        provisional_started_at, provisional_ends_at,
        provisional_completed_rides,
        is_eligible_for_premium_dispatch,
        is_eligible_for_airport_priority,
        contribution_bonus_granted,
        company_id
    `;

    const newDriver = rows[0];

    // ── Audit log: driver onboarding ─────────────────────────
    try {
      await sql`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, new_data
        ) VALUES (
          'driver',
          ${newDriver.id}::uuid,
          'driver_onboarded_provisional',
          'admin',
          ${JSON.stringify({
            driver_code,
            driver_status:                    PROVISIONAL_DEFAULTS.driver_status,
            driver_score_total:               initialScore,
            driver_score_tier:                PROVISIONAL_DEFAULTS.driver_score_tier,
            provisional_started_at:           provisionalStartedAt,
            provisional_ends_at:              provisionalEndsAt,
            is_affiliate:                     is_affiliate ?? false,
            contribution_bonus_granted:       is_affiliate ?? false,
            is_eligible_for_premium_dispatch: PROVISIONAL_DEFAULTS.is_eligible_for_premium_dispatch,
            is_eligible_for_airport_priority: PROVISIONAL_DEFAULTS.is_eligible_for_airport_priority,
            company_id:                       company_id ?? null,
            timestamp:                        new Date().toISOString(),
          })}::jsonb
        )
      `;
    } catch {
      // Non-blocking
    }

    // ── Audit log: contribution bonus grant ──────────────────
    if (is_affiliate) {
      try {
        await sql`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, actor_type, new_data
          ) VALUES (
            'driver',
            ${newDriver.id}::uuid,
            'provisional_score_event:onboarding_contribution_bonus',
            'system',
            ${JSON.stringify({
              event_type:         "onboarding_contribution_bonus",
              score_delta:        5,
              previous_score:     PROVISIONAL_DEFAULTS.driver_score_total,
              new_score:          initialScore,
              is_affiliate:       true,
              contribution_bonus: true,
              timestamp:          new Date().toISOString(),
            })}::jsonb
          )
        `;
      } catch {
        // Non-blocking
      }
    }

    // ── Audit log: company relationship ────────────────────
    if (company_id) {
      try {
        await sql`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, actor_type, new_data
          ) VALUES (
            'driver',
            ${newDriver.id}::uuid,
            'driver_assigned_to_company',
            'admin',
            ${JSON.stringify({
              driver_id:   newDriver.id,
              driver_code,
              company_id,
              action:      'company_relationship_created',
              timestamp:   new Date().toISOString(),
            })}::jsonb
          )
        `;
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json(
      {
        driver: newDriver,
        provisional: {
          status:          PROVISIONAL_DEFAULTS.driver_status,
          score:           initialScore,
          tier:            PROVISIONAL_DEFAULTS.driver_score_tier,
          starts_at:       provisionalStartedAt,
          ends_at:         provisionalEndsAt,
          ride_threshold:  10,
          bonus_granted:   is_affiliate ?? false,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
