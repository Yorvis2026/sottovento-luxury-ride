module.exports=[93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},13670,e=>{"use strict";var t=e.i(66574),a=e.i(58350),s=e.i(10732),r=e.i(12768),n=e.i(75089),i=e.i(11299),o=e.i(66012),u=e.i(12480),d=e.i(64629),l=e.i(2078),p=e.i(99591),c=e.i(65698),h=e.i(29809),R=e.i(64157),E=e.i(56534),g=e.i(93695);e.i(22981);var _=e.i(4706),m=e.i(16770);let x=(0,e.i(70485).neon)(process.env.DATABASE_URL_UNPOOLED);async function f(){let e=[];try{await x`
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
    `;e.push(`📊 Final dispatch_status distribution: ${JSON.stringify(s)}`);let r=await x`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE dispatch_status = 'not_required'
    `,n=Number(r[0]?.count??0);return 0===n?e.push("✅ CONSISTENCY CHECK PASSED: No bookings left with dispatch_status = not_required"):e.push(`⚠️ WARNING: ${n} bookings still have dispatch_status = not_required — check manually`),m.NextResponse.json({success:!0,results:e})}catch(t){return m.NextResponse.json({error:t.message,results:e},{status:500})}}async function w(){try{let e=await x`
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
    `:[];return m.NextResponse.json({hasDispatchStatus:t,columns:e.map(e=>e.column_name),dispatchStatusCounts:a,notRequiredBookings:s,consistencyIssue:s.length>0})}catch(e){return m.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>w,"POST",()=>f],36207);var T=e.i(36207);let v=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/admin/migrate/route",pathname:"/api/admin/migrate",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/admin/migrate/route.ts",nextConfigOutput:"",userland:T}),{workAsyncStorage:N,workUnitAsyncStorage:C,serverHooks:O}=v;function A(){return(0,s.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:C})}async function b(e,t,s){v.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/admin/migrate/route";m=m.replace(/\/index$/,"")||"/";let x=await v.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!x)return t.statusCode=400,t.end("Bad Request"),null==s.waitUntil||s.waitUntil.call(s,Promise.resolve()),null;let{buildId:f,params:w,nextConfig:T,parsedUrl:N,isDraftMode:C,prerenderManifest:O,routerServerContext:A,isOnDemandRevalidate:b,revalidateOnlyGenerated:y,resolvedPathname:S,clientReferenceManifest:k,serverActionsManifest:q}=x,D=(0,o.normalizeAppPath)(m),P=!!(O.dynamicRoutes[D]||O.routes[S]),U=async()=>((null==A?void 0:A.render404)?await A.render404(e,t,N,!1):t.end("This page could not be found"),null);if(P&&!C){let e=!!O.routes[S],t=O.dynamicRoutes[D];if(t&&!1===t.fallback&&!e){if(T.experimental.adapterPath)return await U();throw new g.NoFallbackError}}let I=null;!P||v.isDev||C||(I="/index"===(I=S)?"/":I);let H=!0===v.isDev||!P,j=P&&!H;q&&k&&(0,i.setManifestsSingleton)({page:m,clientReferenceManifest:k,serverActionsManifest:q});let M=e.method||"GET",L=(0,n.getTracer)(),F=L.getActiveScopeSpan(),B={params:w,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!T.experimental.authInterrupts},cacheComponents:!!T.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,r.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:T.cacheLife,waitUntil:s.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,s,r)=>v.onRequestError(e,t,s,r,A)},sharedContext:{buildId:f}},$=new u.NodeNextRequest(e),W=new u.NodeNextResponse(t),G=d.NextRequestAdapter.fromNodeNextRequest($,(0,d.signalFromNodeResponse)(t));try{let i=async e=>v.handle(G,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=L.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=a.get("next.route");if(s){let t=`${M} ${s}`;e.setAttributes({"next.route":s,"http.route":s,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${m}`)}),o=!!(0,r.getRequestMeta)(e,"minimalMode"),u=async r=>{var n,u;let d=async({previousCacheEntry:a})=>{try{if(!o&&b&&y&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(r);e.fetchMetrics=B.renderOpts.fetchMetrics;let u=B.renderOpts.pendingWaitUntil;u&&s.waitUntil&&(s.waitUntil(u),u=void 0);let d=B.renderOpts.collectedTags;if(!P)return await (0,c.sendResponse)($,W,n,B.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(n.headers);d&&(t[E.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,s=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:_.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:s}}}}catch(t){throw(null==a?void 0:a.isStale)&&await v.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:b})},!1,A),t}},l=await v.handleResponse({req:e,nextConfig:T,cacheKey:I,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:b,revalidateOnlyGenerated:y,responseGenerator:d,waitUntil:s.waitUntil,isMinimalMode:o});if(!P)return null;if((null==l||null==(n=l.value)?void 0:n.kind)!==_.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(u=l.value)?void 0:u.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",b?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,h.fromNodeOutgoingHttpHeaders)(l.value.headers);return o&&P||g.delete(E.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,R.getCacheControlHeader)(l.cacheControl)),await (0,c.sendResponse)($,W,new Response(l.value.body,{headers:g,status:l.value.status||200})),null};F?await u(F):await L.withPropagatedContext(e.headers,()=>L.trace(l.BaseServerSpan.handleRequest,{spanName:`${M} ${m}`,kind:n.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},u))}catch(t){if(t instanceof g.NoFallbackError||await v.onRequestError(e,t,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:b})},!1,A),P)throw t;return await (0,c.sendResponse)($,W,new Response(null,{status:500})),null}}e.s(["handler",()=>b,"patchFetch",()=>A,"routeModule",()=>v,"serverHooks",()=>O,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>C],13670)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__4256ae16._.js.map