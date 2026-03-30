module.exports=[32641,e=>{"use strict";var t=e.i(39743),r=e.i(37383),i=e.i(16108),o=e.i(1266),n=e.i(10171),a=e.i(44067),s=e.i(7601),l=e.i(3083),_=e.i(88890),d=e.i(37886),c=e.i(63388),u=e.i(46601),p=e.i(24139),E=e.i(78785),v=e.i(2640),m=e.i(93695);e.i(46509);var h=e.i(56592),A=e.i(50974),S=e.i(57747),T=e.i(45972);let R=(0,S.neon)(process.env.DATABASE_URL_UNPOOLED),O=["completed_ride_on_time","high_acceptance_behavior","positive_rating_event","source_lead_generated","onboarding_contribution_bonus","late_cancel_driver","driver_cancel_1h_to_4h","no_response_offer_timeout","client_complaint","driver_fault_no_show"];async function b(e){try{let{driver_id:t,event_type:r,booking_id:i,notes:o,is_affiliate:n}=await e.json();if(!t||!r)return A.NextResponse.json({error:"driver_id and event_type are required"},{status:400});if(!O.includes(r))return A.NextResponse.json({error:`Invalid event_type. Valid values: ${O.join(", ")}`},{status:400});try{await R`
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
      `}catch{}let a=await R`
      SELECT
        id,
        driver_status,
        COALESCE(driver_score_total, 75)               AS driver_score_total,
        COALESCE(driver_score_tier, 'GOLD')            AS driver_score_tier,
        provisional_started_at,
        provisional_ends_at,
        COALESCE(provisional_completed_rides, 0)       AS provisional_completed_rides,
        COALESCE(is_eligible_for_premium_dispatch, FALSE) AS is_eligible_for_premium_dispatch,
        COALESCE(is_eligible_for_airport_priority, FALSE) AS is_eligible_for_airport_priority,
        COALESCE(on_time_rides, 0)                     AS on_time_rides,
        COALESCE(rides_completed, 0)                   AS rides_completed,
        COALESCE(late_cancel_count, 0)                 AS late_cancel_count,
        COALESCE(complaint_count, 0)                   AS complaint_count,
        COALESCE(contribution_bonus_granted, FALSE)    AS contribution_bonus_granted
      FROM drivers
      WHERE id = ${t}::uuid
      LIMIT 1
    `;if(0===a.length)return A.NextResponse.json({error:"Driver not found"},{status:404});let s=a[0],l="provisional"===s.driver_status;if("onboarding_contribution_bonus"===r){if(s.contribution_bonus_granted)return A.NextResponse.json({error:"Contribution bonus has already been granted to this driver"},{status:409});if(!n)return A.NextResponse.json({error:"is_affiliate must be true to grant contribution bonus"},{status:400})}let _=l?(0,T.getProvisionalDelta)(r):T.BASE_SCORE_DELTAS[r],d=Number(s.driver_score_total),c=(0,T.clampScore)(d+_),u=(0,T.getTierFromScore)(c),p=0,E=0,v=0,m=0;"completed_ride_on_time"===r&&(p=1,m=1),"late_cancel_driver"===r&&(E=1),"client_complaint"===r&&(v=1);let h=Number(s.provisional_completed_rides)+m,S=Number(s.on_time_rides)+p,b=Number(s.late_cancel_count)+E,g=Number(s.complaint_count)+v,N=Number(s.rides_completed)+ +(m>0),f=N>0?Math.round(S/N*100):0,C={provisional_completed_rides:h,has_late_driver_cancellation:b>0,has_active_complaint:g>0,on_time_rate:f},D=(0,T.checkPremiumDispatchEligibility)(C),I=(0,T.checkAirportPriorityEligibility)(C),L=l?(0,T.checkProvisionalExit)(h,s.provisional_ends_at):{should_exit:!1},x=c,y=u,w=s.driver_status,U=null;if(L.should_exit&&L.exit_reason){let e=(0,T.recalculateExitScore)(c);x=e.final_score,y=e.final_tier,w="active",U=L.exit_reason}let F="onboarding_contribution_bonus"===r||s.contribution_bonus_granted;await R`
      UPDATE drivers
      SET
        driver_score_total               = ${x},
        driver_score_tier                = ${y},
        driver_status                    = ${w},
        provisional_completed_rides      = ${h},
        provisional_exit_reason          = ${U},
        is_eligible_for_premium_dispatch = ${D},
        is_eligible_for_airport_priority = ${I},
        on_time_rides                    = ${S},
        late_cancel_count                = ${b},
        complaint_count                  = ${g},
        contribution_bonus_granted       = ${F},
        updated_at                       = NOW()
      WHERE id = ${t}::uuid
    `;let P={event_type:r,is_provisional:l,score_delta:_,previous_score:d,new_score:x,previous_tier:s.driver_score_tier,new_tier:y,provisional_rides:h,premium_eligible:D,airport_eligible:I,on_time_rate:f,provisional_exit:L.should_exit,provisional_exit_reason:U,booking_id:i??null,notes:o??null,contribution_bonus:"onboarding_contribution_bonus"===r,timestamp:new Date().toISOString()};try{await R`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, new_data
        ) VALUES (
          'driver',
          ${t}::uuid,
          ${"provisional_score_event:"+r},
          'system',
          ${JSON.stringify(P)}::jsonb
        )
      `}catch{}if(L.should_exit)try{await R`
          INSERT INTO audit_logs (
            entity_type, entity_id, action, actor_type, new_data
          ) VALUES (
            'driver',
            ${t}::uuid,
            'provisional_exit_recalculation',
            'system',
            ${JSON.stringify({exit_reason:U,pre_exit_score:c,post_exit_score:x,final_tier:y,provisional_rides:h,threshold_rides:T.PROVISIONAL_RIDE_THRESHOLD,timestamp:new Date().toISOString()})}::jsonb
          )
        `}catch{}return A.NextResponse.json({success:!0,driver_id:t,event_type:r,is_provisional:l,score_delta:_,previous_score:d,new_score:x,previous_tier:s.driver_score_tier,new_tier:y,driver_status:w,provisional_completed_rides:h,is_eligible_for_premium_dispatch:D,is_eligible_for_airport_priority:I,on_time_rate:f,provisional_exit:L.should_exit,provisional_exit_reason:U})}catch(e){return console.error("[drivers/provisional-score]",e),A.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}e.s(["POST",()=>b,"dynamic",0,"force-dynamic"],85060);var g=e.i(85060);let N=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/drivers/provisional-score/route",pathname:"/api/admin/drivers/provisional-score",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/drivers/provisional-score/route.ts",nextConfigOutput:"",userland:g}),{workAsyncStorage:f,workUnitAsyncStorage:C,serverHooks:D}=N;function I(){return(0,i.patchFetch)({workAsyncStorage:f,workUnitAsyncStorage:C})}async function L(e,t,i){N.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let A="/api/admin/drivers/provisional-score/route";A=A.replace(/\/index$/,"")||"/";let S=await N.prepare(e,t,{srcPage:A,multiZoneDraftMode:!1});if(!S)return t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve()),null;let{buildId:T,params:R,nextConfig:O,parsedUrl:b,isDraftMode:g,prerenderManifest:f,routerServerContext:C,isOnDemandRevalidate:D,revalidateOnlyGenerated:I,resolvedPathname:L,clientReferenceManifest:x,serverActionsManifest:y}=S,w=(0,s.normalizeAppPath)(A),U=!!(f.dynamicRoutes[w]||f.routes[L]),F=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,b,!1):t.end("This page could not be found"),null);if(U&&!g){let e=!!f.routes[L],t=f.dynamicRoutes[w];if(t&&!1===t.fallback&&!e){if(O.experimental.adapterPath)return await F();throw new m.NoFallbackError}}let P=null;!U||N.isDev||g||(P="/index"===(P=L)?"/":P);let M=!0===N.isDev||!U,$=U&&!M;y&&x&&(0,a.setManifestsSingleton)({page:A,clientReferenceManifest:x,serverActionsManifest:y});let H=e.method||"GET",j=(0,n.getTracer)(),k=j.getActiveScopeSpan(),X={params:R,prerenderManifest:f,renderOpts:{experimental:{authInterrupts:!!O.experimental.authInterrupts},cacheComponents:!!O.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:O.cacheLife,waitUntil:i.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,i,o)=>N.onRequestError(e,t,i,o,C)},sharedContext:{buildId:T}},q=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),G=_.NextRequestAdapter.fromNodeNextRequest(q,(0,_.signalFromNodeResponse)(t));try{let a=async e=>N.handle(G,X).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=r.get("next.route");if(i){let t=`${H} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${A}`)}),s=!!(0,o.getRequestMeta)(e,"minimalMode"),l=async o=>{var n,l;let _=async({previousCacheEntry:r})=>{try{if(!s&&D&&I&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await a(o);e.fetchMetrics=X.renderOpts.fetchMetrics;let l=X.renderOpts.pendingWaitUntil;l&&i.waitUntil&&(i.waitUntil(l),l=void 0);let _=X.renderOpts.collectedTags;if(!U)return await (0,u.sendResponse)(q,B,n,X.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(n.headers);_&&(t[v.NEXT_CACHE_TAGS_HEADER]=_),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==X.renderOpts.collectedRevalidate&&!(X.renderOpts.collectedRevalidate>=v.INFINITE_CACHE)&&X.renderOpts.collectedRevalidate,i=void 0===X.renderOpts.collectedExpire||X.renderOpts.collectedExpire>=v.INFINITE_CACHE?void 0:X.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:i}}}}catch(t){throw(null==r?void 0:r.isStale)&&await N.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:D})},!1,C),t}},d=await N.handleResponse({req:e,nextConfig:O,cacheKey:P,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:f,isRoutePPREnabled:!1,isOnDemandRevalidate:D,revalidateOnlyGenerated:I,responseGenerator:_,waitUntil:i.waitUntil,isMinimalMode:s});if(!U)return null;if((null==d||null==(n=d.value)?void 0:n.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",D?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),g&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(d.value.headers);return s&&U||m.delete(v.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,E.getCacheControlHeader)(d.cacheControl)),await (0,u.sendResponse)(q,B,new Response(d.value.body,{headers:m,status:d.value.status||200})),null};k?await l(k):await j.withPropagatedContext(e.headers,()=>j.trace(d.BaseServerSpan.handleRequest,{spanName:`${H} ${A}`,kind:n.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},l))}catch(t){if(t instanceof m.NoFallbackError||await N.onRequestError(e,t,{routerKind:"App Router",routePath:w,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:D})},!1,C),U)throw t;return await (0,u.sendResponse)(q,B,new Response(null,{status:500})),null}}e.s(["handler",()=>L,"patchFetch",()=>I,"routeModule",()=>N,"serverHooks",()=>D,"workAsyncStorage",()=>f,"workUnitAsyncStorage",()=>C],32641)}];

//# sourceMappingURL=80686_next_dist_esm_build_templates_app-route_70107e17.js.map