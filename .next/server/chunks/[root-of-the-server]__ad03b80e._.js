module.exports=[93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},68755,e=>{"use strict";var t=e.i(39743),a=e.i(37383),r=e.i(16108),s=e.i(1266),n=e.i(10171),i=e.i(44067),o=e.i(7601),d=e.i(3083),l=e.i(88890),p=e.i(37886),u=e.i(63388),c=e.i(46601),_=e.i(24139),f=e.i(78785),g=e.i(2640),h=e.i(93695);e.i(46509);var E=e.i(56592),x=e.i(50974);let T=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED),m=e=>new Promise(t=>setTimeout(t,e));async function N(e){let t=e.headers.get("authorization");if(process.env.CRON_SECRET&&t!==`Bearer ${process.env.CRON_SECRET}`)return x.NextResponse.json({error:"Unauthorized"},{status:401});let a=process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:"https://www.sottoventoluxuryride.com";return(async()=>{for(let e of[15e3,3e4,45e3]){await m(e);try{await fetch(`${a}/api/dispatch/engine`,{method:"POST",headers:{"Content-Type":"application/json"}})}catch{}}})(),w()}async function R(){return w()}async function w(){let e=new Date().toISOString(),t=[],a=0;try{await T`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS offer_stage TEXT DEFAULT 'source_owner',
      ADD COLUMN IF NOT EXISTS offer_status TEXT DEFAULT 'pending'
    `,await T`
      CREATE TABLE IF NOT EXISTS dispatch_log (
        id SERIAL PRIMARY KEY,
        booking_id TEXT NOT NULL,
        previous_dispatch_status TEXT,
        new_dispatch_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;let r=await T`
      SELECT
        id,
        status,
        dispatch_status,
        offer_stage,
        offer_status,
        offer_expires_at,
        offer_sent_at
      FROM bookings
      WHERE
        dispatch_status IN ('awaiting_source_owner', 'awaiting_sln_member')
        AND offer_expires_at IS NOT NULL
        AND offer_expires_at <= NOW()
        AND offer_status = 'pending'
        AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
      FOR UPDATE SKIP LOCKED
    `;t.push(`📋 Found ${r.length} expired offer(s)`);let s=r.filter(e=>"awaiting_source_owner"===e.dispatch_status);for(let e of s){let r=await T`
        SELECT id, status, dispatch_status
        FROM bookings
        WHERE id = ${e.id}
          AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
          AND dispatch_status = 'awaiting_source_owner'
          AND offer_status = 'pending'
        LIMIT 1
      `;if(0===r.length){t.push(`⚠️ Booking ${e.id.slice(0,8)} — skipped (safety check failed)`);continue}await T`
        UPDATE bookings
        SET
          dispatch_status = 'awaiting_sln_member',
          offer_sent_at = NOW(),
          offer_expires_at = NOW() + INTERVAL '30 minutes',
          offer_stage = 'sln_member',
          offer_status = 'pending',
          updated_at = NOW()
        WHERE id = ${e.id}
          AND dispatch_status = 'awaiting_source_owner'
          AND offer_status = 'pending'
          AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
      `,await T`
        INSERT INTO dispatch_log (
          booking_id,
          previous_dispatch_status,
          new_dispatch_status,
          reason,
          metadata
        ) VALUES (
          ${e.id},
          'awaiting_source_owner',
          'awaiting_sln_member',
          'expired',
          ${JSON.stringify({expired_at:new Date().toISOString(),offer_stage_before:e.offer_stage,booking_status:e.status})}::jsonb
        )
      `,t.push(`✅ Booking ${e.id.slice(0,8)}: source_owner_offer_expired → awaiting_sln_member`),a++}let n=r.filter(e=>"awaiting_sln_member"===e.dispatch_status);for(let e of n){let r=await T`
        SELECT id, status, dispatch_status
        FROM bookings
        WHERE id = ${e.id}
          AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
          AND dispatch_status = 'awaiting_sln_member'
          AND offer_status = 'pending'
        LIMIT 1
      `;if(0===r.length){t.push(`⚠️ Booking ${e.id.slice(0,8)} — skipped (safety check failed)`);continue}await T`
        UPDATE bookings
        SET
          dispatch_status = 'manual_dispatch_required',
          offer_expires_at = NULL,
          offer_stage = 'manual',
          offer_status = 'pending',
          updated_at = NOW()
        WHERE id = ${e.id}
          AND dispatch_status = 'awaiting_sln_member'
          AND offer_status = 'pending'
          AND status NOT IN ('assigned', 'cancelled', 'completed', 'rejected', 'expired')
      `,await T`
        INSERT INTO dispatch_log (
          booking_id,
          previous_dispatch_status,
          new_dispatch_status,
          reason,
          metadata
        ) VALUES (
          ${e.id},
          'awaiting_sln_member',
          'manual_dispatch_required',
          'expired',
          ${JSON.stringify({expired_at:new Date().toISOString(),offer_stage_before:e.offer_stage,booking_status:e.status})}::jsonb
        )
      `,t.push(`✅ Booking ${e.id.slice(0,8)}: sln_member_offer_expired → manual_dispatch_required`),a++}let i={success:!0,started_at:e,completed_at:new Date().toISOString(),expired_offers_found:r.length,transitions_made:a,source_owner_expired:s.length,sln_member_expired:n.length,log:t};return x.NextResponse.json(i)}catch(a){return x.NextResponse.json({success:!1,error:a.message,started_at:e,log:t},{status:500})}}e.s(["GET",()=>N,"POST",()=>R,"dynamic",0,"force-dynamic"],57716);var A=e.i(57716);let v=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/dispatch/engine/route",pathname:"/api/dispatch/engine",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/dispatch/engine/route.ts",nextConfigOutput:"",userland:A}),{workAsyncStorage:O,workUnitAsyncStorage:S,serverHooks:b}=v;function C(){return(0,r.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:S})}async function D(e,t,r){v.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let x="/api/dispatch/engine/route";x=x.replace(/\/index$/,"")||"/";let T=await v.prepare(e,t,{srcPage:x,multiZoneDraftMode:!1});if(!T)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:m,params:N,nextConfig:R,parsedUrl:w,isDraftMode:A,prerenderManifest:O,routerServerContext:S,isOnDemandRevalidate:b,revalidateOnlyGenerated:C,resolvedPathname:D,clientReferenceManifest:y,serverActionsManifest:I}=T,L=(0,o.normalizeAppPath)(x),k=!!(O.dynamicRoutes[L]||O.routes[D]),U=async()=>((null==S?void 0:S.render404)?await S.render404(e,t,w,!1):t.end("This page could not be found"),null);if(k&&!A){let e=!!O.routes[D],t=O.dynamicRoutes[L];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await U();throw new h.NoFallbackError}}let P=null;!k||v.isDev||A||(P="/index"===(P=D)?"/":P);let j=!0===v.isDev||!k,M=k&&!j;I&&y&&(0,i.setManifestsSingleton)({page:x,clientReferenceManifest:y,serverActionsManifest:I});let $=e.method||"GET",q=(0,n.getTracer)(),H=q.getActiveScopeSpan(),F={params:N,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:j,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,s)=>v.onRequestError(e,t,r,s,S)},sharedContext:{buildId:m}},B=new d.NodeNextRequest(e),W=new d.NodeNextResponse(t),X=l.NextRequestAdapter.fromNodeNextRequest(B,(0,l.signalFromNodeResponse)(t));try{let i=async e=>v.handle(X,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=q.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${$} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${$} ${x}`)}),o=!!(0,s.getRequestMeta)(e,"minimalMode"),d=async s=>{var n,d;let l=async({previousCacheEntry:a})=>{try{if(!o&&b&&C&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(s);e.fetchMetrics=F.renderOpts.fetchMetrics;let d=F.renderOpts.pendingWaitUntil;d&&r.waitUntil&&(r.waitUntil(d),d=void 0);let l=F.renderOpts.collectedTags;if(!k)return await (0,c.sendResponse)(B,W,n,F.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[g.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,r=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:E.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await v.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:b})},!1,S),t}},p=await v.handleResponse({req:e,nextConfig:R,cacheKey:P,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:b,revalidateOnlyGenerated:C,responseGenerator:l,waitUntil:r.waitUntil,isMinimalMode:o});if(!k)return null;if((null==p||null==(n=p.value)?void 0:n.kind)!==E.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(d=p.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",b?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let h=(0,_.fromNodeOutgoingHttpHeaders)(p.value.headers);return o&&k||h.delete(g.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||h.get("Cache-Control")||h.set("Cache-Control",(0,f.getCacheControlHeader)(p.cacheControl)),await (0,c.sendResponse)(B,W,new Response(p.value.body,{headers:h,status:p.value.status||200})),null};H?await d(H):await q.withPropagatedContext(e.headers,()=>q.trace(p.BaseServerSpan.handleRequest,{spanName:`${$} ${x}`,kind:n.SpanKind.SERVER,attributes:{"http.method":$,"http.target":e.url}},d))}catch(t){if(t instanceof h.NoFallbackError||await v.onRequestError(e,t,{routerKind:"App Router",routePath:L,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:b})},!1,S),k)throw t;return await (0,c.sendResponse)(B,W,new Response(null,{status:500})),null}}e.s(["handler",()=>D,"patchFetch",()=>C,"routeModule",()=>v,"serverHooks",()=>b,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>S],68755)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__ad03b80e._.js.map