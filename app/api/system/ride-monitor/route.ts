export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/system/ride-monitor
//
// SLN Ride Activation Engine — runs every 60 seconds via cron.
//
// STATE FLOW:
//   accepted/assigned → UPCOMING (visible in upcoming tab)
//   UPCOMING → ACTIVE_WINDOW when: pickup_time - 90min
//
// This endpoint:
//   1. Checks all upcoming rides and calculates activation window
//   2. Sets ride_window_state = 'active' when within 90 min
//   3. Sends pre-alert emails/SMS at 2h mark
//   4. Returns summary of processed rides
//
// Called by: Vercel Cron (every 60s) or manual trigger
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const nowISO = now.toISOString();

    // ── Ensure ride_window_state column exists ───────────────
    try {
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS ride_window_state VARCHAR(20) DEFAULT 'upcoming',
          ADD COLUMN IF NOT EXISTS pre_alert_2h_sent BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS pre_alert_eta_sent BOOLEAN DEFAULT FALSE
      `;
    } catch { /* columns may already exist */ }

    // ── Get all upcoming rides (assigned/accepted, not yet active) ──
    const upcomingRides = await sql`
      SELECT
        b.id,
        b.status,
        b.pickup_at,
        b.pickup_address,
        b.assigned_driver_id,
        b.ride_window_state,
        b.pre_alert_2h_sent,
        d.email AS driver_email,
        d.full_name AS driver_name,
        d.phone AS driver_phone
      FROM bookings b
      LEFT JOIN drivers d ON d.id = b.assigned_driver_id
      WHERE b.status IN ('accepted', 'assigned')
        AND b.pickup_at IS NOT NULL
        AND b.pickup_at > NOW() - INTERVAL '30 minutes'
        AND b.pickup_at < NOW() + INTERVAL '48 hours'
      ORDER BY b.pickup_at ASC
    `;

    const results = {
      processed: 0,
      activated: 0,
      alerts_sent: 0,
      rides: [] as Record<string, unknown>[],
    };

    for (const ride of upcomingRides) {
      const pickupTime = new Date(ride.pickup_at);
      const minutesUntilPickup = (pickupTime.getTime() - now.getTime()) / 60000;
      const hoursUntilPickup = minutesUntilPickup / 60;

      results.processed++;

      // ── Activate ride when within 90 minutes of pickup ──────
      const ACTIVATION_WINDOW_MINUTES = 90;
      const shouldBeActive = minutesUntilPickup <= ACTIVATION_WINDOW_MINUTES;
      const currentWindowState = ride.ride_window_state ?? "upcoming";

      if (shouldBeActive && currentWindowState !== "active") {
        try {
          await sql`
            UPDATE bookings
            SET ride_window_state = 'active',
                updated_at = NOW()
            WHERE id = ${ride.id}
          `;
          results.activated++;
        } catch { /* non-blocking */ }
      }

      // ── Send 2h pre-alert if not already sent ───────────────
      const should2hAlert = hoursUntilPickup <= 2 && hoursUntilPickup > 1.5;
      if (should2hAlert && !ride.pre_alert_2h_sent && ride.driver_email) {
        try {
          // Send email via Resend
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Sottovento SLN <dispatch@sottoventoluxuryride.com>",
              to: [ride.driver_email],
              subject: "⏰ Reminder: Ride in 2 hours",
              html: `
                <div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:24px;border-radius:8px;">
                  <h2 style="color:#C8A96A;">Ride Reminder — 2 Hours</h2>
                  <p>Hi ${ride.driver_name},</p>
                  <p>You have a ride scheduled in approximately <strong>2 hours</strong>.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="color:#9ca3af;padding:4px 0;">Pickup:</td><td><strong>${ride.pickup_address}</strong></td></tr>
                    <tr><td style="color:#9ca3af;padding:4px 0;">Time:</td><td><strong>${new Date(ride.pickup_at).toLocaleString("en-US", { timeZone: "America/New_York" })}</strong></td></tr>
                  </table>
                  <p style="color:#9ca3af;font-size:12px;">Please ensure you are prepared and on time.</p>
                </div>
              `,
            }),
          });

          if (emailRes.ok) {
            await sql`
              UPDATE bookings SET pre_alert_2h_sent = TRUE WHERE id = ${ride.id}
            `;
            results.alerts_sent++;
          }
        } catch { /* email failure is non-blocking */ }
      }

      results.rides.push({
        id: ride.id,
        pickup_at: ride.pickup_at,
        minutes_until_pickup: Math.round(minutesUntilPickup),
        window_state: shouldBeActive ? "active" : "upcoming",
        activated: shouldBeActive && currentWindowState !== "active",
        alert_sent: should2hAlert && !ride.pre_alert_2h_sent,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: nowISO,
      ...results,
    });
  } catch (err: any) {
    console.error("[ride-monitor]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Also support POST for Vercel Cron
export async function POST(req: NextRequest) {
  return GET(req);
}
