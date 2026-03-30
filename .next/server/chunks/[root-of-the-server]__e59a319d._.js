module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},81264,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),n=e.i(1266),s=e.i(10171),o=e.i(44067),i=e.i(7601),d=e.i(3083),u=e.i(88890),l=e.i(37886),c=e.i(63388),p=e.i(46601),E=e.i(24139),R=e.i(78785),_=e.i(2640),v=e.i(93695);e.i(46509);var h=e.i(56592),m=e.i(50974);let A=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function N(){try{let e=await A`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
        AND status = ANY(ARRAY['new','needs_review','ready_for_dispatch','assigned',
                               'driver_confirmed','in_progress','driver_issue',
                               'pending_dispatch','pending','pending_payment','completed'])
    `,t=await A`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= date_trunc('week', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
        AND status = ANY(ARRAY['new','needs_review','ready_for_dispatch','assigned',
                               'driver_confirmed','in_progress','driver_issue',
                               'pending_dispatch','pending','pending_payment','completed'])
    `,r=await A`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= date_trunc('month', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'
        AND status = ANY(ARRAY['new','needs_review','ready_for_dispatch','assigned',
                               'driver_confirmed','in_progress','driver_issue',
                               'pending_dispatch','pending','pending_payment','completed'])
    `,a=await A`
      SELECT COUNT(*) AS count FROM drivers WHERE driver_status = 'active'
    `,n=await A`
      SELECT COUNT(*) AS count FROM leads
    `,s=await A`
      SELECT lead_source, COUNT(*) AS count
      FROM leads
      GROUP BY lead_source
      ORDER BY count DESC
    `,o=await A`
      SELECT status, COUNT(*) AS count
      FROM bookings
      GROUP BY status
      ORDER BY count DESC
    `,i=await A`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE status = 'needs_review'
         OR (
           status = 'new'
           AND (
             (pickup_address IS NULL OR pickup_address = '') AND (pickup_zone IS NULL OR pickup_zone = '')
             OR (dropoff_address IS NULL OR dropoff_address = '') AND (dropoff_zone IS NULL OR dropoff_zone = '')
             OR pickup_at IS NULL
           )
         )
    `,d=await A`
      SELECT b.id, b.pickup_zone, b.dropoff_zone, b.pickup_address, b.dropoff_address,
             b.total_price, b.status, b.dispatch_status, b.payment_status, b.created_at,
             b.booking_ref, b.booking_origin,
             c.full_name AS client_name
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      ORDER BY b.created_at DESC
      LIMIT 5
    `;return m.NextResponse.json({today:{count:Number(e[0]?.count??0),revenue:Number(e[0]?.revenue??0)},week:{count:Number(t[0]?.count??0),revenue:Number(t[0]?.revenue??0)},month:{count:Number(r[0]?.count??0),revenue:Number(r[0]?.revenue??0)},activeDrivers:Number(a[0]?.count??0),totalLeads:Number(n[0]?.count??0),needsReview:Number(i[0]?.count??0),leadsBySource:s,bookingStatuses:o,recentBookings:d})}catch(e){return m.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>N,"dynamic",0,"force-dynamic"],42643);var g=e.i(42643);let x=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/dashboard/route",pathname:"/api/admin/dashboard",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/dashboard/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:f,workUnitAsyncStorage:w,serverHooks:O}=x;function b(){return(0,a.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:w})}async function C(e,t,a){x.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/admin/dashboard/route";m=m.replace(/\/index$/,"")||"/";let A=await x.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!A)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:N,params:g,nextConfig:f,parsedUrl:w,isDraftMode:O,prerenderManifest:b,routerServerContext:C,isOnDemandRevalidate:T,revalidateOnlyGenerated:S,resolvedPathname:y,clientReferenceManifest:k,serverActionsManifest:U}=A,L=(0,i.normalizeAppPath)(m),M=!!(b.dynamicRoutes[L]||b.routes[y]),I=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,w,!1):t.end("This page could not be found"),null);if(M&&!O){let e=!!b.routes[y],t=b.dynamicRoutes[L];if(t&&!1===t.fallback&&!e){if(f.experimental.adapterPath)return await I();throw new v.NoFallbackError}}let D=null;!M||x.isDev||O||(D="/index"===(D=y)?"/":D);let P=!0===x.isDev||!M,H=M&&!P;U&&k&&(0,o.setManifestsSingleton)({page:m,clientReferenceManifest:k,serverActionsManifest:U});let q=e.method||"GET",j=(0,s.getTracer)(),F=j.getActiveScopeSpan(),Y={params:g,prerenderManifest:b,renderOpts:{experimental:{authInterrupts:!!f.experimental.authInterrupts},cacheComponents:!!f.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:f.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>x.onRequestError(e,t,a,n,C)},sharedContext:{buildId:N}},B=new d.NodeNextRequest(e),W=new d.NodeNextResponse(t),$=u.NextRequestAdapter.fromNodeNextRequest(B,(0,u.signalFromNodeResponse)(t));try{let o=async e=>x.handle($,Y).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${q} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${q} ${m}`)}),i=!!(0,n.getRequestMeta)(e,"minimalMode"),d=async n=>{var s,d;let u=async({previousCacheEntry:r})=>{try{if(!i&&T&&S&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await o(n);e.fetchMetrics=Y.renderOpts.fetchMetrics;let d=Y.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let u=Y.renderOpts.collectedTags;if(!M)return await (0,p.sendResponse)(B,W,s,Y.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,E.toNodeOutgoingHttpHeaders)(s.headers);u&&(t[_.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==Y.renderOpts.collectedRevalidate&&!(Y.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&Y.renderOpts.collectedRevalidate,a=void 0===Y.renderOpts.collectedExpire||Y.renderOpts.collectedExpire>=_.INFINITE_CACHE?void 0:Y.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await x.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:T})},!1,C),t}},l=await x.handleResponse({req:e,nextConfig:f,cacheKey:D,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:b,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:S,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:i});if(!M)return null;if((null==l||null==(s=l.value)?void 0:s.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(d=l.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",T?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let v=(0,E.fromNodeOutgoingHttpHeaders)(l.value.headers);return i&&M||v.delete(_.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||v.get("Cache-Control")||v.set("Cache-Control",(0,R.getCacheControlHeader)(l.cacheControl)),await (0,p.sendResponse)(B,W,new Response(l.value.body,{headers:v,status:l.value.status||200})),null};F?await d(F):await j.withPropagatedContext(e.headers,()=>j.trace(l.BaseServerSpan.handleRequest,{spanName:`${q} ${m}`,kind:s.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},d))}catch(t){if(t instanceof v.NoFallbackError||await x.onRequestError(e,t,{routerKind:"App Router",routePath:L,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:T})},!1,C),M)throw t;return await (0,p.sendResponse)(B,W,new Response(null,{status:500})),null}}e.s(["handler",()=>C,"patchFetch",()=>b,"routeModule",()=>x,"serverHooks",()=>O,"workAsyncStorage",()=>f,"workUnitAsyncStorage",()=>w],81264)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__e59a319d._.js.map