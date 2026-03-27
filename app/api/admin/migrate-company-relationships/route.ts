import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

// ============================================================
// GET /api/admin/migrate-company-relationships
//
// Idempotent DB migration — Architectural Convergence Phase 1
// SLN Affiliate Network Integration
//
// Adds to drivers:
//   company_id  UUID  nullable FK → partner_companies.id
//
// Adds to vehicles:
//   company_id  UUID  nullable FK → partner_companies.id
//
// Rule: a vehicle belongs to either driver_id OR company_id.
//   Neither is required simultaneously — both remain nullable.
//   Enforcement is handled at the application layer (not DB constraint)
//   to allow maximum flexibility during the transition period.
//
// Audit log action types added:
//   driver_assigned_to_company
//   vehicle_assigned_to_company
//   company_relationship_created
//
// Safe to run multiple times — ADD COLUMN IF NOT EXISTS is idempotent.
// ============================================================

type StepResult = { step: string; status: "ok" | "already_exists" | "error"; detail?: string };

async function runStep(
  steps: StepResult[],
  name: string,
  fn: () => Promise<any>
): Promise<void> {
  try {
    await fn();
    steps.push({ step: name, status: "ok" });
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate column") ||
      msg.includes("DuplicateColumn")
    ) {
      steps.push({ step: name, status: "already_exists" });
    } else {
      steps.push({ step: name, status: "error", detail: msg });
    }
  }
}

export async function GET() {
  const steps: StepResult[] = [];

  // ── Step 1: Add company_id to drivers ────────────────────
  await runStep(steps, "drivers.company_id", () =>
    sql`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS company_id UUID
          REFERENCES partner_companies(id) ON DELETE SET NULL
    `
  );

  // ── Step 2: Add company_id to vehicles ───────────────────
  await runStep(steps, "vehicles.company_id", () =>
    sql`
      ALTER TABLE vehicles
        ADD COLUMN IF NOT EXISTS company_id UUID
          REFERENCES partner_companies(id) ON DELETE SET NULL
    `
  );

  // ── Step 3: Index on drivers.company_id ──────────────────
  await runStep(steps, "idx_drivers_company_id", () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_drivers_company_id
        ON drivers(company_id)
        WHERE company_id IS NOT NULL
    `
  );

  // ── Step 4: Index on vehicles.company_id ─────────────────
  await runStep(steps, "idx_vehicles_company_id", () =>
    sql`
      CREATE INDEX IF NOT EXISTS idx_vehicles_company_id
        ON vehicles(company_id)
        WHERE company_id IS NOT NULL
    `
  );

  // ── Step 5: Verify final state ────────────────────────────
  const driverCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'drivers'
      AND column_name = 'company_id'
  `.catch(() => []);

  const vehicleCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'vehicles'
      AND column_name = 'company_id'
  `.catch(() => []);

  const driversHasCompanyId  = driverCols.length > 0;
  const vehiclesHasCompanyId = vehicleCols.length > 0;

  const allOk = steps.every(s => s.status === "ok" || s.status === "already_exists");

  return NextResponse.json({
    ok: allOk && driversHasCompanyId && vehiclesHasCompanyId,
    steps,
    verification: {
      drivers_has_company_id:  driversHasCompanyId,
      vehicles_has_company_id: vehiclesHasCompanyId,
    },
    message: allOk
      ? "✅ Phase 1 schema migration complete — company_id linked to drivers and vehicles"
      : "⚠️ Some steps failed — check steps array for details",
  });
}
