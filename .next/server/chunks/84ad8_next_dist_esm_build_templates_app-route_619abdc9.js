module.exports=[33135,e=>{"use strict";var t=e.i(66574),r=e.i(58350),i=e.i(10732),a=e.i(12768),s=e.i(75089),n=e.i(11299),d=e.i(66012),o=e.i(12480),u=e.i(64629),c=e.i(2078),l=e.i(99591),_=e.i(65698),p=e.i(29809),h=e.i(64157),g=e.i(56534),E=e.i(93695);e.i(22981);var b=e.i(4706),v=e.i(16770);let f=(0,e.i(70485).neon)(process.env.DATABASE_URL_UNPOOLED);async function A(){try{let e=await f`
      SELECT
        b.id,
        COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
        b.pickup_zone,
        b.dropoff_zone,
        b.pickup_address,
        b.dropoff_address,
        b.pickup_at,
        b.vehicle_type,
        b.total_price,
        b.status,
        b.dispatch_status,
        b.payment_status,
        b.assigned_driver_id,
        b.created_at,
        b.updated_at,
        COALESCE(b.service_type, '') AS service_type,
        COALESCE(b.flight_number, '') AS flight_number,
        COALESCE(b.passenger_count, b.passengers::integer, 1) AS passenger_count,
        COALESCE(b.luggage_count, b.luggage::integer, 0) AS luggage_count,
        COALESCE(b.notes, '') AS notes,
        COALESCE(b.lead_source, 'unknown') AS lead_source,
        COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
        COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
        c.full_name AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        d.full_name AS driver_name,
        d.driver_code AS driver_code,
        d.phone AS driver_phone,
        -- ── Cancellation fields (Fases 1-10) ──────────────────────────────────
        COALESCE(b.cancel_reason, '') AS cancel_reason,
        COALESCE(b.cancel_responsibility, '') AS cancel_responsibility,
        COALESCE(b.passenger_no_show, FALSE) AS passenger_no_show,
        COALESCE(b.early_cancel, FALSE) AS early_cancel,
        COALESCE(b.late_cancel, FALSE) AS late_cancel,
        COALESCE(b.payout_status, '') AS payout_status,
        b.cancelled_at,
        (
          SELECT al.action FROM audit_logs al
          WHERE al.entity_id = b.id
            AND al.action IN (
              'driver_reported_incomplete',
              'driver_requested_correction',
              'driver_rejected_incomplete_ride'
            )
          ORDER BY al.created_at DESC
          LIMIT 1
        ) AS last_driver_action,
        (
          SELECT al.new_data->>'notes' FROM audit_logs al
          WHERE al.entity_id = b.id
            AND al.action IN (
              'driver_reported_incomplete',
              'driver_requested_correction',
              'driver_rejected_incomplete_ride'
            )
          ORDER BY al.created_at DESC
          LIMIT 1
        ) AS driver_issue_notes
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE (
        b.status NOT IN ('cancelled', 'archived')
        OR (b.status = 'completed' AND b.updated_at > NOW() - INTERVAL '24 hours')
        OR (b.status = 'cancelled' AND b.updated_at > NOW() - INTERVAL '24 hours')
      )
      ORDER BY
        CASE
          WHEN b.status = 'driver_issue' THEN 1
          WHEN b.dispatch_status IN ('driver_rejected', 'needs_correction') THEN 1
          WHEN b.status = 'needs_review' THEN 2
          WHEN b.status = 'ready_for_dispatch' THEN 3
          WHEN b.status IN ('assigned', 'driver_confirmed') THEN 4
          WHEN b.status = 'in_progress' THEN 5
          WHEN b.status = 'completed' THEN 6
          ELSE 7
        END,
        b.pickup_at ASC NULLS LAST,
        b.created_at DESC
    `,t=[],r=[],i=[],a=[],s=[],n=[],d=[];for(let o of e){let e={...o},u=e.status??"",c=e.dispatch_status??"",l=e.last_driver_action??"",_="driver_issue"===u||"driver_rejected"===c||"needs_correction"===c||"driver_rejected_incomplete_ride"===l||"driver_reported_incomplete"===l||"driver_requested_correction"===l,p="tablet"===e.booking_origin||"driver_qr"===e.booking_origin||"driver_referral"===e.booking_origin||"driver_tablet"===e.booking_origin||"hotel_partner"===e.booking_origin||e.captured_by_driver_code&&"public_site"!==e.captured_by_driver_code,h=[];e.client_phone||h.push("tel. cliente"),e.pickup_address||e.pickup_zone||h.push("pickup"),e.dropoff_address||e.dropoff_zone||h.push("dropoff"),e.pickup_at||h.push("fecha/hora"),"paid"!==e.payment_status&&h.push("pago pendiente"),p&&!e.captured_by_driver_code&&h.push("captured_by");let g=[];e.vehicle_type||g.push("vehículo"),e.client_email||g.push("email"),e.flight_number||g.push("vuelo"),e.luggage_count||0===e.luggage_count||g.push("equipaje"),(!e.passenger_count||e.passenger_count<=0)&&g.push("pasajeros"),e.notes||g.push("notas"),e.missing_critical=h,e.missing_optional=g,e.missing_optional_info=g.length>0;let E=e.pickup_at?new Date(e.pickup_at).getTime():null,b=Date.now(),v=E?b-E:0,f=v>0?Math.floor(v/6e4):0,A=["accepted","assigned","en_route","arrived","offer_pending"].includes(e.status??"")&&f>0;e.is_overdue=A,e.overdue_minutes=A?f:0;let S=e.updated_at?new Date(e.updated_at).getTime():null,R="offer_pending"===e.dispatch_status&&S?b-S:0,m=R>0?Math.floor(R/6e4):0;e.offer_no_response="offer_pending"===e.dispatch_status&&m>=10,e.offer_pending_minutes=m;let N="paid"===e.payment_status&&e.captured_by_driver_code&&"public_site"!==e.captured_by_driver_code&&"PUBLIC_SITE"!==e.captured_by_driver_code&&(e.pickup_address||e.pickup_zone)&&(e.dropoff_address||e.dropoff_zone);if("cancelled"===u){d.push(e);continue}_?t.push(e):"completed"===u?n.push(e):"in_progress"===u||["en_route","arrived","in_trip"].includes(u)?s.push(e):"assigned"===u||"driver_confirmed"===u||"accepted"===u||"offer_pending"===u?a.push(e):"ready_for_dispatch"===u||"offered"===u||"pending_dispatch"===u?i.push(e):"needs_review"===u||"new"===u?N?e.assigned_driver_id?a.push(e):i.push(e):"needs_review"===u||h.length>0?r.push(e):i.push(e):N?e.assigned_driver_id?a.push(e):i.push(e):r.push(e)}let o=i.filter(e=>e.captured_by_driver_code&&!e.assigned_driver_id);if(o.length>0)for(let e of o)try{let[t]=await f`
            SELECT id FROM drivers
            WHERE UPPER(driver_code) = UPPER(${e.captured_by_driver_code})
              AND driver_status = 'active'
            LIMIT 1
          `;if(t?.id){await f`
              UPDATE bookings
              SET
                assigned_driver_id = ${t.id}::uuid,
                status = 'assigned',
                dispatch_status = 'offer_pending',
                updated_at = NOW()
              WHERE id = ${e.id}::uuid
                AND assigned_driver_id IS NULL
            `;try{await f`
                INSERT INTO dispatch_offers (
                  booking_id, driver_id, offer_round,
                  is_source_offer, response, sent_at, expires_at
                ) VALUES (
                  ${e.id}::uuid,
                  ${t.id}::uuid,
                  1,
                  true,
                  'pending',
                  NOW(),
                  NOW() + interval '24 hours'
                )
                ON CONFLICT DO NOTHING
              `}catch{}let r=i.indexOf(e);-1!==r&&i.splice(r,1),e.assigned_driver_id=t.id,e.status="assigned",e.dispatch_status="offer_pending",e.auto_assigned=!0,a.push(e)}}catch{}return v.NextResponse.json({driverIssue:t,needsReview:r,readyForDispatch:i,assigned:a,inProgress:s,completed:n,recentlyCancelled:d,total:e.length,counts:{driverIssue:t.length,needsReview:r.length,readyForDispatch:i.length,assigned:a.length,inProgress:s.length,completed:n.length,recentlyCancelled:d.length},awaitingSourceOwner:i.filter(e=>"awaiting_source_owner"===e.dispatch_status),awaitingSlnMember:i.filter(e=>"awaiting_sln_member"===e.dispatch_status),manualDispatchRequired:r})}catch(e){try{let e=await f`
        SELECT
          b.id,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at, b.updated_at,
          COALESCE(b.service_type, '') AS service_type,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passengers, 1) AS passenger_count,
          0 AS luggage_count,
          COALESCE(b.notes, '') AS notes,
          'unknown' AS lead_source,
          '' AS captured_by_driver_code,
          'manual_admin' AS booking_origin,
          c.full_name AS client_name,
          c.phone AS client_phone,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          NULL AS last_driver_action,
          NULL AS driver_issue_notes
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status NOT IN ('cancelled', 'archived')
        ORDER BY b.created_at DESC
        LIMIT 200
      `,t=[],r=[],i=[],a=[],s=[],n=[];for(let d of e){let e=d.status??"",o=d.dispatch_status??"";"driver_rejected"===o||"needs_correction"===o?t.push(d):"completed"===e?n.push(d):["en_route","arrived","in_trip","in_progress"].includes(e)?s.push(d):["assigned","driver_confirmed","accepted"].includes(e)?a.push(d):["ready_for_dispatch","offered","pending_dispatch"].includes(e)?i.push(d):r.push(d)}return v.NextResponse.json({driverIssue:t,needsReview:r,readyForDispatch:i,assigned:a,inProgress:s,completed:n,total:e.length,counts:{driverIssue:t.length,needsReview:r.length,readyForDispatch:i.length,assigned:a.length,inProgress:s.length,completed:n.length}})}catch(e){return v.NextResponse.json({driverIssue:[],needsReview:[],readyForDispatch:[],assigned:[],inProgress:[],completed:[],total:0,counts:{driverIssue:0,needsReview:0,readyForDispatch:0,assigned:0,inProgress:0,completed:0},error:e.message},{status:200})}}}async function S(e){try{let{booking_id:t,dispatch_status:r,status:i,notes:a}=await e.json();if(!t)return v.NextResponse.json({error:"booking_id required"},{status:400});if(r&&!["not_required","awaiting_source_owner","awaiting_sln_member","manual_dispatch_required","needs_review","needs_correction","driver_rejected","assigned","expired","cancelled"].includes(r))return v.NextResponse.json({error:`Invalid dispatch_status: ${r}`},{status:400});if(i&&!["new","needs_review","ready_for_dispatch","assigned","driver_confirmed","in_progress","driver_issue","completed","archived","cancelled"].includes(i))return v.NextResponse.json({error:`Invalid status: ${i}`},{status:400});if(r&&i?await f`UPDATE bookings SET dispatch_status = ${r}, status = ${i}, updated_at = NOW() WHERE id = ${t}::uuid`:r?await f`UPDATE bookings SET dispatch_status = ${r}, updated_at = NOW() WHERE id = ${t}::uuid`:i&&await f`UPDATE bookings SET status = ${i}, updated_at = NOW() WHERE id = ${t}::uuid`,a)try{await f`
          INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
          VALUES (${t}::uuid, 'booking', 'admin_dispatch_update', ${a}, NOW())
        `}catch{}return v.NextResponse.json({success:!0})}catch(e){return v.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>A,"PATCH",()=>S],65602);var R=e.i(65602);let m=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/dispatch/route",pathname:"/api/admin/dispatch",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/admin/dispatch/route.ts",nextConfigOutput:"",userland:R}),{workAsyncStorage:N,workUnitAsyncStorage:C,serverHooks:O}=m;function y(){return(0,i.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:C})}async function w(e,t,i){m.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let v="/api/admin/dispatch/route";v=v.replace(/\/index$/,"")||"/";let f=await m.prepare(e,t,{srcPage:v,multiZoneDraftMode:!1});if(!f)return t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve()),null;let{buildId:A,params:S,nextConfig:R,parsedUrl:N,isDraftMode:C,prerenderManifest:O,routerServerContext:y,isOnDemandRevalidate:w,revalidateOnlyGenerated:T,resolvedPathname:L,clientReferenceManifest:I,serverActionsManifest:k}=f,x=(0,d.normalizeAppPath)(v),D=!!(O.dynamicRoutes[x]||O.routes[L]),H=async()=>((null==y?void 0:y.render404)?await y.render404(e,t,N,!1):t.end("This page could not be found"),null);if(D&&!C){let e=!!O.routes[L],t=O.dynamicRoutes[x];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await H();throw new E.NoFallbackError}}let P=null;!D||m.isDev||C||(P="/index"===(P=L)?"/":P);let U=!0===m.isDev||!D,W=D&&!U;k&&I&&(0,n.setManifestsSingleton)({page:v,clientReferenceManifest:I,serverActionsManifest:k});let F=e.method||"GET",j=(0,s.getTracer)(),$=j.getActiveScopeSpan(),M={params:S,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:i.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,i,a)=>m.onRequestError(e,t,i,a,y)},sharedContext:{buildId:A}},q=new o.NodeNextRequest(e),B=new o.NodeNextResponse(t),z=u.NextRequestAdapter.fromNodeNextRequest(q,(0,u.signalFromNodeResponse)(t));try{let n=async e=>m.handle(z,M).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=r.get("next.route");if(i){let t=`${F} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${F} ${v}`)}),d=!!(0,a.getRequestMeta)(e,"minimalMode"),o=async a=>{var s,o;let u=async({previousCacheEntry:r})=>{try{if(!d&&w&&T&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await n(a);e.fetchMetrics=M.renderOpts.fetchMetrics;let o=M.renderOpts.pendingWaitUntil;o&&i.waitUntil&&(i.waitUntil(o),o=void 0);let u=M.renderOpts.collectedTags;if(!D)return await (0,_.sendResponse)(q,B,s,M.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(s.headers);u&&(t[g.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,i=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:b.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:i}}}}catch(t){throw(null==r?void 0:r.isStale)&&await m.onRequestError(e,t,{routerKind:"App Router",routePath:v,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:w})},!1,y),t}},c=await m.handleResponse({req:e,nextConfig:R,cacheKey:P,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:w,revalidateOnlyGenerated:T,responseGenerator:u,waitUntil:i.waitUntil,isMinimalMode:d});if(!D)return null;if((null==c||null==(s=c.value)?void 0:s.kind)!==b.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(o=c.value)?void 0:o.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});d||t.setHeader("x-nextjs-cache",w?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let E=(0,p.fromNodeOutgoingHttpHeaders)(c.value.headers);return d&&D||E.delete(g.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||E.get("Cache-Control")||E.set("Cache-Control",(0,h.getCacheControlHeader)(c.cacheControl)),await (0,_.sendResponse)(q,B,new Response(c.value.body,{headers:E,status:c.value.status||200})),null};$?await o($):await j.withPropagatedContext(e.headers,()=>j.trace(c.BaseServerSpan.handleRequest,{spanName:`${F} ${v}`,kind:s.SpanKind.SERVER,attributes:{"http.method":F,"http.target":e.url}},o))}catch(t){if(t instanceof E.NoFallbackError||await m.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:w})},!1,y),D)throw t;return await (0,_.sendResponse)(q,B,new Response(null,{status:500})),null}}e.s(["handler",()=>w,"patchFetch",()=>y,"routeModule",()=>m,"serverHooks",()=>O,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>C],33135)}];

//# sourceMappingURL=84ad8_next_dist_esm_build_templates_app-route_619abdc9.js.map