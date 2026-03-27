module.exports=[80960,e=>{"use strict";var t=e.i(66574),a=e.i(58350),r=e.i(10732),i=e.i(12768),n=e.i(75089),s=e.i(11299),o=e.i(66012),d=e.i(12480),l=e.i(64629),u=e.i(2078),c=e.i(99591),p=e.i(65698),_=e.i(29809),E=e.i(64157),T=e.i(56534),R=e.i(93695);e.i(22981);var h=e.i(4706),g=e.i(16770);let m=(0,e.i(70485).neon)(process.env.DATABASE_URL_UNPOOLED),v={offer_pending:["accepted","cancelled"],accepted:["en_route","cancelled"],assigned:["en_route","cancelled"],en_route:["arrived","cancelled"],arrived:["in_trip","no_show","cancelled"],in_trip:["completed","cancelled"]},N={en_route:"en_route_at",arrived:"arrived_at",in_trip:"trip_started_at",completed:"completed_at",cancelled:"cancelled_at",no_show:"no_show_at"},A={en_route:"driver_en_route",arrived:"driver_arrived",in_trip:"ride_started",completed:"ride_completed",cancelled:"ride_cancelled",no_show:"no_show"};async function w(e){try{let t=await e.json(),{booking_id:a,driver_id:r,new_status:i}=t;if(!a||!r||!i)return g.NextResponse.json({error:"Missing required fields: booking_id, driver_id, new_status"},{status:400});let n=await m`
      SELECT id, status, assigned_driver_id, source_driver_id,
             total_price, pickup_address, dropoff_address,
             pickup_at, vehicle_type, client_id
      FROM bookings
      WHERE id = ${a}
      LIMIT 1
    `;if(0===n.length)return g.NextResponse.json({error:"Booking not found"},{status:404});let s=n[0];if(s.assigned_driver_id!==r)return g.NextResponse.json({error:"Unauthorized: not assigned driver"},{status:403});let o=s.status,d=v[o]??[];if(!d.includes(i))return g.NextResponse.json({error:`Invalid transition: ${o} → ${i}`,allowed_transitions:d},{status:409});let l=new Date().toISOString();N[i];try{await m`
        ALTER TABLE bookings
          ADD COLUMN IF NOT EXISTS en_route_at    TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS arrived_at     TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS trip_started_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS no_show_at     TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50)
      `}catch{}"accepted"===i?await m`
        UPDATE bookings
        SET status = 'accepted',
            dispatch_status = 'accepted',
            updated_at = NOW()
        WHERE id = ${a}
      `:"en_route"===i?await m`
        UPDATE bookings
        SET status = 'en_route',
            dispatch_status = 'en_route',
            en_route_at = ${l}::timestamptz,
            updated_at = NOW()
        WHERE id = ${a}
      `:"arrived"===i?await m`
        UPDATE bookings
        SET status = 'arrived',
            dispatch_status = 'arrived',
            arrived_at = ${l}::timestamptz,
            updated_at = NOW()
        WHERE id = ${a}
      `:"in_trip"===i?await m`
        UPDATE bookings
        SET status = 'in_trip',
            dispatch_status = 'in_trip',
            trip_started_at = ${l}::timestamptz,
            updated_at = NOW()
        WHERE id = ${a}
      `:"completed"===i?await m`
        UPDATE bookings
        SET status = 'completed',
            dispatch_status = 'completed',
            completed_at = ${l}::timestamptz,
            updated_at = NOW()
        WHERE id = ${a}
      `:"cancelled"===i?await m`
        UPDATE bookings
        SET status = 'cancelled',
            dispatch_status = 'cancelled',
            cancelled_at = ${l}::timestamptz,
            updated_at = NOW()
        WHERE id = ${a}
      `:"no_show"===i&&await m`
        UPDATE bookings
        SET status = 'no_show',
            dispatch_status = 'no_show',
            no_show_at = ${l}::timestamptz,
            updated_at = NOW()
        WHERE id = ${a}
      `;let u=A[i]??i,c=t.override_type??null,p=t.gps_lat??null,_=t.gps_lng??null;try{await m`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, new_data)
        VALUES (
          'booking',
          ${a}::uuid,
          ${u},
          'driver',
          ${r}::uuid,
          ${JSON.stringify({previous_status:o,new_status:i,timestamp:l,override_type:c,gps_lat:p,gps_lng:_})}::jsonb
        )
      `}catch{}if("completed"===i){try{await m`
          UPDATE commissions
          SET status = 'confirmed',
              updated_at = NOW()
          WHERE booking_id = ${a}::uuid
            AND status = 'pending'
        `}catch{}try{let e=Number(s.total_price??0);e>0&&s.assigned_driver_id&&(await m`
            ALTER TABLE drivers
              ADD COLUMN IF NOT EXISTS total_earned NUMERIC(10,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS month_earned NUMERIC(10,2) DEFAULT 0,
              ADD COLUMN IF NOT EXISTS rides_completed INTEGER DEFAULT 0
          `,await m`
            UPDATE drivers
            SET total_earned = COALESCE(total_earned, 0) + ${e},
                month_earned = COALESCE(month_earned, 0) + ${e},
                rides_completed = COALESCE(rides_completed, 0) + 1,
                updated_at = NOW()
            WHERE id = ${s.assigned_driver_id}::uuid
          `)}catch{}try{let e=(await m`
          SELECT id, total_price, ref_code FROM bookings WHERE id = ${a}::uuid
        `)[0];if(e?.ref_code){let t=await m`
            SELECT id, commission_rate FROM partners
            WHERE ref_code = ${e.ref_code.toUpperCase()}
              AND status = 'active'
          `;if(t.length>0){let r=t[0],i=Number(e.total_price??0),n=Number(r.commission_rate??.1),s=i*n,o=await m`
              SELECT id FROM partner_earnings WHERE booking_id = ${a}::uuid
            `;0===o.length&&s>0&&await m`
                INSERT INTO partner_earnings
                  (partner_id, booking_id, gross_amount, commission_rate, commission_amount, status)
                VALUES
                  (${r.id}::uuid, ${a}::uuid, ${i}, ${n}, ${s}, 'pending')
              `}}}catch{}}return g.NextResponse.json({success:!0,booking_id:a,previous_status:o,new_status:i,timestamp:l})}catch(e){return console.error("[driver/ride-status]",e),g.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}async function S(e){try{let{searchParams:t}=new URL(e.url),a=t.get("booking_id");if(!a)return g.NextResponse.json({error:"booking_id required"},{status:400});let r=await m`
      SELECT
        b.id,
        b.status,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at,
        b.vehicle_type,
        b.total_price,
        b.client_id,
        b.assigned_driver_id,
        b.en_route_at,
        b.arrived_at,
        b.trip_started_at,
        b.completed_at,
        b.cancelled_at,
        b.no_show_at
      FROM bookings b
      WHERE b.id = ${a}
      LIMIT 1
    `;if(0===r.length)return g.NextResponse.json({error:"Booking not found"},{status:404});let i=[];try{i=await m`
        SELECT action, new_data, created_at
        FROM audit_logs
        WHERE entity_id = ${a}::uuid
          AND entity_type = 'booking'
        ORDER BY created_at ASC
      `}catch{}return g.NextResponse.json({booking:r[0],timeline:i})}catch(e){return g.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>S,"POST",()=>w],71844);var O=e.i(71844);let f=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/driver/ride-status/route",pathname:"/api/driver/ride-status",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/driver/ride-status/route.ts",nextConfigOutput:"",userland:O}),{workAsyncStorage:b,workUnitAsyncStorage:C,serverHooks:I}=f;function D(){return(0,r.patchFetch)({workAsyncStorage:b,workUnitAsyncStorage:C})}async function y(e,t,r){f.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/driver/ride-status/route";g=g.replace(/\/index$/,"")||"/";let m=await f.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!m)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:v,params:N,nextConfig:A,parsedUrl:w,isDraftMode:S,prerenderManifest:O,routerServerContext:b,isOnDemandRevalidate:C,revalidateOnlyGenerated:I,resolvedPathname:D,clientReferenceManifest:y,serverActionsManifest:U}=m,M=(0,o.normalizeAppPath)(g),$=!!(O.dynamicRoutes[M]||O.routes[D]),x=async()=>((null==b?void 0:b.render404)?await b.render404(e,t,w,!1):t.end("This page could not be found"),null);if($&&!S){let e=!!O.routes[D],t=O.dynamicRoutes[M];if(t&&!1===t.fallback&&!e){if(A.experimental.adapterPath)return await x();throw new R.NoFallbackError}}let P=null;!$||f.isDev||S||(P="/index"===(P=D)?"/":P);let k=!0===f.isDev||!$,L=$&&!k;U&&y&&(0,s.setManifestsSingleton)({page:g,clientReferenceManifest:y,serverActionsManifest:U});let H=e.method||"GET",F=(0,n.getTracer)(),W=F.getActiveScopeSpan(),j={params:N,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:k,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:A.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,i)=>f.onRequestError(e,t,r,i,b)},sharedContext:{buildId:v}},q=new d.NodeNextRequest(e),X=new d.NodeNextResponse(t),B=l.NextRequestAdapter.fromNodeNextRequest(q,(0,l.signalFromNodeResponse)(t));try{let s=async e=>f.handle(B,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=F.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${H} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${g}`)}),o=!!(0,i.getRequestMeta)(e,"minimalMode"),d=async i=>{var n,d;let l=async({previousCacheEntry:a})=>{try{if(!o&&C&&I&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(i);e.fetchMetrics=j.renderOpts.fetchMetrics;let d=j.renderOpts.pendingWaitUntil;d&&r.waitUntil&&(r.waitUntil(d),d=void 0);let l=j.renderOpts.collectedTags;if(!$)return await (0,p.sendResponse)(q,X,n,j.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[T.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=T.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,r=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=T.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await f.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:L,isOnDemandRevalidate:C})},!1,b),t}},u=await f.handleResponse({req:e,nextConfig:A,cacheKey:P,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:I,responseGenerator:l,waitUntil:r.waitUntil,isMinimalMode:o});if(!$)return null;if((null==u||null==(n=u.value)?void 0:n.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(d=u.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",C?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),S&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let R=(0,_.fromNodeOutgoingHttpHeaders)(u.value.headers);return o&&$||R.delete(T.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||R.get("Cache-Control")||R.set("Cache-Control",(0,E.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(q,X,new Response(u.value.body,{headers:R,status:u.value.status||200})),null};W?await d(W):await F.withPropagatedContext(e.headers,()=>F.trace(u.BaseServerSpan.handleRequest,{spanName:`${H} ${g}`,kind:n.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},d))}catch(t){if(t instanceof R.NoFallbackError||await f.onRequestError(e,t,{routerKind:"App Router",routePath:M,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:L,isOnDemandRevalidate:C})},!1,b),$)throw t;return await (0,p.sendResponse)(q,X,new Response(null,{status:500})),null}}e.s(["handler",()=>y,"patchFetch",()=>D,"routeModule",()=>f,"serverHooks",()=>I,"workAsyncStorage",()=>b,"workUnitAsyncStorage",()=>C],80960)}];

//# sourceMappingURL=84ad8_next_dist_esm_build_templates_app-route_a98b93c3.js.map