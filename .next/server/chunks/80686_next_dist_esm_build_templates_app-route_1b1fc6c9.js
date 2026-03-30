module.exports=[28359,e=>{"use strict";var t=e.i(39743),a=e.i(37383),r=e.i(16108),i=e.i(1266),n=e.i(10171),s=e.i(44067),o=e.i(7601),d=e.i(3083),l=e.i(88890),u=e.i(37886),c=e.i(63388),p=e.i(46601),_=e.i(24139),E=e.i(78785),h=e.i(2640),T=e.i(93695);e.i(46509);var R=e.i(56592),g=e.i(50974);let m=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED),v={offer_pending:["accepted","cancelled"],accepted:["en_route","cancelled"],assigned:["en_route","cancelled"],en_route:["arrived","cancelled"],arrived:["in_trip","no_show","cancelled"],in_trip:["completed","cancelled"]},N={en_route:"en_route_at",arrived:"arrived_at",in_trip:"trip_started_at",completed:"completed_at",cancelled:"cancelled_at",no_show:"no_show_at"},A={en_route:"driver_en_route",arrived:"driver_arrived",in_trip:"ride_started",completed:"ride_completed",cancelled:"ride_cancelled",no_show:"no_show"};async function w(e){try{let t=await e.json(),{booking_id:a,driver_id:r,new_status:i}=t;if(!a||!r||!i)return g.NextResponse.json({error:"Missing required fields: booking_id, driver_id, new_status"},{status:400});let n=await m`
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
          `)}catch{}if(s.assigned_driver_id)try{let e=s.pickup_at?new Date(s.pickup_at).getTime():null,t=Date.now(),r=!!e&&3e5>=Math.abs(t-e),i=process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:process.env.NEXT_PUBLIC_BASE_URL??"http://localhost:3000";await fetch(`${i}/api/admin/drivers/provisional-score`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({driver_id:s.assigned_driver_id,event_type:r?"completed_ride_on_time":"high_acceptance_behavior",booking_id:a,notes:`Auto-triggered on ride completion. on_time=${r}`})})}catch{}try{let e=(await m`
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
      `}catch{}return g.NextResponse.json({booking:r[0],timeline:i})}catch(e){return g.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>S,"POST",()=>w,"dynamic",0,"force-dynamic"],93552);var f=e.i(93552);let O=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/driver/ride-status/route",pathname:"/api/driver/ride-status",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/driver/ride-status/route.ts",nextConfigOutput:"",userland:f}),{workAsyncStorage:b,workUnitAsyncStorage:C,serverHooks:I}=O;function y(){return(0,r.patchFetch)({workAsyncStorage:b,workUnitAsyncStorage:C})}async function D(e,t,r){O.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/driver/ride-status/route";g=g.replace(/\/index$/,"")||"/";let m=await O.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!m)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:v,params:N,nextConfig:A,parsedUrl:w,isDraftMode:S,prerenderManifest:f,routerServerContext:b,isOnDemandRevalidate:C,revalidateOnlyGenerated:I,resolvedPathname:y,clientReferenceManifest:D,serverActionsManifest:U}=m,M=(0,o.normalizeAppPath)(g),$=!!(f.dynamicRoutes[M]||f.routes[y]),L=async()=>((null==b?void 0:b.render404)?await b.render404(e,t,w,!1):t.end("This page could not be found"),null);if($&&!S){let e=!!f.routes[y],t=f.dynamicRoutes[M];if(t&&!1===t.fallback&&!e){if(A.experimental.adapterPath)return await L();throw new T.NoFallbackError}}let k=null;!$||O.isDev||S||(k="/index"===(k=y)?"/":k);let P=!0===O.isDev||!$,x=$&&!P;U&&D&&(0,s.setManifestsSingleton)({page:g,clientReferenceManifest:D,serverActionsManifest:U});let H=e.method||"GET",F=(0,n.getTracer)(),W=F.getActiveScopeSpan(),j={params:N,prerenderManifest:f,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:A.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,i)=>O.onRequestError(e,t,r,i,b)},sharedContext:{buildId:v}},q=new d.NodeNextRequest(e),X=new d.NodeNextResponse(t),B=l.NextRequestAdapter.fromNodeNextRequest(q,(0,l.signalFromNodeResponse)(t));try{let s=async e=>O.handle(B,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=F.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${H} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${g}`)}),o=!!(0,i.getRequestMeta)(e,"minimalMode"),d=async i=>{var n,d;let l=async({previousCacheEntry:a})=>{try{if(!o&&C&&I&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(i);e.fetchMetrics=j.renderOpts.fetchMetrics;let d=j.renderOpts.pendingWaitUntil;d&&r.waitUntil&&(r.waitUntil(d),d=void 0);let l=j.renderOpts.collectedTags;if(!$)return await (0,p.sendResponse)(q,X,n,j.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[h.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,r=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await O.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:x,isOnDemandRevalidate:C})},!1,b),t}},u=await O.handleResponse({req:e,nextConfig:A,cacheKey:k,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:f,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:I,responseGenerator:l,waitUntil:r.waitUntil,isMinimalMode:o});if(!$)return null;if((null==u||null==(n=u.value)?void 0:n.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(d=u.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",C?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),S&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let T=(0,_.fromNodeOutgoingHttpHeaders)(u.value.headers);return o&&$||T.delete(h.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||T.get("Cache-Control")||T.set("Cache-Control",(0,E.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(q,X,new Response(u.value.body,{headers:T,status:u.value.status||200})),null};W?await d(W):await F.withPropagatedContext(e.headers,()=>F.trace(u.BaseServerSpan.handleRequest,{spanName:`${H} ${g}`,kind:n.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},d))}catch(t){if(t instanceof T.NoFallbackError||await O.onRequestError(e,t,{routerKind:"App Router",routePath:M,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:x,isOnDemandRevalidate:C})},!1,b),$)throw t;return await (0,p.sendResponse)(q,X,new Response(null,{status:500})),null}}e.s(["handler",()=>D,"patchFetch",()=>y,"routeModule",()=>O,"serverHooks",()=>I,"workAsyncStorage",()=>b,"workUnitAsyncStorage",()=>C],28359)}];

//# sourceMappingURL=80686_next_dist_esm_build_templates_app-route_1b1fc6c9.js.map