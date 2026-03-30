module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},7540,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),n=e.i(1266),i=e.i(10171),o=e.i(44067),s=e.i(7601),d=e.i(3083),u=e.i(88890),l=e.i(37886),c=e.i(63388),p=e.i(46601),_=e.i(24139),E=e.i(78785),m=e.i(2640),S=e.i(93695);e.i(46509);var v=e.i(56592),A=e.i(50974);let C=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function N(e){try{let t,r,a,{searchParams:n}=new URL(e.url),i=n.get("code");if(!i)return A.NextResponse.json({error:"code is required"},{status:400});try{await C`
        ALTER TABLE drivers
          ADD COLUMN IF NOT EXISTS stripe_account_id     TEXT,
          ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected',
          ADD COLUMN IF NOT EXISTS stripe_bank_last4     TEXT,
          ADD COLUMN IF NOT EXISTS stripe_bank_type      TEXT,
          ADD COLUMN IF NOT EXISTS stripe_bank_name      TEXT
      `}catch{}let o=await C`
      SELECT
        id,
        driver_code,
        full_name,
        COALESCE(stripe_account_id,          NULL)            AS stripe_account_id,
        COALESCE(stripe_account_status,      'not_connected') AS stripe_account_status,
        COALESCE(stripe_bank_last4,          NULL)            AS stripe_bank_last4,
        COALESCE(stripe_bank_type,           NULL)            AS stripe_bank_type,
        COALESCE(stripe_bank_name,           NULL)            AS stripe_bank_name,
        COALESCE(payout_onboarding_status,   'not_started')   AS payout_onboarding_status,
        COALESCE(payouts_enabled,            FALSE)           AS payouts_enabled
      FROM drivers
      WHERE driver_code = ${i.toUpperCase()}
      LIMIT 1
    `;if(0===o.length)return A.NextResponse.json({error:"Driver not found"},{status:404});let s=o[0],d=s.stripe_account_id,u=s.stripe_account_status??"not_connected",l=s.payout_onboarding_status??"not_started",c=!0===s.payouts_enabled||"true"===s.payouts_enabled,p={status:d?u:"not_connected",type:s.stripe_bank_type??null,last4:s.stripe_bank_last4??null,bank_name:s.stripe_bank_name??null,verified:"connected"===u&&c,stripe_account_id:d,onboarding_url:d?null:`/api/driver/stripe-onboard?code=${i.toUpperCase()}`,payout_onboarding_status:l,payouts_enabled:c,resume_onboarding_url:null},_={available:0,pending:0,paid_total:0},E={available:0,pending:0,paid_total:0};try{let[e]=await C`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN executor_amount ELSE 0 END), 0) AS available,
          COALESCE(SUM(CASE WHEN status = 'pending'   THEN executor_amount ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN status = 'paid'      THEN executor_amount ELSE 0 END), 0) AS paid_total
        FROM commissions
        WHERE executor_driver_id = ${s.id}
      `;_={available:Number(e?.available??0),pending:Number(e?.pending??0),paid_total:Number(e?.paid_total??0)}}catch{}try{let[e]=await C`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN source_amount ELSE 0 END), 0) AS available,
          COALESCE(SUM(CASE WHEN status = 'pending'   THEN source_amount ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN status = 'paid'      THEN source_amount ELSE 0 END), 0) AS paid_total
        FROM commissions
        WHERE source_driver_id = ${s.id}
      `;E={available:Number(e?.available??0),pending:Number(e?.pending??0),paid_total:Number(e?.paid_total??0)}}catch{}let m={available:_.available+E.available,pending:_.pending+E.pending,paid_total:_.paid_total+E.paid_total,payout_frequency:"Weekly",next_payout_day:(r=(t=new Date).getDay(),(a=new Date(t)).setDate(t.getDate()+((5-r+7)%7||7)),a.toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"}))},S=[];try{S=(await C`
        SELECT
          DATE(paid_at) AS payout_date,
          COALESCE(SUM(executor_amount) FILTER (WHERE executor_driver_id = ${s.id}), 0) +
          COALESCE(SUM(source_amount)   FILTER (WHERE source_driver_id   = ${s.id}), 0) AS amount,
          'paid' AS status,
          COUNT(*) AS ride_count
        FROM commissions
        WHERE (executor_driver_id = ${s.id} OR source_driver_id = ${s.id})
          AND status = 'paid'
          AND paid_at IS NOT NULL
        GROUP BY DATE(paid_at)
        ORDER BY payout_date DESC
        LIMIT 10
      `).map(e=>({date:e.payout_date,amount:Number(e.amount),status:e.status,ride_count:Number(e.ride_count)}))}catch{}let v=[];try{v=(await C`
        SELECT
          c.id,
          c.created_at AS date,
          b.pickup_address,
          b.dropoff_address,
          b.total_price AS booking_total,
          CASE
            WHEN c.executor_driver_id = ${s.id} AND c.source_driver_id = ${s.id}
              THEN 'both'
            WHEN c.executor_driver_id = ${s.id}
              THEN 'executor'
            ELSE 'source'
          END AS role,
          CASE
            WHEN c.executor_driver_id = ${s.id} AND c.source_driver_id = ${s.id}
              THEN COALESCE(c.executor_amount, 0) + COALESCE(c.source_amount, 0)
            WHEN c.executor_driver_id = ${s.id}
              THEN COALESCE(c.executor_amount, 0)
            ELSE COALESCE(c.source_amount, 0)
          END AS my_amount,
          CASE
            WHEN c.executor_driver_id = ${s.id} AND c.source_driver_id = ${s.id}
              THEN c.executor_pct + c.source_pct
            WHEN c.executor_driver_id = ${s.id}
              THEN c.executor_pct
            ELSE c.source_pct
          END AS my_pct,
          c.status AS commission_status,
          cl.full_name AS client_name,
          b.vehicle_type,
          b.pickup_at
        FROM commissions c
        JOIN bookings b ON b.id = c.booking_id
        LEFT JOIN clients cl ON cl.id = b.client_id
        WHERE c.executor_driver_id = ${s.id}
           OR c.source_driver_id   = ${s.id}
        ORDER BY c.created_at DESC
        LIMIT 30
      `).map(e=>({id:e.id,date:e.date,pickup_at:e.pickup_at,client_name:e.client_name??"Client",route:function(e,t){if(!e&&!t)return"Route not specified";let r=e?e.split(",")[0].trim():"?",a=t?t.split(",")[0].trim():"?";return`${r} → ${a}`}(e.pickup_address,e.dropoff_address),booking_total:Number(e.booking_total),my_amount:Number(e.my_amount),my_pct:Number(e.my_pct),role:e.role,status:e.commission_status,vehicle_type:e.vehicle_type}))}catch{}return A.NextResponse.json({driver:{id:s.id,driver_code:s.driver_code,full_name:s.full_name},payout_method:p,balance:m,payout_history:S,earnings_history:v})}catch(e){return console.error("[payout-info] error:",e),A.NextResponse.json({error:String(e)},{status:500})}}e.s(["GET",()=>N,"dynamic",0,"force-dynamic"],37390);var x=e.i(37390);let b=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/driver/payout-info/route",pathname:"/api/driver/payout-info",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/driver/payout-info/route.ts",nextConfigOutput:"",userland:x}),{workAsyncStorage:y,workUnitAsyncStorage:R,serverHooks:h}=b;function g(){return(0,a.patchFetch)({workAsyncStorage:y,workUnitAsyncStorage:R})}async function T(e,t,a){b.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let A="/api/driver/payout-info/route";A=A.replace(/\/index$/,"")||"/";let C=await b.prepare(e,t,{srcPage:A,multiZoneDraftMode:!1});if(!C)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:N,params:x,nextConfig:y,parsedUrl:R,isDraftMode:h,prerenderManifest:g,routerServerContext:T,isOnDemandRevalidate:f,revalidateOnlyGenerated:O,resolvedPathname:L,clientReferenceManifest:D,serverActionsManifest:w}=C,H=(0,s.normalizeAppPath)(A),k=!!(g.dynamicRoutes[H]||g.routes[L]),U=async()=>((null==T?void 0:T.render404)?await T.render404(e,t,R,!1):t.end("This page could not be found"),null);if(k&&!h){let e=!!g.routes[L],t=g.dynamicRoutes[H];if(t&&!1===t.fallback&&!e){if(y.experimental.adapterPath)return await U();throw new S.NoFallbackError}}let I=null;!k||b.isDev||h||(I="/index"===(I=L)?"/":I);let M=!0===b.isDev||!k,$=k&&!M;w&&D&&(0,o.setManifestsSingleton)({page:A,clientReferenceManifest:D,serverActionsManifest:w});let P=e.method||"GET",F=(0,i.getTracer)(),q=F.getActiveScopeSpan(),W={params:x,prerenderManifest:g,renderOpts:{experimental:{authInterrupts:!!y.experimental.authInterrupts},cacheComponents:!!y.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:y.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>b.onRequestError(e,t,a,n,T)},sharedContext:{buildId:N}},j=new d.NodeNextRequest(e),X=new d.NodeNextResponse(t),B=u.NextRequestAdapter.fromNodeNextRequest(j,(0,u.signalFromNodeResponse)(t));try{let o=async e=>b.handle(B,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=F.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${P} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${A}`)}),s=!!(0,n.getRequestMeta)(e,"minimalMode"),d=async n=>{var i,d;let u=async({previousCacheEntry:r})=>{try{if(!s&&f&&O&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await o(n);e.fetchMetrics=W.renderOpts.fetchMetrics;let d=W.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let u=W.renderOpts.collectedTags;if(!k)return await (0,p.sendResponse)(j,X,i,W.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(i.headers);u&&(t[m.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,a=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:v.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await b.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:f})},!1,T),t}},l=await b.handleResponse({req:e,nextConfig:y,cacheKey:I,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:g,isRoutePPREnabled:!1,isOnDemandRevalidate:f,revalidateOnlyGenerated:O,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:s});if(!k)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==v.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(d=l.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",f?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),h&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let S=(0,_.fromNodeOutgoingHttpHeaders)(l.value.headers);return s&&k||S.delete(m.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||S.get("Cache-Control")||S.set("Cache-Control",(0,E.getCacheControlHeader)(l.cacheControl)),await (0,p.sendResponse)(j,X,new Response(l.value.body,{headers:S,status:l.value.status||200})),null};q?await d(q):await F.withPropagatedContext(e.headers,()=>F.trace(l.BaseServerSpan.handleRequest,{spanName:`${P} ${A}`,kind:i.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},d))}catch(t){if(t instanceof S.NoFallbackError||await b.onRequestError(e,t,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:f})},!1,T),k)throw t;return await (0,p.sendResponse)(j,X,new Response(null,{status:500})),null}}e.s(["handler",()=>T,"patchFetch",()=>g,"routeModule",()=>b,"serverHooks",()=>h,"workAsyncStorage",()=>y,"workUnitAsyncStorage",()=>R],7540)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__6f874061._.js.map