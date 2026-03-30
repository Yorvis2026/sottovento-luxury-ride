module.exports=[93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},40421,e=>{"use strict";var t=e.i(39743),a=e.i(37383),r=e.i(16108),n=e.i(1266),i=e.i(10171),s=e.i(44067),o=e.i(7601),d=e.i(3083),l=e.i(88890),p=e.i(37886),u=e.i(63388),c=e.i(46601),_=e.i(24139),E=e.i(78785),R=e.i(2640),h=e.i(93695);e.i(46509);var m=e.i(56592),g=e.i(50974);let x=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function v(e){let t={};try{t.columns=await x`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position
    `}catch(e){t.columns_error=e.message}try{let e=await x`
      INSERT INTO bookings (
        status, dispatch_status,
        pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        trip_type, created_at, updated_at
      ) VALUES (
        'pending_payment', 'pending_payment',
        'MCO Airport', 'Oviedo',
        '2026-03-25T14:00:00+00'::timestamptz,
        'sedan', 95,
        'oneway', NOW(), NOW()
      )
      RETURNING id
    `;t.test_insert={success:!0,id:e[0].id},await x`DELETE FROM bookings WHERE id = ${e[0].id}::uuid`,t.cleanup="done"}catch(e){t.test_insert_error=e.message}try{let e=await x`
      INSERT INTO bookings (
        status, dispatch_status,
        pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        trip_type, created_at, updated_at
      ) VALUES (
        'pending_payment', 'pending_payment',
        'MCO Airport', 'Oviedo',
        NULL,
        'sedan', 95,
        'oneway', NOW(), NOW()
      )
      RETURNING id
    `;t.test_null_pickup={success:!0,id:e[0].id},await x`DELETE FROM bookings WHERE id = ${e[0].id}::uuid`}catch(e){t.test_null_pickup_error=e.message}try{let e=await x`
      INSERT INTO bookings (
        status, dispatch_status,
        pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        client_email, client_phone_raw,
        trip_type, created_at, updated_at
      ) VALUES (
        'pending_payment', 'pending_payment',
        'MCO Airport', 'Oviedo',
        '2026-03-25T14:00:00+00'::timestamptz,
        'sedan', 95,
        'test@test.com', '+14073830647',
        'oneway', NOW(), NOW()
      )
      RETURNING id
    `;t.test_with_email={success:!0,id:e[0].id},await x`DELETE FROM bookings WHERE id = ${e[0].id}::uuid`}catch(e){t.test_with_email_error=e.message}try{let e="debugtest@test.com",a="+14073830647",r=null,n=await x`
      SELECT id FROM clients WHERE email = ${e.toLowerCase()} LIMIT 1
    `;r=n.length>0?n[0].id:(await x`
        INSERT INTO clients (full_name, email, phone, created_at, updated_at)
        VALUES (${"Debug Test"}, ${e.toLowerCase()}, ${a}, NOW(), NOW())
        RETURNING id
      `)[0].id,t.client_upsert={success:!0,clientId:r};let i=await x`
      INSERT INTO bookings (
        status, dispatch_status,
        pickup_address, dropoff_address,
        pickup_at, vehicle_type, total_price,
        client_id, client_email, client_phone_raw,
        trip_type, created_at, updated_at
      ) VALUES (
        'pending_payment', 'pending_payment',
        'MCO Airport', 'Oviedo',
        '2026-03-25T14:00:00+00'::timestamptz,
        'sedan', 95,
        ${r}::uuid,
        ${e}, ${a},
        'oneway', NOW(), NOW()
      )
      RETURNING id
    `;t.full_booking_insert={success:!0,id:i[0].id},await x`DELETE FROM bookings WHERE id = ${i[0].id}::uuid`,await x`DELETE FROM clients WHERE id = ${r}::uuid`}catch(e){t.full_flow_error=e.message}return g.NextResponse.json(t)}e.s(["GET",()=>v,"dynamic",0,"force-dynamic"],70943);var w=e.i(70943);let y=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/admin/debug-booking-create/route",pathname:"/api/admin/debug-booking-create",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/debug-booking-create/route.ts",nextConfigOutput:"",userland:w}),{workAsyncStorage:f,workUnitAsyncStorage:N,serverHooks:O}=y;function T(){return(0,r.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:N})}async function b(e,t,r){y.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/admin/debug-booking-create/route";g=g.replace(/\/index$/,"")||"/";let x=await y.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!x)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:v,params:w,nextConfig:f,parsedUrl:N,isDraftMode:O,prerenderManifest:T,routerServerContext:b,isOnDemandRevalidate:k,revalidateOnlyGenerated:C,resolvedPathname:A,clientReferenceManifest:I,serverActionsManifest:S}=x,U=(0,o.normalizeAppPath)(g),H=!!(T.dynamicRoutes[U]||T.routes[A]),L=async()=>((null==b?void 0:b.render404)?await b.render404(e,t,N,!1):t.end("This page could not be found"),null);if(H&&!O){let e=!!T.routes[A],t=T.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(f.experimental.adapterPath)return await L();throw new h.NoFallbackError}}let M=null;!H||y.isDev||O||(M="/index"===(M=A)?"/":M);let P=!0===y.isDev||!H,D=H&&!P;S&&I&&(0,s.setManifestsSingleton)({page:g,clientReferenceManifest:I,serverActionsManifest:S});let $=e.method||"GET",q=(0,i.getTracer)(),W=q.getActiveScopeSpan(),j={params:w,prerenderManifest:T,renderOpts:{experimental:{authInterrupts:!!f.experimental.authInterrupts},cacheComponents:!!f.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:f.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,n)=>y.onRequestError(e,t,r,n,b)},sharedContext:{buildId:v}},F=new d.NodeNextRequest(e),G=new d.NodeNextResponse(t),K=l.NextRequestAdapter.fromNodeNextRequest(F,(0,l.signalFromNodeResponse)(t));try{let s=async e=>y.handle(K,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=q.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${$} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${$} ${g}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),d=async n=>{var i,d;let l=async({previousCacheEntry:a})=>{try{if(!o&&k&&C&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await s(n);e.fetchMetrics=j.renderOpts.fetchMetrics;let d=j.renderOpts.pendingWaitUntil;d&&r.waitUntil&&(r.waitUntil(d),d=void 0);let l=j.renderOpts.collectedTags;if(!H)return await (0,c.sendResponse)(F,G,i,j.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(i.headers);l&&(t[R.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=R.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,r=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=R.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:m.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await y.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:k})},!1,b),t}},p=await y.handleResponse({req:e,nextConfig:f,cacheKey:M,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:k,revalidateOnlyGenerated:C,responseGenerator:l,waitUntil:r.waitUntil,isMinimalMode:o});if(!H)return null;if((null==p||null==(i=p.value)?void 0:i.kind)!==m.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(d=p.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",k?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let h=(0,_.fromNodeOutgoingHttpHeaders)(p.value.headers);return o&&H||h.delete(R.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||h.get("Cache-Control")||h.set("Cache-Control",(0,E.getCacheControlHeader)(p.cacheControl)),await (0,c.sendResponse)(F,G,new Response(p.value.body,{headers:h,status:p.value.status||200})),null};W?await d(W):await q.withPropagatedContext(e.headers,()=>q.trace(p.BaseServerSpan.handleRequest,{spanName:`${$} ${g}`,kind:i.SpanKind.SERVER,attributes:{"http.method":$,"http.target":e.url}},d))}catch(t){if(t instanceof h.NoFallbackError||await y.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:D,isOnDemandRevalidate:k})},!1,b),H)throw t;return await (0,c.sendResponse)(F,G,new Response(null,{status:500})),null}}e.s(["handler",()=>b,"patchFetch",()=>T,"routeModule",()=>y,"serverHooks",()=>O,"workAsyncStorage",()=>f,"workUnitAsyncStorage",()=>N],40421)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__624cc7fa._.js.map