export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// ============================================================
// GET /api/admin/migrate-bm7
// BM7: Client Communication Escalation Layer
// Creates booking_communication_log table and adds communication
// fields to bookings table
// ============================================================
export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const steps: string[] = [];
  const errors: string[] = [];

  // Step 1: Create booking_communication_log table
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS booking_communication_log (
        id SERIAL PRIMARY KEY,
        booking_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'email',
        template_used TEXT,
        delivery_status TEXT NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        approved_by_admin BOOLEAN DEFAULT FALSE,
        trigger_source TEXT,
        event_reference TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    steps.push("✅ booking_communication_log table created");
  } catch (e: unknown) {
    errors.push(`❌ booking_communication_log: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Step 2: Create indexes on booking_communication_log
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_bcl_booking_id ON booking_communication_log(booking_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bcl_message_type ON booking_communication_log(message_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bcl_sent_at ON booking_communication_log(sent_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bcl_delivery_status ON booking_communication_log(delivery_status)`;
    steps.push("✅ indexes on booking_communication_log created");
  } catch (e: unknown) {
    errors.push(`❌ indexes: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Step 3: Add communication fields to bookings table
  const bookingFields = [
    { col: "client_communication_opt_in", type: "BOOLEAN DEFAULT TRUE" },
    { col: "last_client_notification_at", type: "TIMESTAMPTZ" },
    { col: "last_client_notification_type", type: "TEXT" },
    { col: "pending_client_notification", type: "JSONB" },
    { col: "communication_notes", type: "TEXT" },
  ];
  for (const f of bookingFields) {
    try {
      await sql.unsafe(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ${f.col} ${f.type}`);
      steps.push(`✅ bookings.${f.col} added`);
    } catch (e: unknown) {
      errors.push(`❌ bookings.${f.col}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Step 4: Register BM7 events in dispatch_event_log (add new event types support)
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_del_booking_id ON dispatch_event_log(booking_id)`;
    steps.push("✅ dispatch_event_log booking_id index ensured");
  } catch (e: unknown) {
    errors.push(`❌ dispatch_event_log index: ${e instanceof Error ? e.message : String(e)}`);
  }

  return NextResponse.json({
    success: errors.length === 0,
    steps,
    errors,
    timestamp: new Date().toISOString(),
  });
}
