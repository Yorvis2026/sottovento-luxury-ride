// ============================================================
// SOTTOVENTO NETWORK — Database Adapter (Neon Postgres)
// Real queries replacing the stubs in API routes
// ============================================================
import { neon } from "@neondatabase/serverless";
import type { Driver, Client } from "./types";

// Singleton SQL client
const sql = neon(process.env.DATABASE_URL!);

// ============================================================
// DRIVERS
// ============================================================
export const drivers = {
  findById: async (id: string): Promise<Driver | null> => {
    const rows = await sql`
      SELECT * FROM drivers WHERE id = ${id} LIMIT 1
    `;
    return (rows[0] as Driver) ?? null;
  },

  findByCode: async (code: string): Promise<Driver | null> => {
    const rows = await sql`
      SELECT * FROM drivers 
      WHERE driver_code = ${code} 
        AND driver_status = 'active'
      LIMIT 1
    `;
    return (rows[0] as Driver) ?? null;
  },

  findAvailable: async (serviceType: string): Promise<Driver[]> => {
    const rows = await sql`
      SELECT * FROM drivers
      WHERE driver_status = 'active'
        AND is_eligible = true
        AND ${serviceType} = ANY(service_types)
        AND (license_expires_at IS NULL OR license_expires_at > NOW())
        AND (insurance_expires_at IS NULL OR insurance_expires_at > NOW())
      ORDER BY created_at ASC
    `;
    return rows as Driver[];
  },
};

// ============================================================
// CLIENTS
// ============================================================
export const clients = {
  findById: async (id: string): Promise<Client | null> => {
    const rows = await sql`
      SELECT * FROM clients WHERE id = ${id} LIMIT 1
    `;
    return (rows[0] as Client) ?? null;
  },

  findByContact: async (
    phone?: string | null,
    email?: string | null
  ): Promise<Client | null> => {
    if (!phone && !email) return null;
    const rows = await sql`
      SELECT * FROM clients
      WHERE (${phone ?? null}::text IS NOT NULL AND phone = ${phone ?? null})
         OR (${email ?? null}::text IS NOT NULL AND email = ${email ?? null})
      LIMIT 1
    `;
    return (rows[0] as Client) ?? null;
  },

  create: async (data: {
    full_name?: string;
    phone?: string;
    email?: string;
    source_driver_id?: string | null;
    source_type?: string;
    tablet_id?: string | null;
    company_id?: string | null;
    ref_code?: string | null;
  }): Promise<Client> => {
    const rows = await sql`
      INSERT INTO clients (
        full_name, phone, email,
        source_driver_id, source_type,
        tablet_id, company_id, ref_code,
        total_bookings, created_at, updated_at
      ) VALUES (
        ${data.full_name ?? null},
        ${data.phone ?? null},
        ${data.email ?? null},
        ${data.source_driver_id ?? null},
        ${data.source_type ?? "direct"},
        ${data.tablet_id ?? null},
        ${data.company_id ?? null},
        ${data.ref_code ?? null},
        0, NOW(), NOW()
      )
      RETURNING *
    `;
    return rows[0] as Client;
  },

  update: async (id: string, data: Partial<Client>): Promise<void> => {
    await sql`
      UPDATE clients
      SET
        total_bookings = COALESCE(${data.total_bookings ?? null}, total_bookings),
        last_booking_at = COALESCE(${data.last_booking_at ?? null}::timestamptz, last_booking_at),
        updated_at = NOW()
      WHERE id = ${id}
    `;
  },
};

