module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},47056,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),n=e.i(1266),s=e.i(10171),i=e.i(44067),o=e.i(7601),l=e.i(3083),d=e.i(88890),c=e.i(37886),u=e.i(63388),p=e.i(46601),h=e.i(24139),R=e.i(78785),E=e.i(2640),v=e.i(93695);e.i(46509);var g=e.i(56592),x=e.i(50974);let m=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function _(e){try{let t=await e.json().catch(()=>({})),r=e.headers.get("x-cleanup-secret")??t.secret,a=process.env.CLEANUP_SECRET??"sln-cleanup-2026";if(r!==a)return x.NextResponse.json({error:"Unauthorized"},{status:401});let n=await m`
      SELECT COUNT(*) AS total FROM bookings
      WHERE status NOT IN ('archived', 'cancelled')
    `,s=Number(n[0]?.total??0),i=await m`
      UPDATE bookings
      SET
        status = 'archived',
        dispatch_status = 'archived',
        updated_at = NOW()
      WHERE status NOT IN ('archived')
        AND (
          -- Test client names
          LOWER(COALESCE(
            (SELECT full_name FROM clients WHERE id = bookings.client_id LIMIT 1),
            ''
          )) SIMILAR TO '%(test|pipeline|demo|prueba|sample)%'
          -- OR test addresses
          OR UPPER(COALESCE(bookings.pickup_address, '')) SIMILAR TO '%(MCO|DISNEY|TBD|TEST|SAMPLE)%'
          OR UPPER(COALESCE(bookings.dropoff_address, '')) SIMILAR TO '%(MCO|DISNEY|TBD|TEST|SAMPLE)%'
          -- OR any booking in a non-active state (cleanup all pending/new/offered/assigned)
          OR bookings.status IN ('new', 'offered', 'pending_dispatch', 'accepted', 'assigned', 'completed', 'cancelled')
          -- OR bookings with driver_rejected or needs_correction dispatch_status
          OR bookings.dispatch_status IN ('driver_rejected', 'needs_correction', 'manual_dispatch_required', 'needs_review')
        )
      RETURNING id
    `,o=i.length,l=await m`
      SELECT COUNT(*) AS total FROM bookings
      WHERE status NOT IN ('archived', 'cancelled')
    `,d=Number(l[0]?.total??0);try{await m`
        INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
        VALUES (
          'system',
          gen_random_uuid(),
          'test_environment_cleanup',
          ${JSON.stringify({archived_count:o,total_before:s,total_after:d,timestamp:new Date().toISOString()})}::jsonb,
          NOW()
        )
      `}catch{}return x.NextResponse.json({success:!0,message:`Test environment cleaned. ${o} bookings archived.`,archived_count:o,total_before:s,total_after:d,archived_ids:i.map(e=>e.id)})}catch(e){return console.error("[cleanup-test]",e),x.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}async function f(e){try{let t=e.nextUrl.searchParams.get("secret"),r=process.env.CLEANUP_SECRET??"sln-cleanup-2026";if(t!==r)return x.NextResponse.json({error:"Unauthorized"},{status:401});let a=await m`
      SELECT
        b.id,
        b.status,
        b.dispatch_status,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at,
        b.created_at,
        c.full_name AS client_name
      FROM bookings b
      LEFT JOIN clients c ON c.id = b.client_id
      WHERE b.status NOT IN ('archived')
      ORDER BY b.created_at DESC
    `;return x.NextResponse.json({preview:!0,total_to_archive:a.length,bookings:a})}catch(e){return x.NextResponse.json({error:e?.message},{status:500})}}e.s(["GET",()=>f,"POST",()=>_,"dynamic",0,"force-dynamic"],20095);var N=e.i(20095);let O=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/cleanup-test/route",pathname:"/api/admin/cleanup-test",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/cleanup-test/route.ts",nextConfigOutput:"",userland:N}),{workAsyncStorage:b,workUnitAsyncStorage:T,serverHooks:C}=O;function w(){return(0,a.patchFetch)({workAsyncStorage:b,workUnitAsyncStorage:T})}async function S(e,t,a){O.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let x="/api/admin/cleanup-test/route";x=x.replace(/\/index$/,"")||"/";let m=await O.prepare(e,t,{srcPage:x,multiZoneDraftMode:!1});if(!m)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:_,params:f,nextConfig:N,parsedUrl:b,isDraftMode:T,prerenderManifest:C,routerServerContext:w,isOnDemandRevalidate:S,revalidateOnlyGenerated:A,resolvedPathname:y,clientReferenceManifest:k,serverActionsManifest:I}=m,P=(0,o.normalizeAppPath)(x),U=!!(C.dynamicRoutes[P]||C.routes[y]),j=async()=>((null==w?void 0:w.render404)?await w.render404(e,t,b,!1):t.end("This page could not be found"),null);if(U&&!T){let e=!!C.routes[y],t=C.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(N.experimental.adapterPath)return await j();throw new v.NoFallbackError}}let L=null;!U||O.isDev||T||(L="/index"===(L=y)?"/":L);let D=!0===O.isDev||!U,M=U&&!D;I&&k&&(0,i.setManifestsSingleton)({page:x,clientReferenceManifest:k,serverActionsManifest:I});let H=e.method||"GET",q=(0,s.getTracer)(),F=q.getActiveScopeSpan(),$={params:f,prerenderManifest:C,renderOpts:{experimental:{authInterrupts:!!N.experimental.authInterrupts},cacheComponents:!!N.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:N.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>O.onRequestError(e,t,a,n,w)},sharedContext:{buildId:_}},W=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),K=d.NextRequestAdapter.fromNodeNextRequest(W,(0,d.signalFromNodeResponse)(t));try{let i=async e=>O.handle(K,$).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${H} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${x}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var s,l;let d=async({previousCacheEntry:r})=>{try{if(!o&&S&&A&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await i(n);e.fetchMetrics=$.renderOpts.fetchMetrics;let l=$.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let d=$.renderOpts.collectedTags;if(!U)return await (0,p.sendResponse)(W,B,s,$.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(s.headers);d&&(t[E.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==$.renderOpts.collectedRevalidate&&!($.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&$.renderOpts.collectedRevalidate,a=void 0===$.renderOpts.collectedExpire||$.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:$.renderOpts.collectedExpire;return{value:{kind:g.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await O.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:S})},!1,w),t}},c=await O.handleResponse({req:e,nextConfig:N,cacheKey:L,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:C,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:A,responseGenerator:d,waitUntil:a.waitUntil,isMinimalMode:o});if(!U)return null;if((null==c||null==(s=c.value)?void 0:s.kind)!==g.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(l=c.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",S?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),T&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let v=(0,h.fromNodeOutgoingHttpHeaders)(c.value.headers);return o&&U||v.delete(E.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||v.get("Cache-Control")||v.set("Cache-Control",(0,R.getCacheControlHeader)(c.cacheControl)),await (0,p.sendResponse)(W,B,new Response(c.value.body,{headers:v,status:c.value.status||200})),null};F?await l(F):await q.withPropagatedContext(e.headers,()=>q.trace(c.BaseServerSpan.handleRequest,{spanName:`${H} ${x}`,kind:s.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},l))}catch(t){if(t instanceof v.NoFallbackError||await O.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:S})},!1,w),U)throw t;return await (0,p.sendResponse)(W,B,new Response(null,{status:500})),null}}e.s(["handler",()=>S,"patchFetch",()=>w,"routeModule",()=>O,"serverHooks",()=>C,"workAsyncStorage",()=>b,"workUnitAsyncStorage",()=>T],47056)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__4a8d109f._.js.map