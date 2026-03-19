import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// PATCH /api/admin/leads/[id] — Update lead status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await req.json();
    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }
    await sql`
      UPDATE leads
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${params.id}::uuid
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
