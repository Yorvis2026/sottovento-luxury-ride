import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: Request) {
  const key = req.headers.get("x-admin-key");
  if (key !== "sln-admin-2024") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      ORDER BY column_name
    `;
    return NextResponse.json({ columns: cols.map((c: Record<string, unknown>) => c.column_name), count: cols.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
