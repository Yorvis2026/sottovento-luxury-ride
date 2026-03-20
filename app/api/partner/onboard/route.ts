import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET — Validate invite token and get prefilled data
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    const invites = await sql`
      SELECT * FROM partner_invites
      WHERE token = ${token}
        AND status != 'completed'
        AND status != 'expired'
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (invites.length === 0) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    const invite = invites[0];

    // Mark as opened
    await sql`
      UPDATE partner_invites SET status = 'opened' WHERE id = ${invite.id} AND status = 'sent'
    `;

    return NextResponse.json({ invite });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST — Complete onboarding (all steps)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      token,
      // Step 2 — Profile
      name,
      phone,
      email,
      company,
      type,
      // Step 3 — Tax Info
      legal_name,
      business_name,
      entity_type,
      tax_id_type,
      tax_id,
      address,
      // Step 4 — Agreement
      agreement_accepted
    } = body;

    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
    if (!agreement_accepted) return NextResponse.json({ error: "Agreement must be accepted" }, { status: 400 });

    // Validate invite
    const invites = await sql`
      SELECT * FROM partner_invites
      WHERE token = ${token}
        AND status != 'completed'
        AND status != 'expired'
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (invites.length === 0) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    const invite = invites[0];

    // Generate unique ref_code
    const baseCode = (name ?? "PARTNER")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 8);
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const ref_code = `${baseCode}${suffix}`;

    // Encrypt tax ID (basic base64 — production should use proper encryption)
    const tax_id_encrypted = tax_id
      ? Buffer.from(tax_id).toString("base64")
      : null;

    // Create partner
    const partnerResult = await sql`
      INSERT INTO partners (
        type, name, email, phone, status, ref_code, commission_rate
      ) VALUES (
        ${type ?? invite.type ?? "individual"},
        ${name},
        ${email ?? invite.email ?? null},
        ${phone ?? invite.phone ?? null},
        'active',
        ${ref_code},
        ${invite.commission_rate ?? 0.10}
      )
      RETURNING *
    `;

    const partner = partnerResult[0];

    // Create partner profile (KYC + Tax)
    await sql`
      INSERT INTO partner_profiles (
        partner_id, legal_name, business_name, entity_type,
        tax_id_type, tax_id_encrypted, address,
        w9_status, agreement_signed_at
      ) VALUES (
        ${partner.id},
        ${legal_name ?? name},
        ${business_name ?? company ?? null},
        ${entity_type ?? 'individual'},
        ${tax_id_type ?? 'SSN'},
        ${tax_id_encrypted},
        ${address ?? null},
        ${tax_id ? 'submitted' : 'pending'},
        NOW()
      )
    `;

    // Mark invite as completed
    await sql`
      UPDATE partner_invites SET status = 'completed' WHERE id = ${invite.id}
    `;

    // Send welcome email via Resend
    if (email && process.env.RESEND_API_KEY) {
      try {
        const partnerLink = `https://www.sottoventoluxuryride.com/partner/${ref_code}`;
        const referralLink = `https://www.sottoventoluxuryride.com/?ref=${ref_code}`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Sottovento Network <partners@sottoventoluxuryride.com>",
            to: [email],
            subject: "Welcome to Sottovento Partner Network — Your account is active",
            html: `
              <div style="font-family: Georgia, serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <p style="color: #C8A96A; letter-spacing: 4px; font-size: 12px; text-transform: uppercase; margin: 0;">SOTTOVENTO LUXURY NETWORK</p>
                  <h1 style="color: #ffffff; font-size: 28px; margin: 8px 0;">Welcome, ${name}!</h1>
                </div>
                <p style="color: #a0a0a0; line-height: 1.8;">
                  Your partner account is now <strong style="color: #4ade80;">active</strong>. 
                  Your referral code is <strong style="color: #C8A96A;">${ref_code}</strong>.
                </p>
                <div style="background: #1a1a1a; border: 1px solid #C8A96A33; padding: 20px; margin: 24px 0; border-radius: 4px;">
                  <p style="color: #C8A96A; font-size: 12px; letter-spacing: 2px; margin: 0 0 8px;">YOUR REFERRAL LINK</p>
                  <p style="color: #ffffff; word-break: break-all; margin: 0; font-size: 14px;">${referralLink}</p>
                </div>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${partnerLink}" style="background: #C8A96A; color: #0a0a0a; padding: 16px 40px; text-decoration: none; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; display: inline-block;">
                    View My Dashboard
                  </a>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center;">
                  Commission rate: ${Math.round(Number(invite.commission_rate ?? 0.10) * 100)}% per completed booking
                </p>
              </div>
            `
          })
        });
      } catch (emailError) {
        console.error("Welcome email error:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        ref_code: partner.ref_code,
        status: partner.status
      },
      partner_link: `https://www.sottoventoluxuryride.com/partner/${ref_code}`,
      referral_link: `https://www.sottoventoluxuryride.com/?ref=${ref_code}`
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
