module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},24361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},14747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},54799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},21517,(e,t,r)=>{t.exports=e.x("http",()=>require("http"))},24836,(e,t,r)=>{t.exports=e.x("https",()=>require("https"))},27699,(e,t,r)=>{t.exports=e.x("events",()=>require("events"))},41471,e=>{"use strict";function t(e,t,r){let i,a,n,o,s,d;"boolean"==typeof t?(i=t?"__legacy_source__":null,a="__legacy_executor__"):(i=t??null,a=r??null),null!==i&&null!==a&&i===a?(n="self_capture_execute",o=20,s=80,d=0):null!==i&&null!==a&&i!==a?(n="network_reassigned_execute",o=20,s=15,d=65):(n="platform_direct_assign",o=25,s=0,d=75);let l=t=>parseFloat((e*t/100).toFixed(2));return{commission_model:n,platform_pct:o,platform_amount:l(o),source_pct:s,source_amount:s>0?l(s):null,executor_pct:d,executor_amount:l(d),total_amount:e}}function r(e,t,r){var i;let a,n=(i=new Date(r.pickup_at),a=new Date,(i.getTime()-a.getTime())/36e5<2?90:300);return e&&e.source_driver_id?t?!function(e,t){if("active"!==e.driver_status||!e.is_eligible||!e.service_types.includes(t))return!1;let r=new Date;return!(e.license_expires_at&&new Date(e.license_expires_at)<r||e.insurance_expires_at&&new Date(e.insurance_expires_at)<r)&&!0}(t,r.service_type)?{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:n,reason:`source_driver_ineligible:${t.driver_status}`}:{offer_source_first:!0,source_driver_id:t.id,timeout_secs:n,reason:"source_driver_priority"}:{offer_source_first:!1,source_driver_id:e.source_driver_id,timeout_secs:n,reason:"source_driver_not_found"}:{offer_source_first:!1,source_driver_id:null,timeout_secs:n,reason:"no_source_driver"}}function i(e){let{ref_code:t,tablet_code:r,driver_code:i,source_type:a}=e,n=a??"direct";return r?n="tablet":(t||i)&&(n="qr"),{source_type:n,ref_code:t??null,tablet_code:r??null,driver_code:i??null}}function a(e,t){return null!==e?e:t??null}e.s(["calculateCommissions",()=>t,"getDispatchStrategy",()=>r,"guardSourceDriverId",()=>a,"resolveAttribution",()=>i],41471)},88947,(e,t,r)=>{t.exports=e.x("stream",()=>require("stream"))},27308,e=>{"use strict";let t=(0,e.i(70485).neon)(process.env.DATABASE_URL);e.s(["db",0,{drivers:{findById:async e=>(await t`
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
    `)[0],findByBooking:async e=>await t`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
      ORDER BY offer_round ASC
    `,findPendingForBooking:async e=>(await t`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
        AND response = 'pending'
      ORDER BY offer_round ASC
      LIMIT 1
    `)[0]??null,update:async(e,r)=>{await t`
      UPDATE dispatch_offers
      SET
        response = COALESCE(${r.status??null}, response),
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
    `)[0]}}])},34981,e=>{"use strict";var t=e.i(66574),r=e.i(58350),i=e.i(10732),a=e.i(12768),n=e.i(75089),o=e.i(11299),s=e.i(66012),d=e.i(12480),l=e.i(64629),u=e.i(2078),c=e.i(99591),_=e.i(65698),p=e.i(29809),f=e.i(64157),m=e.i(56534),g=e.i(93695);e.i(22981);var v=e.i(4706),E=e.i(16770),y=e.i(73314),x=e.i(41471),h=e.i(27308);async function R(e){try{let t,r=await e.json();if(!r.pickup_zone||!r.dropoff_zone||!r.pickup_at||!r.total_price)return E.NextResponse.json({error:"Missing required fields: pickup_zone, dropoff_zone, pickup_at, total_price"},{status:400});let i=(0,x.resolveAttribution)({ref_code:r.ref_code,tablet_code:r.tablet_code,driver_code:r.driver_code,source_type:r.source_type}),a=r.client_id?await h.db.clients.findById(r.client_id):await h.db.clients.findByContact(r.client_phone,r.client_email),n=null;if(a){let e=await b(i.driver_code,i.ref_code),r=(0,x.guardSourceDriverId)(a.source_driver_id,e);await h.db.clients.update(a.id,{last_booking_at:new Date().toISOString(),total_bookings:a.total_bookings+1,...null===a.source_driver_id&&r?{source_driver_id:r}:{}}),t=a.id,n=r}else{let e=await b(i.driver_code,i.ref_code);t=(await h.db.clients.create({full_name:r.client_name??void 0,phone:r.client_phone??void 0,email:r.client_email??void 0,source_driver_id:e,source_type:i.source_type,ref_code:i.ref_code})).id,n=e}let o=n?await h.db.drivers.findById(n):null,s=a??{source_driver_id:n},d=(0,x.getDispatchStrategy)(s,o,{pickup_at:r.pickup_at,service_type:r.service_type}),l=await h.db.bookings.create({client_id:t,source_driver_id:n,service_type:r.service_type??"transfer",pickup_location:r.pickup_address??r.pickup_zone??"",dropoff_location:r.dropoff_address??r.dropoff_zone??null,pickup_zone:r.pickup_zone??null,dropoff_zone:r.dropoff_zone??null,pickup_at:r.pickup_at,passengers:r.passengers??null,luggage:null!=r.luggage?Number(r.luggage):null,flight_number:r.flight_number??null,notes:r.notes??null,base_price:r.base_price??r.total_price,extras_price:r.extras_price??0,total_price:r.total_price,stripe_session_id:r.stripe_session_id??null,payment_status:r.stripe_session_id?"paid":"pending",status:"pending",offer_timeout_secs:d.timeout_secs}),u=!1;if(d.offer_source_first&&d.source_driver_id){let e=new Date(Date.now()+1e3*d.timeout_secs).toISOString();await h.db.dispatchOffers.create({booking_id:l.id,driver_id:d.source_driver_id,offer_round:1,is_source_offer:!0,sent_at:new Date().toISOString(),expires_at:e}),await h.db.bookings.update(l.id,{status:"offered",offer_sent_at:new Date().toISOString()}),await $(d.source_driver_id,l.id,d.timeout_secs),u=!0}else await w(l.id,2);let c=(0,x.calculateCommissions)(r.total_price,null!==n);await h.db.commissions.create({booking_id:l.id,source_driver_id:n,executor_pct:c.executor_pct,source_pct:c.source_pct,source_amount:c.source_amount,platform_pct:c.platform_pct,platform_amount:c.platform_amount,total_amount:c.total_amount,status:"pending"}),await h.db.auditLogs.create({entity_type:"booking",entity_id:l.id,action:"booking_created",actor_type:"system",new_data:{strategy:d.reason,source_driver_id:n,offer_sent:u}});let _={booking_id:l.id,client_id:t,source_driver_id:n,offer_sent:u,offer_timeout_secs:d.timeout_secs,message:u?`Offer sent to source driver. Timeout: ${d.timeout_secs}s`:`Dispatched to network. Reason: ${d.reason}`};return E.NextResponse.json(_,{status:201})}catch(e){return console.error("[dispatch/create-booking]",e),E.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}async function b(e,t){let r=e??t;if(!r)return null;let i=await h.db.drivers.findByCode(r);return i?.id??null}async function $(e,t,r){try{let i=await h.db.drivers.findById(e);if(!i?.phone)return void console.warn(`[notify] Driver ${e} has no phone number`);let a=await h.db.bookings.findById(t);if(!a)return;let n=(await h.db.dispatchOffers.findByBooking(t)).find(t=>t.driver_id===e);await (0,y.sendOfferSMS)({driverPhone:i.phone,driverName:i.full_name??`Driver ${e.slice(0,8)}`,offerId:n?.id??t,bookingId:t,pickupLocation:a.pickup_address??a.pickup_zone??"TBD",dropoffLocation:a.dropoff_address??a.dropoff_zone??"TBD",pickupTime:new Date(a.pickup_at).toLocaleString("en-US",{timeZone:"America/New_York",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}),estimatedAmount:a.total_price,isSourceDriver:!0,timeoutMinutes:Math.round(r/60)})}catch(t){console.error(`[notify] SMS failed for driver ${e}:`,t)}}async function w(e,t){console.log(`[dispatch] Network fallback for booking ${e} — Round ${t}`)}e.s(["POST",()=>R],99335);var k=e.i(99335);let S=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/dispatch/create-booking/route",pathname:"/api/dispatch/create-booking",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/dispatch/create-booking/route.ts",nextConfigOutput:"",userland:k}),{workAsyncStorage:N,workUnitAsyncStorage:O,serverHooks:T}=S;function C(){return(0,i.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:O})}async function A(e,t,i){S.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let E="/api/dispatch/create-booking/route";E=E.replace(/\/index$/,"")||"/";let y=await S.prepare(e,t,{srcPage:E,multiZoneDraftMode:!1});if(!y)return t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve()),null;let{buildId:x,params:h,nextConfig:R,parsedUrl:b,isDraftMode:$,prerenderManifest:w,routerServerContext:k,isOnDemandRevalidate:N,revalidateOnlyGenerated:O,resolvedPathname:T,clientReferenceManifest:C,serverActionsManifest:A}=y,I=(0,s.normalizeAppPath)(E),D=!!(w.dynamicRoutes[I]||w.routes[T]),L=async()=>((null==k?void 0:k.render404)?await k.render404(e,t,b,!1):t.end("This page could not be found"),null);if(D&&!$){let e=!!w.routes[T],t=w.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await L();throw new g.NoFallbackError}}let U=null;!D||S.isDev||$||(U="/index"===(U=T)?"/":U);let M=!0===S.isDev||!D,H=D&&!M;A&&C&&(0,o.setManifestsSingleton)({page:E,clientReferenceManifest:C,serverActionsManifest:A});let P=e.method||"GET",q=(0,n.getTracer)(),B=q.getActiveScopeSpan(),W={params:h,prerenderManifest:w,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:i.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,i,a)=>S.onRequestError(e,t,i,a,k)},sharedContext:{buildId:x}},z=new d.NodeNextRequest(e),j=new d.NodeNextResponse(t),F=l.NextRequestAdapter.fromNodeNextRequest(z,(0,l.signalFromNodeResponse)(t));try{let o=async e=>S.handle(F,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=r.get("next.route");if(i){let t=`${P} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${E}`)}),s=!!(0,a.getRequestMeta)(e,"minimalMode"),d=async a=>{var n,d;let l=async({previousCacheEntry:r})=>{try{if(!s&&N&&O&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await o(a);e.fetchMetrics=W.renderOpts.fetchMetrics;let d=W.renderOpts.pendingWaitUntil;d&&i.waitUntil&&(i.waitUntil(d),d=void 0);let l=W.renderOpts.collectedTags;if(!D)return await (0,_.sendResponse)(z,j,n,W.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[m.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,i=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:i}}}}catch(t){throw(null==r?void 0:r.isStale)&&await S.onRequestError(e,t,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:N})},!1,k),t}},u=await S.handleResponse({req:e,nextConfig:R,cacheKey:U,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:w,isRoutePPREnabled:!1,isOnDemandRevalidate:N,revalidateOnlyGenerated:O,responseGenerator:l,waitUntil:i.waitUntil,isMinimalMode:s});if(!D)return null;if((null==u||null==(n=u.value)?void 0:n.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(d=u.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",N?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),$&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,p.fromNodeOutgoingHttpHeaders)(u.value.headers);return s&&D||g.delete(m.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,f.getCacheControlHeader)(u.cacheControl)),await (0,_.sendResponse)(z,j,new Response(u.value.body,{headers:g,status:u.value.status||200})),null};B?await d(B):await q.withPropagatedContext(e.headers,()=>q.trace(u.BaseServerSpan.handleRequest,{spanName:`${P} ${E}`,kind:n.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},d))}catch(t){if(t instanceof g.NoFallbackError||await S.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:N})},!1,k),D)throw t;return await (0,_.sendResponse)(z,j,new Response(null,{status:500})),null}}e.s(["handler",()=>A,"patchFetch",()=>C,"routeModule",()=>S,"serverHooks",()=>T,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>O],34981)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__3642e269._.js.map