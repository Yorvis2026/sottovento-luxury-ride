import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(req: NextRequest) {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const results: any = {};
  
  try {
    const bookingId = '3f3bad18-c920-467a-9296-d1d1cff7fad0';
    const driverId = 'f2cb4bc6-1962-4b35-bd7d-3ff6f4e806c3';
    
    // Read before
    const before = await sql`SELECT id, status, dispatch_status, assigned_driver_id FROM bookings WHERE id = ${bookingId}::uuid`;
    results.before = before[0];
    
    // Do the PATCH (same as the API does)
    const updateResult = await sql`
      UPDATE bookings 
      SET 
        status = 'accepted',
        dispatch_status = 'assigned',
        updated_at = NOW()
      WHERE id = ${bookingId}::uuid
      RETURNING id, status, dispatch_status
    `;
    results.step1_status_update = updateResult[0];
    
    // Now update assigned_driver_id separately (same as API does)
    const driverUpdate = await sql`
      UPDATE bookings 
      SET assigned_driver_id = ${driverId}::uuid, updated_at = NOW()
      WHERE id = ${bookingId}::uuid
      RETURNING id, assigned_driver_id
    `;
    results.step2_driver_update = driverUpdate[0];
    
    // Read after - immediate
    const after = await sql`SELECT id, status, dispatch_status, assigned_driver_id FROM bookings WHERE id = ${bookingId}::uuid`;
    results.after_immediate = after[0];
    
    // Wait 2 seconds and read again
    await new Promise(r => setTimeout(r, 2000));
    const after2 = await sql`SELECT id, status, dispatch_status, assigned_driver_id FROM bookings WHERE id = ${bookingId}::uuid`;
    results.after_2sec = after2[0];
    
    // Check dispatch log
    const dispatchLog = await sql`
      SELECT * FROM dispatch_log WHERE booking_id = ${bookingId} ORDER BY created_at DESC LIMIT 5
    `.catch(() => []);
    results.dispatch_log = dispatchLog;
    
  } catch (err: any) {
    results.error = err.message;
    results.stack = err.stack?.substring(0, 500);
  }
  
  return NextResponse.json(results);
}
