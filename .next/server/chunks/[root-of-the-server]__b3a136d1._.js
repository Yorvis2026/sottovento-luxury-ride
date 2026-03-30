module.exports=[93695,(e,o,r)=>{o.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,o,r)=>{o.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,o,r)=>{o.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,o,r)=>{o.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,o,r)=>{o.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,o,r)=>{o.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},58673,e=>{"use strict";function o(e,o){let r=[];if("airport_dropoff_mco"===o||"port_dropoff_canaveral"===o||""===o)return{eligible:!0,reasons:[],gate_type:"none"};let t=()=>{"active"!==e.vehicle_status&&r.push("inactive_vehicle"),"approved"!==e.city_permit_status&&r.push("city_permit_not_approved"),"approved"!==e.insurance_status&&r.push("insurance_expired"),"approved"!==e.registration_status&&r.push("registration_expired")};return"airport_pickup_mco"===o?(t(),"approved"!==e.airport_permit_mco_status&&r.push("missing_airport_permit_mco")):"port_pickup_canaveral"===o?(t(),"approved"!==e.port_permit_canaveral_status&&r.push("missing_port_permit_canaveral")):"airport_pickup_sfb"===o&&t(),{eligible:0===r.length,reasons:r,gate_type:o}}function r(e){if(!e)return"";let o=e.toUpperCase().trim();return"MCO"===o?"airport_pickup_mco":"PORT_CANAVERAL"===o?"port_pickup_canaveral":"SFB"===o?"airport_pickup_sfb":""}function t(e){return"airport_pickup_mco"===e||"port_pickup_canaveral"===e||"airport_pickup_sfb"===e}e.s(["checkVehicleEligibility",()=>o,"deriveServiceLocationType",()=>r,"requiresEligibilityGate",()=>t])},62257,e=>{"use strict";function o(e,o,r){let t,i,_,s,n,c;"boolean"==typeof o?(t=o?"__legacy_source__":null,i="__legacy_executor__"):(t=o??null,i=r??null),null!==t&&null!==i&&t===i?(_="self_capture_execute",s=20,n=80,c=0):null!==t&&null!==i&&t!==i?(_="network_reassigned_execute",s=20,n=15,c=65):(_="platform_direct_assign",s=25,n=0,c=75);let a=o=>parseFloat((e*o/100).toFixed(2));return{commission_model:_,platform_pct:s,platform_amount:a(s),source_pct:n,source_amount:n>0?a(n):null,executor_pct:c,executor_amount:a(c),total_amount:e}}function r(e,o,r){var t;let i,_=(t=new Date(r.pickup_at),i=new Date,(t.getTime()-i.getTime())/36e5<2?90:300);return e&&e.source_driver_id?o?!function(e,o){if("active"!==e.driver_status||!e.is_eligible||!e.service_types.includes(o))return!1;let r=new Date;return!(e.license_expires_at&&new Date(e.license_expires_at)<r||e.insurance_expires_at&&new Date(e.insurance_expires_at)<r)&&!0}(o,r.service_type)?{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:_,reason:`source_driver_ineligible:${o.driver_status}`}:{offer_source_first:!0,source_driver_id:o.id,timeout_secs:_,reason:"source_driver_priority"}:{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:_,reason:"source_driver_not_found"}:{offer_source_first:!1,source_driver_id:null,timeout_secs:_,reason:"no_source_driver"}}function t(e){let{ref_code:o,tablet_code:r,driver_code:t,source_type:i}=e,_=i??"direct";return r?_="tablet":(o||t)&&(_="qr"),{source_type:_,ref_code:o??null,tablet_code:r??null,driver_code:t??null}}function i(e,o){return null!==e?e:o??null}e.s(["calculateCommissions",()=>o,"getDispatchStrategy",()=>r,"guardSourceDriverId",()=>i,"resolveAttribution",()=>t],62257)},78934,25619,e=>{"use strict";var o=e.i(57747),r=e.i(62257);let t=(0,o.neon)(process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL);async function i(e){let o=await t`
    SELECT
      id,
      total_price,
      commission_model,
      commission_platform_pct,
      commission_source_pct,
      commission_executor_pct,
      commission_locked_at,
      ledger_posted_at,
      source_driver_id,
      executor_driver_id,
      source_type,
      source_reference,
      currency
    FROM bookings
    WHERE id = ${e}
    LIMIT 1
  `;if(0===o.length)return{ok:!1,already_posted:!1,rows_created:0,commission_model:"unknown",gross_booking_amount:0,rows:[],error:`Booking not found: ${e}`};let r=o[0];if(!r.commission_locked_at)return{ok:!1,already_posted:!1,rows_created:0,commission_model:r.commission_model??"unknown",gross_booking_amount:Number(r.total_price??0),rows:[],error:"Commission not yet locked. Ledger posting requires commission_locked_at IS NOT NULL."};if(r.ledger_posted_at)return{ok:!0,already_posted:!0,rows_created:0,commission_model:r.commission_model??"unknown",gross_booking_amount:Number(r.total_price??0),rows:[]};let i=Number(r.total_price??0),_=r.commission_model??"platform_direct_assign",s=Number(r.commission_platform_pct??20),n=Number(r.commission_source_pct??0),c=Number(r.commission_executor_pct??75),a=r.source_driver_id??null,u=r.executor_driver_id??null,m=r.source_type??null,d=r.source_reference??null,l=r.currency??"USD",p=[],g=e=>Math.round(100*e)/100;"self_capture_execute"===_?p.push({booking_id:e,earning_role:"source_driver",driver_id:a,gross_booking_amount:i,commission_model:_,pct_applied:n,amount_earned:g(i*n/100),currency:l,ledger_status:"posted",source_driver_id:a,executor_driver_id:u,source_type:m,source_reference:d}):("network_reassigned_execute"===_&&p.push({booking_id:e,earning_role:"source_driver",driver_id:a,gross_booking_amount:i,commission_model:_,pct_applied:n,amount_earned:g(i*n/100),currency:l,ledger_status:"posted",source_driver_id:a,executor_driver_id:u,source_type:m,source_reference:d}),p.push({booking_id:e,earning_role:"executor_driver",driver_id:u,gross_booking_amount:i,commission_model:_,pct_applied:c,amount_earned:g(i*c/100),currency:l,ledger_status:"posted",source_driver_id:a,executor_driver_id:u,source_type:m,source_reference:d})),p.push({booking_id:e,earning_role:"platform",driver_id:null,gross_booking_amount:i,commission_model:_,pct_applied:s,amount_earned:g(i*s/100),currency:l,ledger_status:"posted",source_driver_id:a,executor_driver_id:u,source_type:m,source_reference:d});let f=0;for(let e of p){let o=e.driver_id??null;!((await t`
      SELECT 1 FROM driver_earnings_ledger
      WHERE booking_id   = ${e.booking_id}::uuid
        AND earning_role = ${e.earning_role}
        AND (
          (driver_id IS NULL AND ${o}::uuid IS NULL)
          OR driver_id = ${o}::uuid
        )
      LIMIT 1
    `).length>0)&&(await t`
      INSERT INTO driver_earnings_ledger (
        booking_id, earning_role, driver_id,
        gross_booking_amount, commission_model,
        pct_applied, amount_earned, currency, ledger_status,
        source_driver_id, executor_driver_id,
        source_type, source_reference,
        posted_at
      ) VALUES (
        ${e.booking_id}::uuid,
        ${e.earning_role},
        ${e.driver_id??null},
        ${e.gross_booking_amount},
        ${e.commission_model},
        ${e.pct_applied},
        ${e.amount_earned},
        ${e.currency},
        ${e.ledger_status},
        ${e.source_driver_id??null},
        ${e.executor_driver_id??null},
        ${e.source_type},
        ${e.source_reference},
        NOW()
      )
      RETURNING id
    `).length>0&&f++}f>0&&await t`
      UPDATE bookings
        SET ledger_posted_at = NOW()
      WHERE id = ${e}::uuid
        AND ledger_posted_at IS NULL
    `;try{let o=p.filter(e=>"platform"!==e.earning_role).reduce((e,o)=>e+o.amount_earned,0),r=p.find(e=>"platform"===e.earning_role);await t`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, actor_type, new_data
      ) VALUES (
        'booking',
        ${e}::uuid,
        'ledger_posted',
        'system',
        ${JSON.stringify({commission_model:_,rows_created_count:f,total_platform_amount:r?.amount_earned??0,total_driver_amount:g(o),posted_at:new Date().toISOString()})}::jsonb
      )
    `}catch{}return{ok:!0,already_posted:!1,rows_created:f,commission_model:_,gross_booking_amount:i,rows:p.map(e=>({earning_role:e.earning_role,driver_id:e.driver_id,pct_applied:e.pct_applied,amount_earned:e.amount_earned}))}}e.s(["postBookingLedger",()=>i],25619);let _=(0,o.neon)(process.env.DATABASE_URL);async function s(e){let{booking_id:o,total_price:t,source_driver_id:s,executor_driver_id:n}=e,c=await _`
    SELECT commission_locked_at, commission_model,
           commission_platform_pct, commission_source_pct,
           commission_executor_pct
    FROM bookings
    WHERE id = ${o}::uuid
    LIMIT 1
  `;if(c[0]?.commission_locked_at!==null&&c[0]?.commission_locked_at!==void 0)return{locked:!1,commission_model:c[0].commission_model??"unknown",platform_pct:Number(c[0].commission_platform_pct??0),source_pct:Number(c[0].commission_source_pct??0),executor_pct:Number(c[0].commission_executor_pct??0),platform_amount:0,source_amount:null,executor_amount:0,total_amount:t,skipped_reason:"commission_already_locked"};let a=(0,r.calculateCommissions)(t,s,n),u=new Date().toISOString();await _`
    UPDATE bookings
    SET
      commission_model         = ${a.commission_model},
      commission_platform_pct  = ${a.platform_pct},
      commission_source_pct    = ${a.source_pct},
      commission_executor_pct  = ${a.executor_pct},
      commission_locked_at     = ${u}::timestamptz
    WHERE id = ${o}::uuid
      AND commission_locked_at IS NULL
  `,await _`
    INSERT INTO commissions (
      booking_id, source_driver_id, executor_driver_id,
      commission_model,
      executor_pct, executor_amount,
      source_pct,   source_amount,
      platform_pct, platform_amount,
      total_amount, status
    ) VALUES (
      ${o}::uuid,
      ${s}::uuid,
      ${n}::uuid,
      ${a.commission_model},
      ${a.executor_pct},  ${a.executor_amount},
      ${a.source_pct},    ${a.source_amount??null},
      ${a.platform_pct},  ${a.platform_amount},
      ${a.total_amount},  'confirmed'
    )
    ON CONFLICT (booking_id) DO UPDATE SET
      commission_model    = EXCLUDED.commission_model,
      executor_driver_id  = EXCLUDED.executor_driver_id,
      executor_pct        = EXCLUDED.executor_pct,
      executor_amount     = EXCLUDED.executor_amount,
      source_pct          = EXCLUDED.source_pct,
      source_amount       = EXCLUDED.source_amount,
      platform_pct        = EXCLUDED.platform_pct,
      platform_amount     = EXCLUDED.platform_amount,
      total_amount        = EXCLUDED.total_amount,
      status              = 'confirmed',
      updated_at          = NOW()
  `,await _`
    INSERT INTO booking_financial_attribution_snapshot (
      booking_id, source_driver_id, executor_driver_id,
      commission_model,
      commission_platform_pct, commission_source_pct, commission_executor_pct,
      total_booking_amount, platform_amount, source_amount, executor_amount
    ) VALUES (
      ${o}::uuid,
      ${s}::uuid,
      ${n}::uuid,
      ${a.commission_model},
      ${a.platform_pct}, ${a.source_pct}, ${a.executor_pct},
      ${a.total_amount}, ${a.platform_amount},
      ${a.source_amount??null}, ${a.executor_amount}
    )
    ON CONFLICT (booking_id) DO NOTHING
  `,console.log(`[commission-engine] locked — booking=${o} model=${a.commission_model} platform=${a.platform_pct}% source=${a.source_pct}% executor=${a.executor_pct}%`);try{let e=await i(o);e.ok&&!e.already_posted?console.log(`[commission-engine] ledger posted — booking=${o} rows=${e.rows_created} model=${e.commission_model}`):e.already_posted?console.log(`[commission-engine] ledger already posted — booking=${o}`):e.error&&console.warn(`[commission-engine] ledger post failed (non-blocking) — booking=${o}: ${e.error}`)}catch(e){console.warn(`[commission-engine] ledger post exception (non-blocking) — booking=${o}:`,e)}return{locked:!0,commission_model:a.commission_model,platform_pct:a.platform_pct,source_pct:a.source_pct,executor_pct:a.executor_pct,platform_amount:a.platform_amount,source_amount:a.source_amount,executor_amount:a.executor_amount,total_amount:a.total_amount}}e.s(["lockCommission",()=>s],78934)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__b3a136d1._.js.map