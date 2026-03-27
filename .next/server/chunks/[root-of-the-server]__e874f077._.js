module.exports=[93695,(e,t,o)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,o)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,o)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,o)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,o)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,o)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},41471,e=>{"use strict";function t(e,t,o){let r,i,n,s,a,d;"boolean"==typeof t?(r=t?"__legacy_source__":null,i="__legacy_executor__"):(r=t??null,i=o??null),null!==r&&null!==i&&r===i?(n="self_capture_execute",s=20,a=80,d=0):null!==r&&null!==i&&r!==i?(n="network_reassigned_execute",s=20,a=15,d=65):(n="platform_direct_assign",s=25,a=0,d=75);let _=t=>parseFloat((e*t/100).toFixed(2));return{commission_model:n,platform_pct:s,platform_amount:_(s),source_pct:a,source_amount:a>0?_(a):null,executor_pct:d,executor_amount:_(d),total_amount:e}}function o(e,t,o){var r;let i,n=(r=new Date(o.pickup_at),i=new Date,(r.getTime()-i.getTime())/36e5<2?90:300);return e&&e.source_driver_id?t?!function(e,t){if("active"!==e.driver_status||!e.is_eligible||!e.service_types.includes(t))return!1;let o=new Date;return!(e.license_expires_at&&new Date(e.license_expires_at)<o||e.insurance_expires_at&&new Date(e.insurance_expires_at)<o)&&!0}(t,o.service_type)?{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:n,reason:`source_driver_ineligible:${t.driver_status}`}:{offer_source_first:!0,source_driver_id:t.id,timeout_secs:n,reason:"source_driver_priority"}:{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:n,reason:"source_driver_not_found"}:{offer_source_first:!1,source_driver_id:null,timeout_secs:n,reason:"no_source_driver"}}function r(e){let{ref_code:t,tablet_code:o,driver_code:r,source_type:i}=e,n=i??"direct";return o?n="tablet":(t||r)&&(n="qr"),{source_type:n,ref_code:t??null,tablet_code:o??null,driver_code:r??null}}function i(e,t){return null!==e?e:t??null}e.s(["calculateCommissions",()=>t,"getDispatchStrategy",()=>o,"guardSourceDriverId",()=>i,"resolveAttribution",()=>r],41471)},91501,20622,e=>{"use strict";var t=e.i(70485),o=e.i(41471);let r=(0,t.neon)(process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL);async function i(e){let t=await r`
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
  `;if(0===t.length)return{ok:!1,already_posted:!1,rows_created:0,commission_model:"unknown",gross_booking_amount:0,rows:[],error:`Booking not found: ${e}`};let o=t[0];if(!o.commission_locked_at)return{ok:!1,already_posted:!1,rows_created:0,commission_model:o.commission_model??"unknown",gross_booking_amount:Number(o.total_price??0),rows:[],error:"Commission not yet locked. Ledger posting requires commission_locked_at IS NOT NULL."};if(o.ledger_posted_at)return{ok:!0,already_posted:!0,rows_created:0,commission_model:o.commission_model??"unknown",gross_booking_amount:Number(o.total_price??0),rows:[]};let i=Number(o.total_price??0),n=o.commission_model??"platform_direct_assign",s=Number(o.commission_platform_pct??20),a=Number(o.commission_source_pct??0),d=Number(o.commission_executor_pct??75),_=o.source_driver_id??null,c=o.executor_driver_id??null,u=o.source_type??null,l=o.source_reference??null,m=o.currency??"USD",p=[],g=e=>Math.round(100*e)/100;"self_capture_execute"===n?p.push({booking_id:e,earning_role:"source_driver",driver_id:_,gross_booking_amount:i,commission_model:n,pct_applied:a,amount_earned:g(i*a/100),currency:m,ledger_status:"posted",source_driver_id:_,executor_driver_id:c,source_type:u,source_reference:l}):("network_reassigned_execute"===n&&p.push({booking_id:e,earning_role:"source_driver",driver_id:_,gross_booking_amount:i,commission_model:n,pct_applied:a,amount_earned:g(i*a/100),currency:m,ledger_status:"posted",source_driver_id:_,executor_driver_id:c,source_type:u,source_reference:l}),p.push({booking_id:e,earning_role:"executor_driver",driver_id:c,gross_booking_amount:i,commission_model:n,pct_applied:d,amount_earned:g(i*d/100),currency:m,ledger_status:"posted",source_driver_id:_,executor_driver_id:c,source_type:u,source_reference:l})),p.push({booking_id:e,earning_role:"platform",driver_id:null,gross_booking_amount:i,commission_model:n,pct_applied:s,amount_earned:g(i*s/100),currency:m,ledger_status:"posted",source_driver_id:_,executor_driver_id:c,source_type:u,source_reference:l});let E=0;for(let e of p){let t=e.driver_id??null;!((await r`
      SELECT 1 FROM driver_earnings_ledger
      WHERE booking_id   = ${e.booking_id}::uuid
        AND earning_role = ${e.earning_role}
        AND (
          (driver_id IS NULL AND ${t}::uuid IS NULL)
          OR driver_id = ${t}::uuid
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
    `).length>0&&E++}E>0&&await r`
      UPDATE bookings
        SET ledger_posted_at = NOW()
      WHERE id = ${e}::uuid
        AND ledger_posted_at IS NULL
    `;try{let t=p.filter(e=>"platform"!==e.earning_role).reduce((e,t)=>e+t.amount_earned,0),o=p.find(e=>"platform"===e.earning_role);await r`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, actor_type, new_data
      ) VALUES (
        'booking',
        ${e}::uuid,
        'ledger_posted',
        'system',
        ${JSON.stringify({commission_model:n,rows_created_count:E,total_platform_amount:o?.amount_earned??0,total_driver_amount:g(t),posted_at:new Date().toISOString()})}::jsonb
      )
    `}catch{}return{ok:!0,already_posted:!1,rows_created:E,commission_model:n,gross_booking_amount:i,rows:p.map(e=>({earning_role:e.earning_role,driver_id:e.driver_id,pct_applied:e.pct_applied,amount_earned:e.amount_earned}))}}e.s(["postBookingLedger",()=>i],20622);let n=(0,t.neon)(process.env.DATABASE_URL);async function s(e){let{booking_id:t,total_price:r,source_driver_id:s,executor_driver_id:a}=e,d=await n`
    SELECT commission_locked_at, commission_model,
           commission_platform_pct, commission_source_pct,
           commission_executor_pct
    FROM bookings
    WHERE id = ${t}::uuid
    LIMIT 1
  `;if(d[0]?.commission_locked_at!==null&&d[0]?.commission_locked_at!==void 0)return{locked:!1,commission_model:d[0].commission_model??"unknown",platform_pct:Number(d[0].commission_platform_pct??0),source_pct:Number(d[0].commission_source_pct??0),executor_pct:Number(d[0].commission_executor_pct??0),platform_amount:0,source_amount:null,executor_amount:0,total_amount:r,skipped_reason:"commission_already_locked"};let _=(0,o.calculateCommissions)(r,s,a),c=new Date().toISOString();await n`
    UPDATE bookings
    SET
      commission_model         = ${_.commission_model},
      commission_platform_pct  = ${_.platform_pct},
      commission_source_pct    = ${_.source_pct},
      commission_executor_pct  = ${_.executor_pct},
      commission_locked_at     = ${c}::timestamptz
    WHERE id = ${t}::uuid
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
      ${t}::uuid,
      ${s}::uuid,
      ${a}::uuid,
      ${_.commission_model},
      ${_.executor_pct},  ${_.executor_amount},
      ${_.source_pct},    ${_.source_amount??null},
      ${_.platform_pct},  ${_.platform_amount},
      ${_.total_amount},  'confirmed'
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
      ${t}::uuid,
      ${s}::uuid,
      ${a}::uuid,
      ${_.commission_model},
      ${_.platform_pct}, ${_.source_pct}, ${_.executor_pct},
      ${_.total_amount}, ${_.platform_amount},
      ${_.source_amount??null}, ${_.executor_amount}
    )
    ON CONFLICT (booking_id) DO NOTHING
  `,console.log(`[commission-engine] locked — booking=${t} model=${_.commission_model} platform=${_.platform_pct}% source=${_.source_pct}% executor=${_.executor_pct}%`);try{let e=await i(t);e.ok&&!e.already_posted?console.log(`[commission-engine] ledger posted — booking=${t} rows=${e.rows_created} model=${e.commission_model}`):e.already_posted?console.log(`[commission-engine] ledger already posted — booking=${t}`):e.error&&console.warn(`[commission-engine] ledger post failed (non-blocking) — booking=${t}: ${e.error}`)}catch(e){console.warn(`[commission-engine] ledger post exception (non-blocking) — booking=${t}:`,e)}return{locked:!0,commission_model:_.commission_model,platform_pct:_.platform_pct,source_pct:_.source_pct,executor_pct:_.executor_pct,platform_amount:_.platform_amount,source_amount:_.source_amount,executor_amount:_.executor_amount,total_amount:_.total_amount}}e.s(["lockCommission",()=>s],91501)},96148,e=>{"use strict";var t=e.i(66574),o=e.i(58350),r=e.i(10732),i=e.i(12768),n=e.i(75089),s=e.i(11299),a=e.i(66012),d=e.i(12480),_=e.i(64629),c=e.i(2078),u=e.i(99591),l=e.i(65698),m=e.i(29809),p=e.i(64157),g=e.i(56534),E=e.i(93695);e.i(22981);var v=e.i(4706),f=e.i(16770),x=e.i(70485),k=e.i(91501),R=e.i(20622);let b=(0,x.neon)(process.env.DATABASE_URL_UNPOOLED);async function w(e){if("SLN_ADMIN_2026"!==e.headers.get("x-admin-key"))return f.NextResponse.json({error:"Unauthorized"},{status:401});let t=await e.json().catch(()=>({})),o=t.driver_code??"YHV001",r=!0===t.cleanup,i=Number(t.total_price??250),n={},s=null;try{let[e]=await b`
      SELECT id, driver_code, full_name
      FROM drivers
      WHERE driver_code = ${o.toUpperCase()}
      LIMIT 1
    `;if(!e)return f.NextResponse.json({error:`Driver not found: ${o}`},{status:404});n.driver={id:e.id,code:e.driver_code,name:e.full_name};let[t]=await b`
      INSERT INTO clients (full_name, phone, source_driver_id, source_type)
      VALUES ('Test Client SLN', '+1-000-000-0000', ${e.id}::uuid, 'direct')
      RETURNING id, full_name
    `;n.client={id:t.id,name:t.full_name};let[a]=await b`
      INSERT INTO bookings (
        client_id,
        source_driver_id,
        executor_driver_id,
        assigned_driver_id,
        source_type,
        pickup_address,
        dropoff_address,
        pickup_at,
        vehicle_type,
        service_type,
        trip_type,
        total_price,
        currency,
        status,
        payment_status
      ) VALUES (
        ${t.id}::uuid,
        ${e.id}::uuid,
        ${e.id}::uuid,
        ${e.id}::uuid,
        'direct',
        'MCO Airport — Test',
        'Oviedo FL — Test',
        NOW() - INTERVAL '2 hours',
        'SUV',
        'transfer',
        'oneway',
        ${i},
        'USD',
        'in_progress',
        'paid'
      )
      RETURNING id, status, total_price, source_driver_id, executor_driver_id
    `;s=a.id,n.booking_created={id:a.id,status:a.status,total_price:Number(a.total_price),source_driver_id:a.source_driver_id,executor_driver_id:a.executor_driver_id},await b`
      UPDATE bookings
      SET status = 'completed', updated_at = NOW()
      WHERE id = ${s}::uuid
    `,n.booking_completed="ok",n.commission_locked=await (0,k.lockCommission)({booking_id:s,total_price:i,source_driver_id:e.id,executor_driver_id:e.id}),n.ledger_posted=await (0,R.postBookingLedger)(s);let[d]=await b`
      SELECT
        id, status, commission_locked_at, ledger_posted_at,
        commission_model, commission_platform_pct,
        commission_source_pct, commission_executor_pct
      FROM bookings
      WHERE id = ${s}::uuid
    `;n.booking_verified={status:d.status,commission_locked_at:d.commission_locked_at,ledger_posted_at:d.ledger_posted_at,commission_model:d.commission_model,platform_pct:d.commission_platform_pct,source_pct:d.commission_source_pct,executor_pct:d.commission_executor_pct};let _=await b`
      SELECT earning_role, driver_id, amount_earned, pct_applied, ledger_status
      FROM driver_earnings_ledger
      WHERE booking_id = ${s}::uuid
      ORDER BY earning_role
    `;n.ledger_rows=_.map(e=>({earning_role:e.earning_role,driver_id:e.driver_id,amount_earned:Number(e.amount_earned),pct_applied:Number(e.pct_applied),ledger_status:e.ledger_status}));let[c]=await b`
      SELECT
        COALESCE(SUM(amount_earned) FILTER (WHERE ledger_status = 'posted'), 0) AS unpaid_balance,
        COALESCE(SUM(amount_earned), 0) AS total_lifetime_earnings
      FROM driver_earnings_ledger
      WHERE driver_id = ${e.id}::uuid
        AND earning_role IN ('source_driver', 'executor_driver')
    `;n.driver_summary_after={unpaid_balance:Number(c.unpaid_balance),total_lifetime_earnings:Number(c.total_lifetime_earnings),currency:"USD"},r&&(await b`DELETE FROM driver_earnings_ledger WHERE booking_id = ${s}::uuid`,await b`DELETE FROM commissions WHERE booking_id = ${s}::uuid`,await b`DELETE FROM bookings WHERE id = ${s}::uuid`,await b`DELETE FROM clients WHERE id = ${t.id}::uuid`,n.cleanup="done — test data removed");let u=null!==d.commission_locked_at&&null!==d.ledger_posted_at&&_.length>0;return f.NextResponse.json({ok:u,test_booking_id:r?null:s,driver_code:o,total_price:i,steps:n,verdict:u?"PASS — commission locked, ledger posted, balance visible":"FAIL — check steps for details"})}catch(t){let e=t instanceof Error?t.message:String(t);if(s)try{await b`DELETE FROM driver_earnings_ledger WHERE booking_id = ${s}::uuid`,await b`DELETE FROM commissions WHERE booking_id = ${s}::uuid`,await b`DELETE FROM bookings WHERE id = ${s}::uuid`}catch{}return f.NextResponse.json({ok:!1,error:e,steps:n},{status:500})}}e.s(["POST",()=>w,"runtime",0,"nodejs"],10695);var $=e.i(10695);let N=new t.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/admin/test-booking-complete/route",pathname:"/api/admin/test-booking-complete",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/admin/test-booking-complete/route.ts",nextConfigOutput:"",userland:$}),{workAsyncStorage:h,workUnitAsyncStorage:y,serverHooks:T}=N;function S(){return(0,r.patchFetch)({workAsyncStorage:h,workUnitAsyncStorage:y})}async function D(e,t,r){N.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/admin/test-booking-complete/route";f=f.replace(/\/index$/,"")||"/";let x=await N.prepare(e,t,{srcPage:f,multiZoneDraftMode:!1});if(!x)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:k,params:R,nextConfig:b,parsedUrl:w,isDraftMode:$,prerenderManifest:h,routerServerContext:y,isOnDemandRevalidate:T,revalidateOnlyGenerated:S,resolvedPathname:D,clientReferenceManifest:O,serverActionsManifest:A}=x,C=(0,a.normalizeAppPath)(f),L=!!(h.dynamicRoutes[C]||h.routes[D]),U=async()=>((null==y?void 0:y.render404)?await y.render404(e,t,w,!1):t.end("This page could not be found"),null);if(L&&!$){let e=!!h.routes[D],t=h.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(b.experimental.adapterPath)return await U();throw new E.NoFallbackError}}let I=null;!L||N.isDev||$||(I="/index"===(I=D)?"/":I);let H=!0===N.isDev||!L,M=L&&!H;A&&O&&(0,s.setManifestsSingleton)({page:f,clientReferenceManifest:O,serverActionsManifest:A});let P=e.method||"GET",F=(0,n.getTracer)(),W=F.getActiveScopeSpan(),j={params:R,prerenderManifest:h,renderOpts:{experimental:{authInterrupts:!!b.experimental.authInterrupts},cacheComponents:!!b.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:b.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,o,r,i)=>N.onRequestError(e,t,r,i,y)},sharedContext:{buildId:k}},q=new d.NodeNextRequest(e),B=new d.NodeNextResponse(t),V=_.NextRequestAdapter.fromNodeNextRequest(q,(0,_.signalFromNodeResponse)(t));try{let s=async e=>N.handle(V,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let o=F.getRootSpanAttributes();if(!o)return;if(o.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${o.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=o.get("next.route");if(r){let t=`${P} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${f}`)}),a=!!(0,i.getRequestMeta)(e,"minimalMode"),d=async i=>{var n,d;let _=async({previousCacheEntry:o})=>{try{if(!a&&T&&S&&!o)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(i);e.fetchMetrics=j.renderOpts.fetchMetrics;let d=j.renderOpts.pendingWaitUntil;d&&r.waitUntil&&(r.waitUntil(d),d=void 0);let _=j.renderOpts.collectedTags;if(!L)return await (0,l.sendResponse)(q,B,n,j.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(n.headers);_&&(t[g.NEXT_CACHE_TAGS_HEADER]=_),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let o=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,r=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:o,expire:r}}}}catch(t){throw(null==o?void 0:o.isStale)&&await N.onRequestError(e,t,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:T})},!1,y),t}},c=await N.handleResponse({req:e,nextConfig:b,cacheKey:I,routeKind:o.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:h,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:S,responseGenerator:_,waitUntil:r.waitUntil,isMinimalMode:a});if(!L)return null;if((null==c||null==(n=c.value)?void 0:n.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(d=c.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});a||t.setHeader("x-nextjs-cache",T?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),$&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let E=(0,m.fromNodeOutgoingHttpHeaders)(c.value.headers);return a&&L||E.delete(g.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||E.get("Cache-Control")||E.set("Cache-Control",(0,p.getCacheControlHeader)(c.cacheControl)),await (0,l.sendResponse)(q,B,new Response(c.value.body,{headers:E,status:c.value.status||200})),null};W?await d(W):await F.withPropagatedContext(e.headers,()=>F.trace(c.BaseServerSpan.handleRequest,{spanName:`${P} ${f}`,kind:n.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},d))}catch(t){if(t instanceof E.NoFallbackError||await N.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:T})},!1,y),L)throw t;return await (0,l.sendResponse)(q,B,new Response(null,{status:500})),null}}e.s(["handler",()=>D,"patchFetch",()=>S,"routeModule",()=>N,"serverHooks",()=>T,"workAsyncStorage",()=>h,"workUnitAsyncStorage",()=>y],96148)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__e874f077._.js.map