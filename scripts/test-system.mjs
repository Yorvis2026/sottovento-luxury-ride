import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"

const envFile = readFileSync(".env.local", "utf8")
const env = {}
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=")
  if (key && rest.length) env[key.trim()] = rest.join("=").trim()
}

const sql = neon(env.DATABASE_URL_UNPOOLED)

console.log("=== SOTTOVENTO SYSTEM TEST ===\n")

// 1. Verify driver exists
console.log("1. Checking driver TEST001 in DB...")
const drivers = await sql`SELECT id, driver_code, full_name, email, driver_status FROM drivers`
console.log(`   Found ${drivers.length} driver(s):`)
for (const d of drivers) {
  console.log(`   ✅ ${d.full_name} | Code: ${d.driver_code} | Status: ${d.driver_status}`)
}

// 2. Tablet URL
console.log("\n2. Tablet URLs:")
for (const d of drivers) {
  console.log(`   ✅ https://www.sottoventoluxuryride.com/tablet/${d.driver_code}`)
}

// 3. Check booking API fields
console.log("\n3. Checking booking API route fields...")
const bookingRouteContent = readFileSync("app/api/dispatch/create-booking/route.ts", "utf8")
const requiredMatch = bookingRouteContent.match(/Missing required fields[^"']*/g)
console.log(`   Required fields hint: ${requiredMatch?.[0] ?? "not found"}`)

// 4. Test booking API with correct fields
console.log("\n4. Testing booking API (correct fields)...")
try {
  const pickupDate = new Date(Date.now() + 86400000).toISOString()
  const res = await fetch("https://www.sottoventoluxuryride.com/api/dispatch/create-booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: "Test Passenger",
      phone: "+14073830647",
      email: "test@test.com",
      pickup_address: "Orlando International Airport, Orlando, FL",
      dropoff_address: "1002 McCully Ct, Oviedo, FL 32765",
      pickup_zone: "MCO",
      dropoff_zone: "OVIEDO",
      pickup_at: pickupDate,
      vehicle_type: "sedan",
      passengers: 2,
      luggage: 1,
      base_fare: 85,
      total_price: 85,
      source_driver_code: "TEST001",
      notes: "SYSTEM TEST - DELETE"
    })
  })
  const data = await res.json()
  if (res.ok) {
    console.log(`   ✅ Booking API OK: booking_id=${data.booking_id ?? data.id ?? "created"}`)
  } else {
    console.log(`   ⚠️  Booking API ${res.status}: ${JSON.stringify(data).substring(0, 300)}`)
  }
} catch(e) {
  console.log(`   ❌ Booking API error: ${e.message}`)
}

// 5. Test SMS API with correct field
console.log("\n5. Testing SMS API...")
try {
  const res = await fetch("https://www.sottoventoluxuryride.com/api/dispatch/test-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      to: "+14073830647",
      phone: "+14073830647",
      message: "Sottovento System Test: SMS working ✅" 
    })
  })
  const data = await res.json()
  if (res.ok) {
    console.log(`   ✅ SMS API OK: ${JSON.stringify(data).substring(0, 150)}`)
  } else {
    console.log(`   ⚠️  SMS API ${res.status}: ${JSON.stringify(data).substring(0, 300)}`)
  }
} catch(e) {
  console.log(`   ❌ SMS API error: ${e.message}`)
}

// 6. Test tablet page accessibility
console.log("\n6. Testing tablet page accessibility...")
try {
  const res = await fetch("https://www.sottoventoluxuryride.com/tablet/TEST001")
  console.log(`   /tablet/TEST001 → HTTP ${res.status} ${res.ok ? "✅" : "❌"}`)
  
  const res2 = await fetch("https://www.sottoventoluxuryride.com/tablet")
  console.log(`   /tablet → HTTP ${res2.status} ${res2.ok ? "✅" : "❌"}`)
  
  const res3 = await fetch("https://www.sottoventoluxuryride.com/driver")
  console.log(`   /driver → HTTP ${res3.status} ${res3.ok ? "✅" : "❌"}`)
} catch(e) {
  console.log(`   ❌ Page test error: ${e.message}`)
}

console.log("\n=== TEST COMPLETE ===")
