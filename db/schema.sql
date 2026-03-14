-- ============================================================
-- SOTTOVENTO NETWORK — DATABASE SCHEMA
-- Version: 1.0
-- Description: Full schema for dispatch, attribution, commissions
-- ============================================================

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  display_brand VARCHAR(255),          -- display_brand_name override
  suffix        VARCHAR(100),          -- e.g. "by Sottovento Network"
  status        VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tablets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tablet_code   VARCHAR(50) UNIQUE NOT NULL,  -- unique code for QR attribution
  company_id    UUID REFERENCES companies(id),
  driver_id     UUID,                          -- current assigned driver (FK added below)
  label         VARCHAR(100),
  status        VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_code         VARCHAR(50) UNIQUE NOT NULL,  -- unique code for QR/ref attribution
  company_id          UUID REFERENCES companies(id),
  full_name           VARCHAR(255) NOT NULL,
  phone               VARCHAR(50),
  email               VARCHAR(255),
  -- Status: active | inactive | suspended | documents_expired
  driver_status       VARCHAR(50) NOT NULL DEFAULT 'active',
  -- Service types this driver can handle
  service_types       TEXT[] NOT NULL DEFAULT ARRAY['transfer','hourly','corporate'],
  -- Document expiry
  license_expires_at  DATE,
  insurance_expires_at DATE,
  -- Eligibility computed flag (updated by cron or trigger)
  is_eligible         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from tablets to drivers
