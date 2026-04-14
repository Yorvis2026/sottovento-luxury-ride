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
//   4. Sends push notification at T-90 (90 min before pickup)
//   5. [SLN-ETA-FEASIBILITY-01] Evaluates ETA risk for each ride
//      with a known driver location — detects if driver cannot
//      realistically arrive on time.
//   6. Returns summary of processed rides
//
// Called by: Vercel Cron (every 60s) or manual trigger
// ============================================================

// ── ETA Feasibility Constants ────────────────────────────────
// Safety buffer: if ETA + buffer > minutes_until_pickup → risk
const ETA_SAFETY_BUFFER_MINUTES = 10;

// Average urban driving speed used for Haversine-based ETA
// (no external routing API needed — zero cost, production-safe)
const AVG_SPEED_KMH = 35;

// Only evaluate ETA for rides within this window (hours before pickup)
const ETA_EVALUATION_WINDOW_HOURS = 6;

// ── Haversine distance (km) ──────────────────────────────────
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── ETA risk classification ──────────────────────────────────
function classifyEtaRisk(
  etaMinutes: number,
  minutesUntilPickup: number,
  buffer: number
): "none" | "low" | "medium" | "high" | "critical" {
  const slack = minutesUntilPickup - etaMinutes;
  if (slack >= buffer) return "none";
  if (slack >= 0)      return "low";
  if (slack >= -15)    return "medium";
  if (slack >= -30)    return "high";
  return "critical";
}

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
          ADD COLUMN IF NOT EXISTS pre_alert_eta_sent BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS pre_alert_90_sent BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS pre_alert_90_sent_at TIMESTAMPTZ
      `;
    } catch { /* columns may already exist */ }

    // ── [SLN-ETA-FEASIBILITY-01] Ensure ETA telemetry columns exist ──
    try {
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS eta_check_at                    TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS eta_minutes_to_pickup           DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS minutes_until_pickup_at_check   DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS eta_risk_detected               BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS eta_risk_level                  VARCHAR(20),
          ADD COLUMN IF NOT EXISTS eta_driver_lat                  DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS eta_driver_lng                  DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS eta_distance_km                 DOUBLE PRECISION
      `;
    } catch { /* columns may already exist */ }

    // ── Ensure driver location columns exist ────────────────
    try {
      await sql`
        ALTER TABLE drivers
          ADD COLUMN IF NOT EXISTS last_known_lat    DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS last_known_lng    DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS last_location_at  TIMESTAMPTZ
      `;
    } catch { /* columns may already exist */ }

    // ── Get all upcoming rides (assigned/accepted, not yet active) ──
    const upcomingRides = await sql`
      SELECT
        b.id,
        b.status,
        b.pickup_at,
        b.pickup_address,
        b.pickup_lat,
        b.pickup_lng,
        b.assigned_driver_id,
        b.ride_window_state,
        b.pre_alert_2h_sent,
        b.pre_alert_90_sent,
        d.email AS driver_email,
        d.full_name AS driver_name,
        d.phone AS driver_phone,
        d.driver_code AS driver_code,
        d.last_known_lat AS driver_lat,
        d.last_known_lng AS driver_lng,
        d.last_location_at AS driver_location_at
      FROM bookings b
      LEFT JOIN drivers d ON d.id = b.assigned_driver_id
      -- [BM-STATUS-FIX-01] Include assigned_not_started (canonical post-acceptance status from BM23-FIX-A)
      WHERE b.status IN ('accepted', 'assigned', 'assigned_not_started')
        AND b.pickup_at IS NOT NULL
        AND b.pickup_at > NOW() - INTERVAL '30 minutes'
        AND b.pickup_at < NOW() + INTERVAL '48 hours'
      ORDER BY b.pickup_at ASC
    `;

    const results = {
      processed: 0,
      activated: 0,
      alerts_sent: 0,
      push_90_sent: 0,
      eta_evaluated: 0,
      eta_risks_detected: 0,
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

      // ── T-90: Send push notification 90 min before pickup ───
      const should90Push =
        minutesUntilPickup <= 95 &&
        minutesUntilPickup > 85 &&
        !ride.pre_alert_90_sent &&
        ride.driver_code;

      if (should90Push) {
        try {
          // [BM-PUSH-FIX-01] Query by driver_id (UUID) — driver_push_subscriptions uses driver_id as key
          const subs = await sql`
            SELECT endpoint, p256dh, auth
            FROM driver_push_subscriptions
            WHERE driver_id = ${ride.assigned_driver_id}::uuid
              AND endpoint IS NOT NULL
              AND p256dh IS NOT NULL
              AND auth IS NOT NULL
          `;

          if (subs.length > 0) {
            const { sendPushToDriver } = await import("@/lib/push/send-push");

            const pushPayload = {
              title: "Upcoming service reminder",
              body: `Pickup in 90 minutes. Please prepare for your next ride.`,
              sound: "default",
              badge: 1,
              tag: `t90-${ride.id}`,
              renotify: true,
              data: {
                url: `/driver/${ride.driver_code}`,
                booking_id: ride.id,
                type: "pre_trip_reminder",
              },
            };

            // [BM-PUSH-FIX-01] Use assigned_driver_id (UUID) — sendPushToDriver queries
            // driver_push_subscriptions.driver_id which is a UUID, not driver_code.
            // Passing driver_code caused 0 rows returned → silent push failure.
            await sendPushToDriver(ride.assigned_driver_id, pushPayload);

            await sql`
              UPDATE bookings
              SET pre_alert_90_sent = TRUE,
                  pre_alert_90_sent_at = NOW()
              WHERE id = ${ride.id}
            `;
            results.push_90_sent++;
          }
        } catch (pushErr) {
          console.error(`[ride-monitor] T-90 push failed for booking ${ride.id}:`, pushErr);
        }
      }

      // ── [SLN-ETA-FEASIBILITY-01] ETA Risk Evaluation ────────
      // Evaluates whether the driver can realistically arrive on time.
      // Uses Haversine + average speed (no external API, zero cost).
      // Graceful degradation: skips if GPS data unavailable.
      let etaRiskLevel: string | null = null;
      let etaMinutes: number | null = null;
      let etaDistanceKm: number | null = null;
      let etaEvaluated = false;

      const withinEtaWindow = hoursUntilPickup <= ETA_EVALUATION_WINDOW_HOURS;
      const hasPickupCoords =
        ride.pickup_lat != null &&
        ride.pickup_lng != null &&
        !isNaN(Number(ride.pickup_lat)) &&
        !isNaN(Number(ride.pickup_lng));
      const hasDriverLocation =
        ride.driver_lat != null &&
        ride.driver_lng != null &&
        !isNaN(Number(ride.driver_lat)) &&
        !isNaN(Number(ride.driver_lng));

      // Only use driver location if it's fresh (within last 2 hours)
      const locationFresh = ride.driver_location_at != null &&
        (now.getTime() - new Date(ride.driver_location_at).getTime()) < 2 * 60 * 60 * 1000;

      if (withinEtaWindow && hasPickupCoords && hasDriverLocation && locationFresh) {
        try {
          const driverLat = Number(ride.driver_lat);
          const driverLng = Number(ride.driver_lng);
          const pickupLat = Number(ride.pickup_lat);
          const pickupLng = Number(ride.pickup_lng);

          // Haversine distance + 20% road factor for non-straight roads
          etaDistanceKm = haversineKm(driverLat, driverLng, pickupLat, pickupLng);
          const roadFactor = 1.2;
          etaMinutes = (etaDistanceKm * roadFactor / AVG_SPEED_KMH) * 60;

          const riskLevel = classifyEtaRisk(
            etaMinutes,
            minutesUntilPickup,
            ETA_SAFETY_BUFFER_MINUTES
          );
          etaRiskLevel = riskLevel === "none" ? null : riskLevel;
          etaEvaluated = true;
          results.eta_evaluated++;

          const riskDetected = etaRiskLevel !== null;
          if (riskDetected) results.eta_risks_detected++;

          // Persist telemetry
          await sql`
            UPDATE bookings
            SET eta_check_at                  = NOW(),
                eta_minutes_to_pickup         = ${Math.round(etaMinutes * 10) / 10},
                minutes_until_pickup_at_check = ${Math.round(minutesUntilPickup * 10) / 10},
                eta_risk_detected             = ${riskDetected},
                eta_risk_level                = ${etaRiskLevel},
                eta_driver_lat                = ${driverLat},
                eta_driver_lng                = ${driverLng},
                eta_distance_km               = ${Math.round(etaDistanceKm * 100) / 100},
                updated_at                    = NOW()
            WHERE id = ${ride.id}
          `;

          // ── Push alert for high/critical ETA risk ──────────
          // Deduplication: only fire once per risk level per 2h window.
          if ((riskLevel === "high" || riskLevel === "critical") && ride.driver_code) {
            try {
              const existingAlert = await sql`
                SELECT id FROM audit_logs
                WHERE entity_type = 'booking'
                  AND entity_id = ${ride.id}::uuid
                  AND action = ${'eta_risk_push_' + riskLevel}
                  AND created_at > NOW() - INTERVAL '2 hours'
                LIMIT 1
              `;

              if (existingAlert.length === 0) {
                const { sendPushToDriver } = await import("@/lib/push/send-push");
                const riskEmoji = riskLevel === "critical" ? "🚨" : "⚠️";
                const minutesLate = Math.round(etaMinutes - minutesUntilPickup);

                // [BM-PUSH-FIX-01] Use assigned_driver_id (UUID) — same fix as T-90 push
                await sendPushToDriver(ride.assigned_driver_id, {
                  title: `${riskEmoji} ETA Alert — Pickup at risk`,
                  body: `You may arrive ~${minutesLate} min late. Pickup in ${Math.round(minutesUntilPickup)} min.`,
                  sound: "default",
                  badge: 1,
                  tag: `eta-risk-${ride.id}`,
                  renotify: true,
                  data: {
                    url: `/driver/${ride.driver_code}`,
                    booking_id: ride.id,
                    type: "eta_risk_alert",
                    risk_level: riskLevel,
                  },
                });

                await sql`
                  INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, new_data)
                  VALUES (
                    'booking',
                    ${ride.id}::uuid,
                    ${'eta_risk_push_' + riskLevel},
                    'system',
                    ${ride.assigned_driver_id}::uuid,
                    ${JSON.stringify({
                      risk_level: riskLevel,
                      eta_minutes: Math.round(etaMinutes),
                      minutes_until_pickup: Math.round(minutesUntilPickup),
                      distance_km: Math.round(etaDistanceKm * 100) / 100,
                      driver_lat: driverLat,
                      driver_lng: driverLng,
                      timestamp: now.toISOString(),
                    })}::jsonb
                  )
                `;
              }
            } catch { /* push failure is non-blocking */ }
          }
        } catch (etaErr) {
          console.error(`[ride-monitor] ETA evaluation failed for booking ${ride.id}:`, etaErr);
        }
      }

      results.rides.push({
        id: ride.id,
        pickup_at: ride.pickup_at,
        minutes_until_pickup: Math.round(minutesUntilPickup),
        window_state: shouldBeActive ? "active" : "upcoming",
        activated: shouldBeActive && currentWindowState !== "active",
        alert_sent: should2hAlert && !ride.pre_alert_2h_sent,
        push_90_sent: should90Push ?? false,
        eta_evaluated: etaEvaluated,
        eta_minutes: etaMinutes !== null ? Math.round(etaMinutes * 10) / 10 : null,
        eta_distance_km: etaDistanceKm !== null ? Math.round(etaDistanceKm * 100) / 100 : null,
        eta_risk_level: etaRiskLevel,
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
