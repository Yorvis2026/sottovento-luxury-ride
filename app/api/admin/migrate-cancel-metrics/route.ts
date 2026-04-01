export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// POST /api/admin/migrate-cancel-metrics
//
// Adds normalized cancellation columns to bookings table:
//   - cancelled_by_type   (client / driver / admin / system)
//   - cancelled_by_id     (nullable UUID)
//   - cancel_reason_code  (normalized code, e.g. PASSENGER_NO_SHOW)
//   - cancel_reason_text  (human-readable text)
//   - cancel_stage        (before_assignment / assigned / in_progress / post_driver_issue)
//   - affects_driver_metrics  (boolean)
//   - affects_payout          (boolean)
//
// Also backfills existing cancelled bookings from cancel_reason + cancel_responsibility
// ============================================================

export async function POST() {
  const steps: { step: string; status: string; error?: string }[] = []

  async function run(step: string, fn: () => Promise<void>) {
    try {
      await fn()
      steps.push({ step, status: "ok" })
    } catch (err: any) {
      steps.push({ step, status: "error", error: err.message })
    }
  }

  // 1. Add new normalized columns
  await run("add cancelled_by_type", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by_type TEXT CHECK (cancelled_by_type IN ('client', 'driver', 'admin', 'system'))`
  })
  await run("add cancelled_by_id", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by_id UUID`
  })
  await run("add cancel_reason_code", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason_code TEXT`
  })
  await run("add cancel_reason_text", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_reason_text TEXT`
  })
  await run("add cancel_stage", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancel_stage TEXT CHECK (cancel_stage IN ('before_assignment', 'assigned', 'in_progress', 'post_driver_issue'))`
  })
  await run("add affects_driver_metrics", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS affects_driver_metrics BOOLEAN DEFAULT FALSE`
  })
  await run("add affects_payout", async () => {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS affects_payout BOOLEAN DEFAULT FALSE`
  })

  // 2. Backfill cancelled_by_type from cancel_responsibility
  await run("backfill cancelled_by_type from cancel_responsibility", async () => {
    await sql`
      UPDATE bookings
      SET cancelled_by_type = CASE
        WHEN cancel_responsibility = 'passenger' THEN 'client'
        WHEN cancel_responsibility = 'driver'    THEN 'driver'
        WHEN cancel_responsibility = 'dispatch'  THEN 'admin'
        WHEN cancel_responsibility = 'system'    THEN 'system'
        WHEN cancelled_by IS NOT NULL AND cancelled_by != '' THEN
          CASE
            WHEN cancelled_by ILIKE '%admin%' OR cancelled_by ILIKE '%dispatch%' THEN 'admin'
            WHEN cancelled_by ILIKE '%driver%' THEN 'driver'
            WHEN cancelled_by ILIKE '%client%' OR cancelled_by ILIKE '%passenger%' THEN 'client'
            ELSE 'system'
          END
        ELSE 'system'
      END
      WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
        AND cancelled_by_type IS NULL
    `
  })

  // 3. Backfill cancel_reason_code from cancel_reason (already normalized in cancel-ride)
  await run("backfill cancel_reason_code from cancel_reason", async () => {
    await sql`
      UPDATE bookings
      SET cancel_reason_code = UPPER(REPLACE(COALESCE(cancel_reason, 'UNKNOWN'), ' ', '_'))
      WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
        AND cancel_reason_code IS NULL
        AND cancel_reason IS NOT NULL
    `
  })

  // 4. Backfill cancel_reason_text (human readable)
  await run("backfill cancel_reason_text", async () => {
    await sql`
      UPDATE bookings
      SET cancel_reason_text = CASE cancel_reason_code
        WHEN 'PASSENGER_NO_SHOW'                THEN 'Passenger no-show'
        WHEN 'PASSENGER_CANCELLED'              THEN 'Client cancelled'
        WHEN 'PASSENGER_UNREACHABLE'            THEN 'Passenger unreachable'
        WHEN 'PASSENGER_FLIGHT_DELAY'           THEN 'Flight delay'
        WHEN 'PASSENGER_TOOK_DIFFERENT_VEHICLE' THEN 'Passenger took different vehicle'
        WHEN 'WRONG_PICKUP_LOCATION'            THEN 'Wrong pickup location'
        WHEN 'SAFETY_CONCERN'                   THEN 'Safety concern'
        WHEN 'VEHICLE_ISSUE'                    THEN 'Vehicle issue'
        WHEN 'DRIVER_EMERGENCY'                 THEN 'Driver emergency'
        WHEN 'DISPATCH_REQUEST'                 THEN 'Dispatch cancelled'
        WHEN 'OTHER'                            THEN 'Other reason'
        ELSE COALESCE(cancel_reason, 'Unknown')
      END
      WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
        AND cancel_reason_text IS NULL
    `
  })

  // 5. Backfill cancel_stage based on booking state at time of cancellation
  await run("backfill cancel_stage", async () => {
    await sql`
      UPDATE bookings
      SET cancel_stage = CASE
        WHEN status = 'driver_issue' OR cancel_responsibility = 'driver' THEN 'post_driver_issue'
        WHEN assigned_driver_id IS NOT NULL AND status IN ('accepted', 'assigned', 'en_route', 'arrived', 'in_trip') THEN 'in_progress'
        WHEN assigned_driver_id IS NOT NULL THEN 'assigned'
        ELSE 'before_assignment'
      END
      WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
        AND cancel_stage IS NULL
    `
  })

  // 6. Backfill affects_driver_metrics
  await run("backfill affects_driver_metrics", async () => {
    await sql`
      UPDATE bookings
      SET affects_driver_metrics = CASE
        WHEN cancelled_by_type = 'driver' THEN TRUE
        WHEN cancel_stage = 'post_driver_issue' THEN TRUE
        ELSE FALSE
      END
      WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
        AND affects_driver_metrics = FALSE
    `
  })

  // 7. Backfill affects_payout
  await run("backfill affects_payout", async () => {
    await sql`
      UPDATE bookings
      SET affects_payout = CASE
        WHEN COALESCE(cancellation_fee, 0) > 0 THEN TRUE
        WHEN cancelled_by_type = 'client' AND assigned_driver_id IS NOT NULL THEN TRUE
        ELSE FALSE
      END
      WHERE (status = 'cancelled' OR cancelled_at IS NOT NULL)
        AND affects_payout = FALSE
    `
  })

  // 8. Ensure cancelled_at is set for all status='cancelled' bookings
  await run("ensure cancelled_at is set", async () => {
    await sql`
      UPDATE bookings
      SET cancelled_at = updated_at
      WHERE status = 'cancelled'
        AND cancelled_at IS NULL
    `
  })

  // 9. Count cancelled bookings for verification
  const counts = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'cancelled' OR cancelled_at IS NOT NULL) AS total_cancelled,
      COUNT(*) FILTER (WHERE cancelled_by_type = 'client') AS by_client,
      COUNT(*) FILTER (WHERE cancelled_by_type = 'driver') AS by_driver,
      COUNT(*) FILTER (WHERE cancelled_by_type = 'admin') AS by_admin,
      COUNT(*) FILTER (WHERE cancelled_by_type = 'system') AS by_system,
      COUNT(*) FILTER (WHERE cancelled_by_type IS NULL AND (status = 'cancelled' OR cancelled_at IS NOT NULL)) AS unclassified
    FROM bookings
  `

  return NextResponse.json({
    success: true,
    steps,
    verification: counts[0],
    message: `Migration complete. ${counts[0]?.total_cancelled ?? 0} cancelled bookings processed.`
  })
}