ALTER TABLE tablets
  ADD CONSTRAINT fk_tablets_driver
  FOREIGN KEY (driver_id) REFERENCES drivers(id);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         VARCHAR(255),
  phone             VARCHAR(50),
  email             VARCHAR(255),
  -- Attribution (set on first capture, NEVER overwritten)
  source_driver_id  UUID REFERENCES drivers(id),
  source_partner_id UUID REFERENCES companies(id),
  source_type       VARCHAR(50) NOT NULL DEFAULT 'direct',
  -- source_type: tablet | qr | referral | booking | direct
  tablet_id         UUID REFERENCES tablets(id),
  company_id        UUID REFERENCES companies(id),
  -- Lead metadata
  interested_package VARCHAR(100),
  ref_code           VARCHAR(100),
  -- Timestamps
  first_booking_at  TIMESTAMPTZ,
  last_booking_at   TIMESTAMPTZ,
  total_bookings    INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID REFERENCES clients(id),
  company_id          UUID REFERENCES companies(id),
  -- Attribution preserved from client
  source_driver_id    UUID REFERENCES drivers(id),
  source_partner_id   UUID REFERENCES companies(id),
  source_type         VARCHAR(50),
  -- Dispatch
  assigned_driver_id  UUID REFERENCES drivers(id),
  -- Offer tracking
  offer_sent_at       TIMESTAMPTZ,
  offer_timeout_secs  INT NOT NULL DEFAULT 300,  -- 300 = standard, 90 = immediate
  offer_accepted      BOOLEAN,
  offer_accepted_at   TIMESTAMPTZ,
  offer_declined_at   TIMESTAMPTZ,
  offer_timed_out_at  TIMESTAMPTZ,
  -- Booking details
  pickup_zone         VARCHAR(100),
  dropoff_zone        VARCHAR(100),
  pickup_address      TEXT,
  dropoff_address     TEXT,
  pickup_at           TIMESTAMPTZ NOT NULL,
  vehicle_type        VARCHAR(50) NOT NULL DEFAULT 'SUV',
  service_type        VARCHAR(50) NOT NULL DEFAULT 'transfer',
  trip_type           VARCHAR(50) NOT NULL DEFAULT 'oneway',
  passengers          INT,
  luggage             VARCHAR(100),
  flight_number       VARCHAR(50),
  notes               TEXT,
  -- Pricing
  base_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  extras_price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency            VARCHAR(10) NOT NULL DEFAULT 'USD',
  -- Payment
  payment_status      VARCHAR(50) NOT NULL DEFAULT 'pending',
  stripe_session_id   VARCHAR(255),
  paid_at             TIMESTAMPTZ,
  -- Booking status
  status              VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- status: pending | offered | accepted | assigned | in_progress | completed | cancelled
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DISPATCH OFFERS
-- (one row per offer attempt, supports multiple rounds)
-- ============================================================
CREATE TABLE IF NOT EXISTS dispatch_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  offer_round     INT NOT NULL DEFAULT 1,   -- 1 = source driver, 2+ = network fallback
  is_source_offer BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  response        VARCHAR(50),  -- accepted | declined | timeout
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id),
  -- Executor commission
  executor_driver_id UUID REFERENCES drivers(id),
  executor_amount    NUMERIC(10,2),
  executor_pct       NUMERIC(5,2) NOT NULL DEFAULT 65.00,
  -- Source commission
  source_driver_id   UUID REFERENCES drivers(id),
  source_amount      NUMERIC(10,2),
  source_pct         NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  -- Platform commission
  platform_amount    NUMERIC(10,2),
  platform_pct       NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  -- Total
  total_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Status
  status             VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- status: pending | confirmed | paid | disputed
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENT HISTORY
-- (denormalized log for quick lookups)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id),
  booking_id      UUID REFERENCES bookings(id),
  event_type      VARCHAR(100) NOT NULL,
  -- event_type: booking_created | booking_completed | booking_cancelled | lead_captured
  event_data      JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL,  -- booking | client | driver | commission
  entity_id   UUID NOT NULL,
  action      VARCHAR(100) NOT NULL,
  actor_type  VARCHAR(50),            -- system | driver | admin
  actor_id    UUID,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEADS (from tablet passenger capture)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Attribution
  lead_source         VARCHAR(50) NOT NULL DEFAULT 'tablet',
  tablet_id           UUID REFERENCES tablets(id),
  driver_id           UUID REFERENCES drivers(id),
  company_id          UUID REFERENCES companies(id),
  tablet_code         VARCHAR(50),
  driver_code         VARCHAR(50),
  -- Lead data
  full_name           VARCHAR(255),
  phone               VARCHAR(50),
  email               VARCHAR(255),
  interested_package  VARCHAR(100),
  -- Conversion
  converted_to_client_id UUID REFERENCES clients(id),
  converted_at        TIMESTAMPTZ,
  -- Status
  status              VARCHAR(50) NOT NULL DEFAULT 'new',
  -- status: new | contacted | converted | dead
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_source_driver    ON clients(source_driver_id);
CREATE INDEX IF NOT EXISTS idx_clients_source_type      ON clients(source_type);
CREATE INDEX IF NOT EXISTS idx_bookings_client          ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_source_driver   ON bookings(source_driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_driver ON bookings(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status          ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_at       ON bookings(pickup_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_booking  ON dispatch_offers(booking_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_offers_driver   ON dispatch_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_commissions_booking      ON commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_commissions_source       ON commissions(source_driver_id);
CREATE INDEX IF NOT EXISTS idx_commissions_executor     ON commissions(executor_driver_id);
CREATE INDEX IF NOT EXISTS idx_leads_driver             ON leads(driver_id);
CREATE INDEX IF NOT EXISTS idx_leads_tablet             ON leads(tablet_id);

-- ============================================================
-- VIEW: source_driver_summary
-- Aggregated metrics per source driver
-- ============================================================
CREATE OR REPLACE VIEW source_driver_summary AS
SELECT
  d.id                                                          AS driver_id,
  d.full_name                                                   AS driver_name,
  d.driver_code,
  d.driver_status,
  -- Clients captured
  COUNT(DISTINCT c.id)                                          AS total_clients_captured,
  COUNT(DISTINCT CASE WHEN c.last_booking_at > NOW() - INTERVAL '90 days'
                      THEN c.id END)                           AS active_clients_captured,
  -- Repeat bookings
  COALESCE(SUM(c.total_bookings) - COUNT(DISTINCT c.id), 0)   AS repeat_bookings_count,
  -- Lifetime source earnings
  COALESCE(SUM(comm.source_amount), 0)                         AS lifetime_source_earnings,
  -- Monthly source earnings (current calendar month)
  COALESCE(SUM(CASE
    WHEN DATE_TRUNC('month', comm.created_at) = DATE_TRUNC('month', NOW())
    THEN comm.source_amount ELSE 0 END), 0)                    AS monthly_source_earnings,
  -- Pending offers
  COUNT(DISTINCT CASE WHEN b.status = 'offered' AND b.source_driver_id = d.id
                      THEN b.id END)                           AS pending_offers_count
FROM drivers d
LEFT JOIN clients c
  ON c.source_driver_id = d.id
LEFT JOIN bookings b
  ON b.client_id = c.id
LEFT JOIN commissions comm
  ON comm.source_driver_id = d.id
    AND comm.status IN ('confirmed', 'paid')
GROUP BY d.id, d.full_name, d.driver_code, d.driver_status;
