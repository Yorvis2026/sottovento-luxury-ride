import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// PATCH /api/admin/drivers/[id] — Update driver status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { driver_status } = body;

    if (!driver_status) {
      return NextResponse.json({ error: "driver_status is required" }, { status: 400 });
    }

    await sql`
      UPDATE drivers
      SET driver_status = ${driver_status}, updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
