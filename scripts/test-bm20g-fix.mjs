// BM20-G Fix Validation — simulate webhook classification logic

function classify(metadata) {
  const capturedByRaw = (metadata.captured_by || metadata.source_code || '').trim().toUpperCase()
  const bookingOriginMeta = (metadata.booking_origin || '').trim().toLowerCase()
  const isWebsiteOrigin = bookingOriginMeta === 'website' || bookingOriginMeta === 'driver_referral' || bookingOriginMeta === ''
  const isTabletOrigin = bookingOriginMeta === 'tablet' || !!(metadata.tablet_code)
  const isDriverCaptured = !!(capturedByRaw && capturedByRaw !== 'PUBLIC_SITE') && isTabletOrigin
  const resolvedCapturedByCode = isTabletOrigin ? capturedByRaw : ''
  const poolDispatchFires = !resolvedCapturedByCode || resolvedCapturedByCode === 'PUBLIC_SITE'
  const driverAutoAssignFires = !poolDispatchFires && !!resolvedCapturedByCode

  return {
    capturedByRaw,
    bookingOriginMeta,
    isWebsiteOrigin,
    isTabletOrigin,
    isDriverCaptured,
    resolvedCapturedByCode: resolvedCapturedByCode || '(empty)',
    poolDispatchFires,
    driverAutoAssignFires,
  }
}

const tests = [
  {
    name: 'Website booking with ?ref=YHV001 (the broken case)',
    metadata: { captured_by: 'YHV001', booking_origin: 'driver_referral', source_code: 'YHV001' },
    expect: { poolDispatchFires: true, driverAutoAssignFires: false },
  },
  {
    name: 'Website booking without ref (pure organic)',
    metadata: { captured_by: 'public_site', booking_origin: 'website' },
    expect: { poolDispatchFires: true, driverAutoAssignFires: false },
  },
  {
    name: 'Website booking with empty booking_origin',
    metadata: { captured_by: 'YHV001', booking_origin: '' },
    expect: { poolDispatchFires: true, driverAutoAssignFires: false },
  },
  {
    name: 'Tablet booking (should still auto-assign to driver)',
    metadata: { captured_by: 'YHV001', booking_origin: 'tablet', tablet_code: 'TAB-SV-001' },
    expect: { poolDispatchFires: false, driverAutoAssignFires: true },
  },
  {
    name: 'Tablet booking without tablet_code but origin=tablet',
    metadata: { captured_by: 'IH002', booking_origin: 'tablet' },
    expect: { poolDispatchFires: false, driverAutoAssignFires: true },
  },
]

let passed = 0
let failed = 0

for (const test of tests) {
  const result = classify(test.metadata)
  const ok = result.poolDispatchFires === test.expect.poolDispatchFires &&
             result.driverAutoAssignFires === test.expect.driverAutoAssignFires
  
  const status = ok ? '✓ PASS' : '✗ FAIL'
  console.log(`${status} — ${test.name}`)
  if (!ok) {
    console.log(`  Expected: poolDispatch=${test.expect.poolDispatchFires}, driverAutoAssign=${test.expect.driverAutoAssignFires}`)
    console.log(`  Got:      poolDispatch=${result.poolDispatchFires}, driverAutoAssign=${result.driverAutoAssignFires}`)
    failed++
  } else {
    console.log(`  poolDispatch=${result.poolDispatchFires}, driverAutoAssign=${result.driverAutoAssignFires}, origin=${result.bookingOriginMeta}`)
    passed++
  }
}

console.log(`\nSUMMARY: ${passed}/${tests.length} tests passed`)
if (failed > 0) {
  console.log(`FAIL: ${failed} test(s) failed`)
  process.exit(1)
} else {
  console.log('ALL TESTS PASSED — BM20-G fix is correct')
}
