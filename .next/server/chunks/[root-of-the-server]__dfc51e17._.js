module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},32822,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),o=e.i(1266),n=e.i(10171),s=e.i(44067),i=e.i(7601),c=e.i(3083),l=e.i(88890),d=e.i(37886),u=e.i(63388),_=e.i(46601),p=e.i(24139),E=e.i(78785),T=e.i(2640),N=e.i(93695);e.i(46509);var g=e.i(56592),h=e.i(50974);let R=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function A(e,t,r){try{await r(),e.push({step:t,status:"ok"})}catch(a){let r=a?.message??String(a);r.includes("already exists")||r.includes("duplicate column")||r.includes("DuplicateColumn")?e.push({step:t,status:"already_exists"}):e.push({step:t,status:"error",detail:r})}}async function L(e){let t=[];await A(t,"bookings.source_reference",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_reference TEXT`),await A(t,"bookings.source_tablet_id",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_tablet_id TEXT`),await A(t,"bookings.source_campaign_id",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_campaign_id TEXT`),await A(t,"bookings.source_channel",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_channel TEXT`),await A(t,"bookings.source_metadata",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_metadata JSONB`),await A(t,"bookings.source_locked_at",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_locked_at TIMESTAMPTZ`),await A(t,"bookings.source_override_reason",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_override_reason TEXT`),await A(t,"bookings.source_override_timestamp",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_override_timestamp TIMESTAMPTZ`),await A(t,"bookings.source_override_admin_id",()=>R`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_override_admin_id UUID`),await A(t,"create_lead_origin_snapshots",()=>R`
      CREATE TABLE IF NOT EXISTS lead_origin_snapshots (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        source_type       TEXT NOT NULL,
        source_driver_id  UUID,
        source_reference  TEXT,
        source_tablet_id  TEXT,
        source_campaign_id TEXT,
        source_channel    TEXT,
        source_metadata   JSONB,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(booking_id)
      )
    `),await A(t,"backfill_source_reference",()=>R`
      UPDATE bookings
      SET source_reference = COALESCE(source_code, 'UNKNOWN')
      WHERE source_reference IS NULL
        AND source_locked_at IS NULL
    `),await A(t,"backfill_source_channel",()=>R`
      UPDATE bookings
      SET source_channel = CASE
        WHEN booking_origin = 'tablet' THEN 'tablet'
        WHEN source_type IN ('qr', 'referral') THEN 'referral'
        WHEN source_driver_id IS NOT NULL THEN 'referral'
        ELSE 'website'
      END
      WHERE source_channel IS NULL
        AND source_locked_at IS NULL
    `),await A(t,"backfill_source_type_driver_direct",()=>R`
      UPDATE bookings
      SET source_type = 'driver_direct'
      WHERE source_type IN ('referral', 'qr')
        AND source_driver_id IS NOT NULL
        AND source_locked_at IS NULL
    `),await A(t,"backfill_source_type_tablet",()=>R`
      UPDATE bookings
      SET source_type = 'tablet'
      WHERE booking_origin = 'tablet'
        AND source_locked_at IS NULL
    `),await A(t,"backfill_source_type_direct_web",()=>R`
      UPDATE bookings
      SET source_type = 'direct_web'
      WHERE source_type IN ('direct', 'booking', NULL)
        AND source_driver_id IS NULL
        AND booking_origin != 'tablet'
        AND source_locked_at IS NULL
    `),await A(t,"lock_existing_sourced_bookings",()=>R`
      UPDATE bookings
      SET source_locked_at = created_at
      WHERE source_locked_at IS NULL
        AND (source_driver_id IS NOT NULL OR source_type IS NOT NULL)
    `);let[r]=await R`
    SELECT COUNT(*) AS cnt
    FROM information_schema.columns
    WHERE table_name = 'bookings'
      AND column_name IN (
        'source_reference', 'source_tablet_id', 'source_campaign_id',
        'source_channel', 'source_metadata', 'source_locked_at',
        'source_override_reason', 'source_override_timestamp', 'source_override_admin_id'
      )
  `,[a]=await R`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'lead_origin_snapshots'
    ) AS exists
  `,[o]=await R`
    SELECT
      COUNT(*) FILTER (WHERE source_locked_at IS NOT NULL) AS locked,
      COUNT(*) FILTER (WHERE source_locked_at IS NULL) AS unlocked,
      COUNT(*) FILTER (WHERE source_reference IS NOT NULL) AS has_reference,
      COUNT(*) FILTER (WHERE source_channel IS NOT NULL) AS has_channel,
      COUNT(*) FILTER (WHERE source_type IS NOT NULL) AS has_type
    FROM bookings
  `,n=t.filter(e=>"error"===e.status);return h.NextResponse.json({ok:0===n.length,steps:t,errors:n.length>0?n:void 0,verification:{new_columns_present:9===Number(r.cnt),new_columns_count:Number(r.cnt),lead_origin_snapshots_exists:a.exists,backfill:{locked:Number(o.locked),unlocked:Number(o.unlocked),has_reference:Number(o.has_reference),has_channel:Number(o.has_channel),has_type:Number(o.has_type)}}})}e.s(["GET",()=>L,"dynamic",0,"force-dynamic"],56827);var m=e.i(56827);let b=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/migrate-lead-origin/route",pathname:"/api/admin/migrate-lead-origin",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/migrate-lead-origin/route.ts",nextConfigOutput:"",userland:m}),{workAsyncStorage:S,workUnitAsyncStorage:k,serverHooks:U}=b;function v(){return(0,a.patchFetch)({workAsyncStorage:S,workUnitAsyncStorage:k})}async function f(e,t,a){b.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/admin/migrate-lead-origin/route";h=h.replace(/\/index$/,"")||"/";let R=await b.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:A,params:L,nextConfig:m,parsedUrl:S,isDraftMode:k,prerenderManifest:U,routerServerContext:v,isOnDemandRevalidate:f,revalidateOnlyGenerated:x,resolvedPathname:I,clientReferenceManifest:O,serverActionsManifest:w}=R,C=(0,i.normalizeAppPath)(h),D=!!(U.dynamicRoutes[C]||U.routes[I]),y=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,S,!1):t.end("This page could not be found"),null);if(D&&!k){let e=!!U.routes[I],t=U.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(m.experimental.adapterPath)return await y();throw new N.NoFallbackError}}let H=null;!D||b.isDev||k||(H="/index"===(H=I)?"/":H);let P=!0===b.isDev||!D,M=D&&!P;w&&O&&(0,s.setManifestsSingleton)({page:h,clientReferenceManifest:O,serverActionsManifest:w});let F=e.method||"GET",X=(0,n.getTracer)(),q=X.getActiveScopeSpan(),W={params:L,prerenderManifest:U,renderOpts:{experimental:{authInterrupts:!!m.experimental.authInterrupts},cacheComponents:!!m.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:m.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,o)=>b.onRequestError(e,t,a,o,v)},sharedContext:{buildId:A}},j=new c.NodeNextRequest(e),B=new c.NodeNextResponse(t),K=l.NextRequestAdapter.fromNodeNextRequest(j,(0,l.signalFromNodeResponse)(t));try{let s=async e=>b.handle(K,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=X.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${F} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${F} ${h}`)}),i=!!(0,o.getRequestMeta)(e,"minimalMode"),c=async o=>{var n,c;let l=async({previousCacheEntry:r})=>{try{if(!i&&f&&x&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(o);e.fetchMetrics=W.renderOpts.fetchMetrics;let c=W.renderOpts.pendingWaitUntil;c&&a.waitUntil&&(a.waitUntil(c),c=void 0);let l=W.renderOpts.collectedTags;if(!D)return await (0,_.sendResponse)(j,B,n,W.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[T.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=T.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,a=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=T.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:g.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await b.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:f})},!1,v),t}},d=await b.handleResponse({req:e,nextConfig:m,cacheKey:H,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:U,isRoutePPREnabled:!1,isOnDemandRevalidate:f,revalidateOnlyGenerated:x,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:i});if(!D)return null;if((null==d||null==(n=d.value)?void 0:n.kind)!==g.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(c=d.value)?void 0:c.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",f?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),k&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let N=(0,p.fromNodeOutgoingHttpHeaders)(d.value.headers);return i&&D||N.delete(T.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||N.get("Cache-Control")||N.set("Cache-Control",(0,E.getCacheControlHeader)(d.cacheControl)),await (0,_.sendResponse)(j,B,new Response(d.value.body,{headers:N,status:d.value.status||200})),null};q?await c(q):await X.withPropagatedContext(e.headers,()=>X.trace(d.BaseServerSpan.handleRequest,{spanName:`${F} ${h}`,kind:n.SpanKind.SERVER,attributes:{"http.method":F,"http.target":e.url}},c))}catch(t){if(t instanceof N.NoFallbackError||await b.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:f})},!1,v),D)throw t;return await (0,_.sendResponse)(j,B,new Response(null,{status:500})),null}}e.s(["handler",()=>f,"patchFetch",()=>v,"routeModule",()=>b,"serverHooks",()=>U,"workAsyncStorage",()=>S,"workUnitAsyncStorage",()=>k],32822)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__dfc51e17._.js.map