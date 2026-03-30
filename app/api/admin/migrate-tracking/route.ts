export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// POST /api/admin/migrate-tracking
// Idempotent migration: adds tracking_token column and backfills existing bookings
export async function POST() {
  const results: string[] = []

  try {
    // 1. Add tracking_token column if it doesn't exist
    await sql`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64) UNIQUE
    `
    results.push("✅ Added tracking_token column")

    // 2. Backfill existing bookings that don't have a token yet
    const bookingsWithoutToken = await sql`
      SELECT id FROM bookings
      WHERE tracking_token IS NULL
    `
    results.push(`📊 Bookings without token: ${bookingsWithoutToken.length}`)

    let updated = 0
    for (const row of bookingsWithoutToken) {
      const token = crypto.randomBytes(24).toString("hex") // 48 char hex token
      await sql`
        UPDATE bookings
        SET tracking_token = ${token}
        WHERE id = ${row.id}
          AND tracking_token IS NULL
      `
      updated++
    }
    results.push(`✅ Backfilled ${updated} bookings with tracking tokens`)

    // 3. Return a sample token for testing
    const sample = await sql`
      SELECT id, tracking_token, status, pickup_address, dropoff_address
      FROM bookings
      WHERE tracking_token IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 3
    `
    results.push(`📋 Sample tokens: ${JSON.stringify(sample.map((r: any) => ({
      id: r.id.slice(0, 8),
      token: r.tracking_token?.slice(0, 12) + "...",
      status: r.status,
    })))}`)

    return NextResponse.json({
      success: true,
      results,
      sample_links: sample.map((r: any) => ({
        booking_id: r.id,
        status: r.status,
        tracking_url: `https://sottoventoluxuryride.com/track/${r.tracking_token}`,
        pickup: r.pickup_address,
        dropoff: r.dropoff_address,
      })),
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message, results },
      { status: 500 }
    )
  }
}

// GET — Check migration status
export async function GET() {
  try {
    const count = await sql`
      SELECT
        COUNT(*) FILTER (WHERE tracking_token IS NOT NULL) AS with_token,
        COUNT(*) FILTER (WHERE tracking_token IS NULL) AS without_token,
        COUNT(*) AS total
      FROM bookings
    `
    return NextResponse.json({ status: "ok", counts: count[0] })
  } catch (err: any) {
    // Column doesn't exist yet
    return NextResponse.json({ status: "not_migrated", error: err.message })
  }
}
