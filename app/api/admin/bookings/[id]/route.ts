export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { lockCommission } from "@/lib/dispatch/commission-engine";
import { postBookingLedger } from "@/lib/dispatch/ledger";
import { checkVehicleEligibility, deriveServiceLocationType, requiresEligibilityGate } from "@/lib/vehicles/gate";
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// Booking Status → Dispatch Status mapping rules
// ============================================================
function inferDispatchStatus(bookingStatus: string): string {
  switch (bookingStatus) {
    case "new":
    case "quote_sent":
    case "awaiting_payment":
    case "confirmed":
      return "awaiting_source_owner"
    case "accepted":
    case "assigned":
    case "in_service":
    case "in_progress":
    case "completed":
      return "assigned"
    case "cancelled":
      return "cancelled"
    default:
      return "not_required"
  }
}

// ── Send driver notification email via Resend ────────────────
async function sendDriverNotificationEmail(opts: {
  driverEmail: string
  driverName: string
  bookingId: string
  pickupAddress: string
  dropoffAddress: string
  pickupAt: string | null
  totalPrice: number
  clientName: string | null
}) {
  if (!process.env.RESEND_API_KEY) return;
  const pickupTime = opts.pickupAt
    ? new Date(opts.pickupAt).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZone: "America/New_York"
      })
    : "TBD";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sottovento Luxury Ride <noreply@sottoventoluxuryride.com>",
        to: [opts.driverEmail],
        subject: "🚗 New Ride Assigned — Sottovento",
        html: `
          <div style="font-family: Georgia, serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
              <p style="color: #C8A96A; letter-spacing: 4px; font-size: 11px; text-transform: uppercase; margin: 0 0 8px;">SOTTOVENTO LUXURY NETWORK</p>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 300;">New Ride Assigned</h1>
            </div>

            <p style="color: #a0a0a0; line-height: 1.8; margin-bottom: 24px;">
              Hi <strong style="color: #fff;">${opts.driverName}</strong>, you have a new ride assigned.
            </p>

            <div style="background: #1a1a1a; border: 1px solid #C8A96A33; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0; width: 120px;">Pickup</td>
                  <td style="color: #fff; font-size: 14px; padding: 8px 0;">${opts.pickupAddress}</td>
                </tr>
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0;">Dropoff</td>
                  <td style="color: #fff; font-size: 14px; padding: 8px 0;">${opts.dropoffAddress}</td>
                </tr>
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0;">Time</td>
                  <td style="color: #C8A96A; font-size: 14px; font-weight: bold; padding: 8px 0;">${pickupTime}</td>
                </tr>
                ${opts.clientName ? `
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0;">Client</td>
                  <td style="color: #fff; font-size: 14px; padding: 8px 0;">${opts.clientName}</td>
                </tr>` : ""}
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0;">Fare</td>
                  <td style="color: #4ade80; font-size: 18px; font-weight: bold; padding: 8px 0;">$${opts.totalPrice.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="https://www.sottoventoluxuryride.com/driver/${opts.driverName.replace(/\s+/g, "")}"
                style="background: #C8A96A; color: #0a0a0a; padding: 16px 40px; text-decoration: none; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; display: inline-block; border-radius: 4px;">
                Open Driver Panel →
              </a>
            </div>

            <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
              Booking ID: ${opts.bookingId.substring(0, 8).toUpperCase()}<br/>
              Sottovento Luxury Network — Premium Transportation
            </p>
          </div>
        `,
      }),
    });
  } catch (emailErr) {
    console.error("Driver notification email error:", emailErr);
  }
}

