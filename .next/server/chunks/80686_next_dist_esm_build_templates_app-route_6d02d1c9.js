module.exports=[19182,e=>{"use strict";var t=e.i(39743),i=e.i(37383),r=e.i(16108),a=e.i(1266),n=e.i(10171),s=e.i(44067),d=e.i(7601),o=e.i(3083),_=e.i(88890),c=e.i(37886),l=e.i(63388),u=e.i(46601),p=e.i(24139),E=e.i(78785),v=e.i(2640),g=e.i(93695);e.i(46509);var h=e.i(56592),m=e.i(50974),S=e.i(57747),b=e.i(58673),f=e.i(60016);let A=(0,S.neon)(process.env.DATABASE_URL_UNPOOLED);async function y(){try{let e=await A`
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
        -- ── Affiliate Company fields (Convergence Phase 1) ─────────────────
        d.company_id                                         AS driver_company_id,
        pc.name                                              AS company_name,
        pc.brand_name                                        AS company_brand_display_name,
        -- ── Cancellation fields (Fases 1-10) ──────────────────────────────────
        COALESCE(b.cancel_reason, '') AS cancel_reason,
        COALESCE(b.cancel_responsibility, '') AS cancel_responsibility,
        COALESCE(b.passenger_no_show, FALSE) AS passenger_no_show,
        COALESCE(b.early_cancel, FALSE) AS early_cancel,
        COALESCE(b.late_cancel, FALSE) AS late_cancel,
        COALESCE(b.payout_status, '') AS payout_status,
        b.cancelled_at,
        -- ── Auto Fee Logic V2 — SLN Network fee distribution ─────────────────
        COALESCE(b.cancellation_fee, 0)::numeric            AS cancellation_fee,
        COALESCE(b.executor_share_amount, 0)::numeric       AS executor_share_amount,
        COALESCE(b.source_driver_share_amount, 0)::numeric  AS source_driver_share_amount,
        COALESCE(b.platform_share_amount, 0)::numeric       AS platform_share_amount,
        COALESCE(b.fee_split_strategy, '')                  AS fee_split_strategy,
        COALESCE(b.source_driver_id::text, '')              AS source_driver_id,
        COALESCE(b.source_type, '')                         AS source_type,
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
      LEFT JOIN partner_companies pc ON d.company_id = pc.id
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
    `,t=[],i=[],r=[],a=[],n=[],s=[],d=[];for(let o of e){let e={...o},_=e.status??"",c=e.dispatch_status??"",l=e.last_driver_action??"",u="driver_issue"===_||"driver_rejected"===c||"needs_correction"===c||"driver_rejected_incomplete_ride"===l||"driver_reported_incomplete"===l||"driver_requested_correction"===l,p="tablet"===e.booking_origin||"driver_qr"===e.booking_origin||"driver_referral"===e.booking_origin||"driver_tablet"===e.booking_origin||"hotel_partner"===e.booking_origin||e.captured_by_driver_code&&"public_site"!==e.captured_by_driver_code,E=[];e.client_phone||E.push("tel. cliente"),e.pickup_address||e.pickup_zone||E.push("pickup"),e.dropoff_address||e.dropoff_zone||E.push("dropoff"),e.pickup_at||E.push("fecha/hora"),"paid"!==e.payment_status&&E.push("pago pendiente"),p&&!e.captured_by_driver_code&&E.push("captured_by");let v=[];e.vehicle_type||v.push("vehículo"),e.client_email||v.push("email"),e.flight_number||v.push("vuelo"),e.luggage_count||0===e.luggage_count||v.push("equipaje"),(!e.passenger_count||e.passenger_count<=0)&&v.push("pasajeros"),e.notes||v.push("notas"),e.missing_critical=E,e.missing_optional=v,e.missing_optional_info=v.length>0;let g=e.pickup_at?new Date(e.pickup_at).getTime():null,h=Date.now(),m=g?h-g:0,S=m>0?Math.floor(m/6e4):0,b=["accepted","assigned","en_route","arrived","offer_pending"].includes(e.status??"")&&S>0;e.is_overdue=b,e.overdue_minutes=b?S:0;let f=e.updated_at?new Date(e.updated_at).getTime():null,A="offer_pending"===e.dispatch_status&&f?h-f:0,y=A>0?Math.floor(A/6e4):0;e.offer_no_response="offer_pending"===e.dispatch_status&&y>=10,e.offer_pending_minutes=y;let C="paid"===e.payment_status&&e.captured_by_driver_code&&"public_site"!==e.captured_by_driver_code&&"PUBLIC_SITE"!==e.captured_by_driver_code&&(e.pickup_address||e.pickup_zone)&&(e.dropoff_address||e.dropoff_zone);if("cancelled"===_){d.push(e);continue}u?t.push(e):"completed"===_?s.push(e):"in_progress"===_||["en_route","arrived","in_trip"].includes(_)?n.push(e):"assigned"===_||"driver_confirmed"===_||"accepted"===_||"offer_pending"===_?a.push(e):"ready_for_dispatch"===_||"offered"===_||"pending_dispatch"===_?r.push(e):"needs_review"===_||"new"===_?C?e.assigned_driver_id?a.push(e):r.push(e):"needs_review"===_||E.length>0?i.push(e):r.push(e):C?e.assigned_driver_id?a.push(e):r.push(e):i.push(e)}let o=r.filter(e=>e.captured_by_driver_code&&!e.assigned_driver_id);if(o.length>0){let e=[],t={},i={};try{let r=(e=await A`
          SELECT
            d.id, d.driver_code, d.full_name,
            COALESCE(d.driver_status, 'active')                     AS driver_status,
            COALESCE(d.driver_score_total, 75)::integer             AS driver_score_total,
            COALESCE(d.driver_score_tier, 'GOLD')                   AS driver_score_tier,
            COALESCE(d.is_eligible_for_premium_dispatch, false)     AS is_eligible_for_premium_dispatch,
            COALESCE(d.is_eligible_for_airport_priority, false)     AS is_eligible_for_airport_priority,
            COALESCE(d.rides_completed, 0)::integer                 AS rides_completed,
            COALESCE(d.on_time_rides, 0)::integer                   AS on_time_rides,
            COALESCE(d.late_cancel_count, 0)::integer               AS late_cancel_count,
            COALESCE(d.complaint_count, 0)::integer                 AS complaint_count,
            -- ── Affiliate Company fields (Convergence Phase 1) ─────────────────
            d.company_id                                            AS company_id,
            pc.name                                                 AS company_name,
            pc.brand_name                                           AS company_brand_display_name
          FROM drivers d
          LEFT JOIN partner_companies pc ON d.company_id = pc.id
          WHERE d.driver_status IN ('active', 'provisional')
            AND d.is_eligible = true
        `).map(e=>e.id);if(r.length>0)for(let e of(await A`
            SELECT v.driver_id, v.id, v.vehicle_status, v.city_permit_status,
                   v.airport_permit_mco_status, v.port_permit_canaveral_status,
                   v.insurance_status, v.registration_status, v.make, v.model, v.plate
            FROM vehicles v
            WHERE v.driver_id = ANY(${r}::uuid[])
              AND v.vehicle_status = 'active'
            ORDER BY v.is_primary DESC, v.created_at ASC
          `))t[e.driver_id]||(t[e.driver_id]=e);for(let e of(await A`
          SELECT al.entity_id AS driver_id,
            SUM(CASE WHEN al.action = 'late_cancel_driver'        THEN 1 ELSE 0 END)::integer AS late_cancel,
            SUM(CASE WHEN al.action = 'client_complaint'          THEN 1 ELSE 0 END)::integer AS complaint,
            SUM(CASE WHEN al.action = 'no_response_offer_timeout' THEN 1 ELSE 0 END)::integer AS no_response
          FROM audit_logs al
          WHERE al.entity_type = 'driver'
            AND al.created_at > NOW() - INTERVAL '7 days'
            AND al.action IN ('late_cancel_driver', 'client_complaint', 'no_response_offer_timeout')
          GROUP BY al.entity_id
        `.catch(()=>[])))i[e.driver_id]={late_cancel:e.late_cancel??0,complaint:e.complaint??0,no_response:e.no_response??0}}catch{}for(let n of o)try{let s=(0,b.deriveServiceLocationType)(n.pickup_zone??""),d=null;if(n.captured_by_driver_code){let[e]=await A`
              SELECT id FROM drivers
              WHERE UPPER(driver_code) = UPPER(${n.captured_by_driver_code})
              LIMIT 1
            `.catch(()=>[]);e?.id&&(d=e.id)}let o={id:n.id,pickup_zone:n.pickup_zone??"",service_type:n.service_type||"standard",source_driver_id:d,service_location_type:s},_=e.map(e=>{let r=i[e.id]??{late_cancel:0,complaint:0,no_response:0};return{id:e.id,driver_code:e.driver_code,full_name:e.full_name,driver_status:e.driver_status,driver_score_total:e.driver_score_total,driver_score_tier:e.driver_score_tier,is_eligible_for_premium_dispatch:e.is_eligible_for_premium_dispatch,is_eligible_for_airport_priority:e.is_eligible_for_airport_priority,rides_completed:e.rides_completed,on_time_rides:e.on_time_rides,late_cancel_count:e.late_cancel_count,complaint_count:e.complaint_count,late_cancel_recent:r.late_cancel,complaint_recent:r.complaint,no_response_recent:r.no_response,vehicle:t[e.id]??null}}),c=(0,f.runPriorityEngine)(_,o);A`
            INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
            VALUES ('booking', ${n.id}::uuid, 'dispatch_priority_calculated', 'system',
              ${JSON.stringify(c.audit_payload)}::jsonb)
          `.catch(()=>{}),c.source_driver_override&&A`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES ('booking', ${n.id}::uuid, 'dispatch_source_driver_override', 'system',
                ${JSON.stringify({source_driver_id:c.source_driver_id,booking_id:n.id,timestamp:new Date().toISOString()})}::jsonb)
            `.catch(()=>{}),c.excluded.length>0&&A`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES ('booking', ${n.id}::uuid, 'dispatch_candidates_excluded', 'system',
                ${JSON.stringify({excluded:c.excluded,booking_id:n.id,timestamp:new Date().toISOString()})}::jsonb)
            `.catch(()=>{});let l=c.ranked[0];if(!l)continue;await A`
            UPDATE bookings
            SET
              assigned_driver_id = ${l.id}::uuid,
              status = 'assigned',
              dispatch_status = 'offer_pending',
              updated_at = NOW()
            WHERE id = ${n.id}::uuid
              AND assigned_driver_id IS NULL
          `,A`
            INSERT INTO dispatch_offers (
              booking_id, driver_id, offer_round,
              is_source_offer, response, sent_at, expires_at
            ) VALUES (
              ${n.id}::uuid,
              ${l.id}::uuid,
              1,
              ${c.source_driver_override},
              'pending',
              NOW(),
              NOW() + interval '24 hours'
            )
            ON CONFLICT DO NOTHING
          `.catch(()=>{});let u=r.indexOf(n);-1!==u&&r.splice(u,1),n.assigned_driver_id=l.id,n.status="assigned",n.dispatch_status="offer_pending",n.auto_assigned=!0,n.dispatch_priority_rank=l.dispatch_priority_rank,n.dispatch_priority_score=l.dispatch_priority_score,n.priority_reason=l.priority_reason,n.source_driver_override=c.source_driver_override,a.push(n)}catch{}}return m.NextResponse.json({driverIssue:t,needsReview:i,readyForDispatch:r,assigned:a,inProgress:n,completed:s,recentlyCancelled:d,total:e.length,counts:{driverIssue:t.length,needsReview:i.length,readyForDispatch:r.length,assigned:a.length,inProgress:n.length,completed:s.length,recentlyCancelled:d.length},awaitingSourceOwner:r.filter(e=>"awaiting_source_owner"===e.dispatch_status),awaitingSlnMember:r.filter(e=>"awaiting_sln_member"===e.dispatch_status),manualDispatchRequired:i})}catch(e){try{let e=await A`
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
      `,t=[],i=[],r=[],a=[],n=[],s=[];for(let d of e){let e=d.status??"",o=d.dispatch_status??"";"driver_rejected"===o||"needs_correction"===o?t.push(d):"completed"===e?s.push(d):["en_route","arrived","in_trip","in_progress"].includes(e)?n.push(d):["assigned","driver_confirmed","accepted"].includes(e)?a.push(d):["ready_for_dispatch","offered","pending_dispatch"].includes(e)?r.push(d):i.push(d)}return m.NextResponse.json({driverIssue:t,needsReview:i,readyForDispatch:r,assigned:a,inProgress:n,completed:s,total:e.length,counts:{driverIssue:t.length,needsReview:i.length,readyForDispatch:r.length,assigned:a.length,inProgress:n.length,completed:s.length}})}catch(e){return m.NextResponse.json({driverIssue:[],needsReview:[],readyForDispatch:[],assigned:[],inProgress:[],completed:[],total:0,counts:{driverIssue:0,needsReview:0,readyForDispatch:0,assigned:0,inProgress:0,completed:0},error:e.message},{status:200})}}}async function C(e){try{let{booking_id:t,dispatch_status:i,status:r,notes:a}=await e.json();if(!t)return m.NextResponse.json({error:"booking_id required"},{status:400});if(i&&!["not_required","awaiting_source_owner","awaiting_sln_member","manual_dispatch_required","needs_review","needs_correction","driver_rejected","assigned","expired","cancelled"].includes(i))return m.NextResponse.json({error:`Invalid dispatch_status: ${i}`},{status:400});if(r&&!["new","needs_review","ready_for_dispatch","assigned","driver_confirmed","in_progress","driver_issue","completed","archived","cancelled"].includes(r))return m.NextResponse.json({error:`Invalid status: ${r}`},{status:400});if(i&&r?await A`UPDATE bookings SET dispatch_status = ${i}, status = ${r}, updated_at = NOW() WHERE id = ${t}::uuid`:i?await A`UPDATE bookings SET dispatch_status = ${i}, updated_at = NOW() WHERE id = ${t}::uuid`:r&&await A`UPDATE bookings SET status = ${r}, updated_at = NOW() WHERE id = ${t}::uuid`,a)try{await A`
          INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
          VALUES (${t}::uuid, 'booking', 'admin_dispatch_update', ${a}, NOW())
        `}catch{}return m.NextResponse.json({success:!0})}catch(e){return m.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>y,"PATCH",()=>C,"dynamic",0,"force-dynamic"],5795);var N=e.i(5795);let R=new t.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/admin/dispatch/route",pathname:"/api/admin/dispatch",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/dispatch/route.ts",nextConfigOutput:"",userland:N}),{workAsyncStorage:O,workUnitAsyncStorage:L,serverHooks:T}=R;function w(){return(0,r.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:L})}async function I(e,t,r){R.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/admin/dispatch/route";m=m.replace(/\/index$/,"")||"/";let S=await R.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!S)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:b,params:f,nextConfig:A,parsedUrl:y,isDraftMode:C,prerenderManifest:N,routerServerContext:O,isOnDemandRevalidate:L,revalidateOnlyGenerated:T,resolvedPathname:w,clientReferenceManifest:I,serverActionsManifest:k}=S,D=(0,d.normalizeAppPath)(m),H=!!(N.dynamicRoutes[D]||N.routes[w]),x=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,y,!1):t.end("This page could not be found"),null);if(H&&!C){let e=!!N.routes[w],t=N.dynamicRoutes[D];if(t&&!1===t.fallback&&!e){if(A.experimental.adapterPath)return await x();throw new g.NoFallbackError}}let P=null;!H||R.isDev||C||(P="/index"===(P=w)?"/":P);let U=!0===R.isDev||!H,W=H&&!U;k&&I&&(0,s.setManifestsSingleton)({page:m,clientReferenceManifest:I,serverActionsManifest:k});let $=e.method||"GET",F=(0,n.getTracer)(),M=F.getActiveScopeSpan(),j={params:f,prerenderManifest:N,renderOpts:{experimental:{authInterrupts:!!A.experimental.authInterrupts},cacheComponents:!!A.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:A.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,i,r,a)=>R.onRequestError(e,t,r,a,O)},sharedContext:{buildId:b}},q=new o.NodeNextRequest(e),B=new o.NodeNextResponse(t),z=_.NextRequestAdapter.fromNodeNextRequest(q,(0,_.signalFromNodeResponse)(t));try{let s=async e=>R.handle(z,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let i=F.getRootSpanAttributes();if(!i)return;if(i.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${i.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=i.get("next.route");if(r){let t=`${$} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${$} ${m}`)}),d=!!(0,a.getRequestMeta)(e,"minimalMode"),o=async a=>{var n,o;let _=async({previousCacheEntry:i})=>{try{if(!d&&L&&T&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(a);e.fetchMetrics=j.renderOpts.fetchMetrics;let o=j.renderOpts.pendingWaitUntil;o&&r.waitUntil&&(r.waitUntil(o),o=void 0);let _=j.renderOpts.collectedTags;if(!H)return await (0,u.sendResponse)(q,B,n,j.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(n.headers);_&&(t[v.NEXT_CACHE_TAGS_HEADER]=_),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let i=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=v.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,r=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=v.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:i,expire:r}}}}catch(t){throw(null==i?void 0:i.isStale)&&await R.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:L})},!1,O),t}},c=await R.handleResponse({req:e,nextConfig:A,cacheKey:P,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:L,revalidateOnlyGenerated:T,responseGenerator:_,waitUntil:r.waitUntil,isMinimalMode:d});if(!H)return null;if((null==c||null==(n=c.value)?void 0:n.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(o=c.value)?void 0:o.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});d||t.setHeader("x-nextjs-cache",L?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,p.fromNodeOutgoingHttpHeaders)(c.value.headers);return d&&H||g.delete(v.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,E.getCacheControlHeader)(c.cacheControl)),await (0,u.sendResponse)(q,B,new Response(c.value.body,{headers:g,status:c.value.status||200})),null};M?await o(M):await F.withPropagatedContext(e.headers,()=>F.trace(c.BaseServerSpan.handleRequest,{spanName:`${$} ${m}`,kind:n.SpanKind.SERVER,attributes:{"http.method":$,"http.target":e.url}},o))}catch(t){if(t instanceof g.NoFallbackError||await R.onRequestError(e,t,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:W,isOnDemandRevalidate:L})},!1,O),H)throw t;return await (0,u.sendResponse)(q,B,new Response(null,{status:500})),null}}e.s(["handler",()=>I,"patchFetch",()=>w,"routeModule",()=>R,"serverHooks",()=>T,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>L],19182)}];

//# sourceMappingURL=80686_next_dist_esm_build_templates_app-route_6d02d1c9.js.map