// ============================================================
// BOOKINGS
// ============================================================
export const bookings = {
  create: async (data: {
    client_id: string;
    source_driver_id?: string | null;
    service_type: string;
    pickup_location: string;
    dropoff_location?: string | null;
    pickup_at: string;
    passengers?: number | null;
    luggage?: number | null;
    flight_number?: string | null;
    notes?: string | null;
    base_price: number;
    extras_price?: number;
    total_price: number;
    stripe_session_id?: string | null;
    payment_status?: string;
    status?: string;
    offer_timeout_secs?: number;
  }) => {
    const rows = await sql`
      INSERT INTO bookings (
        client_id, source_driver_id, service_type,
        pickup_location, dropoff_location, pickup_at,
        passengers, luggage, flight_number, notes,
        base_price, extras_price, total_price,
        stripe_session_id, payment_status, status,
        offer_timeout_secs, created_at, updated_at
      ) VALUES (
        ${data.client_id},
        ${data.source_driver_id ?? null},
        ${data.service_type},
        ${data.pickup_location},
        ${data.dropoff_location ?? null},
        ${data.pickup_at}::timestamptz,
        ${data.passengers ?? null},
        ${data.luggage ?? null},
        ${data.flight_number ?? null},
        ${data.notes ?? null},
        ${data.base_price},
        ${data.extras_price ?? 0},
        ${data.total_price},
        ${data.stripe_session_id ?? null},
        ${data.payment_status ?? "pending"},
        ${data.status ?? "pending"},
        ${data.offer_timeout_secs ?? 300},
        NOW(), NOW()
      )
      RETURNING *
    `;
    return rows[0];
  },

  update: async (id: string, data: {
    status?: string;
    assigned_driver_id?: string | null;
    offer_sent_at?: string | null;
    offer_accepted_at?: string | null;
    completed_at?: string | null;
  }): Promise<void> => {
    await sql`
      UPDATE bookings
      SET
        status = COALESCE(${data.status ?? null}, status),
        assigned_driver_id = COALESCE(${data.assigned_driver_id ?? null}, assigned_driver_id),
        offer_sent_at = COALESCE(${data.offer_sent_at ?? null}::timestamptz, offer_sent_at),
        offer_accepted_at = COALESCE(${data.offer_accepted_at ?? null}::timestamptz, offer_accepted_at),
        completed_at = COALESCE(${data.completed_at ?? null}::timestamptz, completed_at),
        updated_at = NOW()
      WHERE id = ${id}
    `;
  },

  findById: async (id: string) => {
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id} LIMIT 1`;
    return rows[0] ?? null;
  },
};

// ============================================================
// DISPATCH OFFERS
// ============================================================
export const dispatchOffers = {
  create: async (data: {
    booking_id: string;
    driver_id: string;
    offer_round: number;
    is_source_offer: boolean;
    sent_at: string;
    expires_at: string;
  }) => {
    const rows = await sql`
      INSERT INTO dispatch_offers (
        booking_id, driver_id, offer_round,
        is_source_offer, status, sent_at, expires_at
      ) VALUES (
        ${data.booking_id},
        ${data.driver_id},
        ${data.offer_round},
        ${data.is_source_offer},
        'pending',
        ${data.sent_at}::timestamptz,
        ${data.expires_at}::timestamptz
      )
      RETURNING *
    `;
    return rows[0];
  },

  findByBooking: async (bookingId: string) => {
    const rows = await sql`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${bookingId}
      ORDER BY offer_round ASC
    `;
    return rows;
  },

  findPendingForBooking: async (bookingId: string) => {
    const rows = await sql`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${bookingId}
        AND status = 'pending'
      ORDER BY offer_round ASC
      LIMIT 1
    `;
    return rows[0] ?? null;
  },

  update: async (id: string, data: {
    status?: string;
    responded_at?: string | null;
  }): Promise<void> => {
    await sql`
      UPDATE dispatch_offers
      SET
        status = COALESCE(${data.status ?? null}, status),
        responded_at = COALESCE(${data.responded_at ?? null}::timestamptz, responded_at)
      WHERE id = ${id}
    `;
  },
};

// ============================================================
// COMMISSIONS
// ============================================================
export const commissions = {
  create: async (data: {
    booking_id: string;
    source_driver_id?: string | null;
    executor_driver_id?: string | null;
    executor_pct: number;
    source_pct?: number | null;
    source_amount?: number | null;
    platform_pct: number;
    platform_amount: number;
    total_amount: number;
    status?: string;
  }) => {
    const rows = await sql`
      INSERT INTO commissions (
        booking_id, source_driver_id, executor_driver_id,
        executor_pct, executor_amount,
        source_pct, source_amount,
        platform_pct, platform_amount,
        total_amount, status, created_at
      ) VALUES (
        ${data.booking_id},
        ${data.source_driver_id ?? null},
        ${data.executor_driver_id ?? null},
        ${data.executor_pct},
        ${parseFloat(((data.total_amount * data.executor_pct) / 100).toFixed(2))},
        ${data.source_pct ?? null},
        ${data.source_amount ?? null},
        ${data.platform_pct},
        ${data.platform_amount},
        ${data.total_amount},
        ${data.status ?? "pending"},
        NOW()
      )
      RETURNING *
    `;
    return rows[0];
  },

  confirm: async (bookingId: string, executorDriverId: string): Promise<void> => {
    await sql`
      UPDATE commissions
      SET
        executor_driver_id = ${executorDriverId},
        executor_amount = total_amount * executor_pct / 100,
        status = 'confirmed'
      WHERE booking_id = ${bookingId}
    `;
  },
};

// ============================================================
// AUDIT LOGS
// ============================================================
export const auditLogs = {
  create: async (data: {
    entity_type: string;
    entity_id: string;
    action: string;
    actor_type?: string;
    actor_id?: string | null;
    old_data?: object | null;
    new_data?: object | null;
  }): Promise<void> => {
    await sql`
      INSERT INTO audit_logs (
        entity_type, entity_id, action,
        actor_type, actor_id,
        old_data, new_data, created_at
      ) VALUES (
        ${data.entity_type},
        ${data.entity_id}::uuid,
        ${data.action},
        ${data.actor_type ?? "system"},
        ${data.actor_id ?? null}::uuid,
        ${data.old_data ? JSON.stringify(data.old_data) : null}::jsonb,
        ${data.new_data ? JSON.stringify(data.new_data) : null}::jsonb,
        NOW()
      )
    `;
  },
};

// ============================================================
// SOURCE DRIVER SUMMARY VIEW
// ============================================================
export const sourceSummary = {
  findByDriverId: async (driverId: string) => {
    const rows = await sql`
      SELECT * FROM source_driver_summary
      WHERE driver_id = ${driverId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  },

  findAll: async () => {
    const rows = await sql`
      SELECT * FROM source_driver_summary
      ORDER BY lifetime_source_earnings DESC
    `;
    return rows;
  },
};

