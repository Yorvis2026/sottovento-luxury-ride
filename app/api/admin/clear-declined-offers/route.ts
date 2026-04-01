export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL_UNPOOLED!)

// Clears declined/timeout dispatch_offers for a booking to allow re-dispatch
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const bookingId = url.searchParams.get('booking_id') || '1515c939-d9f1-4479-80d7-f17454d8669b'

    // Delete declined/timeout offers for this booking
    const deleted = await sql`
      DELETE FROM dispatch_offers
      WHERE booking_id = ${bookingId}::uuid
        AND response IN ('declined', 'timeout', 'pending')
      RETURNING id, driver_id, response, is_fallback_offer
    `

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      deleted_count: deleted.length,
      deleted_offers: deleted
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
