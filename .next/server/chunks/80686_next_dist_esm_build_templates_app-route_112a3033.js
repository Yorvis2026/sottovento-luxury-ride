module.exports=[1354,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),n=e.i(1266),s=e.i(10171),o=e.i(44067),i=e.i(7601),l=e.i(3083),u=e.i(88890),c=e.i(37886),d=e.i(63388),_=e.i(46601),p=e.i(24139),E=e.i(78785),h=e.i(2640),m=e.i(93695);e.i(46509);var T=e.i(56592),R=e.i(50974);let f=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED),v={PASSENGER_NO_SHOW:"passenger",PASSENGER_CANCELLED:"passenger",PASSENGER_UNREACHABLE:"passenger",PASSENGER_FLIGHT_DELAY:"passenger",PASSENGER_TOOK_DIFFERENT_VEHICLE:"passenger",WRONG_PICKUP_LOCATION:"passenger",SAFETY_CONCERN:"driver",VEHICLE_ISSUE:"driver",DRIVER_EMERGENCY:"driver",DISPATCH_REQUEST:"dispatch",OTHER:"system"},N=Object.keys(v);async function g(e){try{var t,r,a;let n,{booking_id:s,driver_id:o,cancel_reason:i,cancellation_notes:l,passenger_no_show_confirmed:u,gps_lat:c,gps_lng:d,evidence_url:_}=await e.json();if(!s||!o||!i)return R.NextResponse.json({error:"Missing required fields: booking_id, driver_id, cancel_reason"},{status:400});if(!N.includes(i))return R.NextResponse.json({error:`Invalid cancel_reason. Must be one of: ${N.join(", ")}`},{status:400});if("OTHER"===i&&!l?.trim())return R.NextResponse.json({error:"cancellation_notes is required when cancel_reason is OTHER"},{status:400});let p=await f`
      SELECT
        id,
        status,
        assigned_driver_id,
        pickup_at,
        total_price,
        pickup_address,
        dropoff_address,
        client_id,
        source_driver_id,
        COALESCE(source_type, 'unknown')         AS source_type,
        COALESCE(cancellation_fee, 0)::numeric   AS cancellation_fee
      FROM bookings
      WHERE id = ${s}::uuid
      LIMIT 1
    `;if(0===p.length)return R.NextResponse.json({error:"Booking not found"},{status:404});let E=p[0];if(E.assigned_driver_id!==o)return R.NextResponse.json({error:"Unauthorized: not assigned driver"},{status:403});if(!["offer_pending","accepted","assigned","en_route","arrived"].includes(E.status))return R.NextResponse.json({error:`Cannot cancel a ride with status: ${E.status}`},{status:409});let h=new Date,m=h.toISOString(),T=E.pickup_at?new Date(E.pickup_at):null,g=!!T&&h<T,S=!!T&&h>=T,A=T?Math.round((h.getTime()-T.getTime())/6e4):null,O="PASSENGER_NO_SHOW"===i&&!0===u,y=v[i]??"system",C=function(e){switch(e){case"passenger":return"pending";case"driver":return"cancelled";default:return"needs_review"}}(y),I=function(e){switch(e){case"passenger":case"driver":default:return"cancelled";case"dispatch":case"system":return"needs_review"}}(y),x=parseFloat(E.cancellation_fee)||0,w=(t=E.assigned_driver_id??null,r=E.source_driver_id??null,a=E.source_type??null,n=x??0,"platform"!==a&&(r||t)?r&&t&&r===t?{executor_share_amount:parseFloat((.8*n).toFixed(2)),source_driver_share_amount:0,platform_share_amount:parseFloat((.2*n).toFixed(2)),fee_split_strategy:"same_driver"}:r&&t&&r!==t?{executor_share_amount:parseFloat((.65*n).toFixed(2)),source_driver_share_amount:parseFloat((.15*n).toFixed(2)),platform_share_amount:parseFloat((.2*n).toFixed(2)),fee_split_strategy:"split_network"}:{executor_share_amount:parseFloat((.75*n).toFixed(2)),source_driver_share_amount:0,platform_share_amount:parseFloat((.25*n).toFixed(2)),fee_split_strategy:"platform_origin"}:{executor_share_amount:parseFloat((.75*n).toFixed(2)),source_driver_share_amount:0,platform_share_amount:parseFloat((.25*n).toFixed(2)),fee_split_strategy:"platform_origin"});try{await f`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS cancel_reason              TEXT,
          ADD COLUMN IF NOT EXISTS cancel_responsibility      TEXT,
          ADD COLUMN IF NOT EXISTS cancellation_notes         TEXT,
          ADD COLUMN IF NOT EXISTS passenger_no_show          BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS early_cancel               BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS late_cancel                BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS cancelled_at               TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS no_show_at                 TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS payout_status              TEXT,
          ADD COLUMN IF NOT EXISTS cancellation_fee           NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS executor_share_amount      NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS source_driver_share_amount NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS platform_share_amount      NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS fee_split_strategy         TEXT
      `}catch{}await f`
      UPDATE bookings
      SET
        status                      = ${I},
        dispatch_status             = 'cancelled',
        cancel_reason               = ${i},
        cancel_responsibility       = ${y},
        cancellation_notes          = ${l??null},
        passenger_no_show           = ${O},
        early_cancel                = ${g},
        late_cancel                 = ${S},
        cancelled_at                = ${m}::timestamptz,
        no_show_at                  = ${O?m:null}::timestamptz,
        payout_status               = ${C},
        executor_share_amount       = ${w.executor_share_amount},
        source_driver_share_amount  = ${w.source_driver_share_amount},
        platform_share_amount       = ${w.platform_share_amount},
        fee_split_strategy          = ${w.fee_split_strategy},
        updated_at                  = NOW()
      WHERE id = ${s}::uuid
    `;let D={cancel_reason:i,cancel_responsibility:y,cancellation_notes:l??null,passenger_no_show:O,early_cancel:g,late_cancel:S,pickup_time_delta_minutes:A,driver_location:c&&d?{lat:c,lng:d}:null,optional_evidence_url:_??null,timestamp:m,payout_status:C,cancellation_fee:x,fee_split_strategy:w.fee_split_strategy,executor_share_amount:w.executor_share_amount,source_driver_share_amount:w.source_driver_share_amount,platform_share_amount:w.platform_share_amount,executor_driver_id:E.assigned_driver_id??null,source_driver_id:E.source_driver_id??null,source_type:E.source_type??null};try{await f`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, actor_type, actor_id, new_data
        ) VALUES (
          'booking',
          ${s}::uuid,
          'ride_cancelled_by_driver',
          'driver',
          ${o}::uuid,
          ${JSON.stringify(D)}::jsonb
        )
      `}catch{}return R.NextResponse.json({success:!0,booking_id:s,cancel_reason:i,cancel_responsibility:y,passenger_no_show:O,early_cancel:g,late_cancel:S,payout_status:C,new_booking_status:I,pickup_time_delta_minutes:A,cancellation_fee:x,fee_split_strategy:w.fee_split_strategy,executor_share_amount:w.executor_share_amount,source_driver_share_amount:w.source_driver_share_amount,platform_share_amount:w.platform_share_amount})}catch(e){return console.error("[driver/cancel-ride]",e),R.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}e.s(["POST",()=>g,"dynamic",0,"force-dynamic"],47392);var S=e.i(47392);let A=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/driver/cancel-ride/route",pathname:"/api/driver/cancel-ride",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/driver/cancel-ride/route.ts",nextConfigOutput:"",userland:S}),{workAsyncStorage:O,workUnitAsyncStorage:y,serverHooks:C}=A;function I(){return(0,a.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:y})}async function x(e,t,a){A.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let R="/api/driver/cancel-ride/route";R=R.replace(/\/index$/,"")||"/";let f=await A.prepare(e,t,{srcPage:R,multiZoneDraftMode:!1});if(!f)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:v,params:N,nextConfig:g,parsedUrl:S,isDraftMode:O,prerenderManifest:y,routerServerContext:C,isOnDemandRevalidate:I,revalidateOnlyGenerated:x,resolvedPathname:w,clientReferenceManifest:D,serverActionsManifest:F}=f,U=(0,i.normalizeAppPath)(R),L=!!(y.dynamicRoutes[U]||y.routes[w]),M=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,S,!1):t.end("This page could not be found"),null);if(L&&!O){let e=!!y.routes[w],t=y.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(g.experimental.adapterPath)return await M();throw new m.NoFallbackError}}let P=null;!L||A.isDev||O||(P="/index"===(P=w)?"/":P);let b=!0===A.isDev||!L,$=L&&!b;F&&D&&(0,o.setManifestsSingleton)({page:R,clientReferenceManifest:D,serverActionsManifest:F});let k=e.method||"GET",H=(0,s.getTracer)(),X=H.getActiveScopeSpan(),j={params:N,prerenderManifest:y,renderOpts:{experimental:{authInterrupts:!!g.experimental.authInterrupts},cacheComponents:!!g.cacheComponents,supportsDynamicResponse:b,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:g.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>A.onRequestError(e,t,a,n,C)},sharedContext:{buildId:v}},q=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),G=u.NextRequestAdapter.fromNodeNextRequest(q,(0,u.signalFromNodeResponse)(t));try{let o=async e=>A.handle(G,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=H.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${k} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${k} ${R}`)}),i=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var s,l;let u=async({previousCacheEntry:r})=>{try{if(!i&&I&&x&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await o(n);e.fetchMetrics=j.renderOpts.fetchMetrics;let l=j.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let u=j.renderOpts.collectedTags;if(!L)return await (0,_.sendResponse)(q,B,s,j.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(s.headers);u&&(t[h.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,a=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:T.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:R,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:I})},!1,C),t}},c=await A.handleResponse({req:e,nextConfig:g,cacheKey:P,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:I,revalidateOnlyGenerated:x,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:i});if(!L)return null;if((null==c||null==(s=c.value)?void 0:s.kind)!==T.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(l=c.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",I?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(c.value.headers);return i&&L||m.delete(h.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,E.getCacheControlHeader)(c.cacheControl)),await (0,_.sendResponse)(q,B,new Response(c.value.body,{headers:m,status:c.value.status||200})),null};X?await l(X):await H.withPropagatedContext(e.headers,()=>H.trace(c.BaseServerSpan.handleRequest,{spanName:`${k} ${R}`,kind:s.SpanKind.SERVER,attributes:{"http.method":k,"http.target":e.url}},l))}catch(t){if(t instanceof m.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:$,isOnDemandRevalidate:I})},!1,C),L)throw t;return await (0,_.sendResponse)(q,B,new Response(null,{status:500})),null}}e.s(["handler",()=>x,"patchFetch",()=>I,"routeModule",()=>A,"serverHooks",()=>C,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>y],1354)}];

//# sourceMappingURL=80686_next_dist_esm_build_templates_app-route_112a3033.js.map