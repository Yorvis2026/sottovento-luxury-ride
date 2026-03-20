import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(req: NextRequest) {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const results: any = {};
  
  try {
    const bookingId = '3f3bad18-c920-467a-9296-d1d1cff7fad0';
    const driverId = 'f2cb4bc6-1962-4b35-bd7d-3ff6f4e806c3';
    
    // Check columns in bookings table
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      ORDER BY ordinal_position
    `;
    results.columns = cols.map((c: any) => c.column_name);
    
    // Check if assigned_driver_id column exists
    results.has_assigned_driver_id = cols.some((c: any) => c.column_name === 'assigned_driver_id');
    
    // Try to update with assigned_driver_id
    const updateResult = await sql`
      UPDATE bookings 
      SET 
        status = 'accepted',
        dispatch_status = 'assigned',
        assigned_driver_id = ${driverId}::uuid,
        updated_at = NOW()
      WHERE id = ${bookingId}::uuid
      RETURNING id, status, dispatch_status, assigned_driver_id
    `;
    results.update_result = updateResult;
    
    // Read back
    const after = await sql`
      SELECT id, status, dispatch_status, assigned_driver_id FROM bookings WHERE id = ${bookingId}::uuid
    `;
    results.after = after[0];
    
    // Reset
    await sql`
      UPDATE bookings 
      SET status = 'pending', dispatch_status = 'manual_dispatch_required', assigned_driver_id = NULL, updated_at = NOW()
      WHERE id = ${bookingId}::uuid
    `;
    results.reset = 'done';
    
  } catch (err: any) {
    results.error = err.message;
  }
  
  return NextResponse.json(results);
}
