import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET /api/admin/drivers — List all drivers
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, driver_code, full_name, phone, email, driver_status, is_eligible, created_at
      FROM drivers
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ drivers: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/drivers — Create a new driver
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, phone, email, driver_code } = body;

    if (!full_name || !phone || !driver_code) {
      return NextResponse.json(
        { error: "full_name, phone and driver_code are required" },
        { status: 400 }
      );
    }

    // Check if driver_code already exists
    const existing = await sql`
      SELECT id FROM drivers WHERE driver_code = ${driver_code} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Driver code "${driver_code}" is already in use` },
        { status: 409 }
      );
    }

    const rows = await sql`
      INSERT INTO drivers (
        driver_code, full_name, phone, email,
        driver_status, is_eligible,
        created_at, updated_at
      ) VALUES (
        ${driver_code},
        ${full_name},
        ${phone},
        ${email ?? null},
        'active',
        true,
        NOW(), NOW()
      )
      RETURNING id, driver_code, full_name, phone, email, driver_status, is_eligible, created_at
    `;

    return NextResponse.json({ driver: rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
