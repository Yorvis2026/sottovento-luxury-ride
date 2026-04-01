export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const tableName = url.searchParams.get('table') ?? 'bookings'
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName}
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    return NextResponse.json({ columns, count: columns.length, tables: tables.map((t: any) => t.table_name) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
