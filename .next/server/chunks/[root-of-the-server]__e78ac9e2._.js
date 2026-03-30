module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},53791,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),i=e.i(1266),s=e.i(10171),n=e.i(44067),o=e.i(7601),d=e.i(3083),p=e.i(88890),l=e.i(37886),c=e.i(63388),u=e.i(46601),_=e.i(24139),f=e.i(78785),h=e.i(2640),v=e.i(93695);e.i(46509);var b=e.i(56592),g=e.i(50974);let R=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function m(e){if((e.headers.get("x-admin-secret")||"")!==(process.env.ADMIN_SECRET||"sln-admin-2026"))return g.NextResponse.json({error:"Unauthorized"},{status:401});let t={};try{t=await e.json()}catch{}let r=[];try{let e=t.booking_id?await R`
          SELECT
            b.id, b.status, b.dispatch_status, b.payment_status,
            b.captured_by_driver_code, b.pickup_zone, b.dropoff_zone,
            b.pickup_address, b.dropoff_address, b.vehicle_type,
            b.pickup_at, b.total_price,
            d.id AS driver_db_id, d.driver_code, d.full_name AS driver_name,
            d.status AS driver_status, d.eligible AS driver_eligible
          FROM bookings b
          LEFT JOIN drivers d ON UPPER(TRIM(d.driver_code)) = UPPER(TRIM(b.captured_by_driver_code))
          WHERE b.id = ${t.booking_id}::uuid
            AND b.payment_status = 'paid'
          LIMIT 1
        `:await R`
          SELECT
            b.id, b.status, b.dispatch_status, b.payment_status,
            b.captured_by_driver_code, b.pickup_zone, b.dropoff_zone,
            b.pickup_address, b.dropoff_address, b.vehicle_type,
            b.pickup_at, b.total_price,
            d.id AS driver_db_id, d.driver_code, d.full_name AS driver_name,
            d.status AS driver_status, d.eligible AS driver_eligible
          FROM bookings b
          LEFT JOIN drivers d ON UPPER(TRIM(d.driver_code)) = UPPER(TRIM(b.captured_by_driver_code))
          WHERE b.payment_status = 'paid'
            AND b.dispatch_status IN ('needs_review', 'ready', 'ready_for_dispatch')
            AND b.captured_by_driver_code IS NOT NULL
            AND b.captured_by_driver_code != 'public_site'
            AND b.status NOT IN ('completed', 'cancelled', 'archived', 'in_trip', 'en_route')
          ORDER BY b.created_at DESC
          LIMIT 20
        `;if(0===e.length)return g.NextResponse.json({success:!0,message:"No eligible bookings found for force-dispatch",processed:0,results:[]});for(let t of e){let e=t.id,a=(t.captured_by_driver_code||"").trim().toUpperCase(),i=t.driver_db_id,s=t.driver_eligible,n=t.driver_status,o=(t.pickup_address||"").trim()||(t.pickup_zone||"").trim(),d=(t.dropoff_address||"").trim()||(t.dropoff_zone||"").trim(),p=(t.vehicle_type||"").trim(),l=!!(o&&d),c=!!p;if(!l||!c){r.push({booking_id:e.slice(0,8),action:"skipped",reason:`Missing: ${!l?"location":""} ${!c?"vehicle":""}`.trim()});continue}let u=new Date(Date.now()+12e4).toISOString();if(i&&"active"===n&&s)if((await R`
          UPDATE bookings
          SET
            status = 'offer_pending',
            dispatch_status = 'offer_pending',
            assigned_driver_id = ${i}::uuid,
            offer_status = 'pending',
            offer_stage = 'source_owner',
            offer_expires_at = ${u}::timestamptz,
            updated_at = NOW()
          WHERE id = ${e}::uuid
            AND payment_status = 'paid'
            AND status NOT IN ('completed', 'cancelled', 'archived', 'in_trip', 'en_route', 'accepted')
          RETURNING id, status, dispatch_status, assigned_driver_id
        `).length>0){try{await R`
              INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
              VALUES (
                ${e}::uuid,
                'booking',
                'force_dispatch_applied',
                ${JSON.stringify({reason:"force_dispatch_endpoint",driver_code:a,driver_id:i,pickup_evidence:o,dropoff_evidence:d,previous_dispatch_status:t.dispatch_status})},
                NOW()
              )
            `}catch{}r.push({booking_id:e.slice(0,8),action:"dispatched",new_status:"offer_pending",assigned_to:a,driver_name:t.driver_name,pickup:o,dropoff:d})}else r.push({booking_id:e.slice(0,8),action:"no_update",reason:"booking_in_terminal_state_or_already_processed"});else(await R`
          UPDATE bookings
          SET
            status = 'new',
            dispatch_status = 'ready_for_dispatch',
            offer_status = 'pending',
            offer_stage = 'sln_member',
            offer_expires_at = ${u}::timestamptz,
            updated_at = NOW()
          WHERE id = ${e}::uuid
            AND payment_status = 'paid'
            AND status NOT IN ('completed', 'cancelled', 'archived', 'in_trip', 'en_route', 'accepted')
          RETURNING id, status, dispatch_status
        `).length>0?r.push({booking_id:e.slice(0,8),action:"escalated_to_pool",new_status:"ready_for_dispatch",reason:i?`driver_${a}_not_eligible`:`driver_${a}_not_found`,pickup:o,dropoff:d}):r.push({booking_id:e.slice(0,8),action:"no_update",reason:"booking_in_terminal_state_or_already_processed"})}return g.NextResponse.json({success:!0,processed:r.length,results:r})}catch(t){let e=t instanceof Error?t.message:String(t);return g.NextResponse.json({error:e},{status:500})}}e.s(["POST",()=>m,"dynamic",0,"force-dynamic"],36498);var E=e.i(36498);let x=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/force-dispatch/route",pathname:"/api/admin/force-dispatch",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/force-dispatch/route.ts",nextConfigOutput:"",userland:E}),{workAsyncStorage:y,workUnitAsyncStorage:N,serverHooks:w}=x;function A(){return(0,a.patchFetch)({workAsyncStorage:y,workUnitAsyncStorage:N})}async function T(e,t,a){x.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/admin/force-dispatch/route";g=g.replace(/\/index$/,"")||"/";let R=await x.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:m,params:E,nextConfig:y,parsedUrl:N,isDraftMode:w,prerenderManifest:A,routerServerContext:T,isOnDemandRevalidate:k,revalidateOnlyGenerated:S,resolvedPathname:O,clientReferenceManifest:C,serverActionsManifest:I}=R,P=(0,o.normalizeAppPath)(g),D=!!(A.dynamicRoutes[P]||A.routes[O]),U=async()=>((null==T?void 0:T.render404)?await T.render404(e,t,N,!1):t.end("This page could not be found"),null);if(D&&!w){let e=!!A.routes[O],t=A.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(y.experimental.adapterPath)return await U();throw new v.NoFallbackError}}let j=null;!D||x.isDev||w||(j="/index"===(j=O)?"/":j);let M=!0===x.isDev||!D,H=D&&!M;I&&C&&(0,n.setManifestsSingleton)({page:g,clientReferenceManifest:C,serverActionsManifest:I});let $=e.method||"GET",q=(0,s.getTracer)(),L=q.getActiveScopeSpan(),F={params:E,prerenderManifest:A,renderOpts:{experimental:{authInterrupts:!!y.experimental.authInterrupts},cacheComponents:!!y.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:y.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,i)=>x.onRequestError(e,t,a,i,T)},sharedContext:{buildId:m}},z=new d.NodeNextRequest(e),W=new d.NodeNextResponse(t),K=p.NextRequestAdapter.fromNodeNextRequest(z,(0,p.signalFromNodeResponse)(t));try{let n=async e=>x.handle(K,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${$} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${$} ${g}`)}),o=!!(0,i.getRequestMeta)(e,"minimalMode"),d=async i=>{var s,d;let p=async({previousCacheEntry:r})=>{try{if(!o&&k&&S&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await n(i);e.fetchMetrics=F.renderOpts.fetchMetrics;let d=F.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let p=F.renderOpts.collectedTags;if(!D)return await (0,u.sendResponse)(z,W,s,F.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(s.headers);p&&(t[h.NEXT_CACHE_TAGS_HEADER]=p),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,a=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:b.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await x.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:k})},!1,T),t}},l=await x.handleResponse({req:e,nextConfig:y,cacheKey:j,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:A,isRoutePPREnabled:!1,isOnDemandRevalidate:k,revalidateOnlyGenerated:S,responseGenerator:p,waitUntil:a.waitUntil,isMinimalMode:o});if(!D)return null;if((null==l||null==(s=l.value)?void 0:s.kind)!==b.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(d=l.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",k?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),w&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let v=(0,_.fromNodeOutgoingHttpHeaders)(l.value.headers);return o&&D||v.delete(h.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||v.get("Cache-Control")||v.set("Cache-Control",(0,f.getCacheControlHeader)(l.cacheControl)),await (0,u.sendResponse)(z,W,new Response(l.value.body,{headers:v,status:l.value.status||200})),null};L?await d(L):await q.withPropagatedContext(e.headers,()=>q.trace(l.BaseServerSpan.handleRequest,{spanName:`${$} ${g}`,kind:s.SpanKind.SERVER,attributes:{"http.method":$,"http.target":e.url}},d))}catch(t){if(t instanceof v.NoFallbackError||await x.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:k})},!1,T),D)throw t;return await (0,u.sendResponse)(z,W,new Response(null,{status:500})),null}}e.s(["handler",()=>T,"patchFetch",()=>A,"routeModule",()=>x,"serverHooks",()=>w,"workAsyncStorage",()=>y,"workUnitAsyncStorage",()=>N],53791)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__e78ac9e2._.js.map