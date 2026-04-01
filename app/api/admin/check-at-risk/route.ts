import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/admin/check-at-risk
//
// Guardrail: detect drivers who accepted but haven't advanced
// to en_route within the tolerance window.
//
// Tolerance rules:
//   A) > 45 min to pickup  → 30 min tolerance from accept
//   B) 15–45 min to pickup → 10 min tolerance from accept
//   C) < 15 min to pickup  →  3 min tolerance from accept
//
// Returns list of at-risk bookings and updates dispatch_status.
// ============================================================

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== "sln-admin-2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Ensure at_risk columns exist ──────────────────────────
    try {
      await sql`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS at_risk_flagged_at    TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS at_risk_escalated_at  TIMESTAMPTZ
      `;
    } catch { /* already exists */ }

    const nowMs = Date.now();
    const nowIso = new Date().toISOString();

    // ── Load accepted/assigned bookings that are NOT yet en_route ─
    const candidates = await sql`
      SELECT
        b.id, b.status, b.dispatch_status,
        b.pickup_at, b.assigned_driver_id,
        b.updated_at, b.created_at,
        b.at_risk_flagged_at, b.at_risk_escalated_at,
        b.pickup_address, b.dropoff_address,
        b.total_price,
        d.driver_code, d.full_name AS driver_name, d.phone AS driver_phone
      FROM bookings b
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE b.status IN ('accepted', 'assigned')
        AND b.dispatch_status NOT IN (
          'completed', 'cancelled', 'driver_issue',
          'reassignment_needed', 'urgent_reassignment',
          'critical_driver_failure', 'at_risk', 'admin_attention_required'
        )
        AND b.assigned_driver_id IS NOT NULL
    `;

    const atRiskResults: any[] = [];
    const escalatedResults: any[] = [];

    for (const booking of candidates) {
      const pickupMs = booking.pickup_at ? new Date(booking.pickup_at).getTime() : null;
      const minutesToPickup = pickupMs !== null ? (pickupMs - nowMs) / 60000 : null;
      const acceptedAt = booking.updated_at ? new Date(booking.updated_at).getTime() : nowMs;
      const minutesSinceAccept = (nowMs - acceptedAt) / 60000;

      // Determine tolerance based on time to pickup
      let toleranceMinutes: number;
      let riskCase: "A" | "B" | "C";

      if (minutesToPickup === null || minutesToPickup < 0) {
        toleranceMinutes = 3;
        riskCase = "C";
      } else if (minutesToPickup < 15) {
        toleranceMinutes = 3;
        riskCase = "C";
      } else if (minutesToPickup <= 45) {
        toleranceMinutes = 10;
        riskCase = "B";
      } else {
        toleranceMinutes = 30;
        riskCase = "A";
      }

      const isOverTolerance = minutesSinceAccept > toleranceMinutes;

      if (!isOverTolerance) continue;

      // Already flagged as at_risk — check for escalation
      if (booking.at_risk_flagged_at) {
        const flaggedMs = new Date(booking.at_risk_flagged_at).getTime();
        const minutesSinceFlag = (nowMs - flaggedMs) / 60000;

        // Escalation: if still no action after another tolerance window
        if (minutesSinceFlag > toleranceMinutes && !booking.at_risk_escalated_at) {
          // Escalate to admin_attention_required or critical
          const newStatus = (minutesToPickup !== null && minutesToPickup < 0)
            ? "critical_driver_failure"
            : "admin_attention_required";

          await sql`
            UPDATE bookings
            SET
              dispatch_status       = ${newStatus},
              at_risk_escalated_at  = ${nowIso}::timestamptz,
              updated_at            = NOW()
            WHERE id = ${booking.id}::uuid
          `;

          escalatedResults.push({
            booking_id: booking.id,
            driver_code: booking.driver_code,
            escalated_to: newStatus,
            minutes_to_pickup: minutesToPickup !== null ? Math.round(minutesToPickup) : null,
            risk_case: riskCase,
          });
        }
        continue;
      }

      // First time flagging as at_risk
      await sql`
        UPDATE bookings
        SET
          dispatch_status    = 'at_risk',
          at_risk_flagged_at = ${nowIso}::timestamptz,
          updated_at         = NOW()
        WHERE id = ${booking.id}::uuid
      `;

      // Write audit log
      try {
        await sql`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, actor_type, actor_id, new_data
          ) VALUES (
            'booking',
            ${booking.id}::uuid,
            'driver_at_risk_flagged',
            'system',
            ${booking.assigned_driver_id}::uuid,
            ${JSON.stringify({
              risk_case: riskCase,
              minutes_to_pickup: minutesToPickup !== null ? Math.round(minutesToPickup) : null,
              minutes_since_accept: Math.round(minutesSinceAccept),
              tolerance_minutes: toleranceMinutes,
              flagged_at: nowIso,
            })}::jsonb
          )
        `;
      } catch { /* non-blocking */ }

      atRiskResults.push({
        booking_id: booking.id,
        driver_code: booking.driver_code,
        driver_name: booking.driver_name,
        pickup_address: booking.pickup_address,
        dropoff_address: booking.dropoff_address,
        minutes_to_pickup: minutesToPickup !== null ? Math.round(minutesToPickup) : null,
        minutes_since_accept: Math.round(minutesSinceAccept),
        tolerance_minutes: toleranceMinutes,
        risk_case: riskCase,
        flagged_at: nowIso,
      });
    }

    return NextResponse.json({
      success: true,
      checked: candidates.length,
      at_risk_flagged: atRiskResults.length,
      escalated: escalatedResults.length,
      at_risk: atRiskResults,
      escalations: escalatedResults,
    });

  } catch (err: any) {
    console.error("[admin/check-at-risk]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
