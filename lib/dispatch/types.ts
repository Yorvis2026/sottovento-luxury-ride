// ============================================================
// SOTTOVENTO NETWORK — Dispatch Types
// ============================================================

export type DriverStatus = "active" | "inactive" | "suspended" | "documents_expired";
export type BookingStatus =
  | "pending"
  | "offered"
  | "accepted"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";
export type OfferResponse = "accepted" | "declined" | "timeout";
export type CommissionStatus = "pending" | "confirmed" | "paid" | "disputed";
export type SourceType = "tablet" | "qr" | "referral" | "booking" | "direct";
export type LeadStatus = "new" | "contacted" | "converted" | "dead";

// ---- Commission split constants ----
export const COMMISSION_SPLIT = {
  EXECUTOR_PCT: 65,
  SOURCE_PCT: 15,
  PLATFORM_PCT: 20,
} as const;

// ---- Offer timeout constants (seconds) ----
export const OFFER_TIMEOUT = {
  STANDARD: 300,    // 5 minutes
  IMMEDIATE: 90,    // 1.5 minutes (pickup < 2 hours)
} as const;

// ---- Immediate booking threshold ----
export const IMMEDIATE_THRESHOLD_HOURS = 2;

// ============================================================
// Core entity types (mirrors DB schema)
// ============================================================

export interface Driver {
  id: string;
  driver_code: string;
  company_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  driver_status: DriverStatus;
  service_types: string[];
  license_expires_at: string | null;
  insurance_expires_at: string | null;
  is_eligible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  source_driver_id: string | null;
  source_partner_id: string | null;
  source_type: SourceType;
  tablet_id: string | null;
  company_id: string | null;
  interested_package: string | null;
  ref_code: string | null;
  first_booking_at: string | null;
  last_booking_at: string | null;
  total_bookings: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  client_id: string | null;
  company_id: string | null;
  source_driver_id: string | null;
  source_partner_id: string | null;
  source_type: SourceType | null;
  assigned_driver_id: string | null;
  offer_sent_at: string | null;
  offer_timeout_secs: number;
  offer_accepted: boolean | null;
  offer_accepted_at: string | null;
  offer_declined_at: string | null;
  offer_timed_out_at: string | null;
  pickup_zone: string | null;
  dropoff_zone: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string;
  vehicle_type: string;
  service_type: string;
  trip_type: string;
  passengers: number | null;
  luggage: string | null;
  flight_number: string | null;
  notes: string | null;
  base_price: number;
  extras_price: number;
  total_price: number;
  currency: string;
  payment_status: string;
  stripe_session_id: string | null;
  paid_at: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface DispatchOffer {
  id: string;
  booking_id: string;
  driver_id: string;
  offer_round: number;
  is_source_offer: boolean;
  sent_at: string;
  expires_at: string;
  response: OfferResponse | null;
  responded_at: string | null;
  created_at: string;
}

export interface Commission {
  id: string;
  booking_id: string;
  executor_driver_id: string | null;
  executor_amount: number | null;
  executor_pct: number;
  source_driver_id: string | null;
  source_amount: number | null;
  source_pct: number;
  platform_amount: number | null;
  platform_pct: number;
  total_amount: number;
  status: CommissionStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  lead_source: string;
  tablet_id: string | null;
  driver_id: string | null;
  company_id: string | null;
  tablet_code: string | null;
  driver_code: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  interested_package: string | null;
  converted_to_client_id: string | null;
  converted_at: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================
// API request/response types
// ============================================================

export interface CreateBookingRequest {
  client_id?: string;
  // Client info (if new client)
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  // Attribution
  ref_code?: string;          // from ?ref= URL param
  tablet_code?: string;
  driver_code?: string;
  source_type?: SourceType;
  // Booking details
  pickup_zone: string;
  dropoff_zone: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_at: string;
  vehicle_type: string;
  service_type: string;
  trip_type: string;
  passengers?: number;
  luggage?: string;
  flight_number?: string;
  notes?: string;
  base_price: number;
  extras_price?: number;
  total_price: number;
  stripe_session_id?: string;
}

export interface CreateBookingResponse {
  booking_id: string;
  client_id: string;
  source_driver_id: string | null;
  offer_sent: boolean;
  offer_timeout_secs: number;
  message: string;
}

export interface RespondOfferRequest {
  offer_id: string;
  driver_id: string;
  response: "accepted" | "declined";
}

export interface RespondOfferResponse {
  booking_id: string;
  assigned_driver_id: string | null;
  fallback_dispatched: boolean;
  message: string;
}

export interface SourceDriverSummary {
  driver_id: string;
  driver_name: string;
  driver_code: string;
  driver_status: DriverStatus;
  total_clients_captured: number;
  active_clients_captured: number;
  repeat_bookings_count: number;
  lifetime_source_earnings: number;
  monthly_source_earnings: number;
  pending_offers_count: number;
}

export interface DriverEarnings {
  driver_id: string;
  period_start: string;
  period_end: string;
  executor_earnings: number;
  executor_rides: number;
  source_earnings: number;
  source_rides: number;
  total_earnings: number;
}
