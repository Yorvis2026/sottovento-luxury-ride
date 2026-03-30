module.exports=[93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},58303,e=>{"use strict";var t=e.i(39743),a=e.i(37383),s=e.i(16108),n=e.i(1266),r=e.i(10171),i=e.i(44067),o=e.i(7601),d=e.i(3083),u=e.i(88890),l=e.i(37886),c=e.i(63388),p=e.i(46601),h=e.i(24139),R=e.i(78785),E=e.i(2640),g=e.i(93695);e.i(46509);var m=e.i(56592),_=e.i(50974);let x=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function f(){let e=[];try{await x`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS dispatch_status TEXT NOT NULL DEFAULT 'not_required'
    `,e.push("✅ Added dispatch_status column");let t=await x`
      SELECT DISTINCT status, COUNT(*) as count
      FROM bookings
      GROUP BY status
      ORDER BY status
    `;e.push(`📊 Existing status values: ${JSON.stringify(t)}`),await x`
      UPDATE bookings
      SET dispatch_status = 'cancelled'
      WHERE status IN ('cancelled', 'rejected', 'expired')
        AND dispatch_status = 'not_required'
    `,e.push("✅ Mapped cancelled/rejected/expired → dispatch cancelled"),await x`
      UPDATE bookings
      SET dispatch_status = 'assigned'
      WHERE status IN ('accepted', 'in_progress', 'completed', 'assigned')
        AND dispatch_status = 'not_required'
    `,e.push("✅ Mapped accepted/in_progress/completed → dispatch assigned");let a=await x`
      UPDATE bookings
      SET dispatch_status = 'manual_dispatch_required'
      WHERE dispatch_status = 'not_required'
      RETURNING id, status, dispatch_status
    `;e.push(`✅ Reclassified ${a.length} remaining bookings → manual_dispatch_required`),a.length>0&&e.push(`📋 Reclassified bookings: ${JSON.stringify(a.map(e=>({id:e.id.slice(0,8),status:e.status})))}`),await x`
      UPDATE bookings
      SET dispatch_status = 'awaiting_source_owner'
      WHERE status IN ('new', 'offered', 'pending', 'quote_sent')
        AND dispatch_status = 'manual_dispatch_required'
    `,e.push("✅ Refined new/offered/pending/quote_sent → awaiting_source_owner");let s=await x`
      SELECT dispatch_status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status
      ORDER BY dispatch_status
    `;e.push(`📊 Final dispatch_status distribution: ${JSON.stringify(s)}`);let n=await x`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE dispatch_status = 'not_required'
    `,r=Number(n[0]?.count??0);return 0===r?e.push("✅ CONSISTENCY CHECK PASSED: No bookings left with dispatch_status = not_required"):e.push(`⚠️ WARNING: ${r} bookings still have dispatch_status = not_required — check manually`),_.NextResponse.json({success:!0,results:e})}catch(t){return _.NextResponse.json({error:t.message,results:e},{status:500})}}async function w(){try{let e=await x`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position
    `,t=e.some(e=>"dispatch_status"===e.column_name),a=t?await x`
      SELECT dispatch_status, status, COUNT(*) as count
      FROM bookings
      GROUP BY dispatch_status, status
      ORDER BY dispatch_status, status
    `:[],s=t?await x`
      SELECT id, status, dispatch_status, client_name, pickup_at
      FROM bookings
      WHERE dispatch_status = 'not_required'
      ORDER BY created_at DESC
    `:[];return _.NextResponse.json({hasDispatchStatus:t,columns:e.map(e=>e.column_name),dispatchStatusCounts:a,notRequiredBookings:s,consistencyIssue:s.length>0})}catch(e){return _.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>w,"POST",()=>f,"dynamic",0,"force-dynamic"],22011);var v=e.i(22011);let T=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/admin/migrate/route",pathname:"/api/admin/migrate",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/migrate/route.ts",nextConfigOutput:"",userland:v}),{workAsyncStorage:N,workUnitAsyncStorage:C,serverHooks:O}=T;function y(){return(0,s.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:C})}async function A(e,t,s){T.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let _="/api/admin/migrate/route";_=_.replace(/\/index$/,"")||"/";let x=await T.prepare(e,t,{srcPage:_,multiZoneDraftMode:!1});if(!x)return t.statusCode=400,t.end("Bad Request"),null==s.waitUntil||s.waitUntil.call(s,Promise.resolve()),null;let{buildId:f,params:w,nextConfig:v,parsedUrl:N,isDraftMode:C,prerenderManifest:O,routerServerContext:y,isOnDemandRevalidate:A,revalidateOnlyGenerated:b,resolvedPathname:S,clientReferenceManifest:k,serverActionsManifest:q}=x,D=(0,o.normalizeAppPath)(_),P=!!(O.dynamicRoutes[D]||O.routes[S]),U=async()=>((null==y?void 0:y.render404)?await y.render404(e,t,N,!1):t.end("This page could not be found"),null);if(P&&!C){let e=!!O.routes[S],t=O.dynamicRoutes[D];if(t&&!1===t.fallback&&!e){if(v.experimental.adapterPath)return await U();throw new g.NoFallbackError}}let I=null;!P||T.isDev||C||(I="/index"===(I=S)?"/":I);let H=!0===T.isDev||!P,j=P&&!H;q&&k&&(0,i.setManifestsSingleton)({page:_,clientReferenceManifest:k,serverActionsManifest:q});let M=e.method||"GET",L=(0,r.getTracer)(),F=L.getActiveScopeSpan(),B={params:w,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!v.experimental.authInterrupts},cacheComponents:!!v.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:v.cacheLife,waitUntil:s.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,s,n)=>T.onRequestError(e,t,s,n,y)},sharedContext:{buildId:f}},$=new d.NodeNextRequest(e),W=new d.NodeNextResponse(t),G=u.NextRequestAdapter.fromNodeNextRequest($,(0,u.signalFromNodeResponse)(t));try{let i=async e=>T.handle(G,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=L.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=a.get("next.route");if(s){let t=`${M} ${s}`;e.setAttributes({"next.route":s,"http.route":s,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${_}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),d=async n=>{var r,d;let u=async({previousCacheEntry:a})=>{try{if(!o&&A&&b&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let r=await i(n);e.fetchMetrics=B.renderOpts.fetchMetrics;let d=B.renderOpts.pendingWaitUntil;d&&s.waitUntil&&(s.waitUntil(d),d=void 0);let u=B.renderOpts.collectedTags;if(!P)return await (0,p.sendResponse)($,W,r,B.renderOpts.pendingWaitUntil),null;{let e=await r.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(r.headers);u&&(t[E.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,s=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:m.CachedRouteKind.APP_ROUTE,status:r.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:s}}}}catch(t){throw(null==a?void 0:a.isStale)&&await T.onRequestError(e,t,{routerKind:"App Router",routePath:_,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:A})},!1,y),t}},l=await T.handleResponse({req:e,nextConfig:v,cacheKey:I,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:b,responseGenerator:u,waitUntil:s.waitUntil,isMinimalMode:o});if(!P)return null;if((null==l||null==(r=l.value)?void 0:r.kind)!==m.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(d=l.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,h.fromNodeOutgoingHttpHeaders)(l.value.headers);return o&&P||g.delete(E.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,R.getCacheControlHeader)(l.cacheControl)),await (0,p.sendResponse)($,W,new Response(l.value.body,{headers:g,status:l.value.status||200})),null};F?await d(F):await L.withPropagatedContext(e.headers,()=>L.trace(l.BaseServerSpan.handleRequest,{spanName:`${M} ${_}`,kind:r.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},d))}catch(t){if(t instanceof g.NoFallbackError||await T.onRequestError(e,t,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:A})},!1,y),P)throw t;return await (0,p.sendResponse)($,W,new Response(null,{status:500})),null}}e.s(["handler",()=>A,"patchFetch",()=>y,"routeModule",()=>T,"serverHooks",()=>O,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>C],58303)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__396076fc._.js.map