export const dynamic = "force-dynamic"
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// POST — Send referral link to a client via email
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ref_code, contact, contact_type } = body;
    // contact_type: 'email' | 'phone'

    if (!ref_code || !contact) {
      return NextResponse.json({ error: "ref_code and contact required" }, { status: 400 });
    }

    // Validate partner
    const partners = await sql`
      SELECT id, name, ref_code FROM partners
      WHERE ref_code = ${ref_code.toUpperCase()} AND status = 'active'
      LIMIT 1
    `;

    if (partners.length === 0) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partner = partners[0];
    const referralLink = `https://www.sottoventoluxuryride.com/?ref=${partner.ref_code}`;

    if (contact_type === "email" && process.env.RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Sottovento Luxury Ride <reservations@sottoventoluxuryride.com>",
          to: [contact],
          subject: `${partner.name} has a special offer for you — Sottovento Luxury Ride`,
          html: `
            <div style="font-family: Georgia, serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 32px;">
                <p style="color: #C8A96A; letter-spacing: 4px; font-size: 12px; text-transform: uppercase; margin: 0;">SOTTOVENTO LUXURY RIDE</p>
                <h1 style="color: #ffffff; font-size: 24px; margin: 8px 0;">Premium Black Car Service</h1>
                <p style="color: #888; font-size: 14px;">Orlando's Finest Luxury Transportation</p>
              </div>
              <p style="color: #a0a0a0; line-height: 1.8;">
                ${partner.name} thought you'd enjoy our premium black car service in Orlando.
              </p>
              <p style="color: #a0a0a0; line-height: 1.8;">
                Airport transfers, hotel pickups, private tours, and more — all in luxury vehicles with professional chauffeurs.
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${referralLink}" style="background: #C8A96A; color: #0a0a0a; padding: 16px 40px; text-decoration: none; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; display: inline-block;">
                  Book Your Ride
                </a>
              </div>
              <p style="color: #555; font-size: 12px; text-align: center;">
                sottoventoluxuryride.com · Orlando, FL
              </p>
            </div>
          `
        })
      });

      if (!emailRes.ok) {
        const errData = await emailRes.json();
        return NextResponse.json({ error: "Email failed", details: errData }, { status: 500 });
      }

      return NextResponse.json({ success: true, method: "email", sent_to: contact });
    }

    // SMS — Phase 2 (Twilio)
    if (contact_type === "phone") {
      // Log the attempt for now
      await sql`
        INSERT INTO audit_logs (entity_type, entity_id, action, details)
        VALUES ('partner', ${partner.id}, 'quick_send_sms_attempt', ${JSON.stringify({ phone: contact, link: referralLink })})
      `;

      return NextResponse.json({
        success: false,
        method: "sms",
        message: "SMS sending coming soon. Please share the link manually.",
        link: referralLink
      });
    }

    return NextResponse.json({ error: "contact_type must be email or phone" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