// ============================================================
// LEADS
// ============================================================
export const leads = {
  create: async (data: {
    lead_source?: string;
    tablet_id?: string | null;
    driver_id?: string | null;
    company_id?: string | null;
    tablet_code?: string | null;
    driver_code?: string | null;
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
    interested_package?: string | null;
  }) => {
    const rows = await sql`
      INSERT INTO leads (
        lead_source, tablet_id, driver_id, company_id,
        tablet_code, driver_code,
        full_name, phone, email, interested_package,
        status, created_at, updated_at
      ) VALUES (
        ${data.lead_source ?? "tablet"},
        ${data.tablet_id ?? null}::uuid,
        ${data.driver_id ?? null}::uuid,
        ${data.company_id ?? null}::uuid,
        ${data.tablet_code ?? null},
        ${data.driver_code ?? null},
        ${data.full_name ?? null},
        ${data.phone ?? null},
        ${data.email ?? null},
        ${data.interested_package ?? null},
        'new', NOW(), NOW()
      )
      RETURNING *
    `;
    return rows[0];
  },
};

// ============================================================
// Unified DB export (drop-in replacement for stub)
// ============================================================
export const db = {
  drivers,
  clients,
  bookings,
  dispatchOffers,
  commissions,
  auditLogs,
  sourceSummary,
  leads,
};

export default db;
