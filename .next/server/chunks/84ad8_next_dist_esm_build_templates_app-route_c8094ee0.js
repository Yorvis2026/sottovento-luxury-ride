module.exports=[62975,e=>{"use strict";var t=e.i(66574),i=e.i(58350),a=e.i(10732),s=e.i(12768),n=e.i(75089),r=e.i(11299),o=e.i(66012),d=e.i(12480),l=e.i(64629),c=e.i(2078),u=e.i(99591),p=e.i(65698),_=e.i(29809),g=e.i(64157),f=e.i(56534),h=e.i(93695);e.i(22981);var N=e.i(4706),m=e.i(16770);let E=(0,e.i(70485).neon)(process.env.DATABASE_URL_UNPOOLED);async function b(e){try{let{searchParams:t}=new URL(e.url),i=t.get("code");if(!i)return m.NextResponse.json({error:"code is required"},{status:400});let a=await E`
      SELECT
        id,
        driver_code,
        full_name,
        phone,
        email,
        driver_status,
        is_eligible,
        created_at
      FROM drivers
      WHERE driver_code = ${i.toUpperCase()}
      LIMIT 1
    `;if(0===a.length)return m.NextResponse.json({error:"Driver not found"},{status:404});let s=a[0],[n]=await E`
      SELECT
        COUNT(*) AS completed_rides_count,
        COALESCE(SUM(total_price), 0) AS lifetime_executor_earnings,
        COALESCE(SUM(CASE WHEN completed_at >= date_trunc('month', NOW()) THEN total_price ELSE 0 END), 0) AS month_executor_earnings
      FROM bookings
      WHERE assigned_driver_id = ${s.id}
        AND status = 'completed'
    `,[r]=await E`
      SELECT
        COUNT(DISTINCT client_id) AS total_clients,
        COALESCE(SUM(total_price * 0.05), 0) AS lifetime_source_earnings,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN total_price * 0.05 ELSE 0 END), 0) AS month_source_earnings
      FROM bookings
      WHERE source_driver_id = ${s.id}
        AND status != 'cancelled'
    `,[o]=await E`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE assigned_driver_id = ${s.id}
        AND status = 'pending'
    `,d=Number(n?.lifetime_executor_earnings??0)+Number(r?.lifetime_source_earnings??0),l=Number(n?.month_executor_earnings??0)+Number(r?.month_source_earnings??0),c=null;try{let e=await E`
        SELECT
          do.id AS offer_id,
          do.booking_id,
          do.expires_at,
          do.offer_round,
          do.is_source_offer,
          b.pickup_address,
          b.dropoff_address,
          b.pickup_at,
          b.vehicle_type,
          b.total_price,
          b.dispatch_status
        FROM dispatch_offers do
        JOIN bookings b ON b.id = do.booking_id
        WHERE do.driver_id = ${s.id}
          AND do.response = 'pending'
          AND (do.expires_at IS NULL OR do.expires_at > NOW())
          -- Exclude all finalized or already-accepted bookings
          AND b.status NOT IN ('cancelled', 'completed', 'no_show', 'archived', 'en_route', 'arrived', 'in_trip', 'accepted')
          -- Exclude 'assigned' bookings unless they are explicitly awaiting driver response
          AND NOT (b.status = 'assigned' AND (b.dispatch_status IS NULL OR b.dispatch_status NOT IN ('offer_pending')))
          -- DEDUP GUARD: exclude bookings already accepted by this driver (dispatch_status=accepted)
          AND b.dispatch_status NOT IN ('accepted', 'completed', 'cancelled')
          -- DEDUP GUARD: exclude bookings where this driver is already assigned and accepted
          AND NOT (b.assigned_driver_id = ${s.id} AND b.offer_accepted = true)
        ORDER BY do.created_at DESC
        LIMIT 1
      `;if(e.length>0){let t=e[0];c={offer_id:t.offer_id,booking_id:t.booking_id,pickup_location:t.pickup_address??"TBD",dropoff_location:t.dropoff_address??"TBD",pickup_datetime:t.pickup_at,vehicle_type:t.vehicle_type??"Sedan",total_price:Number(t.total_price??0),expires_at:t.expires_at,dispatch_status:t.dispatch_status??"awaiting_driver_response",is_source_offer:t.is_source_offer??!1,offer_round:t.offer_round??1}}}catch{}if(!c)try{let e=await E`
          SELECT
            id AS booking_id,
            pickup_address,
            dropoff_address,
            pickup_at,
            vehicle_type,
            total_price,
            dispatch_status,
            offer_expires_at
          FROM bookings
          WHERE (
            (dispatch_status = 'awaiting_driver_response' AND assigned_driver_id = ${s.id})
            OR (dispatch_status = 'awaiting_source_owner' AND source_driver_id = ${s.id})
            OR (dispatch_status = 'awaiting_sln_member' AND assigned_driver_id = ${s.id})
          )
          -- CRITICAL FIX: 'assigned' was excluded here, but auto-assigned bookings have
          -- status='assigned' AND dispatch_status='offer_pending'. They ARE valid offers.
          -- Only exclude 'assigned' if dispatch_status is NOT 'offer_pending'.
          AND status NOT IN ('cancelled', 'completed', 'no_show', 'archived', 'en_route', 'arrived', 'in_trip', 'accepted')
          AND NOT (status = 'assigned' AND (dispatch_status IS NULL OR dispatch_status != 'offer_pending'))
          AND (offer_expires_at IS NULL OR offer_expires_at > NOW())
          ORDER BY created_at DESC
          LIMIT 1
        `;if(e.length>0){let t=e[0];c={offer_id:t.booking_id,booking_id:t.booking_id,pickup_location:t.pickup_address??"TBD",dropoff_location:t.dropoff_address??"TBD",pickup_datetime:t.pickup_at,vehicle_type:t.vehicle_type??"Sedan",total_price:Number(t.total_price??0),expires_at:t.offer_expires_at,dispatch_status:t.dispatch_status??"awaiting_driver_response",is_source_offer:"awaiting_source_owner"===t.dispatch_status,offer_round:1}}}catch{}let u=null;try{let e=await E`
        SELECT
          id AS booking_id,
          status,
          dispatch_status,
          pickup_address,
          dropoff_address,
          pickup_zone,
          dropoff_zone,
          pickup_at,
          vehicle_type,
          total_price,
          client_id,
          service_type,
          flight_number,
          notes,
          passengers,
          luggage,
          updated_at,
          captured_by_driver_code
        FROM bookings
        WHERE assigned_driver_id = ${s.id}
          -- Primary guard: exclude all finalized states by status
          AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
          -- Secondary guard: exclude by dispatch_status if present (covers partial-write scenarios)
          AND (dispatch_status IS NULL OR dispatch_status NOT IN ('completed', 'cancelled', 'archived', 'no_show'))
          AND (
            -- OFFER_PENDING: driver must accept/reject — ALWAYS shown regardless of time.
            -- CRITICAL FIX: dispatch_status='offer_pending' must be visible even for future rides.
            -- A booking assigned for tomorrow with offer_pending must appear in the driver panel.
            -- Previously, the ACTIVE_WINDOW time gate was blocking these rides.
            status = 'offer_pending'
            OR
            dispatch_status = 'offer_pending'
            OR
            -- LIVE_FLOW: already executing regardless of time
            -- These statuses are always resumable regardless of pickup time
            status IN ('en_route', 'arrived', 'in_trip')
            OR
            -- ACTIVE_WINDOW: accepted/assigned rides within a strict time window.
            -- SLN PREMIUM RULE: minimum booking window is 2 hours.
            -- 'accepted'/'assigned' rides enter assigned_ride only when within 2h of pickup.
            -- Before that they stay in upcoming_rides (no operational controls).
            -- pickup_at IS NULL is intentionally excluded here to avoid permanent ghost rides.
            (
              status = 'accepted'
              AND dispatch_status NOT IN ('offer_pending', 'completed', 'cancelled')
              AND pickup_at IS NOT NULL
              AND pickup_at >= NOW() - INTERVAL '6 hours'
              AND pickup_at <= NOW() + INTERVAL '120 minutes'
            )
            OR
            (
              status = 'assigned'
              AND dispatch_status NOT IN ('offer_pending', 'completed', 'cancelled')
              AND pickup_at IS NOT NULL
              AND pickup_at >= NOW() - INTERVAL '6 hours'
              AND pickup_at <= NOW() + INTERVAL '120 minutes'
            )
          )
        ORDER BY
          CASE status
            WHEN 'in_trip'       THEN 1
            WHEN 'arrived'       THEN 2
            WHEN 'en_route'      THEN 3
            WHEN 'offer_pending' THEN 4
            WHEN 'accepted'      THEN 5
            WHEN 'assigned'      THEN 6
            ELSE 7
          END,
          pickup_at ASC
        LIMIT 1
      `;if(e.length>0){let t=e[0],i=null,a=null;if(t.client_id)try{let e=await E`
              SELECT full_name, phone FROM clients WHERE id = ${t.client_id} LIMIT 1
            `;e.length>0&&(i=e[0].full_name,a=e[0].phone)}catch{}let s=null,n=null,r=null,o=null;try{let e=await E`
            SELECT en_route_at, arrived_at, trip_started_at, completed_at
            FROM bookings WHERE id = ${t.booking_id} LIMIT 1
          `;e.length>0&&(s=e[0].en_route_at??null,n=e[0].arrived_at??null,r=e[0].trip_started_at??null,o=e[0].completed_at??null)}catch{}let d=t.pickup_at?new Date(t.pickup_at):null,l=new Date,c=d?(d.getTime()-l.getTime())/6e4:null,p="active_window";["en_route","arrived","in_trip"].includes(t.status)?p="live_flow":"offer_pending"===t.dispatch_status?p="offer_pending":"accepted"===t.status?p=null!==c&&c<=120?"operational_window_open":"active_window":"offer_pending"===t.status?p="offer_pending":"assigned"===t.status&&(p=null!==c&&c<=120?"operational_window_open":"active_window");let _=1;if(t.client_id)try{let e=await E`
              SELECT COUNT(*) AS cnt FROM bookings
              WHERE client_id = ${t.client_id} AND status = 'completed'
            `;_=Number(e[0]?.cnt??0)}catch{}u={booking_id:t.booking_id,status:t.status??"assigned",dispatch_status:t.dispatch_status??t.status??"assigned",pickup_location:t.pickup_address??"TBD",dropoff_location:t.dropoff_address??"TBD",pickup_zone:t.pickup_zone??null,dropoff_zone:t.dropoff_zone??null,pickup_datetime:t.pickup_at,vehicle_type:t.vehicle_type??"Sedan",total_price:Number(t.total_price??0),client_name:i,client_phone:a,service_type:t.service_type??"transfer",flight_number:t.flight_number??null,notes:t.notes??null,passengers:t.passengers??null,luggage:t.luggage??null,bookings_count:_,en_route_at:s,arrived_at:n,trip_started_at:r,completed_at:o,ride_mode:p,minutes_until_pickup:null!==c?Math.round(c):null,updated_at:t.updated_at??null,captured_by_driver_code:t.captured_by_driver_code??null}}}catch(e){console.error("[driver/me] assigned_ride query error:",e?.message)}u&&["completed","cancelled","archived","no_show"].includes(u.status)&&(console.warn("[driver/me] SAFETY: discarding finalized ride from assigned_ride",u.booking_id,u.status),u=null);let p=[];try{p=(await E`
        SELECT
          b.id AS booking_id,
          b.status,
          b.dispatch_status,
          b.pickup_address,
          b.dropoff_address,
          b.pickup_at,
          b.vehicle_type,
          b.total_price,
          b.flight_number,
          b.passengers,
          b.luggage,
          b.notes,
          c.full_name AS client_name,
          c.phone AS client_phone
        FROM bookings b
        LEFT JOIN clients c ON c.id = b.client_id
        WHERE b.assigned_driver_id = ${s.id}
          -- Primary guard: exclude all finalized states by status
          AND b.status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
          -- Secondary guard: exclude by dispatch_status if present (covers partial-write scenarios)
          AND (b.dispatch_status IS NULL OR b.dispatch_status NOT IN ('completed', 'cancelled', 'archived', 'no_show'))
          AND b.status IN ('offer_pending', 'accepted', 'assigned')
          AND b.pickup_at > NOW()
        ORDER BY b.pickup_at ASC
        LIMIT 10
      `).map(e=>{let t=e.pickup_at?new Date(e.pickup_at):null,i=t?Math.round((t.getTime()-Date.now())/6e4):null;return{booking_id:e.booking_id,status:e.status,dispatch_status:e.dispatch_status??e.status,pickup_location:e.pickup_address??"TBD",dropoff_location:e.dropoff_address??"TBD",pickup_datetime:e.pickup_at,vehicle_type:e.vehicle_type??"Sedan",total_price:Number(e.total_price??0),ride_window_state:"offer_pending"===e.status?"offer_pending":"upcoming",minutes_until_pickup:i,flight_number:e.flight_number??null,passengers:e.passengers??null,luggage:e.luggage??null,notes:e.notes??null,client_name:e.client_name??null,client_phone:e.client_phone??null}})}catch{}let _=[];try{_=(await E`
        SELECT
          b.id AS booking_id,
          b.status,
          b.pickup_address,
          b.dropoff_address,
          b.pickup_at,
          b.completed_at,
          b.vehicle_type,
          b.total_price,
          b.flight_number,
          b.notes,
          b.passengers,
          b.luggage,
          COALESCE(cl.full_name, b.client_name_override) AS client_name,
          COALESCE(cl.phone, b.client_phone_override) AS client_phone,
          c.executor_amount,
          c.source_amount,
          c.platform_amount,
          c.status AS payout_status
        FROM bookings b
        LEFT JOIN clients cl ON cl.id = b.client_id
        LEFT JOIN commissions c ON c.booking_id = b.id
        WHERE b.assigned_driver_id = ${s.id}
          AND b.status IN ('completed', 'no_show')
        ORDER BY COALESCE(b.completed_at, b.pickup_at) DESC NULLS LAST
        LIMIT 50
      `).map(e=>({booking_id:e.booking_id,status:e.status,pickup_location:e.pickup_address??"TBD",dropoff_location:e.dropoff_address??"TBD",pickup_datetime:e.pickup_at,completed_at:e.completed_at,vehicle_type:e.vehicle_type??"Sedan",total_price:Number(e.total_price??0),flight_number:e.flight_number??null,notes:e.notes??null,passengers:e.passengers??null,luggage:e.luggage??null,client_name:e.client_name??null,client_phone:e.client_phone??null,driver_earnings:e.executor_amount?Number(e.executor_amount):null,sln_commission:e.platform_amount?Number(e.platform_amount):null,source_earnings:e.source_amount?Number(e.source_amount):null,payout_status:e.payout_status??"pending"}))}catch{}return m.NextResponse.json({driver:{...s,stats:{total_clients:Number(r?.total_clients??0),completed_rides_count:Number(n?.completed_rides_count??0),lifetime_earnings:d,month_earnings:l,pending_offers:Number(o?.count??0)},active_offer:c,assigned_ride:u,upcoming_rides:p,completed_rides:_}})}catch(e){return m.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>b],45036);var v=e.i(45036);let R=new t.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/driver/me/route",pathname:"/api/driver/me",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/driver/me/route.ts",nextConfigOutput:"",userland:v}),{workAsyncStorage:A,workUnitAsyncStorage:T,serverHooks:k}=R;function O(){return(0,a.patchFetch)({workAsyncStorage:A,workUnitAsyncStorage:T})}async function w(e,t,a){R.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/driver/me/route";m=m.replace(/\/index$/,"")||"/";let E=await R.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!E)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:b,params:v,nextConfig:A,parsedUrl:T,isDraftMode:k,prerenderManifest:O,routerServerContext:w,isOnDemandRevalidate:S,revalidateOnlyGenerated:D,resolvedPathname:y,clientReferenceManifest:C,serverActionsManifest:I}=E,L=(0,o.normalizeAppPath)(m),x=!!(O.dynamicRoutes[L]||O.routes[y]),H=async()=>((null==w?void 0:w.render404)?await w.render404(e,t,T,!1):t.end("This page could not be found"),null);if(x&&!k){let e=!!O.routes[y],t=O.dynamicRoutes[L];if(t&&!1===t.fallback&&!e){if(A.experimental.adapterPath)return await H();throw new h.NoFallbackError}}let U=null;!x||R.isDev||k||(U="/index"===(U=y)?"/":U);let M=!0===R.isDev||!x,W=x&&!M;I&&C&&(0,r.setManifestsSingleton)({page:m,clientReferenceManifest:C,serverActionsManifest:I});let P=e.method||"GET",F=(0,n.getTracer)(),$=F.getActiveScopeSpan(),B={params:v,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:A.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,i,a,s)=>R.onRequestError(e,t,a,s,w)},sharedContext:{buildId:b}},q=new d.NodeNextRequest(e),j=new d.NodeNextResponse(t),z=l.NextRequestAdapter.fromNodeNextRequest(q,(0,l.signalFromNodeResponse)(t));try{let r=async e=>R.handle(z,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let i=F.getRootSpanAttributes();if(!i)return;if(i.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${i.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=i.get("next.route");if(a){let t=`${P} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${m}`)}),o=!!(0,s.getRequestMeta)(e,"minimalMode"),d=async s=>{var n,d;let l=async({previousCacheEntry:i})=>{try{if(!o&&S&&D&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await r(s);e.fetchMetrics=B.renderOpts.fetchMetrics;let d=B.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let l=B.renderOpts.collectedTags;if(!x)return await (0,p.sendResponse)(q,j,n,B.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[f.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let i=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=f.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,a=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=f.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:N.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:i,expire:a}}}}catch(t){throw(null==i?void 0:i.isStale)&&await R.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:S})},!1,w),t}},c=await R.handleResponse({req:e,nextConfig:A,cacheKey:U,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:D,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:o});if(!x)return null;if((null==c||null==(n=c.value)?void 0:n.kind)!==N.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(d=c.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",S?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),k&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let h=(0,_.fromNodeOutgoingHttpHeaders)(c.value.headers);return o&&x||h.delete(f.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||h.get("Cache-Control")||h.set("Cache-Control",(0,g.getCacheControlHeader)(c.cacheControl)),await (0,p.sendResponse)(q,j,new Response(c.value.body,{headers:h,status:c.value.status||200})),null};$?await d($):await F.withPropagatedContext(e.headers,()=>F.trace(c.BaseServerSpan.handleRequest,{spanName:`${P} ${m}`,kind:n.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},d))}catch(t){if(t instanceof h.NoFallbackError||await R.onRequestError(e,t,{routerKind:"App Router",routePath:L,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:S})},!1,w),x)throw t;return await (0,p.sendResponse)(q,j,new Response(null,{status:500})),null}}e.s(["handler",()=>w,"patchFetch",()=>O,"routeModule",()=>R,"serverHooks",()=>k,"workAsyncStorage",()=>A,"workUnitAsyncStorage",()=>T],62975)}];

//# sourceMappingURL=84ad8_next_dist_esm_build_templates_app-route_c8094ee0.js.map