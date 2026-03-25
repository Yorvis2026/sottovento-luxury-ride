import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

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
    const { status, dispatch_status, assigned_driver_id, edit_fields } = body;

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
        SELECT pickup_at, pickup_address, dropoff_address, total_price
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
        // Atomic update: assigned_driver_id + status + dispatch_status in one query
        // This prevents the partial state where status='assigned' but assigned_driver_id is NULL
        // Section 2: When admin assigns a driver, set dispatch_status to 'offer_pending'
        // so the driver receives the Accept/Reject offer stage before the ride becomes active.
        // Admin can override by explicitly passing dispatch_status in the request body.
        const assignStatus = status ?? "assigned";
        const assignDispatch = dispatch_status ?? "offer_pending";
        try {
          await sql`
            UPDATE bookings
            SET
              assigned_driver_id = ${assigned_driver_id}::uuid,
              status = ${assignStatus},
              dispatch_status = ${assignDispatch},
              updated_at = NOW()
            WHERE id = ${id}::uuid
          `;

          // Section 2: Ensure a dispatch_offer exists for the driver to respond to
          if (assignDispatch === "offer_pending") {
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
                NOW() + interval '24 hours'
              )
              ON CONFLICT DO NOTHING
            `;
          }
        } catch (e: any) {
          // Fallback if dispatch_status column doesn't exist
          if (e.message?.includes("dispatch_status")) {
            await sql`
              UPDATE bookings
              SET assigned_driver_id = ${assigned_driver_id}::uuid, status = ${assignStatus}, updated_at = NOW()
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/admin/bookings/[id] — Get single booking with full details
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
