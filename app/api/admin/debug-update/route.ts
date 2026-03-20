import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const bookingId = url.searchParams.get('id') || '3f3bad18-c920-467a-9296-d1d1cff7fad0';
  
  const results: any = {};
  
  try {
    // Test 1: Check which DATABASE_URL is being used
    results.db_url_prefix = process.env.DATABASE_URL_UNPOOLED?.substring(0, 40) + '...';
    results.db_url_pooled_prefix = process.env.DATABASE_URL?.substring(0, 40) + '...';
    
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    
    // Test 2: Read the booking
    const before = await sql`SELECT id, status, dispatch_status FROM bookings WHERE id = ${bookingId}::uuid`;
    results.before = before[0] || 'NOT FOUND';
    
    // Test 3: Try UPDATE
    const updateResult = await sql`
      UPDATE bookings 
      SET status = 'accepted', dispatch_status = 'assigned', updated_at = NOW()
      WHERE id = ${bookingId}::uuid
      RETURNING id, status, dispatch_status
    `;
    results.update_result = updateResult;
    results.rows_affected = updateResult.length;
    
    // Test 4: Read again
    const after = await sql`SELECT id, status, dispatch_status FROM bookings WHERE id = ${bookingId}::uuid`;
    results.after = after[0] || 'NOT FOUND';
    
    // Test 5: Reset back to original
    await sql`
      UPDATE bookings 
      SET status = 'pending', dispatch_status = 'manual_dispatch_required', updated_at = NOW()
      WHERE id = ${bookingId}::uuid
    `;
    results.reset = 'done';
    
  } catch (err: any) {
    results.error = err.message;
    results.stack = err.stack?.substring(0, 500);
  }
  
  return NextResponse.json(results);
}
