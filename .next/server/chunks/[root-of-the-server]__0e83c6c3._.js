module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},49823,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),n=e.i(1266),i=e.i(10171),s=e.i(44067),o=e.i(7601),l=e.i(3083),d=e.i(88890),p=e.i(37886),u=e.i(63388),c=e.i(46601),m=e.i(24139),E=e.i(78785),_=e.i(2640),R=e.i(93695);e.i(46509);var h=e.i(56592),x=e.i(50974);let g=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function f(e){try{let{searchParams:t}=new URL(e.url),r=t.get("code");if(!r)return x.NextResponse.json({error:"code required"},{status:400});let a=await g`
      SELECT
        p.*,
        pc.brand_name AS company_name,
        pc.master_ref_code AS company_ref_code
      FROM partners p
      LEFT JOIN partner_companies pc ON p.parent_company_id = pc.id
      WHERE p.ref_code = ${r.toUpperCase()}
      LIMIT 1
    `;if(0===a.length)return x.NextResponse.json({error:"Partner not found"},{status:404});let n=a[0];if("suspended"===n.status||"inactive"===n.status)return x.NextResponse.json({error:"Partner account is not active"},{status:403});let i=await g`
      SELECT
        COALESCE(SUM(commission_amount), 0) AS lifetime_earnings,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN commission_amount ELSE 0 END), 0) AS mtd_earnings,
        COUNT(*) AS total_earnings_records
      FROM partner_earnings
      WHERE partner_id = ${n.id} AND status != 'void'
    `,s=await g`
      SELECT
        COUNT(DISTINCT client_id) AS total_clients,
        COUNT(*) AS total_bookings
      FROM bookings
      WHERE partner_id = ${n.id}
    `,o=await g`
      SELECT
        c.id,
        c.full_name,
        c.phone,
        MAX(b.pickup_at) AS last_ride,
        COUNT(b.id) AS total_rides,
        COALESCE(SUM(b.total_price), 0) AS total_revenue
      FROM bookings b
      JOIN clients c ON c.id = b.client_id
      WHERE b.partner_id = ${n.id}
      GROUP BY c.id, c.full_name, c.phone
      ORDER BY last_ride DESC
      LIMIT 20
    `,l=await g`
      SELECT
        pe.id,
        pe.gross_amount,
        pe.commission_amount,
        pe.commission_rate,
        pe.status,
        pe.created_at,
        b.pickup_address,
        b.dropoff_address
      FROM partner_earnings pe
      LEFT JOIN bookings b ON b.id = pe.booking_id
      WHERE pe.partner_id = ${n.id}
      ORDER BY pe.created_at DESC
      LIMIT 20
    `;return await g`
      UPDATE partners SET last_activity_at = NOW() WHERE id = ${n.id}
    `,x.NextResponse.json({partner:{id:n.id,name:n.name,email:n.email,phone:n.phone,type:n.type,status:n.status,ref_code:n.ref_code,commission_rate:n.commission_rate,company_name:n.company_name,created_at:n.created_at},stats:{total_clients:Number(s[0]?.total_clients??0),total_bookings:Number(s[0]?.total_bookings??0),mtd_earnings:Number(i[0]?.mtd_earnings??0),lifetime_earnings:Number(i[0]?.lifetime_earnings??0)},clients:o,earnings:l})}catch(e){return x.NextResponse.json({error:String(e)},{status:500})}}e.s(["GET",()=>f,"dynamic",0,"force-dynamic"],50089);var v=e.i(50089);let C=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/partner/me/route",pathname:"/api/partner/me",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/partner/me/route.ts",nextConfigOutput:"",userland:v}),{workAsyncStorage:N,workUnitAsyncStorage:b,serverHooks:A}=C;function S(){return(0,a.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:b})}async function w(e,t,a){C.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let x="/api/partner/me/route";x=x.replace(/\/index$/,"")||"/";let g=await C.prepare(e,t,{srcPage:x,multiZoneDraftMode:!1});if(!g)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:f,params:v,nextConfig:N,parsedUrl:b,isDraftMode:A,prerenderManifest:S,routerServerContext:w,isOnDemandRevalidate:y,revalidateOnlyGenerated:O,resolvedPathname:T,clientReferenceManifest:k,serverActionsManifest:U}=g,P=(0,o.normalizeAppPath)(x),I=!!(S.dynamicRoutes[P]||S.routes[T]),H=async()=>((null==w?void 0:w.render404)?await w.render404(e,t,b,!1):t.end("This page could not be found"),null);if(I&&!A){let e=!!S.routes[T],t=S.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(N.experimental.adapterPath)return await H();throw new R.NoFallbackError}}let M=null;!I||C.isDev||A||(M="/index"===(M=T)?"/":M);let D=!0===C.isDev||!I,j=I&&!D;U&&k&&(0,s.setManifestsSingleton)({page:x,clientReferenceManifest:k,serverActionsManifest:U});let L=e.method||"GET",q=(0,i.getTracer)(),F=q.getActiveScopeSpan(),$={params:v,prerenderManifest:S,renderOpts:{experimental:{authInterrupts:!!N.experimental.authInterrupts},cacheComponents:!!N.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:N.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>C.onRequestError(e,t,a,n,w)},sharedContext:{buildId:f}},W=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),K=d.NextRequestAdapter.fromNodeNextRequest(W,(0,d.signalFromNodeResponse)(t));try{let s=async e=>C.handle(K,$).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${L} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${L} ${x}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var i,l;let d=async({previousCacheEntry:r})=>{try{if(!o&&y&&O&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await s(n);e.fetchMetrics=$.renderOpts.fetchMetrics;let l=$.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let d=$.renderOpts.collectedTags;if(!I)return await (0,c.sendResponse)(W,B,i,$.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(i.headers);d&&(t[_.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==$.renderOpts.collectedRevalidate&&!($.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&$.renderOpts.collectedRevalidate,a=void 0===$.renderOpts.collectedExpire||$.renderOpts.collectedExpire>=_.INFINITE_CACHE?void 0:$.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await C.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:y})},!1,w),t}},p=await C.handleResponse({req:e,nextConfig:N,cacheKey:M,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:S,isRoutePPREnabled:!1,isOnDemandRevalidate:y,revalidateOnlyGenerated:O,responseGenerator:d,waitUntil:a.waitUntil,isMinimalMode:o});if(!I)return null;if((null==p||null==(i=p.value)?void 0:i.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(l=p.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",y?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let R=(0,m.fromNodeOutgoingHttpHeaders)(p.value.headers);return o&&I||R.delete(_.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||R.get("Cache-Control")||R.set("Cache-Control",(0,E.getCacheControlHeader)(p.cacheControl)),await (0,c.sendResponse)(W,B,new Response(p.value.body,{headers:R,status:p.value.status||200})),null};F?await l(F):await q.withPropagatedContext(e.headers,()=>q.trace(p.BaseServerSpan.handleRequest,{spanName:`${L} ${x}`,kind:i.SpanKind.SERVER,attributes:{"http.method":L,"http.target":e.url}},l))}catch(t){if(t instanceof R.NoFallbackError||await C.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:y})},!1,w),I)throw t;return await (0,c.sendResponse)(W,B,new Response(null,{status:500})),null}}e.s(["handler",()=>w,"patchFetch",()=>S,"routeModule",()=>C,"serverHooks",()=>A,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>b],49823)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0e83c6c3._.js.map