// PATCH /api/admin/bookings/[id] — Update booking status and/or dispatch_status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15+ requires awaiting params
    const { id } = await params;
    const body = await req.json();
    let { status, dispatch_status, assigned_driver_id, edit_fields } = body;

    // ── Resolve assign_driver_code → assigned_driver_id ──────────────────────
    // Admin panel sends { assign_driver_code: 'YHV001' } instead of a raw UUID.
    // We resolve the code to the driver's UUID here so the rest of the handler
    // can use assigned_driver_id normally.
    if (body.assign_driver_code && !assigned_driver_id) {
      const driverRows = await sql`
        SELECT id FROM drivers
        WHERE driver_code = ${(body.assign_driver_code as string).toUpperCase()}
        LIMIT 1
      `;
      if (driverRows.length === 0) {
        return NextResponse.json(
          { error: `Driver not found: ${body.assign_driver_code}` },
          { status: 404 }
        );
      }
      assigned_driver_id = driverRows[0].id;
    }

    // Edit operational fields (pickup_at, pickup_address, dropoff_address, flight_number, notes, service_type, passengers, luggage)
    if (edit_fields && typeof edit_fields === "object") {
      const allowed = ["pickup_at", "pickup_address", "dropoff_address", "flight_number",
                       "notes", "service_type", "passengers", "luggage", "vehicle_type",
                       "total_price", "client_name", "client_phone", "client_email"];
      const keys = Object.keys(edit_fields).filter(k => allowed.includes(k));
      if (keys.length > 0) {
        // Build dynamic SET clause safely using individual updates
        for (const key of keys) {
          const val = edit_fields[key];
          if (key === "pickup_at") {
            await sql`UPDATE bookings SET pickup_at = ${val}::timestamptz, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "pickup_address") {
            await sql`UPDATE bookings SET pickup_address = ${val}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "dropoff_address") {
            await sql`UPDATE bookings SET dropoff_address = ${val}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "flight_number") {
            await sql`UPDATE bookings SET flight_number = ${val}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "notes") {
            await sql`UPDATE bookings SET notes = ${val}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "service_type") {
            await sql`UPDATE bookings SET service_type = ${val}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "passengers") {
            await sql`UPDATE bookings SET passengers = ${Number(val)}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "luggage") {
            await sql`UPDATE bookings SET luggage = ${val}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "vehicle_type") {
            await sql`UPDATE bookings SET vehicle_type = ${val}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "total_price") {
            await sql`UPDATE bookings SET total_price = ${Number(val)}, updated_at = NOW() WHERE id = ${id}::uuid`;
          } else if (key === "client_name" || key === "client_phone" || key === "client_email") {
            // Skip here — handled together after the loop
          }
        }

        // Handle client_name, client_phone, and client_email together: upsert client record
        const newClientName = edit_fields.client_name as string | undefined;
        const newClientPhone = edit_fields.client_phone as string | undefined;
        const newClientEmail = edit_fields.client_email as string | undefined;
        if (newClientName !== undefined || newClientPhone !== undefined || newClientEmail !== undefined) {
          try {
            // Check if booking has a client_id
            const bookingRows = await sql`SELECT client_id FROM bookings WHERE id = ${id}::uuid LIMIT 1`;
            const existingClientId = bookingRows[0]?.client_id ?? null;

            if (existingClientId) {
              // Update existing client
              if (newClientName !== undefined) {
                await sql`UPDATE clients SET full_name = ${newClientName}, updated_at = NOW() WHERE id = ${existingClientId}`;
              }
              if (newClientPhone !== undefined) {
                await sql`UPDATE clients SET phone = ${newClientPhone}, updated_at = NOW() WHERE id = ${existingClientId}`;
              }
              if (newClientEmail !== undefined) {
                await sql`UPDATE clients SET email = ${newClientEmail}, updated_at = NOW() WHERE id = ${existingClientId}`;
              }
            } else {
              // Create new client and link to booking
              const name = newClientName ?? "Guest";
              const phone = newClientPhone ?? null;
              const email = newClientEmail ?? null;
              const newClientRows = await sql`
                INSERT INTO clients (full_name, phone, email, source_type, created_at, updated_at)
                VALUES (${name}, ${phone}, ${email}, 'direct', NOW(), NOW())
                RETURNING id
              `;
              const newClientId = newClientRows[0]?.id;
              if (newClientId) {
                await sql`UPDATE bookings SET client_id = ${newClientId}, updated_at = NOW() WHERE id = ${id}::uuid`;
              }
            }
          } catch (clientErr: any) {
            console.error("[PATCH] client upsert error:", clientErr?.message);
          }
        }

        // Always touch updated_at to ensure driver panel detects the change via polling
        try {
          await sql`UPDATE bookings SET updated_at = NOW() WHERE id = ${id}::uuid`;
        } catch {}
      }
    }

    // ── Pre-assignment validation gate (must run BEFORE status update to avoid
    //    partial state where status='assigned' but assigned_driver_id is NULL) ──
    if (assigned_driver_id !== undefined && assigned_driver_id) {
      const [bookingCheck] = await sql`
        SELECT pickup_at, pickup_address, dropoff_address, total_price,
               pickup_zone, COALESCE(service_location_type, '') AS service_location_type
        FROM bookings WHERE id = ${id}::uuid LIMIT 1
      `;
      const missingFields: string[] = [];
      if (!bookingCheck?.pickup_at) missingFields.push("pickup_time");
      if (!bookingCheck?.pickup_address || bookingCheck.pickup_address === "TBD") missingFields.push("pickup_address");
      if (!bookingCheck?.dropoff_address || bookingCheck.dropoff_address === "TBD") missingFields.push("dropoff_address");
      if (!bookingCheck?.total_price || Number(bookingCheck.total_price) === 0) missingFields.push("total_price");
      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Cannot assign driver: booking is missing required fields: ${missingFields.join(", ")}. Please edit the booking first.`, missingFields },
          { status: 422 }
        );
      }

      // ── Vehicle Eligibility Gate (VEG v1) ──────────────────────────────────
      // Derive service_location_type from pickup_zone if not already set
      const slt = bookingCheck.service_location_type ||
                  deriveServiceLocationType(bookingCheck.pickup_zone ?? "");
      if (requiresEligibilityGate(slt)) {
        // Load driver's primary vehicle (or any active vehicle for this driver)
        const vehicleRows = await sql`
          SELECT v.*
          FROM vehicles v
          WHERE v.driver_id = ${assigned_driver_id}::uuid
            AND v.vehicle_status = 'active'
          ORDER BY v.is_primary DESC, v.created_at ASC
          LIMIT 1
        `;
        if (vehicleRows.length === 0) {
          // Log exclusion
          try {
            await sql`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES (
                'booking', ${id}::uuid, 'dispatch_vehicle_gate_blocked', 'admin',
                ${JSON.stringify({
                  reason: 'no_vehicle_assigned',
                  driver_id: assigned_driver_id,
                  service_location_type: slt,
                  pickup_zone: bookingCheck.pickup_zone,
                  timestamp: new Date().toISOString(),
                })}::jsonb
              )
            `;
          } catch { /* non-blocking */ }
          return NextResponse.json(
            {
              error: `Vehicle Eligibility Gate: driver has no active vehicle registered. A vehicle with the required permits must be registered before this driver can be assigned to a ${slt} booking.`,
              gate_blocked: true,
              exclusion_reasons: ["no_vehicle_assigned"],
              service_location_type: slt,
            },
            { status: 422 }
          );
        }
        const vehicle = vehicleRows[0] as import("@/lib/vehicles/gate").VehicleRecord;
        const gateResult = checkVehicleEligibility(vehicle, slt);
        if (!gateResult.eligible) {
          // Log exclusion with reasons
          try {
            await sql`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES (
                'booking', ${id}::uuid, 'dispatch_vehicle_gate_blocked', 'admin',
                ${JSON.stringify({
                  vehicle_id:           vehicle.id,
                  driver_id:            assigned_driver_id,
                  service_location_type: slt,
                  pickup_zone:          bookingCheck.pickup_zone,
                  exclusion_reasons:    gateResult.reasons,
                  vehicle_snapshot: {
                    make:                         vehicle.make,
                    model:                        vehicle.model,
                    plate:                        vehicle.plate,
                    vehicle_status:               vehicle.vehicle_status,
                    city_permit_status:           vehicle.city_permit_status,
                    airport_permit_mco_status:    vehicle.airport_permit_mco_status,
                    port_permit_canaveral_status: vehicle.port_permit_canaveral_status,
                    insurance_status:             vehicle.insurance_status,
                    registration_status:          vehicle.registration_status,
                  },
                  timestamp: new Date().toISOString(),
                })}::jsonb
              )
            `;
          } catch { /* non-blocking */ }
          return NextResponse.json(
            {
              error: `Vehicle Eligibility Gate: vehicle is not eligible for ${slt}. Missing requirements: ${gateResult.reasons.join(", ")}.`,
              gate_blocked: true,
              exclusion_reasons: gateResult.reasons,
              service_location_type: slt,
              vehicle_id: vehicle.id,
            },
            { status: 422 }
          );
        }
        // Gate passed — update booking service_location_type if not set
        if (!bookingCheck.service_location_type && slt) {
          try {
            await sql`
              UPDATE bookings SET service_location_type = ${slt}, updated_at = NOW()
              WHERE id = ${id}::uuid
            `;
          } catch { /* non-blocking — column may not exist yet */ }
        }
      }
      // ── End Vehicle Eligibility Gate ───────────────────────────────────────
    }

    if (status) {
      const inferredDispatch = dispatch_status ?? inferDispatchStatus(status);
      try {
        await sql`
          UPDATE bookings
          SET
            status = ${status},
            dispatch_status = ${inferredDispatch},
            updated_at = NOW()
          WHERE id = ${id}::uuid
        `;
      } catch (e: any) {
        // Fallback if dispatch_status column doesn't exist yet
        if (e.message?.includes("dispatch_status")) {
          await sql`
            UPDATE bookings
            SET status = ${status}, updated_at = NOW()
            WHERE id = ${id}::uuid
          `;
        } else throw e;
      }
    }

    // Update dispatch_status independently (without changing booking status)
    if (dispatch_status && !status) {
      try {
        await sql`
          UPDATE bookings
          SET dispatch_status = ${dispatch_status}, updated_at = NOW()
          WHERE id = ${id}::uuid
        `;
      } catch (e: any) {
        if (!e.message?.includes("dispatch_status")) throw e;
      }
    }

    // Assign driver + write status/dispatch atomically in a single UPDATE
    if (assigned_driver_id !== undefined) {
      if (assigned_driver_id) {
        // ── SLN Dispatch Lifecycle: Admin assigns driver via offer flow ──────────
        //
        // CORRECT BEHAVIOR (per SLN spec):
        //   1. Admin selects driver → creates dispatch_offer row (response='pending')
        //   2. Booking status → 'pending_dispatch', dispatch_status → 'offer_pending'
        //   3. assigned_driver_id stays NULL until driver explicitly accepts
        //   4. Driver panel reads dispatch_offers → shows OfferScreen with beep + timer
        //   5. Driver accepts → respond-offer sets assigned_driver_id + status='accepted'
        //
        // WRONG (previous behavior):
        //   UPDATE bookings SET assigned_driver_id = driver_id → driver panel skips OfferScreen
        //
        // Admin can force-bypass the offer flow by passing dispatch_status='assigned' explicitly.
        const adminForceDirect = dispatch_status === "assigned";
        try {
          if (adminForceDirect) {
            // Direct assignment bypass (admin explicitly chose to skip offer flow)
            await sql`
              UPDATE bookings
              SET
                assigned_driver_id = ${assigned_driver_id}::uuid,
                status = 'assigned',
                dispatch_status = 'assigned',
                updated_at = NOW()
              WHERE id = ${id}::uuid
            `;
          } else {
            // ── Standard SLN offer flow ──────────────────────────────────────────
            // Step 1: Close any existing pending offers for this booking
            await sql`
              UPDATE dispatch_offers
              SET response = 'superseded', responded_at = NOW()
              WHERE booking_id = ${id}::uuid
                AND response = 'pending'
            `;
            // Step 2: Create new dispatch_offer (30-minute window)
            await sql`
              INSERT INTO dispatch_offers (
                booking_id, driver_id, offer_round,
                is_source_offer, response, sent_at, expires_at
              ) VALUES (
                ${id}::uuid,
                ${assigned_driver_id}::uuid,
                1,
                false,
                'pending',
                NOW(),
                NOW() + interval '30 minutes'
              )
            `;
            // Step 3: Update booking to offer_pending — DO NOT set assigned_driver_id yet
            // assigned_driver_id is set only when driver accepts via respond-offer
            await sql`
              UPDATE bookings
              SET
                dispatch_status = 'offer_pending',
                status = 'pending_dispatch',
                assigned_driver_id = NULL,
                offer_expires_at = NOW() + interval '30 minutes',
                updated_at = NOW()
              WHERE id = ${id}::uuid
            `;
          }
        } catch (e: any) {
          // Fallback if dispatch_status column doesn't exist
          if (e.message?.includes("dispatch_status") || e.message?.includes("offer_expires_at")) {
            await sql`
              UPDATE bookings
              SET assigned_driver_id = ${assigned_driver_id}::uuid, updated_at = NOW()
              WHERE id = ${id}::uuid
            `;
          } else throw e;
        }
      } else {
        // Unassign driver (assigned_driver_id = null)
        await sql`
          UPDATE bookings
          SET assigned_driver_id = NULL, updated_at = NOW()
          WHERE id = ${id}::uuid
        `;
      }

      // Send email notification to driver (non-blocking)
      if (assigned_driver_id) {
        try {
          // Get driver email + booking details
          const [driverRow] = await sql`
            SELECT d.email, d.full_name, d.driver_code,
                   b.pickup_address, b.dropoff_address, b.pickup_at,
                   b.total_price, b.id AS booking_id,
                   c.full_name AS client_name
            FROM drivers d
            JOIN bookings b ON b.id = ${id}::uuid
            LEFT JOIN clients c ON b.client_id = c.id
            WHERE d.id = ${assigned_driver_id}::uuid
            LIMIT 1
          `;

          if (driverRow?.email) {
            // Fire-and-forget email
            sendDriverNotificationEmail({
              driverEmail: driverRow.email,
              driverName: driverRow.full_name ?? "Driver",
              bookingId: driverRow.booking_id ?? id,
              pickupAddress: driverRow.pickup_address ?? "TBD",
              dropoffAddress: driverRow.dropoff_address ?? "TBD",
              pickupAt: driverRow.pickup_at ?? null,
              totalPrice: Number(driverRow.total_price ?? 0),
              clientName: driverRow.client_name ?? null,
            }).catch(() => null);
          }
        } catch {
          // Email failure should never block the assignment
        }
      }
    }

    // ── Financial close: lock commission + post ledger on completed ──────
    // Triggered when status changes to 'completed'.
    // Non-blocking: failures are logged but do not affect the booking update.
    if (status === "completed") {
      try {
        // Load booking fields needed for lockCommission
        const [bRow] = await sql`
          SELECT
            id, total_price, source_driver_id, executor_driver_id
          FROM bookings
          WHERE id = ${id}::uuid
          LIMIT 1
        `;
        if (bRow) {
          // Step 1: Lock commission (idempotent)
          await lockCommission({
            booking_id: id,
            total_price: Number(bRow.total_price ?? 0),
            source_driver_id: bRow.source_driver_id ?? null,
            executor_driver_id: bRow.executor_driver_id ?? null,
          });
          // Step 2: Post ledger rows (idempotent)
          await postBookingLedger(id);
        }
      } catch (finErr: any) {
        // Financial close failure is non-blocking — booking status update already committed
        console.error("[PATCH] financial close error:", finErr?.message);
      }
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// GET /api/admin/bookings/[id]] — Get single booking with full details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15+ requires awaiting params
    const { id } = await params;
    const rows = await sql`
      SELECT
        b.*,
        c.full_name AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        d.full_name AS driver_name,
        d.driver_code AS driver_code,
        d.email AS driver_email
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE b.id = ${id}::uuid
    `;
    if (!rows[0]) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ booking: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
