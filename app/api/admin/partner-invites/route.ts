export const dynamic = "force-dynamic"
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// GET — List all invites
export async function GET() {
  try {
    const invites = await sql`
      SELECT
        id,
        token,
        type,
        email,
        phone,
        prefilled_data,
        commission_rate,
        expires_at,
        status,
        created_at
      FROM partner_invites
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ invites });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST — Create a new invite and optionally send email
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, email, phone, prefilled_data, commission_rate, send_email } = body;

    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

    // Create invite record
    const result = await sql`
      INSERT INTO partner_invites (type, email, phone, prefilled_data, commission_rate)
      VALUES (
        ${type},
        ${email ?? null},
        ${phone ?? null},
        ${JSON.stringify(prefilled_data ?? {})},
        ${commission_rate ?? 0.10}
      )
      RETURNING *
    `;

    const invite = result[0];
    const inviteLink = `https://www.sottoventoluxuryride.com/partner/invite/${invite.token}`;

    // Send email via Resend if requested and email is provided
    if (send_email && email && process.env.RESEND_API_KEY) {
      try {
        const partnerName = prefilled_data?.name ?? "Partner";
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Sottovento Network <partners@sottoventoluxuryride.com>",
            to: [email],
            subject: "You're invited to join Sottovento Partner Network",
            html: `
              <div style="font-family: Georgia, serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <p style="color: #C8A96A; letter-spacing: 4px; font-size: 12px; text-transform: uppercase; margin: 0;">SOTTOVENTO LUXURY NETWORK</p>
                  <h1 style="color: #ffffff; font-size: 28px; margin: 8px 0;">Partner Invitation</h1>
                </div>
                <p style="color: #a0a0a0; line-height: 1.8;">Dear ${partnerName},</p>
                <p style="color: #a0a0a0; line-height: 1.8;">
                  You have been invited to join the <strong style="color: #C8A96A;">Sottovento Partner Network</strong> — 
                  Orlando's premier luxury transportation referral program.
                </p>
                <p style="color: #a0a0a0; line-height: 1.8;">
                  As a partner, you'll earn <strong style="color: #C8A96A;">${Math.round((commission_rate ?? 0.10) * 100)}% commission</strong> 
                  on every booking you generate.
                </p>
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${inviteLink}" style="background: #C8A96A; color: #0a0a0a; padding: 16px 40px; text-decoration: none; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; display: inline-block;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center;">
                  This invitation expires in 7 days.<br>
                  ${inviteLink}
                </p>
              </div>
            `
          })
        });

        if (emailRes.ok) {
          await sql`
            UPDATE partner_invites SET status = 'sent' WHERE id = ${invite.id}
          `;
        }
      } catch (emailError) {
        console.error("Email send error:", emailError);
        // Don't fail the invite creation if email fails
      }
    }

    return NextResponse.json({
      invite,
      invite_link: inviteLink
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH — Mark invite as opened/expired
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    await sql`
      UPDATE partner_invites SET status = ${status} WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
