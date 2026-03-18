import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"

const envFile = readFileSync(".env.local", "utf8")
const env = {}
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=")
  if (key && rest.length) env[key.trim()] = rest.join("=").trim()
}

const sql = neon(env.DATABASE_URL_UNPOOLED)

const [d] = await sql`SELECT COUNT(*) as n FROM drivers`
const [c] = await sql`SELECT COUNT(*) as n FROM clients`
const [co] = await sql`SELECT COUNT(*) as n FROM companies`
const [b] = await sql`SELECT COUNT(*) as n FROM bookings`
const [l] = await sql`SELECT COUNT(*) as n FROM leads`
const [a] = await sql`SELECT COUNT(*) as n FROM audit_logs`

console.log(`drivers: ${d.n}, clients: ${c.n}, companies: ${co.n}, bookings: ${b.n}, leads: ${l.n}, audit_logs: ${a.n}`)

// Check the admin API routes to understand how drivers are created
