/**
 * Sottovento Network — Twilio SMS Notifications
 * Sends real-time SMS alerts to drivers for ride offers
 */

import twilio from "twilio";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID!;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER!;
// A2P 10DLC registered number (689) 264-6565 — Campaign pending vetting (24-48h)
// Toll-Free fallback (888) 997-5436 — pending verification
const LOCAL_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+16892646565';
const TOLLFREE_NUMBER = process.env.TWILIO_TOLLFREE_NUMBER || '+18889975436';
// Use local number (A2P registered); fallback to toll-free if needed
const SMS_FROM = LOCAL_NUMBER;

function getClient() {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(ACCOUNT_SID, AUTH_TOKEN);
}

export interface OfferSMSPayload {
  driverPhone: string;
  driverName: string;
  offerId: string;
  bookingId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  estimatedAmount: number;
  isSourceDriver: boolean;
  timeoutMinutes: number;
}

/**
 * Send a ride offer SMS to a driver
 */
export async function sendOfferSMS(payload: OfferSMSPayload): Promise<boolean> {
  const {
    driverPhone,
    driverName,
    offerId,
    bookingId,
    pickupLocation,
    dropoffLocation,
    pickupTime,
    estimatedAmount,
    isSourceDriver,
    timeoutMinutes,
  } = payload;

  const priorityTag = isSourceDriver ? "⭐ YOUR CLIENT — PRIORITY OFFER\n" : "";
  const acceptUrl = `https://www.sottoventoluxuryride.com/driver/offer/${offerId}`;

  const message =
    `🚗 SOTTOVENTO — New Ride Offer\n` +
    `${priorityTag}` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Hi ${driverName},\n\n` +
    `📍 Pickup: ${pickupLocation}\n` +
    `🏁 Drop-off: ${dropoffLocation}\n` +
    `🕐 Time: ${pickupTime}\n` +
    `💵 Est. Fare: $${estimatedAmount.toFixed(2)}\n\n` +
    `⏱ You have ${timeoutMinutes} min to respond.\n\n` +
    `👉 Accept or Decline:\n${acceptUrl}`;

  try {
    const client = getClient();
    const result = await client.messages.create({
      body: message,
      from: SMS_FROM,
      to: driverPhone,
    });

    console.log(`[SMS] Offer sent to ${driverPhone} — SID: ${result.sid} — Status: ${result.status}`);
    return true;
  } catch (error: any) {
    console.error(`[SMS] Failed to send offer to ${driverPhone}:`, error?.message || error);
    return false;
  }
}

/**
 * Send a booking confirmation SMS to a driver
 */
export async function sendAssignmentSMS(
  driverPhone: string,
  driverName: string,
  bookingId: string,
  pickupLocation: string,
  dropoffLocation: string,
  pickupTime: string,
  passengerName: string,
  passengerPhone: string
): Promise<boolean> {
  const message =
    `✅ SOTTOVENTO — Ride Confirmed\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Hi ${driverName}, you're assigned!\n\n` +
    `👤 Passenger: ${passengerName}\n` +
    `📞 Contact: ${passengerPhone}\n` +
    `📍 Pickup: ${pickupLocation}\n` +
    `🏁 Drop-off: ${dropoffLocation}\n` +
    `🕐 Time: ${pickupTime}\n\n` +
    `Booking ID: ${bookingId}\n` +
    `Drive safe! 🚗`;

  try {
    const client = getClient();
    const result = await client.messages.create({
      body: message,
      from: SMS_FROM,
      to: driverPhone,
    });

    console.log(`[SMS] Assignment sent to ${driverPhone} — SID: ${result.sid}`);
    return true;
  } catch (error: any) {
    console.error(`[SMS] Failed to send assignment to ${driverPhone}:`, error?.message || error);
    return false;
  }
}

/**
 * Send a source commission notification SMS
 */
export async function sendSourceCommissionSMS(
  driverPhone: string,
  driverName: string,
  bookingId: string,
  commissionAmount: number,
  executorName: string
): Promise<boolean> {
  const message =
    `💰 SOTTOVENTO — Source Commission\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Hi ${driverName},\n\n` +
    `Your client's ride was completed by ${executorName}.\n\n` +
    `💵 Your source commission: $${commissionAmount.toFixed(2)}\n\n` +
    `Booking ID: ${bookingId}\n` +
    `View earnings: https://www.sottoventoluxuryride.com/driver/earnings`;

  try {
    const client = getClient();
    const result = await client.messages.create({
      body: message,
      from: SMS_FROM,
      to: driverPhone,
    });

    console.log(`[SMS] Commission notification sent to ${driverPhone} — SID: ${result.sid}`);
    return true;
  } catch (error: any) {
    console.error(`[SMS] Failed to send commission SMS to ${driverPhone}:`, error?.message || error);
    return false;
  }
}

/**
 * Send a test SMS to verify the integration
 */
export async function sendTestSMS(toPhone: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const client = getClient();
    const result = await client.messages.create({
      body: "✅ Sottovento Network — SMS integration active. A2P 10DLC registered. Sent from +1 (689) 264-6565.",
      from: SMS_FROM,
      to: toPhone,
    });

    return { success: true, sid: result.sid };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}
