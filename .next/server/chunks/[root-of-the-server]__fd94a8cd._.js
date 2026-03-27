module.exports=[93695,(e,o,r)=>{o.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,o,r)=>{o.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,o,r)=>{o.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,o,r)=>{o.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,o,r)=>{o.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,o,r)=>{o.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},41471,e=>{"use strict";function o(e,o,r){let t,i,s,_,n,c;"boolean"==typeof o?(t=o?"__legacy_source__":null,i="__legacy_executor__"):(t=o??null,i=r??null),null!==t&&null!==i&&t===i?(s="self_capture_execute",_=20,n=80,c=0):null!==t&&null!==i&&t!==i?(s="network_reassigned_execute",_=20,n=15,c=65):(s="platform_direct_assign",_=25,n=0,c=75);let u=o=>parseFloat((e*o/100).toFixed(2));return{commission_model:s,platform_pct:_,platform_amount:u(_),source_pct:n,source_amount:n>0?u(n):null,executor_pct:c,executor_amount:u(c),total_amount:e}}function r(e,o,r){var t;let i,s=(t=new Date(r.pickup_at),i=new Date,(t.getTime()-i.getTime())/36e5<2?90:300);return e&&e.source_driver_id?o?!function(e,o){if("active"!==e.driver_status||!e.is_eligible||!e.service_types.includes(o))return!1;let r=new Date;return!(e.license_expires_at&&new Date(e.license_expires_at)<r||e.insurance_expires_at&&new Date(e.insurance_expires_at)<r)&&!0}(o,r.service_type)?{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:s,reason:`source_driver_ineligible:${o.driver_status}`}:{offer_source_first:!0,source_driver_id:o.id,timeout_secs:s,reason:"source_driver_priority"}:{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:s,reason:"source_driver_not_found"}:{offer_source_first:!1,source_driver_id:null,timeout_secs:s,reason:"no_source_driver"}}function t(e){let{ref_code:o,tablet_code:r,driver_code:t,source_type:i}=e,s=i??"direct";return r?s="tablet":(o||t)&&(s="qr"),{source_type:s,ref_code:o??null,tablet_code:r??null,driver_code:t??null}}function i(e,o){return null!==e?e:o??null}e.s(["calculateCommissions",()=>o,"getDispatchStrategy",()=>r,"guardSourceDriverId",()=>i,"resolveAttribution",()=>t],41471)},91501,20622,e=>{"use strict";var o=e.i(70485),r=e.i(41471);let t=(0,o.neon)(process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL);async function i(e){let o=await t`
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
  `;if(0===o.length)return{ok:!1,already_posted:!1,rows_created:0,commission_model:"unknown",gross_booking_amount:0,rows:[],error:`Booking not found: ${e}`};let r=o[0];if(!r.commission_locked_at)return{ok:!1,already_posted:!1,rows_created:0,commission_model:r.commission_model??"unknown",gross_booking_amount:Number(r.total_price??0),rows:[],error:"Commission not yet locked. Ledger posting requires commission_locked_at IS NOT NULL."};if(r.ledger_posted_at)return{ok:!0,already_posted:!0,rows_created:0,commission_model:r.commission_model??"unknown",gross_booking_amount:Number(r.total_price??0),rows:[]};let i=Number(r.total_price??0),s=r.commission_model??"platform_direct_assign",_=Number(r.commission_platform_pct??20),n=Number(r.commission_source_pct??0),c=Number(r.commission_executor_pct??75),u=r.source_driver_id??null,a=r.executor_driver_id??null,m=r.source_type??null,d=r.source_reference??null,l=r.currency??"USD",p=[],g=e=>Math.round(100*e)/100;"self_capture_execute"===s?p.push({booking_id:e,earning_role:"source_driver",driver_id:u,gross_booking_amount:i,commission_model:s,pct_applied:n,amount_earned:g(i*n/100),currency:l,ledger_status:"posted",source_driver_id:u,executor_driver_id:a,source_type:m,source_reference:d}):("network_reassigned_execute"===s&&p.push({booking_id:e,earning_role:"source_driver",driver_id:u,gross_booking_amount:i,commission_model:s,pct_applied:n,amount_earned:g(i*n/100),currency:l,ledger_status:"posted",source_driver_id:u,executor_driver_id:a,source_type:m,source_reference:d}),p.push({booking_id:e,earning_role:"executor_driver",driver_id:a,gross_booking_amount:i,commission_model:s,pct_applied:c,amount_earned:g(i*c/100),currency:l,ledger_status:"posted",source_driver_id:u,executor_driver_id:a,source_type:m,source_reference:d})),p.push({booking_id:e,earning_role:"platform",driver_id:null,gross_booking_amount:i,commission_model:s,pct_applied:_,amount_earned:g(i*_/100),currency:l,ledger_status:"posted",source_driver_id:u,executor_driver_id:a,source_type:m,source_reference:d});let x=0;for(let e of p){let o=e.driver_id??null;!((await t`
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
    `).length>0&&x++}x>0&&await t`
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
        ${JSON.stringify({commission_model:s,rows_created_count:x,total_platform_amount:r?.amount_earned??0,total_driver_amount:g(o),posted_at:new Date().toISOString()})}::jsonb
      )
    `}catch{}return{ok:!0,already_posted:!1,rows_created:x,commission_model:s,gross_booking_amount:i,rows:p.map(e=>({earning_role:e.earning_role,driver_id:e.driver_id,pct_applied:e.pct_applied,amount_earned:e.amount_earned}))}}e.s(["postBookingLedger",()=>i],20622);let s=(0,o.neon)(process.env.DATABASE_URL);async function _(e){let{booking_id:o,total_price:t,source_driver_id:_,executor_driver_id:n}=e,c=await s`
    SELECT commission_locked_at, commission_model,
           commission_platform_pct, commission_source_pct,
           commission_executor_pct
    FROM bookings
    WHERE id = ${o}::uuid
    LIMIT 1
  `;if(c[0]?.commission_locked_at!==null&&c[0]?.commission_locked_at!==void 0)return{locked:!1,commission_model:c[0].commission_model??"unknown",platform_pct:Number(c[0].commission_platform_pct??0),source_pct:Number(c[0].commission_source_pct??0),executor_pct:Number(c[0].commission_executor_pct??0),platform_amount:0,source_amount:null,executor_amount:0,total_amount:t,skipped_reason:"commission_already_locked"};let u=(0,r.calculateCommissions)(t,_,n),a=new Date().toISOString();await s`
    UPDATE bookings
    SET
      commission_model         = ${u.commission_model},
      commission_platform_pct  = ${u.platform_pct},
      commission_source_pct    = ${u.source_pct},
      commission_executor_pct  = ${u.executor_pct},
      commission_locked_at     = ${a}::timestamptz
    WHERE id = ${o}::uuid
      AND commission_locked_at IS NULL
  `,await s`
    INSERT INTO commissions (
      booking_id, source_driver_id, executor_driver_id,
      commission_model,
      executor_pct, executor_amount,
      source_pct,   source_amount,
      platform_pct, platform_amount,
      total_amount, status
    ) VALUES (
      ${o}::uuid,
      ${_}::uuid,
      ${n}::uuid,
      ${u.commission_model},
      ${u.executor_pct},  ${u.executor_amount},
      ${u.source_pct},    ${u.source_amount??null},
      ${u.platform_pct},  ${u.platform_amount},
      ${u.total_amount},  'confirmed'
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
  `,await s`
    INSERT INTO booking_financial_attribution_snapshot (
      booking_id, source_driver_id, executor_driver_id,
      commission_model,
      commission_platform_pct, commission_source_pct, commission_executor_pct,
      total_booking_amount, platform_amount, source_amount, executor_amount
    ) VALUES (
      ${o}::uuid,
      ${_}::uuid,
      ${n}::uuid,
      ${u.commission_model},
      ${u.platform_pct}, ${u.source_pct}, ${u.executor_pct},
      ${u.total_amount}, ${u.platform_amount},
      ${u.source_amount??null}, ${u.executor_amount}
    )
    ON CONFLICT (booking_id) DO NOTHING
  `,console.log(`[commission-engine] locked — booking=${o} model=${u.commission_model} platform=${u.platform_pct}% source=${u.source_pct}% executor=${u.executor_pct}%`);try{let e=await i(o);e.ok&&!e.already_posted?console.log(`[commission-engine] ledger posted — booking=${o} rows=${e.rows_created} model=${e.commission_model}`):e.already_posted?console.log(`[commission-engine] ledger already posted — booking=${o}`):e.error&&console.warn(`[commission-engine] ledger post failed (non-blocking) — booking=${o}: ${e.error}`)}catch(e){console.warn(`[commission-engine] ledger post exception (non-blocking) — booking=${o}:`,e)}return{locked:!0,commission_model:u.commission_model,platform_pct:u.platform_pct,source_pct:u.source_pct,executor_pct:u.executor_pct,platform_amount:u.platform_amount,source_amount:u.source_amount,executor_amount:u.executor_amount,total_amount:u.total_amount}}e.s(["lockCommission",()=>_],91501)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__fd94a8cd._.js.map