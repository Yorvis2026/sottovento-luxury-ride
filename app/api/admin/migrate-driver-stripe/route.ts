import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// ============================================================
// POST /api/admin/migrate-driver-stripe
//
// Adds Stripe Connect columns to the drivers table.
// Run once to enable payout method tracking.
//
// New columns:
//   stripe_account_id      TEXT — Stripe Express account ID
//   stripe_account_status  TEXT — pending_verification | connected | restricted
//   stripe_bank_last4      TEXT — masked last 4 digits of bank/card
//   stripe_bank_type       TEXT — bank_account | debit_card
//   stripe_bank_name       TEXT — bank name (e.g. "Chase", "Bank of America")
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // Add Stripe Connect columns to drivers table
    await sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS stripe_account_id     TEXT,
        ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected',
        ADD COLUMN IF NOT EXISTS stripe_bank_last4     TEXT,
        ADD COLUMN IF NOT EXISTS stripe_bank_type      TEXT,
        ADD COLUMN IF NOT EXISTS stripe_bank_name      TEXT
    `

    return NextResponse.json({
      success: true,
      message: "Stripe Connect columns added to drivers table",
      columns: [
        "stripe_account_id",
        "stripe_account_status",
        "stripe_bank_last4",
        "stripe_bank_type",
        "stripe_bank_name",
      ],
    })
  } catch (err) {
    console.error("[migrate-driver-stripe] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
