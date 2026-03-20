import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) return NextResponse.json({ error: "Partner code required" }, { status: 400 })

  try {
    // Get partner
    const partners = await sql`
      SELECT id FROM partners WHERE ref_code = ${code.toUpperCase()} AND status = 'active'
    `
    if (partners.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

    const partnerId = partners[0].id

    // Get earnings with booking details
    const earnings = await sql`
      SELECT
        pe.id,
        pe.gross_amount,
        pe.commission_amount,
        pe.commission_rate,
        pe.status,
        pe.created_at,
        pe.paid_at,
        b.client_name,
        b.pickup_address,
        b.vehicle_type
      FROM partner_earnings pe
      LEFT JOIN bookings b ON b.id = pe.booking_id
      WHERE pe.partner_id = ${partnerId}
      ORDER BY pe.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ earnings })
  } catch (e: any) {
    // Table may not exist yet
    if (e.message?.includes("does not exist")) {
      return NextResponse.json({ earnings: [] })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
