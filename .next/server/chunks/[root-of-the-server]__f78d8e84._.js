module.exports=[93695,(e,t,s)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,s)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,s)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,s)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,s)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,s)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},92908,e=>{"use strict";var t=e.i(39743),s=e.i(37383),a=e.i(16108),n=e.i(1266),i=e.i(10171),r=e.i(44067),o=e.i(7601),d=e.i(3083),u=e.i(88890),p=e.i(37886),c=e.i(63388),l=e.i(46601),h=e.i(24139),_=e.i(78785),g=e.i(2640),E=e.i(93695);e.i(46509);var N=e.i(56592),R=e.i(50974);let m=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function x(){let e=[];try{let t=await m`
      SELECT id, status, dispatch_status, payment_status, pickup_at
      FROM bookings
      ORDER BY created_at DESC
    `;e.push(`📊 Total bookings: ${t.length}`),e.push(`📋 Current state: ${JSON.stringify(t.map(e=>({id:e.id?.slice(0,8),status:e.status,dispatch_status:e.dispatch_status,payment_status:e.payment_status})))}`);let s=await m`
      UPDATE bookings
      SET
        status = 'pending_dispatch',
        dispatch_status = CASE
          WHEN source_code IS NOT NULL AND source_driver_id IS NOT NULL THEN 'awaiting_source_owner'
          ELSE 'awaiting_sln_member'
        END,
        offer_expires_at = CASE
          WHEN source_code IS NOT NULL AND source_driver_id IS NOT NULL
            THEN NOW() + INTERVAL '120 seconds'
          ELSE NOW() + INTERVAL '60 seconds'
        END,
        offer_status = 'pending',
        offer_stage = CASE
          WHEN source_code IS NOT NULL AND source_driver_id IS NOT NULL THEN 'source_owner'
          ELSE 'sln_member'
        END,
        updated_at = NOW()
      WHERE payment_status = 'paid'
        AND status IN ('pending', 'pending_payment', 'pending_dispatch')
        AND dispatch_status IN ('pending', 'not_required', 'awaiting_payment')
      RETURNING id, status, dispatch_status
    `;e.push(`✅ Fixed ${s.length} paid bookings → dispatch buckets`),s.length>0&&e.push(`📋 Fixed: ${JSON.stringify(s.map(e=>({id:e.id?.slice(0,8),status:e.status,dispatch_status:e.dispatch_status})))}`),await m`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status IN ('accepted', 'in_progress', 'assigned')
        AND dispatch_status = 'not_required'
    `,e.push("✅ Mapped accepted/in_progress → dispatch: assigned"),await m`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status = 'completed'
        AND dispatch_status = 'not_required'
    `,e.push("✅ Mapped completed → dispatch: assigned"),await m`
      UPDATE bookings
      SET dispatch_status = 'cancelled'
      WHERE status IN ('cancelled', 'rejected', 'expired')
        AND dispatch_status = 'not_required'
    `,e.push("✅ Mapped cancelled/rejected/expired → dispatch: cancelled");let a=await m`
      UPDATE bookings
      SET dispatch_status = 'manual_dispatch_required'
      WHERE dispatch_status IN ('not_required', 'pending')
        AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress')
      RETURNING id, status, dispatch_status
    `;e.push(`✅ Catch-all: ${a.length} bookings → manual_dispatch_required`);let n=await m`
      SELECT id, status, dispatch_status, payment_status
      FROM bookings
      WHERE (
        -- Paid bookings not in any dispatch bucket
        (payment_status = 'paid' AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress')
          AND dispatch_status NOT IN ('awaiting_source_owner', 'awaiting_sln_member', 'manual_dispatch_required', 'assigned'))
        OR
        -- Active bookings with not_required
        (dispatch_status = 'not_required' AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress'))
      )
    `;0===n.length?e.push("✅ CONSISTENCY CHECK PASSED: All paid bookings are in dispatch buckets"):(e.push(`⚠️ WARNING: ${n.length} bookings still inconsistent`),e.push(JSON.stringify(n.map(e=>({id:e.id?.slice(0,8),status:e.status,dispatch_status:e.dispatch_status,payment_status:e.payment_status})))));let i=await m`
      SELECT dispatch_status, status, payment_status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status, status, payment_status
      ORDER BY dispatch_status, status
    `;return e.push(`📊 Final distribution: ${JSON.stringify(i)}`),R.NextResponse.json({success:!0,results:e,fixed:s.length+a.length,paidFixed:s.length})}catch(t){return R.NextResponse.json({error:t.message,results:e},{status:500})}}async function T(){try{let e=await m`
      SELECT dispatch_status, status, payment_status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status, status, payment_status
      ORDER BY dispatch_status, status
    `,t=await m`
      SELECT id, status, dispatch_status, payment_status, pickup_at, created_at
      FROM bookings
      WHERE (
        (payment_status = 'paid' AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress')
          AND dispatch_status NOT IN ('awaiting_source_owner', 'awaiting_sln_member', 'manual_dispatch_required', 'assigned'))
        OR
        (dispatch_status IN ('not_required', 'pending') AND status NOT IN ('completed', 'cancelled', 'rejected', 'expired', 'assigned', 'in_progress'))
      )
      ORDER BY created_at DESC
    `;return R.NextResponse.json({distribution:e,inconsistentBookings:t,hasInconsistency:t.length>0,message:t.length>0?`⚠️ ${t.length} bookings need reclassification — POST to this endpoint to fix`:"✅ All bookings have consistent dispatch_status"})}catch(e){return R.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>T,"POST",()=>x,"dynamic",0,"force-dynamic"],76329);var y=e.i(76329);let f=new t.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/admin/reclassify/route",pathname:"/api/admin/reclassify",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/reclassify/route.ts",nextConfigOutput:"",userland:y}),{workAsyncStorage:w,workUnitAsyncStorage:A,serverHooks:O}=f;function v(){return(0,a.patchFetch)({workAsyncStorage:w,workUnitAsyncStorage:A})}async function b(e,t,a){f.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let R="/api/admin/reclassify/route";R=R.replace(/\/index$/,"")||"/";let m=await f.prepare(e,t,{srcPage:R,multiZoneDraftMode:!1});if(!m)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:x,params:T,nextConfig:y,parsedUrl:w,isDraftMode:A,prerenderManifest:O,routerServerContext:v,isOnDemandRevalidate:b,revalidateOnlyGenerated:S,resolvedPathname:C,clientReferenceManifest:k,serverActionsManifest:D}=m,I=(0,o.normalizeAppPath)(R),P=!!(O.dynamicRoutes[I]||O.routes[C]),U=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,w,!1):t.end("This page could not be found"),null);if(P&&!A){let e=!!O.routes[C],t=O.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(y.experimental.adapterPath)return await U();throw new E.NoFallbackError}}let q=null;!P||f.isDev||A||(q="/index"===(q=C)?"/":q);let H=!0===f.isDev||!P,L=P&&!H;D&&k&&(0,r.setManifestsSingleton)({page:R,clientReferenceManifest:k,serverActionsManifest:D});let j=e.method||"GET",M=(0,i.getTracer)(),F=M.getActiveScopeSpan(),$={params:T,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!y.experimental.authInterrupts},cacheComponents:!!y.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:y.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,s,a,n)=>f.onRequestError(e,t,a,n,v)},sharedContext:{buildId:x}},W=new d.NodeNextRequest(e),B=new d.NodeNextResponse(t),G=u.NextRequestAdapter.fromNodeNextRequest(W,(0,u.signalFromNodeResponse)(t));try{let r=async e=>f.handle(G,$).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let s=M.getRootSpanAttributes();if(!s)return;if(s.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${s.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=s.get("next.route");if(a){let t=`${j} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${j} ${R}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),d=async n=>{var i,d;let u=async({previousCacheEntry:s})=>{try{if(!o&&b&&S&&!s)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await r(n);e.fetchMetrics=$.renderOpts.fetchMetrics;let d=$.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let u=$.renderOpts.collectedTags;if(!P)return await (0,l.sendResponse)(W,B,i,$.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(i.headers);u&&(t[g.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let s=void 0!==$.renderOpts.collectedRevalidate&&!($.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&$.renderOpts.collectedRevalidate,a=void 0===$.renderOpts.collectedExpire||$.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:$.renderOpts.collectedExpire;return{value:{kind:N.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:s,expire:a}}}}catch(t){throw(null==s?void 0:s.isStale)&&await f.onRequestError(e,t,{routerKind:"App Router",routePath:R,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:L,isOnDemandRevalidate:b})},!1,v),t}},p=await f.handleResponse({req:e,nextConfig:y,cacheKey:q,routeKind:s.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:b,revalidateOnlyGenerated:S,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:o});if(!P)return null;if((null==p||null==(i=p.value)?void 0:i.kind)!==N.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(d=p.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",b?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let E=(0,h.fromNodeOutgoingHttpHeaders)(p.value.headers);return o&&P||E.delete(g.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||E.get("Cache-Control")||E.set("Cache-Control",(0,_.getCacheControlHeader)(p.cacheControl)),await (0,l.sendResponse)(W,B,new Response(p.value.body,{headers:E,status:p.value.status||200})),null};F?await d(F):await M.withPropagatedContext(e.headers,()=>M.trace(p.BaseServerSpan.handleRequest,{spanName:`${j} ${R}`,kind:i.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},d))}catch(t){if(t instanceof E.NoFallbackError||await f.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:L,isOnDemandRevalidate:b})},!1,v),P)throw t;return await (0,l.sendResponse)(W,B,new Response(null,{status:500})),null}}e.s(["handler",()=>b,"patchFetch",()=>v,"routeModule",()=>f,"serverHooks",()=>O,"workAsyncStorage",()=>w,"workUnitAsyncStorage",()=>A],92908)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__f78d8e84._.js.map