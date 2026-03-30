module.exports=[93695,(e,o,t)=>{o.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,o,t)=>{o.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,o,t)=>{o.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,o,t)=>{o.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,o,t)=>{o.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,o,t)=>{o.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},45209,e=>{"use strict";let o=(0,e.i(57747).neon)(process.env.DATABASE_URL);e.s(["db",0,{drivers:{findById:async e=>(await o`
      SELECT * FROM drivers WHERE id = ${e} LIMIT 1
    `)[0]??null,findByCode:async e=>(await o`
      SELECT * FROM drivers 
      WHERE driver_code = ${e} 
        AND driver_status = 'active'
      LIMIT 1
    `)[0]??null,findAvailable:async e=>await o`
      SELECT * FROM drivers
      WHERE driver_status = 'active'
        AND is_eligible = true
        AND ${e} = ANY(service_types)
        AND (license_expires_at IS NULL OR license_expires_at > NOW())
        AND (insurance_expires_at IS NULL OR insurance_expires_at > NOW())
      ORDER BY created_at ASC
    `},clients:{findById:async e=>(await o`
      SELECT * FROM clients WHERE id = ${e} LIMIT 1
    `)[0]??null,findByContact:async(e,t)=>e||t?(await o`
      SELECT * FROM clients
      WHERE (${e??null}::text IS NOT NULL AND phone = ${e??null})
         OR (${t??null}::text IS NOT NULL AND email = ${t??null})
      LIMIT 1
    `)[0]??null:null,create:async e=>(await o`
      INSERT INTO clients (
        full_name, phone, email,
        source_driver_id, source_type,
        tablet_id, company_id, ref_code,
        total_bookings, created_at, updated_at
      ) VALUES (
        ${e.full_name??null},
        ${e.phone??null},
        ${e.email??null},
        ${e.source_driver_id??null},
        ${e.source_type??"direct"},
        ${e.tablet_id??null},
        ${e.company_id??null},
        ${e.ref_code??null},
        0, NOW(), NOW()
      )
      RETURNING *
    `)[0],update:async(e,t)=>{await o`
      UPDATE clients
      SET
        total_bookings = COALESCE(${t.total_bookings??null}, total_bookings),
        last_booking_at = COALESCE(${t.last_booking_at??null}::timestamptz, last_booking_at),
        updated_at = NOW()
      WHERE id = ${e}
    `}},bookings:{create:async e=>(await o`
      INSERT INTO bookings (
        client_id, source_driver_id, service_type,
        pickup_address, dropoff_address,
        pickup_zone, dropoff_zone,
        vehicle_type,
        pickup_at,
        passengers, luggage, flight_number, notes,
        base_price, extras_price, total_price,
        stripe_session_id, payment_status, status,
        offer_timeout_secs, tracking_token, created_at, updated_at
      ) VALUES (
        ${e.client_id},
        ${e.source_driver_id??null},
        ${e.service_type},
        ${e.pickup_location??null},
        ${e.dropoff_location??null},
        ${e.pickup_zone??null},
        ${e.dropoff_zone??null},
        ${e.vehicle_type??"sedan"},
        ${e.pickup_at}::timestamptz,
        ${e.passengers??null},
        ${e.luggage??null},
        ${e.flight_number??null},
        ${e.notes??null},
        ${e.base_price},
        ${e.extras_price??0},
        ${e.total_price},
        ${e.stripe_session_id??null},
        ${e.payment_status??"pending"},
        ${e.status??"pending"},
        ${e.offer_timeout_secs??300},
        encode(gen_random_bytes(24), 'hex'),
        NOW(), NOW()
      )
      RETURNING *
    `)[0],update:async(e,t)=>{await o`
      UPDATE bookings
      SET
        status = COALESCE(${t.status??null}, status),
        assigned_driver_id = COALESCE(${t.assigned_driver_id??null}, assigned_driver_id),
        offer_sent_at = COALESCE(${t.offer_sent_at??null}::timestamptz, offer_sent_at),
        offer_accepted_at = COALESCE(${t.offer_accepted_at??null}::timestamptz, offer_accepted_at),
        completed_at = COALESCE(${t.completed_at??null}::timestamptz, completed_at),
        updated_at = NOW()
      WHERE id = ${e}
    `},findById:async e=>(await o`SELECT * FROM bookings WHERE id = ${e} LIMIT 1`)[0]??null},dispatchOffers:{create:async e=>(await o`
      INSERT INTO dispatch_offers (
        booking_id, driver_id, offer_round,
        is_source_offer, response, sent_at, expires_at
      ) VALUES (
        ${e.booking_id},
        ${e.driver_id},
        ${e.offer_round},
        ${e.is_source_offer},
        'pending',
        ${e.sent_at}::timestamptz,
        ${e.expires_at}::timestamptz
      )
      RETURNING *
    `)[0],findByBooking:async e=>await o`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
      ORDER BY offer_round ASC
    `,findPendingForBooking:async e=>(await o`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
        AND response = 'pending'
      ORDER BY offer_round ASC
      LIMIT 1
    `)[0]??null,update:async(e,t)=>{await o`
      UPDATE dispatch_offers
      SET
        response = COALESCE(${t.status??null}, response),
        responded_at = COALESCE(${t.responded_at??null}::timestamptz, responded_at)
      WHERE id = ${e}
    `}},commissions:{create:async e=>(await o`
      INSERT INTO commissions (
        booking_id, source_driver_id, executor_driver_id,
        executor_pct, executor_amount,
        source_pct, source_amount,
        platform_pct, platform_amount,
        total_amount, status, created_at
      ) VALUES (
        ${e.booking_id},
        ${e.source_driver_id??null},
        ${e.executor_driver_id??null},
        ${e.executor_pct},
        ${parseFloat((e.total_amount*e.executor_pct/100).toFixed(2))},
        ${e.source_pct??null},
        ${e.source_amount??null},
        ${e.platform_pct},
        ${e.platform_amount},
        ${e.total_amount},
        ${e.status??"pending"},
        NOW()
      )
      RETURNING *
    `)[0],confirm:async(e,t)=>{await o`
      UPDATE commissions
      SET
        executor_driver_id = ${t},
        executor_amount = total_amount * executor_pct / 100,
        status = 'confirmed'
      WHERE booking_id = ${e}
    `}},auditLogs:{create:async e=>{await o`
      INSERT INTO audit_logs (
        entity_type, entity_id, action,
        actor_type, actor_id,
        old_data, new_data, created_at
      ) VALUES (
        ${e.entity_type},
        ${e.entity_id}::uuid,
        ${e.action},
        ${e.actor_type??"system"},
        ${e.actor_id??null}::uuid,
        ${e.old_data?JSON.stringify(e.old_data):null}::jsonb,
        ${e.new_data?JSON.stringify(e.new_data):null}::jsonb,
        NOW()
      )
    `}},sourceSummary:{findByDriverId:async e=>(await o`
      SELECT * FROM source_driver_summary
      WHERE driver_id = ${e}
      LIMIT 1
    `)[0]??null,findAll:async()=>await o`
      SELECT * FROM source_driver_summary
      ORDER BY lifetime_source_earnings DESC
    `},leads:{create:async e=>(await o`
      INSERT INTO leads (
        lead_source, tablet_id, driver_id, company_id,
        tablet_code, driver_code,
        full_name, phone, email, interested_package,
        status, created_at, updated_at
      ) VALUES (
        ${e.lead_source??"tablet"},
        ${e.tablet_id??null}::uuid,
        ${e.driver_id??null}::uuid,
        ${e.company_id??null}::uuid,
        ${e.tablet_code??null},
        ${e.driver_code??null},
        ${e.full_name??null},
        ${e.phone??null},
        ${e.email??null},
        ${e.interested_package??null},
        'new', NOW(), NOW()
      )
      RETURNING *
    `)[0]}}])},62257,e=>{"use strict";function o(e,o,t){let r,i,n,s,_,a;"boolean"==typeof o?(r=o?"__legacy_source__":null,i="__legacy_executor__"):(r=o??null,i=t??null),null!==r&&null!==i&&r===i?(n="self_capture_execute",s=20,_=80,a=0):null!==r&&null!==i&&r!==i?(n="network_reassigned_execute",s=20,_=15,a=65):(n="platform_direct_assign",s=25,_=0,a=75);let c=o=>parseFloat((e*o/100).toFixed(2));return{commission_model:n,platform_pct:s,platform_amount:c(s),source_pct:_,source_amount:_>0?c(_):null,executor_pct:a,executor_amount:c(a),total_amount:e}}function t(e,o,t){var r;let i,n=(r=new Date(t.pickup_at),i=new Date,(r.getTime()-i.getTime())/36e5<2?90:300);return e&&e.source_driver_id?o?!function(e,o){if("active"!==e.driver_status||!e.is_eligible||!e.service_types.includes(o))return!1;let t=new Date;return!(e.license_expires_at&&new Date(e.license_expires_at)<t||e.insurance_expires_at&&new Date(e.insurance_expires_at)<t)&&!0}(o,t.service_type)?{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:n,reason:`source_driver_ineligible:${o.driver_status}`}:{offer_source_first:!0,source_driver_id:o.id,timeout_secs:n,reason:"source_driver_priority"}:{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:n,reason:"source_driver_not_found"}:{offer_source_first:!1,source_driver_id:null,timeout_secs:n,reason:"no_source_driver"}}function r(e){let{ref_code:o,tablet_code:t,driver_code:r,source_type:i}=e,n=i??"direct";return t?n="tablet":(o||r)&&(n="qr"),{source_type:n,ref_code:o??null,tablet_code:t??null,driver_code:r??null}}function i(e,o){return null!==e?e:o??null}e.s(["calculateCommissions",()=>o,"getDispatchStrategy",()=>t,"guardSourceDriverId",()=>i,"resolveAttribution",()=>r],62257)},78934,25619,e=>{"use strict";var o=e.i(57747),t=e.i(62257);let r=(0,o.neon)(process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL);async function i(e){let o=await r`
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
  `;if(0===o.length)return{ok:!1,already_posted:!1,rows_created:0,commission_model:"unknown",gross_booking_amount:0,rows:[],error:`Booking not found: ${e}`};let t=o[0];if(!t.commission_locked_at)return{ok:!1,already_posted:!1,rows_created:0,commission_model:t.commission_model??"unknown",gross_booking_amount:Number(t.total_price??0),rows:[],error:"Commission not yet locked. Ledger posting requires commission_locked_at IS NOT NULL."};if(t.ledger_posted_at)return{ok:!0,already_posted:!0,rows_created:0,commission_model:t.commission_model??"unknown",gross_booking_amount:Number(t.total_price??0),rows:[]};let i=Number(t.total_price??0),n=t.commission_model??"platform_direct_assign",s=Number(t.commission_platform_pct??20),_=Number(t.commission_source_pct??0),a=Number(t.commission_executor_pct??75),c=t.source_driver_id??null,u=t.executor_driver_id??null,d=t.source_type??null,l=t.source_reference??null,m=t.currency??"USD",p=[],g=e=>Math.round(100*e)/100;"self_capture_execute"===n?p.push({booking_id:e,earning_role:"source_driver",driver_id:c,gross_booking_amount:i,commission_model:n,pct_applied:_,amount_earned:g(i*_/100),currency:m,ledger_status:"posted",source_driver_id:c,executor_driver_id:u,source_type:d,source_reference:l}):("network_reassigned_execute"===n&&p.push({booking_id:e,earning_role:"source_driver",driver_id:c,gross_booking_amount:i,commission_model:n,pct_applied:_,amount_earned:g(i*_/100),currency:m,ledger_status:"posted",source_driver_id:c,executor_driver_id:u,source_type:d,source_reference:l}),p.push({booking_id:e,earning_role:"executor_driver",driver_id:u,gross_booking_amount:i,commission_model:n,pct_applied:a,amount_earned:g(i*a/100),currency:m,ledger_status:"posted",source_driver_id:c,executor_driver_id:u,source_type:d,source_reference:l})),p.push({booking_id:e,earning_role:"platform",driver_id:null,gross_booking_amount:i,commission_model:n,pct_applied:s,amount_earned:g(i*s/100),currency:m,ledger_status:"posted",source_driver_id:c,executor_driver_id:u,source_type:d,source_reference:l});let f=0;for(let e of p){let o=e.driver_id??null;!((await r`
      SELECT 1 FROM driver_earnings_ledger
      WHERE booking_id   = ${e.booking_id}::uuid
        AND earning_role = ${e.earning_role}
        AND (
          (driver_id IS NULL AND ${o}::uuid IS NULL)
          OR driver_id = ${o}::uuid
        )
      LIMIT 1
    `).length>0)&&(await r`
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
    `).length>0&&f++}f>0&&await r`
      UPDATE bookings
        SET ledger_posted_at = NOW()
      WHERE id = ${e}::uuid
        AND ledger_posted_at IS NULL
    `;try{let o=p.filter(e=>"platform"!==e.earning_role).reduce((e,o)=>e+o.amount_earned,0),t=p.find(e=>"platform"===e.earning_role);await r`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, actor_type, new_data
      ) VALUES (
        'booking',
        ${e}::uuid,
        'ledger_posted',
        'system',
        ${JSON.stringify({commission_model:n,rows_created_count:f,total_platform_amount:t?.amount_earned??0,total_driver_amount:g(o),posted_at:new Date().toISOString()})}::jsonb
      )
    `}catch{}return{ok:!0,already_posted:!1,rows_created:f,commission_model:n,gross_booking_amount:i,rows:p.map(e=>({earning_role:e.earning_role,driver_id:e.driver_id,pct_applied:e.pct_applied,amount_earned:e.amount_earned}))}}e.s(["postBookingLedger",()=>i],25619);let n=(0,o.neon)(process.env.DATABASE_URL);async function s(e){let{booking_id:o,total_price:r,source_driver_id:s,executor_driver_id:_}=e,a=await n`
    SELECT commission_locked_at, commission_model,
           commission_platform_pct, commission_source_pct,
           commission_executor_pct
    FROM bookings
    WHERE id = ${o}::uuid
    LIMIT 1
  `;if(a[0]?.commission_locked_at!==null&&a[0]?.commission_locked_at!==void 0)return{locked:!1,commission_model:a[0].commission_model??"unknown",platform_pct:Number(a[0].commission_platform_pct??0),source_pct:Number(a[0].commission_source_pct??0),executor_pct:Number(a[0].commission_executor_pct??0),platform_amount:0,source_amount:null,executor_amount:0,total_amount:r,skipped_reason:"commission_already_locked"};let c=(0,t.calculateCommissions)(r,s,_),u=new Date().toISOString();await n`
    UPDATE bookings
    SET
      commission_model         = ${c.commission_model},
      commission_platform_pct  = ${c.platform_pct},
      commission_source_pct    = ${c.source_pct},
      commission_executor_pct  = ${c.executor_pct},
      commission_locked_at     = ${u}::timestamptz
    WHERE id = ${o}::uuid
      AND commission_locked_at IS NULL
  `,await n`
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
      ${_}::uuid,
      ${c.commission_model},
      ${c.executor_pct},  ${c.executor_amount},
      ${c.source_pct},    ${c.source_amount??null},
      ${c.platform_pct},  ${c.platform_amount},
      ${c.total_amount},  'confirmed'
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
  `,await n`
    INSERT INTO booking_financial_attribution_snapshot (
      booking_id, source_driver_id, executor_driver_id,
      commission_model,
      commission_platform_pct, commission_source_pct, commission_executor_pct,
      total_booking_amount, platform_amount, source_amount, executor_amount
    ) VALUES (
      ${o}::uuid,
      ${s}::uuid,
      ${_}::uuid,
      ${c.commission_model},
      ${c.platform_pct}, ${c.source_pct}, ${c.executor_pct},
      ${c.total_amount}, ${c.platform_amount},
      ${c.source_amount??null}, ${c.executor_amount}
    )
    ON CONFLICT (booking_id) DO NOTHING
  `,console.log(`[commission-engine] locked — booking=${o} model=${c.commission_model} platform=${c.platform_pct}% source=${c.source_pct}% executor=${c.executor_pct}%`);try{let e=await i(o);e.ok&&!e.already_posted?console.log(`[commission-engine] ledger posted — booking=${o} rows=${e.rows_created} model=${e.commission_model}`):e.already_posted?console.log(`[commission-engine] ledger already posted — booking=${o}`):e.error&&console.warn(`[commission-engine] ledger post failed (non-blocking) — booking=${o}: ${e.error}`)}catch(e){console.warn(`[commission-engine] ledger post exception (non-blocking) — booking=${o}:`,e)}return{locked:!0,commission_model:c.commission_model,platform_pct:c.platform_pct,source_pct:c.source_pct,executor_pct:c.executor_pct,platform_amount:c.platform_amount,source_amount:c.source_amount,executor_amount:c.executor_amount,total_amount:c.total_amount}}e.s(["lockCommission",()=>s],78934)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__6d348030._.js.map