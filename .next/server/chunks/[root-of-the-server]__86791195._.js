module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},72575,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),n=e.i(1266),o=e.i(10171),i=e.i(44067),s=e.i(7601),l=e.i(3083),d=e.i(88890),u=e.i(37886),c=e.i(63388),p=e.i(46601),m=e.i(24139),E=e.i(78785),R=e.i(2640),x=e.i(93695);e.i(46509);var _=e.i(56592),h=e.i(50974);let v=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function C(){try{let e=await v`
      SELECT COALESCE(SUM(total_price), 0) AS total
      FROM bookings
      WHERE status NOT IN ('cancelled')
    `,t=await v`
      SELECT COALESCE(SUM(total_price), 0) AS total
      FROM bookings
      WHERE status NOT IN ('cancelled')
        AND created_at >= date_trunc('month', CURRENT_DATE)
    `,r=await v`
      SELECT
        COALESCE(SUM(executor_amount), 0) AS total_driver_earnings,
        COALESCE(SUM(source_amount), 0) AS total_source_earnings,
        COALESCE(SUM(platform_amount), 0) AS total_platform_earnings,
        COALESCE(SUM(total_amount), 0) AS total_commissions,
        COUNT(*) AS commission_count
      FROM commissions
      WHERE status = 'confirmed'
    `,a=await v`
      SELECT
        d.full_name,
        d.driver_code,
        COALESCE(SUM(c.executor_amount), 0) AS executor_earnings,
        COALESCE(SUM(c.source_amount), 0) AS source_earnings,
        COUNT(DISTINCT c.booking_id) AS rides
      FROM drivers d
      LEFT JOIN commissions c ON c.executor_driver_id = d.id OR c.source_driver_id = d.id
      GROUP BY d.id, d.full_name, d.driver_code
      ORDER BY (COALESCE(SUM(c.executor_amount), 0) + COALESCE(SUM(c.source_amount), 0)) DESC
      LIMIT 10
    `,n=await v`
      SELECT
        c.id,
        c.booking_id,
        c.executor_amount,
        c.source_amount,
        c.platform_amount,
        c.total_amount,
        c.status,
        c.created_at,
        d.full_name AS executor_name
      FROM commissions c
      LEFT JOIN drivers d ON c.executor_driver_id = d.id
      ORDER BY c.created_at DESC
      LIMIT 20
    `;return h.NextResponse.json({totalRevenue:Number(e[0]?.total??0),monthRevenue:Number(t[0]?.total??0),commissions:{totalDriverEarnings:Number(r[0]?.total_driver_earnings??0),totalSourceEarnings:Number(r[0]?.total_source_earnings??0),totalPlatformEarnings:Number(r[0]?.total_platform_earnings??0),totalCommissions:Number(r[0]?.total_commissions??0),count:Number(r[0]?.commission_count??0)},topDrivers:a,recentCommissions:n})}catch(e){return h.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>C,"dynamic",0,"force-dynamic"],71265);var g=e.i(71265);let S=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/finance/route",pathname:"/api/admin/finance",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/finance/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:f,workUnitAsyncStorage:A,serverHooks:O}=S;function N(){return(0,a.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:A})}async function w(e,t,a){S.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/admin/finance/route";h=h.replace(/\/index$/,"")||"/";let v=await S.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!v)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:C,params:g,nextConfig:f,parsedUrl:A,isDraftMode:O,prerenderManifest:N,routerServerContext:w,isOnDemandRevalidate:T,revalidateOnlyGenerated:b,resolvedPathname:y,clientReferenceManifest:U,serverActionsManifest:M}=v,L=(0,s.normalizeAppPath)(h),P=!!(N.dynamicRoutes[L]||N.routes[y]),k=async()=>((null==w?void 0:w.render404)?await w.render404(e,t,A,!1):t.end("This page could not be found"),null);if(P&&!O){let e=!!N.routes[y],t=N.dynamicRoutes[L];if(t&&!1===t.fallback&&!e){if(f.experimental.adapterPath)return await k();throw new x.NoFallbackError}}let I=null;!P||S.isDev||O||(I="/index"===(I=y)?"/":I);let D=!0===S.isDev||!P,q=P&&!D;M&&U&&(0,i.setManifestsSingleton)({page:h,clientReferenceManifest:U,serverActionsManifest:M});let H=e.method||"GET",j=(0,o.getTracer)(),F=j.getActiveScopeSpan(),B={params:g,prerenderManifest:N,renderOpts:{experimental:{authInterrupts:!!f.experimental.authInterrupts},cacheComponents:!!f.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:f.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>S.onRequestError(e,t,a,n,w)},sharedContext:{buildId:C}},$=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),G=d.NextRequestAdapter.fromNodeNextRequest($,(0,d.signalFromNodeResponse)(t));try{let i=async e=>S.handle(G,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${H} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${h}`)}),s=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var o,l;let d=async({previousCacheEntry:r})=>{try{if(!s&&T&&b&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await i(n);e.fetchMetrics=B.renderOpts.fetchMetrics;let l=B.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let d=B.renderOpts.collectedTags;if(!P)return await (0,p.sendResponse)($,K,o,B.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(o.headers);d&&(t[R.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=R.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,a=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=R.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:_.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await S.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:T})},!1,w),t}},u=await S.handleResponse({req:e,nextConfig:f,cacheKey:I,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:b,responseGenerator:d,waitUntil:a.waitUntil,isMinimalMode:s});if(!P)return null;if((null==u||null==(o=u.value)?void 0:o.kind)!==_.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",T?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let x=(0,m.fromNodeOutgoingHttpHeaders)(u.value.headers);return s&&P||x.delete(R.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||x.get("Cache-Control")||x.set("Cache-Control",(0,E.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)($,K,new Response(u.value.body,{headers:x,status:u.value.status||200})),null};F?await l(F):await j.withPropagatedContext(e.headers,()=>j.trace(u.BaseServerSpan.handleRequest,{spanName:`${H} ${h}`,kind:o.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},l))}catch(t){if(t instanceof x.NoFallbackError||await S.onRequestError(e,t,{routerKind:"App Router",routePath:L,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:T})},!1,w),P)throw t;return await (0,p.sendResponse)($,K,new Response(null,{status:500})),null}}e.s(["handler",()=>w,"patchFetch",()=>N,"routeModule",()=>S,"serverHooks",()=>O,"workAsyncStorage",()=>f,"workUnitAsyncStorage",()=>A],72575)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__86791195._.js.map