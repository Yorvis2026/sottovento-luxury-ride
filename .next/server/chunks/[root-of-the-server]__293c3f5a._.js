module.exports=[18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},27308,e=>{"use strict";let t=(0,e.i(70485).neon)(process.env.DATABASE_URL);e.s(["db",0,{drivers:{findById:async e=>(await t`
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
    `)[0]??null,findByContact:async(e,a)=>e||a?(await t`
      SELECT * FROM clients
      WHERE (${e??null}::text IS NOT NULL AND phone = ${e??null})
         OR (${a??null}::text IS NOT NULL AND email = ${a??null})
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
    `)[0],update:async(e,a)=>{await t`
      UPDATE clients
      SET
        total_bookings = COALESCE(${a.total_bookings??null}, total_bookings),
        last_booking_at = COALESCE(${a.last_booking_at??null}::timestamptz, last_booking_at),
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
    `)[0],update:async(e,a)=>{await t`
      UPDATE bookings
      SET
        status = COALESCE(${a.status??null}, status),
        assigned_driver_id = COALESCE(${a.assigned_driver_id??null}, assigned_driver_id),
        offer_sent_at = COALESCE(${a.offer_sent_at??null}::timestamptz, offer_sent_at),
        offer_accepted_at = COALESCE(${a.offer_accepted_at??null}::timestamptz, offer_accepted_at),
        completed_at = COALESCE(${a.completed_at??null}::timestamptz, completed_at),
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
    `)[0],findByBooking:async e=>await t`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
      ORDER BY offer_round ASC
    `,findPendingForBooking:async e=>(await t`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
        AND status = 'pending'
      ORDER BY offer_round ASC
      LIMIT 1
    `)[0]??null,update:async(e,a)=>{await t`
      UPDATE dispatch_offers
      SET
        status = COALESCE(${a.status??null}, status),
        responded_at = COALESCE(${a.responded_at??null}::timestamptz, responded_at)
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
    `)[0],confirm:async(e,a)=>{await t`
      UPDATE commissions
      SET
        executor_driver_id = ${a},
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
    `)[0]}}])},32900,e=>{"use strict";var t=e.i(66574),a=e.i(58350),r=e.i(10732),n=e.i(12768),i=e.i(75089),s=e.i(11299),o=e.i(66012),l=e.i(12480),d=e.i(64629),u=e.i(2078),c=e.i(99591),p=e.i(65698),_=e.i(29809),E=e.i(64157),f=e.i(56534),m=e.i(93695);e.i(22981);var R=e.i(4706),g=e.i(16770),$=e.i(27308);async function v(e){try{let{full_name:t,phone:a,email:r,driver_code:n,tablet_code:i,lead_source:s="tablet",interested_package:o}=await e.json();if(!t&&!a&&!r)return g.NextResponse.json({error:"At least one contact field required (full_name, phone, or email)"},{status:400});let l=null;if(n){let e=await $.db.drivers.findByCode(n);l=e?.id??null}let d=await $.db.leads.create({lead_source:s,driver_id:l,tablet_code:i??null,driver_code:n??null,full_name:t??null,phone:a??null,email:r??null,interested_package:o??null});return g.NextResponse.json({success:!0,lead_id:d.id},{status:201})}catch(e){return console.error("[api/dispatch/leads]",e),g.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}e.s(["POST",()=>v],50425);var y=e.i(50425);let x=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/dispatch/leads/route",pathname:"/api/dispatch/leads",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/dispatch/leads/route.ts",nextConfigOutput:"",userland:y}),{workAsyncStorage:h,workUnitAsyncStorage:N,serverHooks:O}=x;function C(){return(0,r.patchFetch)({workAsyncStorage:h,workUnitAsyncStorage:N})}async function T(e,t,r){x.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/dispatch/leads/route";g=g.replace(/\/index$/,"")||"/";let $=await x.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!$)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:v,params:y,nextConfig:h,parsedUrl:N,isDraftMode:O,prerenderManifest:C,routerServerContext:T,isOnDemandRevalidate:w,revalidateOnlyGenerated:S,resolvedPathname:A,clientReferenceManifest:b,serverActionsManifest:I}=$,k=(0,o.normalizeAppPath)(g),L=!!(C.dynamicRoutes[k]||C.routes[A]),U=async()=>((null==T?void 0:T.render404)?await T.render404(e,t,N,!1):t.end("This page could not be found"),null);if(L&&!O){let e=!!C.routes[A],t=C.dynamicRoutes[k];if(t&&!1===t.fallback&&!e){if(h.experimental.adapterPath)return await U();throw new m.NoFallbackError}}let D=null;!L||x.isDev||O||(D="/index"===(D=A)?"/":D);let H=!0===x.isDev||!L,M=L&&!H;I&&b&&(0,s.setManifestsSingleton)({page:g,clientReferenceManifest:b,serverActionsManifest:I});let P=e.method||"GET",W=(0,i.getTracer)(),j=W.getActiveScopeSpan(),q={params:y,prerenderManifest:C,renderOpts:{experimental:{authInterrupts:!!h.experimental.authInterrupts},cacheComponents:!!h.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:h.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,n)=>x.onRequestError(e,t,r,n,T)},sharedContext:{buildId:v}},F=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),z=d.NextRequestAdapter.fromNodeNextRequest(F,(0,d.signalFromNodeResponse)(t));try{let s=async e=>x.handle(z,q).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=W.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${P} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${g}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var i,l;let d=async({previousCacheEntry:a})=>{try{if(!o&&w&&S&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await s(n);e.fetchMetrics=q.renderOpts.fetchMetrics;let l=q.renderOpts.pendingWaitUntil;l&&r.waitUntil&&(r.waitUntil(l),l=void 0);let d=q.renderOpts.collectedTags;if(!L)return await (0,p.sendResponse)(F,B,i,q.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(i.headers);d&&(t[f.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==q.renderOpts.collectedRevalidate&&!(q.renderOpts.collectedRevalidate>=f.INFINITE_CACHE)&&q.renderOpts.collectedRevalidate,r=void 0===q.renderOpts.collectedExpire||q.renderOpts.collectedExpire>=f.INFINITE_CACHE?void 0:q.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await x.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:w})},!1,T),t}},u=await x.handleResponse({req:e,nextConfig:h,cacheKey:D,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:C,isRoutePPREnabled:!1,isOnDemandRevalidate:w,revalidateOnlyGenerated:S,responseGenerator:d,waitUntil:r.waitUntil,isMinimalMode:o});if(!L)return null;if((null==u||null==(i=u.value)?void 0:i.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",w?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,_.fromNodeOutgoingHttpHeaders)(u.value.headers);return o&&L||m.delete(f.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,E.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(F,B,new Response(u.value.body,{headers:m,status:u.value.status||200})),null};j?await l(j):await W.withPropagatedContext(e.headers,()=>W.trace(u.BaseServerSpan.handleRequest,{spanName:`${P} ${g}`,kind:i.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},l))}catch(t){if(t instanceof m.NoFallbackError||await x.onRequestError(e,t,{routerKind:"App Router",routePath:k,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:w})},!1,T),L)throw t;return await (0,p.sendResponse)(F,B,new Response(null,{status:500})),null}}e.s(["handler",()=>T,"patchFetch",()=>C,"routeModule",()=>x,"serverHooks",()=>O,"workAsyncStorage",()=>h,"workUnitAsyncStorage",()=>N],32900)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__293c3f5a._.js.map