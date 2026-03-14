module.exports=[18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},27308,e=>{"use strict";let t=(0,e.i(70485).neon)(process.env.DATABASE_URL);e.s(["db",0,{drivers:{findById:async e=>(await t`
      SELECT * FROM drivers WHERE id = ${e} LIMIT 1
    `)[0]??null,findByCode:async e=>(await t`
      SELECT * FROM drivers 
      WHERE driver_code = ${e} 
        AND driver_status = 'active'
      LIMIT 1
    `)[0]??null,findAvailable:async e=>await t`
      SELECT * FROM drivers
      WHERE driver_status = 'active'
        AND is_eligible = true
        AND ${e} = ANY(service_types)
        AND (license_expires_at IS NULL OR license_expires_at > NOW())
        AND (insurance_expires_at IS NULL OR insurance_expires_at > NOW())
      ORDER BY created_at ASC
    `},clients:{findById:async e=>(await t`
      SELECT * FROM clients WHERE id = ${e} LIMIT 1
    `)[0]??null,findByContact:async(e,r)=>e||r?(await t`
      SELECT * FROM clients
      WHERE (${e??null}::text IS NOT NULL AND phone = ${e??null})
         OR (${r??null}::text IS NOT NULL AND email = ${r??null})
      LIMIT 1
    `)[0]??null:null,create:async e=>(await t`
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
    `)[0],update:async(e,r)=>{await t`
      UPDATE clients
      SET
        total_bookings = COALESCE(${r.total_bookings??null}, total_bookings),
        last_booking_at = COALESCE(${r.last_booking_at??null}::timestamptz, last_booking_at),
        updated_at = NOW()
      WHERE id = ${e}
    `}},bookings:{create:async e=>(await t`
      INSERT INTO bookings (
        client_id, source_driver_id, service_type,
        pickup_location, dropoff_location, pickup_at,
        passengers, luggage, flight_number, notes,
        base_price, extras_price, total_price,
        stripe_session_id, payment_status, status,
        offer_timeout_secs, created_at, updated_at
      ) VALUES (
        ${e.client_id},
        ${e.source_driver_id??null},
        ${e.service_type},
        ${e.pickup_location},
        ${e.dropoff_location??null},
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
        NOW(), NOW()
      )
      RETURNING *
    `)[0],update:async(e,r)=>{await t`
      UPDATE bookings
      SET
        status = COALESCE(${r.status??null}, status),
        assigned_driver_id = COALESCE(${r.assigned_driver_id??null}, assigned_driver_id),
        offer_sent_at = COALESCE(${r.offer_sent_at??null}::timestamptz, offer_sent_at),
        offer_accepted_at = COALESCE(${r.offer_accepted_at??null}::timestamptz, offer_accepted_at),
        completed_at = COALESCE(${r.completed_at??null}::timestamptz, completed_at),
        updated_at = NOW()
      WHERE id = ${e}
    `},findById:async e=>(await t`SELECT * FROM bookings WHERE id = ${e} LIMIT 1`)[0]??null},dispatchOffers:{create:async e=>(await t`
      INSERT INTO dispatch_offers (
        booking_id, driver_id, offer_round,
        is_source_offer, status, sent_at, expires_at
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
    `)[0],findPendingForBooking:async e=>(await t`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
        AND status = 'pending'
      ORDER BY offer_round ASC
      LIMIT 1
    `)[0]??null,update:async(e,r)=>{await t`
      UPDATE dispatch_offers
      SET
        status = COALESCE(${r.status??null}, status),
        responded_at = COALESCE(${r.responded_at??null}::timestamptz, responded_at)
      WHERE id = ${e}
    `}},commissions:{create:async e=>(await t`
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
    `)[0],confirm:async(e,r)=>{await t`
      UPDATE commissions
      SET
        executor_driver_id = ${r},
        executor_amount = total_amount * executor_pct / 100,
        status = 'confirmed'
      WHERE booking_id = ${e}
    `}},auditLogs:{create:async e=>{await t`
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
    `}},sourceSummary:{findByDriverId:async e=>(await t`
      SELECT * FROM source_driver_summary
      WHERE driver_id = ${e}
      LIMIT 1
    `)[0]??null,findAll:async()=>await t`
      SELECT * FROM source_driver_summary
      ORDER BY lifetime_source_earnings DESC
    `},leads:{create:async e=>(await t`
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
    `)[0]}}])},41471,e=>{"use strict";function t(e,t){let r=15*!!t,a=t?20:35;return{executor_pct:65,executor_amount:parseFloat((65*e/100).toFixed(2)),source_pct:r,source_amount:t?parseFloat((e*r/100).toFixed(2)):null,platform_pct:a,platform_amount:parseFloat((e*a/100).toFixed(2)),total_amount:e}}function r(e,t,r){var a;let i,s=(a=new Date(r.pickup_at),i=new Date,(a.getTime()-i.getTime())/36e5<2?90:300);return e&&e.source_driver_id?t?!function(e,t){if("active"!==e.driver_status||!e.is_eligible||!e.service_types.includes(t))return!1;let r=new Date;return!(e.license_expires_at&&new Date(e.license_expires_at)<r||e.insurance_expires_at&&new Date(e.insurance_expires_at)<r)&&!0}(t,r.service_type)?{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:s,reason:`source_driver_ineligible:${t.driver_status}`}:{offer_source_first:!0,source_driver_id:t.id,timeout_secs:s,reason:"source_driver_priority"}:{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:s,reason:"source_driver_not_found"}:{offer_source_first:!1,source_driver_id:null,timeout_secs:s,reason:"no_source_driver"}}function a(e){let{ref_code:t,tablet_code:r,driver_code:a,source_type:i}=e,s=i??"direct";return r?s="tablet":(t||a)&&(s="qr"),{source_type:s,ref_code:t??null,tablet_code:r??null,driver_code:a??null}}function i(e,t){return null!==e?e:t??null}e.s(["calculateCommissions",()=>t,"getDispatchStrategy",()=>r,"guardSourceDriverId",()=>i,"resolveAttribution",()=>a],41471)},80478,e=>{"use strict";var t=e.i(66574),r=e.i(58350),a=e.i(10732),i=e.i(12768),s=e.i(75089),n=e.i(11299),o=e.i(66012),d=e.i(12480),l=e.i(64629),u=e.i(2078),c=e.i(99591),_=e.i(65698),p=e.i(29809),f=e.i(64157),E=e.i(56534),m=e.i(93695);e.i(22981);var g=e.i(4706),v=e.i(16770),R=e.i(41471),x=e.i(27308);let $=(0,e.i(70485).neon)(process.env.DATABASE_URL);async function y(e){try{let t=await e.json();if(!t.offer_id||!t.driver_id||!t.response)return v.NextResponse.json({error:"Missing required fields: offer_id, driver_id, response"},{status:400});if(!["accepted","declined"].includes(t.response))return v.NextResponse.json({error:"response must be 'accepted' or 'declined'"},{status:400});let r=(await $`
      SELECT * FROM dispatch_offers WHERE id = ${t.offer_id} LIMIT 1
    `)[0]??null;if(!r)return v.NextResponse.json({error:"Offer not found"},{status:404});if(r.driver_id!==t.driver_id)return v.NextResponse.json({error:"Unauthorized"},{status:403});if("pending"!==r.status)return v.NextResponse.json({error:"Offer already responded to",current_status:r.status},{status:409});let a=new Date,i=new Date(r.expires_at);if(a>i&&"accepted"===t.response)return await $`
        UPDATE dispatch_offers
        SET status = 'timeout', responded_at = NOW()
        WHERE id = ${r.id}
      `,await w(r.booking_id,r.offer_round+1),v.NextResponse.json({error:"Offer has expired. Booking dispatched to network."},{status:410});let s=await x.db.bookings.findById(r.booking_id);if(!s)return v.NextResponse.json({error:"Booking not found"},{status:404});let n=a.toISOString();if("accepted"===t.response){await $`
        UPDATE dispatch_offers
        SET status = 'accepted', responded_at = ${n}::timestamptz
        WHERE id = ${r.id}
      `,await $`
        UPDATE bookings
        SET
          assigned_driver_id = ${t.driver_id}::uuid,
          offer_accepted = true,
          offer_accepted_at = ${n}::timestamptz,
          status = 'assigned',
          updated_at = NOW()
        WHERE id = ${s.id}
      `;let e=(0,R.calculateCommissions)(s.total_price,null!==s.source_driver_id);await $`
        UPDATE commissions
        SET
          executor_driver_id = ${t.driver_id}::uuid,
          executor_amount = ${e.executor_amount},
          executor_pct = ${e.executor_pct},
          source_amount = ${e.source_amount??null},
          source_pct = ${e.source_pct??null},
          platform_amount = ${e.platform_amount},
          platform_pct = ${e.platform_pct},
          status = 'confirmed'
        WHERE booking_id = ${s.id}
      `,await x.db.auditLogs.create({entity_type:"booking",entity_id:s.id,action:"offer_accepted",actor_type:"driver",actor_id:t.driver_id,new_data:{assigned_driver_id:t.driver_id,is_source_driver:r.is_source_offer,commissions:e}});let a={booking_id:s.id,assigned_driver_id:t.driver_id,fallback_dispatched:!1,message:"Offer accepted. You are assigned to this booking."};return v.NextResponse.json(a)}{await $`
        UPDATE dispatch_offers
        SET status = 'declined', responded_at = ${n}::timestamptz
        WHERE id = ${r.id}
      `,await w(s.id,r.offer_round+1),await x.db.auditLogs.create({entity_type:"booking",entity_id:s.id,action:"offer_declined",actor_type:"driver",actor_id:t.driver_id,new_data:{declined_by:t.driver_id,is_source_offer:r.is_source_offer,fallback_round:r.offer_round+1}});let e={booking_id:s.id,assigned_driver_id:null,fallback_dispatched:!0,message:"Offer declined. Booking dispatched to network drivers."};return v.NextResponse.json(e)}}catch(e){return console.error("[dispatch/respond-offer]",e),v.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}async function h(e){try{let{offer_id:t}=await e.json();if(!t)return v.NextResponse.json({error:"offer_id required"},{status:400});let r=(await $`
      SELECT * FROM dispatch_offers WHERE id = ${t} LIMIT 1
    `)[0]??null;if(!r||"pending"!==r.status)return v.NextResponse.json({message:"Offer already resolved"});return await $`
      UPDATE dispatch_offers
      SET status = 'timeout', responded_at = NOW()
      WHERE id = ${t}
    `,await w(r.booking_id,r.offer_round+1),v.NextResponse.json({message:"Offer timed out. Dispatched to network.",booking_id:r.booking_id})}catch(e){return console.error("[dispatch/timeout-offer]",e),v.NextResponse.json({error:e?.message},{status:500})}}async function w(e,t){console.log(`[dispatch] Network fallback — Booking ${e} — Round ${t}`)}e.s(["POST",()=>y,"PUT",()=>h],35251);var N=e.i(35251);let T=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/dispatch/respond-offer/route",pathname:"/api/dispatch/respond-offer",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/dispatch/respond-offer/route.ts",nextConfigOutput:"",userland:N}),{workAsyncStorage:b,workUnitAsyncStorage:O,serverHooks:S}=T;function A(){return(0,a.patchFetch)({workAsyncStorage:b,workUnitAsyncStorage:O})}async function k(e,t,a){T.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let v="/api/dispatch/respond-offer/route";v=v.replace(/\/index$/,"")||"/";let R=await T.prepare(e,t,{srcPage:v,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:x,params:$,nextConfig:y,parsedUrl:h,isDraftMode:w,prerenderManifest:N,routerServerContext:b,isOnDemandRevalidate:O,revalidateOnlyGenerated:S,resolvedPathname:A,clientReferenceManifest:k,serverActionsManifest:C}=R,I=(0,o.normalizeAppPath)(v),L=!!(N.dynamicRoutes[I]||N.routes[A]),D=async()=>((null==b?void 0:b.render404)?await b.render404(e,t,h,!1):t.end("This page could not be found"),null);if(L&&!w){let e=!!N.routes[A],t=N.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(y.experimental.adapterPath)return await D();throw new m.NoFallbackError}}let U=null;!L||T.isDev||w||(U="/index"===(U=A)?"/":U);let H=!0===T.isDev||!L,W=L&&!H;C&&k&&(0,n.setManifestsSingleton)({page:v,clientReferenceManifest:k,serverActionsManifest:C});let P=e.method||"GET",j=(0,s.getTracer)(),M=j.getActiveScopeSpan(),F={params:$,prerenderManifest:N,renderOpts:{experimental:{authInterrupts:!!y.experimental.authInterrupts},cacheComponents:!!y.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:y.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,i)=>T.onRequestError(e,t,a,i,b)},sharedContext:{buildId:x}},q=new d.NodeNextRequest(e),B=new d.NodeNextResponse(t),z=l.NextRequestAdapter.fromNodeNextRequest(q,(0,l.signalFromNodeResponse)(t));try{let n=async e=>T.handle(z,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${P} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${v}`)}),o=!!(0,i.getRequestMeta)(e,"minimalMode"),d=async i=>{var s,d;let l=async({previousCacheEntry:r})=>{try{if(!o&&O&&S&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await n(i);e.fetchMetrics=F.renderOpts.fetchMetrics;let d=F.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let l=F.renderOpts.collectedTags;if(!L)return await (0,_.sendResponse)(q,B,s,F.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(s.headers);l&&(t[E.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,a=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:g.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await T.onRequestError(e,t,{routerKind:"App Router",routePath:v,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:O})},!1,b),t}},u=await T.handleResponse({req:e,nextConfig:y,cacheKey:U,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:S,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:o});if(!L)return null;if((null==u||null==(s=u.value)?void 0:s.kind)!==g.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(d=u.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",O?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),w&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(u.value.headers);return o&&L||m.delete(E.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,f.getCacheControlHeader)(u.cacheControl)),await (0,_.sendResponse)(q,B,new Response(u.value.body,{headers:m,status:u.value.status||200})),null};M?await d(M):await j.withPropagatedContext(e.headers,()=>j.trace(u.BaseServerSpan.handleRequest,{spanName:`${P} ${v}`,kind:s.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},d))}catch(t){if(t instanceof m.NoFallbackError||await T.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:O})},!1,b),L)throw t;return await (0,_.sendResponse)(q,B,new Response(null,{status:500})),null}}e.s(["handler",()=>k,"patchFetch",()=>A,"routeModule",()=>T,"serverHooks",()=>S,"workAsyncStorage",()=>b,"workUnitAsyncStorage",()=>O],80478)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__40c34d87._.js.map