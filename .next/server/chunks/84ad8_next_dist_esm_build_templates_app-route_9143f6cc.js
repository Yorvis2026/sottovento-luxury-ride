module.exports=[13676,e=>{"use strict";var t=e.i(66574),r=e.i(58350),a=e.i(10732),o=e.i(12768),n=e.i(75089),i=e.i(11299),c=e.i(66012),s=e.i(12480),u=e.i(64629),d=e.i(2078),E=e.i(99591),_=e.i(65698),l=e.i(29809),S=e.i(64157),m=e.i(56534),p=e.i(93695);e.i(22981);var N=e.i(4706),A=e.i(16770);let C=(0,e.i(70485).neon)(process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL??"");async function R(e){let{searchParams:t}=new URL(e.url),r=t.get("driver_code");if(!r)return A.NextResponse.json({error:"driver_code required"},{status:400});let a=await C`
    SELECT id, full_name, driver_code FROM drivers WHERE driver_code = ${r} LIMIT 1
  `;if(!a.length)return A.NextResponse.json({error:"Driver not found"},{status:404});let o=a[0],n=o.id,i=new Date,c=new Date(i);c.setDate(i.getDate()-i.getDay()),c.setHours(0,0,0,0);let s=new Date(i.getFullYear(),i.getMonth(),1),u=new Date(c);u.setDate(u.getDate()-7);let d=new Date(c),E=new Date(i.getFullYear(),i.getMonth()-1,1),_=new Date(i.getFullYear(),i.getMonth(),1),l=await C`
    SELECT
      COALESCE(SUM(CASE WHEN c.created_at >= ${c.toISOString()} THEN c.executor_amount ELSE 0 END), 0)   AS week_exec,
      COALESCE(SUM(CASE WHEN c.created_at >= ${s.toISOString()} THEN c.executor_amount ELSE 0 END), 0)  AS month_exec,
      COALESCE(SUM(c.executor_amount), 0)                                                                           AS total_exec,
      COALESCE(SUM(CASE WHEN c.created_at >= ${u.toISOString()} AND c.created_at < ${d.toISOString()} THEN c.executor_amount ELSE 0 END), 0) AS last_week_exec,
      COALESCE(SUM(CASE WHEN c.created_at >= ${E.toISOString()} AND c.created_at < ${_.toISOString()} THEN c.executor_amount ELSE 0 END), 0) AS last_month_exec
    FROM commissions c
    WHERE c.executor_driver_id = ${n}
      AND c.status != 'disputed'
  `,S=await C`
    SELECT
      COALESCE(SUM(CASE WHEN c.created_at >= ${c.toISOString()} THEN c.source_amount ELSE 0 END), 0)   AS week_source,
      COALESCE(SUM(CASE WHEN c.created_at >= ${s.toISOString()} THEN c.source_amount ELSE 0 END), 0)  AS month_source,
      COALESCE(SUM(c.source_amount), 0)                                                                           AS total_source,
      COALESCE(SUM(CASE WHEN c.created_at >= ${u.toISOString()} AND c.created_at < ${d.toISOString()} THEN c.source_amount ELSE 0 END), 0) AS last_week_source,
      COALESCE(SUM(CASE WHEN c.created_at >= ${E.toISOString()} AND c.created_at < ${_.toISOString()} THEN c.source_amount ELSE 0 END), 0) AS last_month_source
    FROM commissions c
    WHERE c.source_driver_id = ${n}
      AND c.status != 'disputed'
  `,m=l[0],p=S[0],N=Number(m.week_exec)+Number(p.week_source),R=Number(m.month_exec)+Number(p.month_source),v=Number(m.total_exec)+Number(p.total_source),h=Number(m.last_week_exec)+Number(p.last_week_source),O=Number(m.last_month_exec)+Number(p.last_month_source),b=await C`
    SELECT COUNT(DISTINCT cl.id) AS count, COALESCE(SUM(c.source_amount), 0) AS revenue
    FROM commissions c
    JOIN bookings b ON b.id = c.booking_id
    JOIN clients cl ON cl.id = b.client_id
    WHERE c.source_driver_id = ${n}
      AND c.status != 'disputed'
  `,g=Number(b[0]?.count??0),D=Number(b[0]?.revenue??0),T=await C`
    SELECT COALESCE(SUM(c.executor_amount), 0) AS amount
    FROM commissions c
    JOIN bookings b ON b.id = c.booking_id
    WHERE c.executor_driver_id = ${n}
      AND b.source_code IS NULL
      AND c.status != 'disputed'
  `,w=Number(T[0]?.amount??0),x=await C`
    SELECT COALESCE(SUM(c.executor_amount), 0) AS amount
    FROM commissions c
    JOIN bookings b ON b.id = c.booking_id
    WHERE c.executor_driver_id = ${n}
      AND b.dispatch_status = 'manual_dispatch_required'
      AND c.status != 'disputed'
  `,L=Number(x[0]?.amount??0),H=(await C`
    SELECT
      DATE_TRUNC('month', c.created_at) AS month,
      COALESCE(SUM(CASE WHEN c.executor_driver_id = ${n} THEN c.executor_amount ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN c.source_driver_id   = ${n} THEN c.source_amount   ELSE 0 END), 0) AS earnings
    FROM commissions c
    WHERE (c.executor_driver_id = ${n} OR c.source_driver_id = ${n})
      AND c.created_at >= NOW() - INTERVAL '6 months'
      AND c.status != 'disputed'
    GROUP BY DATE_TRUNC('month', c.created_at)
    ORDER BY month ASC
  `).map(e=>({month:new Date(e.month).toLocaleDateString("en-US",{month:"short"}),earnings:Number(e.earnings)})),f=await C`
    SELECT MAX(weekly_total) AS best_week FROM (
      SELECT DATE_TRUNC('week', c.created_at) AS wk,
        SUM(CASE WHEN c.executor_driver_id = ${n} THEN c.executor_amount ELSE 0 END) +
        SUM(CASE WHEN c.source_driver_id   = ${n} THEN c.source_amount   ELSE 0 END) AS weekly_total
      FROM commissions c
      WHERE (c.executor_driver_id = ${n} OR c.source_driver_id = ${n})
        AND c.status != 'disputed'
      GROUP BY wk
    ) sub
  `,M=await C`
    SELECT MAX(monthly_total) AS best_month FROM (
      SELECT DATE_TRUNC('month', c.created_at) AS mo,
        SUM(CASE WHEN c.executor_driver_id = ${n} THEN c.executor_amount ELSE 0 END) +
        SUM(CASE WHEN c.source_driver_id   = ${n} THEN c.source_amount   ELSE 0 END) AS monthly_total
      FROM commissions c
      WHERE (c.executor_driver_id = ${n} OR c.source_driver_id = ${n})
        AND c.status != 'disputed'
      GROUP BY mo
    ) sub
  `,U=Number(f[0]?.best_week??0),$=Number(M[0]?.best_month??0),k=await C`
    SELECT
      COALESCE(SUM(CASE WHEN c.status = 'pending' AND (c.executor_driver_id = ${n} OR c.source_driver_id = ${n})
        THEN (CASE WHEN c.executor_driver_id = ${n} THEN c.executor_amount ELSE 0 END) +
             (CASE WHEN c.source_driver_id   = ${n} THEN c.source_amount   ELSE 0 END)
        ELSE 0 END), 0) AS pending_balance,
      COALESCE(SUM(CASE WHEN c.status = 'confirmed' AND (c.executor_driver_id = ${n} OR c.source_driver_id = ${n})
        THEN (CASE WHEN c.executor_driver_id = ${n} THEN c.executor_amount ELSE 0 END) +
             (CASE WHEN c.source_driver_id   = ${n} THEN c.source_amount   ELSE 0 END)
        ELSE 0 END), 0) AS available_balance
    FROM commissions c
  `,y=Number(k[0]?.pending_balance??0),I=Number(k[0]?.available_balance??0),W=(await C`
    SELECT
      b.id AS booking_id,
      b.pickup_location,
      b.dropoff_location,
      b.pickup_datetime,
      b.total_price,
      b.vehicle_type,
      cl.full_name AS client_name,
      c.executor_amount,
      c.source_amount,
      c.platform_amount,
      c.status AS payout_status,
      c.executor_driver_id,
      c.source_driver_id,
      c.created_at AS commission_date
    FROM commissions c
    JOIN bookings b ON b.id = c.booking_id
    LEFT JOIN clients cl ON cl.id = b.client_id
    WHERE (c.executor_driver_id = ${n} OR c.source_driver_id = ${n})
    ORDER BY c.created_at DESC
    LIMIT 30
  `).map(e=>{let t=e.executor_driver_id===n,r=e.source_driver_id===n,a=(t?Number(e.executor_amount??0):0)+(r?Number(e.source_amount??0):0);return{booking_id:e.booking_id,pickup_location:e.pickup_location,dropoff_location:e.dropoff_location,pickup_datetime:e.pickup_datetime,total_fare:Number(e.total_price),vehicle_type:e.vehicle_type,client_name:e.client_name,sln_commission:Number(e.platform_amount??0),driver_net:a,role:t&&r?"both":t?"executor":"source",payout_status:e.payout_status,date:e.commission_date}}),P=(await C`
    SELECT
      c.paid_at,
      SUM(
        (CASE WHEN c.executor_driver_id = ${n} THEN COALESCE(c.executor_amount, 0) ELSE 0 END) +
        (CASE WHEN c.source_driver_id   = ${n} THEN COALESCE(c.source_amount,   0) ELSE 0 END)
      ) AS amount,
      c.status
    FROM commissions c
    WHERE (c.executor_driver_id = ${n} OR c.source_driver_id = ${n})
      AND c.status IN ('paid', 'confirmed')
    GROUP BY c.paid_at, c.status
    ORDER BY c.paid_at DESC NULLS LAST
    LIMIT 10
  `).map(e=>({date:e.paid_at?new Date(e.paid_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"—",amount:Number(e.amount),status:e.status}));return A.NextResponse.json({driver_name:o.full_name,driver_code:o.driver_code,week_earnings:N,month_earnings:R,total_earnings:v,vs_last_week:h>0?(N-h)/h*100:null,vs_last_month:O>0?(R-O)/O*100:null,source_breakdown:{captured_clients:D,sln_network:w,admin_dispatch:L},monthly_chart:H,captured_clients_count:g,captured_clients_revenue:D,available_balance:I,pending_balance:y,best_week:U,best_month:$,ride_detail:W,payout_history:P,stripe_connect:{connected:!1,payout_method:null,next_payout_date:null,payout_schedule:"weekly"}})}e.s(["GET",()=>R],90632);var v=e.i(90632);let h=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/driver/earnings/route",pathname:"/api/driver/earnings",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/driver/earnings/route.ts",nextConfigOutput:"",userland:v}),{workAsyncStorage:O,workUnitAsyncStorage:b,serverHooks:g}=h;function D(){return(0,a.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:b})}async function T(e,t,a){h.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let A="/api/driver/earnings/route";A=A.replace(/\/index$/,"")||"/";let C=await h.prepare(e,t,{srcPage:A,multiZoneDraftMode:!1});if(!C)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:R,params:v,nextConfig:O,parsedUrl:b,isDraftMode:g,prerenderManifest:D,routerServerContext:T,isOnDemandRevalidate:w,revalidateOnlyGenerated:x,resolvedPathname:L,clientReferenceManifest:H,serverActionsManifest:f}=C,M=(0,c.normalizeAppPath)(A),U=!!(D.dynamicRoutes[M]||D.routes[L]),$=async()=>((null==T?void 0:T.render404)?await T.render404(e,t,b,!1):t.end("This page could not be found"),null);if(U&&!g){let e=!!D.routes[L],t=D.dynamicRoutes[M];if(t&&!1===t.fallback&&!e){if(O.experimental.adapterPath)return await $();throw new p.NoFallbackError}}let k=null;!U||h.isDev||g||(k="/index"===(k=L)?"/":k);let y=!0===h.isDev||!U,I=U&&!y;f&&H&&(0,i.setManifestsSingleton)({page:A,clientReferenceManifest:H,serverActionsManifest:f});let W=e.method||"GET",P=(0,n.getTracer)(),F=P.getActiveScopeSpan(),q={params:v,prerenderManifest:D,renderOpts:{experimental:{authInterrupts:!!O.experimental.authInterrupts},cacheComponents:!!O.cacheComponents,supportsDynamicResponse:y,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:O.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,o)=>h.onRequestError(e,t,a,o,T)},sharedContext:{buildId:R}},B=new s.NodeNextRequest(e),j=new s.NodeNextResponse(t),Y=u.NextRequestAdapter.fromNodeNextRequest(B,(0,u.signalFromNodeResponse)(t));try{let i=async e=>h.handle(Y,q).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=P.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${W} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${W} ${A}`)}),c=!!(0,o.getRequestMeta)(e,"minimalMode"),s=async o=>{var n,s;let u=async({previousCacheEntry:r})=>{try{if(!c&&w&&x&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(o);e.fetchMetrics=q.renderOpts.fetchMetrics;let s=q.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let u=q.renderOpts.collectedTags;if(!U)return await (0,_.sendResponse)(B,j,n,q.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,l.toNodeOutgoingHttpHeaders)(n.headers);u&&(t[m.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==q.renderOpts.collectedRevalidate&&!(q.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&q.renderOpts.collectedRevalidate,a=void 0===q.renderOpts.collectedExpire||q.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:q.renderOpts.collectedExpire;return{value:{kind:N.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await h.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:w})},!1,T),t}},d=await h.handleResponse({req:e,nextConfig:O,cacheKey:k,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:D,isRoutePPREnabled:!1,isOnDemandRevalidate:w,revalidateOnlyGenerated:x,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:c});if(!U)return null;if((null==d||null==(n=d.value)?void 0:n.kind)!==N.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(s=d.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});c||t.setHeader("x-nextjs-cache",w?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),g&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,l.fromNodeOutgoingHttpHeaders)(d.value.headers);return c&&U||p.delete(m.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,S.getCacheControlHeader)(d.cacheControl)),await (0,_.sendResponse)(B,j,new Response(d.value.body,{headers:p,status:d.value.status||200})),null};F?await s(F):await P.withPropagatedContext(e.headers,()=>P.trace(d.BaseServerSpan.handleRequest,{spanName:`${W} ${A}`,kind:n.SpanKind.SERVER,attributes:{"http.method":W,"http.target":e.url}},s))}catch(t){if(t instanceof p.NoFallbackError||await h.onRequestError(e,t,{routerKind:"App Router",routePath:M,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:w})},!1,T),U)throw t;return await (0,_.sendResponse)(B,j,new Response(null,{status:500})),null}}e.s(["handler",()=>T,"patchFetch",()=>D,"routeModule",()=>h,"serverHooks",()=>g,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>b],13676)}];

//# sourceMappingURL=84ad8_next_dist_esm_build_templates_app-route_9143f6cc.js.map