-- BM-SLN-APNS-TOKEN-NATIVE-REGISTER-FIX
-- Migration: Create driver_apns_tokens table for native iOS APNs tokens
-- Run this in Neon console or via drizzle-kit push

CREATE TABLE IF NOT EXISTS driver_apns_tokens (
  id          SERIAL PRIMARY KEY,
  driver_code TEXT NOT NULL,
  apns_token  TEXT NOT NULL,
  bundle_id   TEXT DEFAULT 'com.sottoventoluxuryride.driver',
  device_id   TEXT,
  environment TEXT DEFAULT 'production',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_code, apns_token)
);

CREATE INDEX IF NOT EXISTS idx_driver_apns_tokens_driver_code
  ON driver_apns_tokens(driver_code);

-- Verify
SELECT 'driver_apns_tokens table created/verified' AS status;
