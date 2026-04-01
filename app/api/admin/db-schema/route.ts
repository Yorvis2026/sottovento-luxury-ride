export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

export async function GET() {
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'bookings'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `
    return NextResponse.json({ columns, count: columns.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
