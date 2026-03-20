import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

export async function GET() {
  try {
    // 1. partner_companies
    await sql`
      CREATE TABLE IF NOT EXISTS partner_companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        master_ref_code TEXT UNIQUE NOT NULL,
        commission_split_company NUMERIC(4,3) DEFAULT 0.10,
        commission_split_staff NUMERIC(4,3) DEFAULT 0.05,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 2. partners
    await sql`
      CREATE TABLE IF NOT EXISTS partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL CHECK (type IN ('hotel', 'valet', 'airbnb', 'influencer', 'staff')),
        parent_company_id UUID REFERENCES partner_companies(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'inactive')),
        ref_code TEXT UNIQUE NOT NULL,
        commission_rate NUMERIC(4,3) DEFAULT 0.10,
        last_activity_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 3. partner_invites
    await sql`
      CREATE TABLE IF NOT EXISTS partner_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
        type TEXT NOT NULL CHECK (type IN ('company', 'individual')),
        email TEXT,
        phone TEXT,
        prefilled_data JSONB DEFAULT '{}',
        commission_rate NUMERIC(4,3) DEFAULT 0.10,
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
        status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'completed', 'expired')),
        created_by_admin_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 4. partner_profiles (KYC + TAX)
    await sql`
      CREATE TABLE IF NOT EXISTS partner_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID UNIQUE REFERENCES partners(id) ON DELETE CASCADE,
        legal_name TEXT,
        business_name TEXT,
        entity_type TEXT CHECK (entity_type IN ('individual', 'sole_prop', 'llc', 'corp')),
        tax_id_type TEXT CHECK (tax_id_type IN ('SSN', 'EIN')),
        tax_id_encrypted TEXT,
        address TEXT,
        country TEXT DEFAULT 'US',
        w9_status TEXT DEFAULT 'pending' CHECK (w9_status IN ('pending', 'submitted', 'verified')),
        agreement_signed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 5. partner_payout_accounts (Fase 2 - Stripe)
    await sql`
      CREATE TABLE IF NOT EXISTS partner_payout_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
        provider TEXT DEFAULT 'stripe',
        account_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 6. partner_earnings
    await sql`
      CREATE TABLE IF NOT EXISTS partner_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        commission_rate NUMERIC(4,3) NOT NULL DEFAULT 0.10,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'void')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // 7. Agregar partner_id a bookings si no existe
    await sql`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL
    `;

    // 8. Agregar ref_code a bookings para tracking
    await sql`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS ref_code TEXT
    `;

    // 9. Índices para performance
    await sql`CREATE INDEX IF NOT EXISTS idx_partners_ref_code ON partners(ref_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner_id ON partner_earnings(partner_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_partner_earnings_booking_id ON partner_earnings(booking_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_partner_id ON bookings(partner_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_partner_invites_token ON partner_invites(token)`;

    return NextResponse.json({
      success: true,
      message: "Partner System tables created successfully",
      tables: [
        "partner_companies",
        "partners",
        "partner_invites",
        "partner_profiles",
        "partner_payout_accounts",
        "partner_earnings",
        "bookings.partner_id (column added)",
        "bookings.ref_code (column added)"
      ]
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
