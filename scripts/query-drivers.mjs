import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"

const envFile = readFileSync(".env.local", "utf8")
const env = {}
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=")
  if (key && rest.length) env[key.trim()] = rest.join("=").trim()
}

const sql = neon(env.DATABASE_URL_UNPOOLED)

// All drivers
const drivers = await sql`SELECT id, driver_code, full_name, email, phone, driver_status FROM drivers ORDER BY id DESC LIMIT 30`
console.log("=== DRIVERS ===")
console.log(JSON.stringify(drivers, null, 2))

// Tablets table columns
const tabletCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tablets' ORDER BY ordinal_position`
console.log("\n=== TABLETS COLUMNS ===", tabletCols.map(c => c.column_name).join(", "))

const tablets = await sql`SELECT * FROM tablets LIMIT 20`
console.log("\n=== TABLETS ===")
console.log(JSON.stringify(tablets, null, 2))

// Companies
const companies = await sql`SELECT id, name, slug FROM companies LIMIT 10`
console.log("\n=== COMPANIES ===")
console.log(JSON.stringify(companies, null, 2))
