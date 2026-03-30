export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/dispatch/db";
import { sendLeadNotification } from "@/lib/email";

// ============================================================
// POST /api/dispatch/leads
// Captures passenger lead from tablet carousel
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      full_name,
      phone,
      email,
      driver_code,
      tablet_code,
      lead_source = "tablet",
      interested_package,
      destination,
      pickup_date,
      pickup_time,
    } = body;

    if (!full_name && !phone && !email) {
      return NextResponse.json(
        { error: "At least one contact field required (full_name, phone, or email)" },
        { status: 400 }
      );
    }

    // Resolve driver_id from driver_code if provided
    let driverId: string | null = null;
    if (driver_code) {
      const driver = await db.drivers.findByCode(driver_code);
      driverId = driver?.id ?? null;
    }

    const lead = await db.leads.create({
      lead_source,
      driver_id: driverId,
      tablet_code: tablet_code ?? null,
      driver_code: driver_code ?? null,
      full_name: full_name ?? null,
      phone: phone ?? null,
      email: email ?? null,
      interested_package: interested_package ?? destination ?? null,
    });

    // ---- Send email notification to admin (non-blocking) ----
    sendLeadNotification({
      name: full_name ?? undefined,
      phone: phone ?? undefined,
      email: email ?? undefined,
      driverCode: driver_code ?? undefined,
      tabletCode: tablet_code ?? undefined,
      package: interested_package ?? undefined,
      destination: destination ?? undefined,
      pickupDate: pickup_date ?? undefined,
      pickupTime: pickup_time ?? undefined,
    }).catch((err) => console.error("[leads] email notification failed:", err));

    return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 });
  } catch (err: any) {
    console.error("[api/dispatch/leads]", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err?.message },
      { status: 500 }
    );
  }
}
