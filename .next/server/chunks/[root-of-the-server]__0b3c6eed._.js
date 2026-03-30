module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},45972,e=>{"use strict";function t(e){return e>=90?"PLATINUM":e>=75?"GOLD":e>=55?"SILVER":"BRONZE"}let r={completed_ride_on_time:2,high_acceptance_behavior:2,positive_rating_event:3,source_lead_generated:2,onboarding_contribution_bonus:5,late_cancel_driver:-8,driver_cancel_1h_to_4h:-5,no_response_offer_timeout:-4,client_complaint:-10,driver_fault_no_show:-12};function i(e){let t=r[e];return t>0?4*t:2*t}function a(e){return e.provisional_completed_rides>=3&&!e.has_late_driver_cancellation&&!e.has_active_complaint}function o(e){return e.provisional_completed_rides>=5&&e.on_time_rate>=90&&!e.has_active_complaint}function n(e,t){if(e>=10)return{should_exit:!0,exit_reason:"ride_threshold"};if(t){let e=new Date(t);if(new Date>=e)return{should_exit:!0,exit_reason:"day_threshold"}}return{should_exit:!1}}function s(e){return Math.max(0,Math.min(100,e))}function _(e){let r=t(e),i=s(Math.round(.7*e+.3*({PLATINUM:95,GOLD:82,SILVER:65,BRONZE:40})[r]));return{final_score:i,final_tier:t(i)}}e.s(["BASE_SCORE_DELTAS",0,r,"PROVISIONAL_DEFAULTS",0,{driver_score_total:75,driver_score_tier:"GOLD",driver_status:"provisional",provisional_completed_rides:0,is_eligible_for_premium_dispatch:!1,is_eligible_for_airport_priority:!1},"PROVISIONAL_RIDE_THRESHOLD",0,10,"PROVISIONAL_WINDOW_DAYS",0,30,"checkAirportPriorityEligibility",()=>o,"checkPremiumDispatchEligibility",()=>a,"checkProvisionalExit",()=>n,"clampScore",()=>s,"getProvisionalDelta",()=>i,"getTierFromScore",()=>t,"recalculateExitScore",()=>_])},11979,e=>{"use strict";var t=e.i(39743),r=e.i(37383),i=e.i(16108),a=e.i(1266),o=e.i(10171),n=e.i(44067),s=e.i(7601),_=e.i(3083),l=e.i(88890),d=e.i(37886),c=e.i(63388),p=e.i(46601),u=e.i(24139),E=e.i(78785),v=e.i(2640),S=e.i(93695);e.i(46509);var A=e.i(56592),O=e.i(50974),m=e.i(57747),h=e.i(45972);let T=(0,m.neon)(process.env.DATABASE_URL_UNPOOLED);async function R(){try{await T`
      ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS driver_score_total               INTEGER     DEFAULT 75,
        ADD COLUMN IF NOT EXISTS driver_score_tier                TEXT        DEFAULT 'GOLD',
        ADD COLUMN IF NOT EXISTS provisional_started_at           TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS provisional_ends_at              TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS provisional_completed_rides      INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS provisional_exit_reason          TEXT,
        ADD COLUMN IF NOT EXISTS is_eligible_for_premium_dispatch BOOLEAN     DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_eligible_for_airport_priority BOOLEAN     DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS on_time_rides                    INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS late_cancel_count                INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS complaint_count                  INTEGER     DEFAULT 0,
        ADD COLUMN IF NOT EXISTS contribution_bonus_granted       BOOLEAN     DEFAULT FALSE
    `}catch{}}async function I(){try{await R();let e=await T`
      SELECT
        id,
        driver_code,
        full_name,
        phone,
        email,
        driver_status,
        is_eligible,
        created_at,
        COALESCE(driver_score_total, 75)                      AS driver_score_total,
        COALESCE(driver_score_tier, 'GOLD')                   AS driver_score_tier,
        provisional_started_at,
        provisional_ends_at,
        COALESCE(provisional_completed_rides, 0)              AS provisional_completed_rides,
        provisional_exit_reason,
        COALESCE(is_eligible_for_premium_dispatch, FALSE)     AS is_eligible_for_premium_dispatch,
        COALESCE(is_eligible_for_airport_priority, FALSE)     AS is_eligible_for_airport_priority,
        COALESCE(rides_completed, 0)                          AS rides_completed,
        COALESCE(on_time_rides, 0)                            AS on_time_rides,
        COALESCE(late_cancel_count, 0)                        AS late_cancel_count,
        COALESCE(complaint_count, 0)                          AS complaint_count,
        COALESCE(contribution_bonus_granted, FALSE)           AS contribution_bonus_granted
      FROM drivers
      ORDER BY created_at DESC
    `;return O.NextResponse.json({drivers:e})}catch(e){return O.NextResponse.json({error:e.message},{status:500})}}async function N(e){try{let{full_name:t,phone:r,email:i,driver_code:a,is_affiliate:o,company_id:n}=await e.json();if(!t||!r||!a)return O.NextResponse.json({error:"full_name, phone and driver_code are required"},{status:400});if((await T`
      SELECT id FROM drivers WHERE UPPER(driver_code) = UPPER(${a}) LIMIT 1
    `).length>0)return O.NextResponse.json({error:`Driver code "${a}" is already in use`},{status:409});await R();let s=new Date().toISOString(),_=new Date(Date.now()+24*h.PROVISIONAL_WINDOW_DAYS*36e5).toISOString(),l=o?h.PROVISIONAL_DEFAULTS.driver_score_total+5:h.PROVISIONAL_DEFAULTS.driver_score_total,d=(await T`
      INSERT INTO drivers (
        driver_code,
        full_name,
        phone,
        email,
        driver_status,
        is_eligible,
        driver_score_total,
        driver_score_tier,
        provisional_started_at,
        provisional_ends_at,
        provisional_completed_rides,
        is_eligible_for_premium_dispatch,
        is_eligible_for_airport_priority,
        contribution_bonus_granted,
        company_id,
        created_at,
        updated_at
      ) VALUES (
        ${a},
        ${t},
        ${r},
        ${i??null},
        ${h.PROVISIONAL_DEFAULTS.driver_status},
        true,
        ${l},
        ${h.PROVISIONAL_DEFAULTS.driver_score_tier},
        ${s}::timestamptz,
        ${_}::timestamptz,
        ${h.PROVISIONAL_DEFAULTS.provisional_completed_rides},
        ${h.PROVISIONAL_DEFAULTS.is_eligible_for_premium_dispatch},
        ${h.PROVISIONAL_DEFAULTS.is_eligible_for_airport_priority},
        ${!!o},
        ${n?`${n}::uuid`:null},
        NOW(),
        NOW()
      )
      RETURNING
        id, driver_code, full_name, phone, email,
        driver_status, is_eligible, created_at,
        driver_score_total, driver_score_tier,
        provisional_started_at, provisional_ends_at,
        provisional_completed_rides,
        is_eligible_for_premium_dispatch,
        is_eligible_for_airport_priority,
        contribution_bonus_granted,
        company_id
    `)[0];try{await T`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, new_data
        ) VALUES (
          'driver',
          ${d.id}::uuid,
          'driver_onboarded_provisional',
          'admin',
          ${JSON.stringify({driver_code:a,driver_status:h.PROVISIONAL_DEFAULTS.driver_status,driver_score_total:l,driver_score_tier:h.PROVISIONAL_DEFAULTS.driver_score_tier,provisional_started_at:s,provisional_ends_at:_,is_affiliate:o??!1,contribution_bonus_granted:o??!1,is_eligible_for_premium_dispatch:h.PROVISIONAL_DEFAULTS.is_eligible_for_premium_dispatch,is_eligible_for_airport_priority:h.PROVISIONAL_DEFAULTS.is_eligible_for_airport_priority,company_id:n??null,timestamp:new Date().toISOString()})}::jsonb
        )
      `}catch{}if(o)try{await T`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, actor_type, new_data
          ) VALUES (
            'driver',
            ${d.id}::uuid,
            'provisional_score_event:onboarding_contribution_bonus',
            'system',
            ${JSON.stringify({event_type:"onboarding_contribution_bonus",score_delta:5,previous_score:h.PROVISIONAL_DEFAULTS.driver_score_total,new_score:l,is_affiliate:!0,contribution_bonus:!0,timestamp:new Date().toISOString()})}::jsonb
          )
        `}catch{}if(n)try{await T`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, actor_type, new_data
          ) VALUES (
            'driver',
            ${d.id}::uuid,
            'driver_assigned_to_company',
            'admin',
            ${JSON.stringify({driver_id:d.id,driver_code:a,company_id:n,action:"company_relationship_created",timestamp:new Date().toISOString()})}::jsonb
          )
        `}catch{}return O.NextResponse.json({driver:d,provisional:{status:h.PROVISIONAL_DEFAULTS.driver_status,score:l,tier:h.PROVISIONAL_DEFAULTS.driver_score_tier,starts_at:s,ends_at:_,ride_threshold:10,bonus_granted:o??!1}},{status:201})}catch(e){return O.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>I,"POST",()=>N,"dynamic",0,"force-dynamic"],62048);var L=e.i(62048);let g=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/drivers/route",pathname:"/api/admin/drivers",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/drivers/route.ts",nextConfigOutput:"",userland:L}),{workAsyncStorage:f,workUnitAsyncStorage:D,serverHooks:x}=g;function y(){return(0,i.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:D})}async function b(e,t,i){g.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let O="/api/admin/drivers/route";O=O.replace(/\/index$/,"")||"/";let m=await g.prepare(e,t,{srcPage:O,multiZoneDraftMode:!1});if(!m)return t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve()),null;let{buildId:h,params:T,nextConfig:R,parsedUrl:I,isDraftMode:N,prerenderManifest:L,routerServerContext:f,isOnDemandRevalidate:D,revalidateOnlyGenerated:x,resolvedPathname:y,clientReferenceManifest:b,serverActionsManifest:C}=m,w=(0,s.normalizeAppPath)(O),U=!!(L.dynamicRoutes[w]||L.routes[y]),P=async()=>((null==f?void 0:f.render404)?await f.render404(e,t,I,!1):t.end("This page could not be found"),null);if(U&&!N){let e=!!L.routes[y],t=L.dynamicRoutes[w];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await P();throw new S.NoFallbackError}}let F=null;!U||g.isDev||N||(F="/index"===(F=y)?"/":F);let M=!0===g.isDev||!U,$=U&&!M;C&&b&&(0,n.setManifestsSingleton)({page:O,clientReferenceManifest:b,serverActionsManifest:C});let j=e.method||"GET",V=(0,o.getTracer)(),k=V.getActiveScopeSpan(),q={params:T,prerenderManifest:L,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:i.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,i,a)=>g.onRequestError(e,t,i,a,f)},sharedContext:{buildId:h}},H=new _.NodeNextRequest(e),X=new _.NodeNextResponse(t),G=l.NextRequestAdapter.fromNodeNextRequest(H,(0,l.signalFromNodeResponse)(t));try{let n=async e=>g.handle(G,q).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=V.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=r.get("next.route");if(i){let t=`${j} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${j} ${O}`)}),s=!!(0,a.getRequestMeta)(e,"minimalMode"),_=async a=>{var o,_;let l=async({previousCacheEntry:r})=>{try{if(!s&&D&&x&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await n(a);e.fetchMetrics=q.renderOpts.fetchMetrics;let _=q.renderOpts.pendingWaitUntil;_&&i.waitUntil&&(i.waitUntil(_),_=void 0);let l=q.renderOpts.collectedTags;if(!U)return await (0,p.sendResponse)(H,X,o,q.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,u.toNodeOutgoingHttpHeaders)(o.headers);l&&(t[v.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==q.renderOpts.collectedRevalidate&&!(q.renderOpts.collectedRevalidate>=v.INFINITE_CACHE)&&q.renderOpts.collectedRevalidate,i=void 0===q.renderOpts.collectedExpire||q.renderOpts.collectedExpire>=v.INFINITE_CACHE?void 0:q.renderOpts.collectedExpire;return{value:{kind:A.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:i}}}}catch(t){throw(null==r?void 0:r.isStale)&&await g.onRequestError(e,t,{routerKind:"App Router",routePath:O,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:D})},!1,f),t}},d=await g.handleResponse({req:e,nextConfig:R,cacheKey:F,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:L,isRoutePPREnabled:!1,isOnDemandRevalidate:D,revalidateOnlyGenerated:x,responseGenerator:l,waitUntil:i.waitUntil,isMinimalMode:s});if(!U)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==A.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(_=d.value)?void 0:_.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",D?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),N&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let S=(0,u.fromNodeOutgoingHttpHeaders)(d.value.headers);return s&&U||S.delete(v.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||S.get("Cache-Control")||S.set("Cache-Control",(0,E.getCacheControlHeader)(d.cacheControl)),await (0,p.sendResponse)(H,X,new Response(d.value.body,{headers:S,status:d.value.status||200})),null};k?await _(k):await V.withPropagatedContext(e.headers,()=>V.trace(d.BaseServerSpan.handleRequest,{spanName:`${j} ${O}`,kind:o.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},_))}catch(t){if(t instanceof S.NoFallbackError||await g.onRequestError(e,t,{routerKind:"App Router",routePath:w,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:D})},!1,f),U)throw t;return await (0,p.sendResponse)(H,X,new Response(null,{status:500})),null}}e.s(["handler",()=>b,"patchFetch",()=>y,"routeModule",()=>g,"serverHooks",()=>x,"workAsyncStorage",()=>f,"workUnitAsyncStorage",()=>D],11979)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0b3c6eed._.js.map