import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// ─────────────────────────────────────────────────────────────────────────────
// /api/admin/dispatch-event-log
// BM5 Event Logging — Dispatch Priority Governance Engine
// Records: dispatch_priority_applied, fallback_priority_applied,
//          legal_affiliation_override, partner_priority_override
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_KEY = "sln-admin-2024"

function checkAuth(req: NextRequest) {
  const key = req.headers.get("x-admin-key")
  return key === ADMIN_KEY
}

// GET — Fetch recent dispatch event logs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit  = parseInt(searchParams.get("limit")  ?? "50")
    const offset = parseInt(searchParams.get("offset") ?? "0")
    const event_type = searchParams.get("event_type")
    const booking_id = searchParams.get("booking_id")
    const driver_id  = searchParams.get("driver_id")

    let rows
    if (event_type) {
      rows = await sql`
        SELECT del.*, b.booking_ref, d.full_name AS driver_name, d.driver_code
        FROM dispatch_event_log del
        LEFT JOIN bookings b ON b.id = del.booking_id
        LEFT JOIN drivers  d ON d.id = del.driver_id
        WHERE del.event_type = ${event_type}
        ORDER BY del.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (booking_id) {
      rows = await sql`
        SELECT del.*, d.full_name AS driver_name, d.driver_code
        FROM dispatch_event_log del
        LEFT JOIN drivers d ON d.id = del.driver_id
        WHERE del.booking_id = ${booking_id}
        ORDER BY del.created_at DESC
        LIMIT ${limit}
      `
    } else if (driver_id) {
      rows = await sql`
        SELECT del.*, b.booking_ref
        FROM dispatch_event_log del
        LEFT JOIN bookings b ON b.id = del.booking_id
        WHERE del.driver_id = ${driver_id}
        ORDER BY del.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      rows = await sql`
        SELECT del.*, b.booking_ref, d.full_name AS driver_name, d.driver_code
        FROM dispatch_event_log del
        LEFT JOIN bookings b ON b.id = del.booking_id
        LEFT JOIN drivers  d ON d.id = del.driver_id
        ORDER BY del.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }

    const total = await sql`SELECT COUNT(*) FROM dispatch_event_log`

    return NextResponse.json({
      logs: rows,
      total: Number(total[0].count),
      limit,
      offset,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — Create a new dispatch event log entry (called internally by dispatch engines)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      booking_id,
      driver_id,
      event_type,
      priority_level,
      legal_affiliation_type,
      reliability_score,
      partner_dispatch_mode,
      fallback_rank,
      notes,
      event_data,
    } = body

    if (!event_type) {
      return NextResponse.json({ error: "event_type is required" }, { status: 400 })
    }

    const validEventTypes = [
      "dispatch_priority_applied",
      "fallback_priority_applied",
      "legal_affiliation_override",
      "partner_priority_override",
      "captor_offer_sent",
      "captor_offer_timeout",
      "captor_offer_rejected",
    ]

    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json({ error: `Invalid event_type. Must be one of: ${validEventTypes.join(", ")}` }, { status: 400 })
    }

    const row = await sql`
      INSERT INTO dispatch_event_log (
        booking_id,
        driver_id,
        event_type,
        priority_level,
        legal_affiliation_type,
        reliability_score,
        partner_dispatch_mode,
        fallback_rank,
        notes,
        event_data,
        created_at
      ) VALUES (
        ${booking_id ?? null},
        ${driver_id ?? null},
        ${event_type},
        ${priority_level ?? null},
        ${legal_affiliation_type ?? null},
        ${reliability_score ?? null},
        ${partner_dispatch_mode ?? null},
        ${fallback_rank ?? null},
        ${notes ?? null},
        ${event_data ? JSON.stringify(event_data) : null},
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, log: row[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
