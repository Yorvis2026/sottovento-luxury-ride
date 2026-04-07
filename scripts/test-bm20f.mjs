// BM20-F Proof test: simulate the server-side lead time validation logic
function getEasternOffset(ds, ts) {
  const naive = new Date(`${ds}T${ts}:00Z`)
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(naive)
  const get = (t) => etParts.find(p => p.type === t)?.value ?? '00'
  const etAsUtc = new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`)
  const offsetMs = naive.getTime() - etAsUtc.getTime()
  const offsetH = Math.round(offsetMs / 3600000)
  const sign = offsetH >= 0 ? '-' : '+'
  return `${sign}${Math.abs(offsetH).toString().padStart(2, '0')}:00`
}

function validateLeadTime(date, time) {
  const etOffset = getEasternOffset(date, time)
  const pickupAtISO = `${date}T${time}:00${etOffset}`
  const pickupMs = new Date(pickupAtISO).getTime()
  const nowMs = Date.now()
  const minLeadMs = 2 * 60 * 60 * 1000
  const leadMins = Math.floor((pickupMs - nowMs) / 60000)
  if (isNaN(pickupMs)) return { ok: false, tag: 'BM20F_INVALID_PICKUP_TIME', msg: 'Cannot parse datetime', pickup_at: pickupAtISO }
  if (pickupMs < nowMs) return { ok: false, tag: 'BM20F_INVALID_PICKUP_TIME', msg: 'Pickup in the past', pickup_at: pickupAtISO, lead_mins: leadMins }
  if (pickupMs - nowMs < minLeadMs) return { ok: false, tag: 'BM20F_LEADTIME_BLOCKED', msg: `Lead time ${leadMins}min < 120min`, pickup_at: pickupAtISO, lead_mins: leadMins }
  return { ok: true, tag: 'BM20F_OK', msg: `Lead time OK: ${leadMins}min`, pickup_at: pickupAtISO, lead_mins: leadMins }
}

const now = new Date()

// CASE 1: BLOCKED — today at 4:30 PM ET (simulating the production bug scenario)
const todayDate = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) // YYYY-MM-DD
const blockedResult = validateLeadTime(todayDate, '16:30')
console.log('CASE 1 (BLOCKED — 4:30 PM today):')
console.log('  ok:', blockedResult.ok)
console.log('  tag:', blockedResult.tag)
console.log('  msg:', blockedResult.msg)
console.log('  pickup_at:', blockedResult.pickup_at)
console.log('  lead_mins:', blockedResult.lead_mins)
console.log()

// CASE 2: VALID — tomorrow at 10:00 AM ET (well over 2h from now)
const tomorrow = new Date(now)
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowDate = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
const validResult = validateLeadTime(tomorrowDate, '10:00')
console.log('CASE 2 (VALID — tomorrow 10:00 AM ET):')
console.log('  ok:', validResult.ok)
console.log('  tag:', validResult.tag)
console.log('  msg:', validResult.msg)
console.log('  pickup_at:', validResult.pickup_at)
console.log('  lead_mins:', validResult.lead_mins)
console.log()

// CASE 3: BLOCKED — 30 minutes from now
const soon = new Date(Date.now() + 30 * 60 * 1000)
const soonDate = soon.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
const soonHH = String(soon.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false })).padStart(2, '0')
const soonMM = String(soon.getMinutes()).padStart(2, '0')
const soonTime = `${soonHH}:${soonMM}`
const soonResult = validateLeadTime(soonDate, soonTime)
console.log(`CASE 3 (BLOCKED — 30min from now, ${soonDate} ${soonTime} ET):`)
console.log('  ok:', soonResult.ok)
console.log('  tag:', soonResult.tag)
console.log('  msg:', soonResult.msg)
console.log('  pickup_at:', soonResult.pickup_at)
console.log('  lead_mins:', soonResult.lead_mins)
console.log()

// CASE 4: BLOCKED — past time (yesterday)
const yesterday = new Date(now)
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayDate = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
const pastResult = validateLeadTime(yesterdayDate, '14:00')
console.log('CASE 4 (BLOCKED — yesterday 2:00 PM ET):')
console.log('  ok:', pastResult.ok)
console.log('  tag:', pastResult.tag)
console.log('  msg:', pastResult.msg)
console.log('  pickup_at:', pastResult.pickup_at)
console.log('  lead_mins:', pastResult.lead_mins)
console.log()

// Summary
const results = [blockedResult, validResult, soonResult, pastResult]
const passed = results.filter((r, i) => {
  if (i === 1) return r.ok === true   // CASE 2 must be OK
  return r.ok === false               // CASES 1, 3, 4 must be blocked
})
console.log(`SUMMARY: ${passed.length}/4 tests passed`)
if (passed.length === 4) {
  console.log('ALL TESTS PASSED ✓')
} else {
  console.log('SOME TESTS FAILED ✗')
  process.exit(1)
}
