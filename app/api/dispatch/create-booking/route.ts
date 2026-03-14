import { NextRequest, NextResponse } from "next/server";
import {
  getDispatchStrategy,
  calculateCommissions,
  resolveAttribution,
  guardSourceDriverId,
} from "@/lib/dispatch/engine";
import { db } from "@/lib/dispatch/db";
import type {
  CreateBookingRequest,
  CreateBookingResponse,
  Client,
  Driver,
} from "@/lib/dispatch/types";

// ============================================================
// POST /api/dispatch/create-booking
//
// Flow:
// 1. Resolve client (existing or new)
// 2. Preserve source_driver_id (never overwrite)
// 3. Determine dispatch strategy (source priority vs network)
// 4. Create booking record
// 5. Create dispatch offer (source driver or network)
// 6. Create pending commission record
// 7. Return booking_id + offer metadata
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body: CreateBookingRequest = await req.json();

    // ---- Validate required fields ----
    if (!body.pickup_zone || !body.dropoff_zone || !body.pickup_at || !body.total_price) {
      return NextResponse.json(
        { error: "Missing required fields: pickup_zone, dropoff_zone, pickup_at, total_price" },
        { status: 400 }
      );
    }

    // ---- Resolve attribution ----
    const attribution = resolveAttribution({
      ref_code: body.ref_code,
      tablet_code: body.tablet_code,
      driver_code: body.driver_code,
      source_type: body.source_type,
    });

    // ---- Resolve or create client ----
    const existingClient: Client | null = body.client_id
      ? await db.clients.findById(body.client_id)
      : await db.clients.findByContact(body.client_phone, body.client_email);

    let clientId: string;
    let sourceDriverId: string | null = null;

    if (existingClient) {
      // GUARD: never overwrite source_driver_id
      const resolvedSourceDriverId = await resolveDriverIdFromCode(
        attribution.driver_code,
        attribution.ref_code
      );
      const protectedSourceDriverId = guardSourceDriverId(
        existingClient.source_driver_id,
        resolvedSourceDriverId
      );

      await db.clients.update(existingClient.id, {
        last_booking_at: new Date().toISOString(),
        total_bookings: existingClient.total_bookings + 1,
        ...(existingClient.source_driver_id === null && protectedSourceDriverId
          ? { source_driver_id: protectedSourceDriverId }
          : {}),
      });

      clientId = existingClient.id;
      sourceDriverId = protectedSourceDriverId;
    } else {
      // New client — resolve source driver from code
      const resolvedSourceDriverId = await resolveDriverIdFromCode(
        attribution.driver_code,
        attribution.ref_code
      );

      const newClient = await db.clients.create({
        full_name: body.client_name ?? null,
        phone: body.client_phone ?? null,
        email: body.client_email ?? null,
        source_driver_id: resolvedSourceDriverId,
        source_type: attribution.source_type,
        ref_code: attribution.ref_code,
      });

      clientId = newClient.id;
      sourceDriverId = resolvedSourceDriverId;
    }

    // ---- Load source driver for eligibility check ----
    const sourceDriver: Driver | null = sourceDriverId
      ? await db.drivers.findById(sourceDriverId)
      : null;

    // ---- Determine dispatch strategy ----
    const clientRecord = existingClient ?? ({ source_driver_id: sourceDriverId } as Client);
    const strategy = getDispatchStrategy(clientRecord, sourceDriver, {
      pickup_at: body.pickup_at,
      service_type: body.service_type,
    });

    // ---- Create booking ----
    const booking = await db.bookings.create({
      client_id: clientId,
      source_driver_id: sourceDriverId,
      service_type: body.service_type ?? "transfer",
      pickup_location: body.pickup_address ?? body.pickup_zone,
      dropoff_location: body.dropoff_address ?? body.dropoff_zone ?? null,
      pickup_at: body.pickup_at,
      passengers: body.passengers ?? null,
      luggage: body.luggage ?? null,
      flight_number: body.flight_number ?? null,
      notes: body.notes ?? null,
      base_price: body.base_price,
      extras_price: body.extras_price ?? 0,
      total_price: body.total_price,
      stripe_session_id: body.stripe_session_id ?? null,
      payment_status: body.stripe_session_id ? "paid" : "pending",
      status: "pending",
      offer_timeout_secs: strategy.timeout_secs,
    });

    // ---- Create dispatch offer ----
    let offerSent = false;
    if (strategy.offer_source_first && strategy.source_driver_id) {
      const expiresAt = new Date(
        Date.now() + strategy.timeout_secs * 1000
      ).toISOString();

      await db.dispatchOffers.create({
        booking_id: booking.id,
        driver_id: strategy.source_driver_id,
        offer_round: 1,
        is_source_offer: true,
        sent_at: new Date().toISOString(),
        expires_at: expiresAt,
      });

      await db.bookings.update(booking.id, {
        status: "offered",
        offer_sent_at: new Date().toISOString(),
      });

      await notifyDriver(strategy.source_driver_id, booking.id, strategy.timeout_secs);
      offerSent = true;
    } else {
      await dispatchToNetwork(booking.id, 2);
    }

    // ---- Create pending commission record ----
    const commissionCalc = calculateCommissions(
      body.total_price,
      sourceDriverId !== null
    );

    await db.commissions.create({
      booking_id: booking.id,
      source_driver_id: sourceDriverId,
      executor_pct: commissionCalc.executor_pct,
      source_pct: commissionCalc.source_pct,
      source_amount: commissionCalc.source_amount,
      platform_pct: commissionCalc.platform_pct,
      platform_amount: commissionCalc.platform_amount,
      total_amount: commissionCalc.total_amount,
      status: "pending",
    });

    // ---- Audit log ----
    await db.auditLogs.create({
      entity_type: "booking",
      entity_id: booking.id,
      action: "booking_created",
      actor_type: "system",
      new_data: {
        strategy: strategy.reason,
        source_driver_id: sourceDriverId,
        offer_sent: offerSent,
      },
    });

    const response: CreateBookingResponse = {
      booking_id: booking.id,
      client_id: clientId,
      source_driver_id: sourceDriverId,
      offer_sent: offerSent,
      offer_timeout_secs: strategy.timeout_secs,
      message: offerSent
        ? `Offer sent to source driver. Timeout: ${strategy.timeout_secs}s`
        : `Dispatched to network. Reason: ${strategy.reason}`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err: any) {
    console.error("[dispatch/create-booking]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}

// ============================================================
// Helpers
// ============================================================

async function resolveDriverIdFromCode(
  driver_code?: string | null,
  ref_code?: string | null
): Promise<string | null> {
  const code = driver_code ?? ref_code;
  if (!code) return null;
  const driver = await db.drivers.findByCode(code);
  return driver?.id ?? null;
}

async function notifyDriver(
  driverId: string,
  bookingId: string,
  timeoutSecs: number
): Promise<void> {
  // TODO: Implement push notification (Firebase FCM, Expo Push, Twilio SMS)
  console.log(
    `[notify] Driver ${driverId} — Booking ${bookingId} — Timeout ${timeoutSecs}s`
  );
}

async function dispatchToNetwork(
  bookingId: string,
  offerRound: number
): Promise<void> {
  // TODO: Query available active drivers and send broadcast offer
  console.log(`[dispatch] Network fallback for booking ${bookingId} — Round ${offerRound}`);
}
