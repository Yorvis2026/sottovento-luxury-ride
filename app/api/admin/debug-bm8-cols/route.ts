export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET(req: Request) {
  const key = req.headers.get("x-admin-key");
  if (key !== "sln-admin-2024") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Try to directly SELECT the airport_code column to see if it exists
    let directTest = "unknown";
    try {
      await sql`SELECT airport_code FROM bookings LIMIT 1`;
      directTest = "airport_code EXISTS";
    } catch (e: unknown) {
      directTest = `airport_code MISSING: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      ORDER BY column_name
    `;
    const colNames = cols.map((c: Record<string, unknown>) => c.column_name as string);
    const bm8Cols = colNames.filter((c: string) => c.startsWith('airport') || c.startsWith('flight') || c.startsWith('operational'));
    return NextResponse.json({ 
      direct_test: directTest,
      all_columns: colNames, 
      bm8_columns: bm8Cols, 
      total: colNames.length, 
      bm8_count: bm8Cols.length,
      db_url_prefix: (process.env.DATABASE_URL_UNPOOLED ?? "").substring(0, 30)
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
