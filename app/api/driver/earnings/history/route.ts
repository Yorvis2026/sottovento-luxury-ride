export const dynamic = "force-dynamic"
// ============================================================
// GET /api/driver/earnings/history?code=YHV001
//
// SLN Driver Earnings Dashboard API v1.0 — History
//
// Returns paginated earnings rows for the logged-in driver.
// Source of truth: driver_earnings_ledger
// Excludes: earning_role = 'platform'
//
// Query params:
//   code          — driver code (required)
//   page          — page number (default: 1)
//   page_size     — rows per page (default: 20, max: 100)
//   from          — ISO date filter start (posted_at >= from)
//   to            — ISO date filter end (posted_at <= to)
//   ledger_status — filter by status: posted|paid|voided|adjusted
//   earning_role  — filter by role: source_driver|executor_driver
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    // ── Resolve driver identity securely ─────────────────────
    const driverRows = await sql`
      SELECT id, driver_code, full_name
      FROM drivers
      WHERE driver_code = ${code.toUpperCase()}
      LIMIT 1
    `;
    if (driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const driver = driverRows[0];
    const driverId: string = driver.id;

    // ── Parse query params ────────────────────────────────────
    const page      = Math.max(1, parseInt(searchParams.get("page")      ?? "1", 10));
    const pageSize  = Math.min(100, Math.max(1, parseInt(searchParams.get("page_size") ?? "20", 10)));
    const offset    = (page - 1) * pageSize;
    const fromDate  = searchParams.get("from")          ?? null;
    const toDate    = searchParams.get("to")            ?? null;
    const statusFilter = searchParams.get("ledger_status") ?? null;
    const roleFilter   = searchParams.get("earning_role")  ?? null;

    // ── Validate filters ──────────────────────────────────────
    const validStatuses = ["posted", "paid", "voided", "adjusted", "pending"];
    const validRoles    = ["source_driver", "executor_driver"];
    if (statusFilter && !validStatuses.includes(statusFilter)) {
      return NextResponse.json({ error: `Invalid ledger_status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }
    if (roleFilter && !validRoles.includes(roleFilter)) {
      return NextResponse.json({ error: `Invalid earning_role. Must be one of: ${validRoles.join(", ")}` }, { status: 400 });
    }

    // ── Build dynamic WHERE clauses ───────────────────────────
    // Base: driver_id match + exclude platform rows
    // Additional filters applied conditionally
    const rows = await sql`
      SELECT
        del.id,
        del.booking_id,
        del.earning_role,
        del.gross_booking_amount,
        del.pct_applied,
        del.amount_earned,
        del.currency,
        del.ledger_status,
        del.commission_model,
        del.source_type,
        del.source_reference,
        del.source_driver_id,
        del.executor_driver_id,
        del.posted_at,
        del.paid_out_at,
        del.payout_batch_id,
        del.created_at,
        -- Booking enrichment (lightweight, non-blocking)
        b.pickup_at           AS pickup_date,
        b.pickup_address      AS pickup_area,
        b.dropoff_address     AS dropoff_area,
        cl.full_name          AS client_first_name
      FROM driver_earnings_ledger del
      LEFT JOIN bookings b  ON b.id  = del.booking_id
      LEFT JOIN clients  cl ON cl.id = b.client_id
      WHERE del.driver_id = ${driverId}::uuid
        AND del.earning_role IN ('source_driver', 'executor_driver')
        AND (${statusFilter}::text IS NULL OR del.ledger_status = ${statusFilter})
        AND (${roleFilter}::text   IS NULL OR del.earning_role  = ${roleFilter})
        AND (${fromDate}::text     IS NULL OR del.posted_at >= ${fromDate}::timestamptz)
        AND (${toDate}::text       IS NULL OR del.posted_at <= ${toDate}::timestamptz)
      ORDER BY del.posted_at DESC, del.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    // ── Count total for pagination ────────────────────────────
    const [countRow] = await sql`
      SELECT COUNT(*) AS total
      FROM driver_earnings_ledger del
      WHERE del.driver_id = ${driverId}::uuid
        AND del.earning_role IN ('source_driver', 'executor_driver')
        AND (${statusFilter}::text IS NULL OR del.ledger_status = ${statusFilter})
        AND (${roleFilter}::text   IS NULL OR del.earning_role  = ${roleFilter})
        AND (${fromDate}::text     IS NULL OR del.posted_at >= ${fromDate}::timestamptz)
        AND (${toDate}::text       IS NULL OR del.posted_at <= ${toDate}::timestamptz)
    `;
    const total      = Number(countRow?.total ?? 0);
    const totalPages = Math.ceil(total / pageSize);

    const items = rows.map((r: Record<string, unknown>) => ({
      id:                   r.id,
      booking_id:           r.booking_id,
      earning_role:         r.earning_role,
      gross_booking_amount: Number(r.gross_booking_amount ?? 0),
      pct_applied:          Number(r.pct_applied ?? 0),
      amount_earned:        Number(r.amount_earned ?? 0),
      currency:             r.currency ?? "USD",
      ledger_status:        r.ledger_status,
      commission_model:     r.commission_model,
      source_type:          r.source_type ?? null,
      source_reference:     r.source_reference ?? null,
      source_driver_id:     r.source_driver_id ?? null,
      executor_driver_id:   r.executor_driver_id ?? null,
      posted_at:            r.posted_at ?? null,
      paid_out_at:          r.paid_out_at ?? null,
      payout_batch_id:      r.payout_batch_id ?? null,
      created_at:           r.created_at ?? null,
      // Booking enrichment
      pickup_date:          r.pickup_date ?? null,
      pickup_area:          r.pickup_area  ?? null,
      dropoff_area:         r.dropoff_area ?? null,
      client_first_name:    r.client_first_name ?? null,
    }));

    return NextResponse.json({
      driver_id:   driverId,
      driver_code: driver.driver_code,
      pagination: {
        page,
        page_size:   pageSize,
        total,
        total_pages: totalPages,
        has_next:    page < totalPages,
        has_prev:    page > 1,
      },
      filters: {
        from:          fromDate,
        to:            toDate,
        ledger_status: statusFilter,
        earning_role:  roleFilter,
      },
      items,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[driver/earnings/history] error:", msg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
