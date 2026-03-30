module.exports=[57354,e=>{"use strict";var t=e.i(39743),r=e.i(37383),n=e.i(16108),a=e.i(1266),i=e.i(10171),o=e.i(44067),d=e.i(7601),s=e.i(3083),c=e.i(88890),l=e.i(37886),_=e.i(63388),u=e.i(46601),b=e.i(24139),p=e.i(78785),E=e.i(2640),S=e.i(93695);e.i(46509);var A=e.i(56592),g=e.i(50974);let C=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function v(e){let t=new URL(e.url).searchParams.get("view")??"active",r=["active","completed","cancelled","archived","all"].includes(t.toLowerCase().trim())?t.toLowerCase().trim():"active";try{let e;return e="active"===r?await C`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
          COALESCE(b.luggage_count, 0) AS luggage_count,
          COALESCE(b.lead_source, 'unknown') AS lead_source,
          COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
          COALESCE(b.cancellation_reason, '') AS cancellation_reason,
          COALESCE(b.cancelled_by, '') AS cancelled_by,
          COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
          c.full_name AS client_name,
          c.phone AS client_phone,
          c.email AS client_email,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          CASE WHEN EXISTS (
            SELECT 1 FROM audit_logs al
            WHERE al.entity_id = b.id
              AND al.action IN ('driver_reported_incomplete', 'driver_requested_correction', 'driver_rejected_incomplete_ride')
          ) THEN true ELSE false END AS driver_reported,
          (
            SELECT al.action FROM audit_logs al
            WHERE al.entity_id = b.id
              AND al.action IN ('driver_reported_incomplete', 'driver_requested_correction', 'driver_rejected_incomplete_ride')
            ORDER BY al.created_at DESC
            LIMIT 1
          ) AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status = ANY(ARRAY['new','needs_review','ready_for_dispatch','assigned','driver_confirmed','in_progress','driver_issue','pending_dispatch','pending','pending_payment'])
        ORDER BY b.created_at DESC
        LIMIT 200
      `:"completed"===r?await C`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
          COALESCE(b.luggage_count, 0) AS luggage_count,
          COALESCE(b.lead_source, 'unknown') AS lead_source,
          COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
          COALESCE(b.cancellation_reason, '') AS cancellation_reason,
          COALESCE(b.cancelled_by, '') AS cancelled_by,
          COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
          c.full_name AS client_name,
          c.phone AS client_phone,
          c.email AS client_email,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status = 'completed'
        ORDER BY b.created_at DESC
        LIMIT 200
      `:"cancelled"===r?await C`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
          COALESCE(b.luggage_count, 0) AS luggage_count,
          COALESCE(b.lead_source, 'unknown') AS lead_source,
          COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
          COALESCE(b.cancellation_reason, '') AS cancellation_reason,
          COALESCE(b.cancelled_by, '') AS cancelled_by,
          COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
          c.full_name AS client_name,
          c.phone AS client_phone,
          c.email AS client_email,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status = 'cancelled'
        ORDER BY b.created_at DESC
        LIMIT 200
      `:"archived"===r?await C`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
          COALESCE(b.luggage_count, 0) AS luggage_count,
          COALESCE(b.lead_source, 'unknown') AS lead_source,
          COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
          COALESCE(b.cancellation_reason, '') AS cancellation_reason,
          COALESCE(b.cancelled_by, '') AS cancelled_by,
          COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
          c.full_name AS client_name,
          c.phone AS client_phone,
          c.email AS client_email,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status = 'archived'
        ORDER BY b.created_at DESC
        LIMIT 200
      `:await C`
        SELECT
          b.id,
          COALESCE(b.booking_ref, UPPER(SUBSTRING(b.id::text, 1, 8))) AS booking_ref,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passenger_count, b.passengers, 1) AS passenger_count,
          COALESCE(b.luggage_count, 0) AS luggage_count,
          COALESCE(b.lead_source, 'unknown') AS lead_source,
          COALESCE(b.captured_by_driver_code, b.source_code, '') AS captured_by_driver_code,
          COALESCE(b.cancellation_reason, '') AS cancellation_reason,
          COALESCE(b.cancelled_by, '') AS cancelled_by,
          COALESCE(b.booking_origin, b.lead_source, 'manual_admin') AS booking_origin,
          c.full_name AS client_name,
          c.phone AS client_phone,
          c.email AS client_email,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        ORDER BY b.created_at DESC
        LIMIT 200
      `,g.NextResponse.json({bookings:Array.isArray(e)?e:[],view:r,total:Array.isArray(e)?e.length:0})}catch(e){try{let e=await C`
        SELECT
          b.id,
          b.pickup_zone, b.dropoff_zone,
          b.pickup_address, b.dropoff_address,
          b.pickup_at, b.vehicle_type, b.total_price,
          b.status, b.dispatch_status, b.payment_status,
          b.assigned_driver_id, b.created_at,
          COALESCE(b.notes, '') AS notes,
          COALESCE(b.flight_number, '') AS flight_number,
          COALESCE(b.passengers, 1) AS passenger_count,
          0 AS luggage_count,
          'unknown' AS lead_source,
          '' AS captured_by_driver_code,
          '' AS cancellation_reason,
          '' AS cancelled_by,
          'manual_admin' AS booking_origin,
          c.full_name AS client_name,
          c.phone AS client_phone,
          c.email AS client_email,
          d.full_name AS driver_name,
          d.driver_code AS driver_code,
          d.phone AS driver_phone,
          false AS driver_reported,
          NULL AS driver_report_action
        FROM bookings b
        LEFT JOIN clients c ON b.client_id = c.id
        LEFT JOIN drivers d ON b.assigned_driver_id = d.id
        WHERE b.status != 'archived'
        ORDER BY b.created_at DESC
        LIMIT 200
      `;return g.NextResponse.json({bookings:Array.isArray(e)?e:[],view:"fallback",total:Array.isArray(e)?e.length:0})}catch(e){return g.NextResponse.json({bookings:[],view:"error",total:0,error:e.message},{status:200})}}}e.s(["GET",()=>v,"dynamic",0,"force-dynamic"],37090);var h=e.i(37090);let m=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/bookings/route",pathname:"/api/admin/bookings",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/bookings/route.ts",nextConfigOutput:"",userland:h}),{workAsyncStorage:O,workUnitAsyncStorage:f,serverHooks:R}=m;function L(){return(0,n.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:f})}async function y(e,t,n){m.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/admin/bookings/route";g=g.replace(/\/index$/,"")||"/";let C=await m.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!C)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:v,params:h,nextConfig:O,parsedUrl:f,isDraftMode:R,prerenderManifest:L,routerServerContext:y,isOnDemandRevalidate:k,revalidateOnlyGenerated:N,resolvedPathname:T,clientReferenceManifest:w,serverActionsManifest:I}=C,x=(0,d.normalizeAppPath)(g),P=!!(L.dynamicRoutes[x]||L.routes[T]),U=async()=>((null==y?void 0:y.render404)?await y.render404(e,t,f,!1):t.end("This page could not be found"),null);if(P&&!R){let e=!!L.routes[T],t=L.dynamicRoutes[x];if(t&&!1===t.fallback&&!e){if(O.experimental.adapterPath)return await U();throw new S.NoFallbackError}}let D=null;!P||m.isDev||R||(D="/index"===(D=T)?"/":D);let F=!0===m.isDev||!P,M=P&&!F;I&&w&&(0,o.setManifestsSingleton)({page:g,clientReferenceManifest:w,serverActionsManifest:I});let H=e.method||"GET",B=(0,i.getTracer)(),q=B.getActiveScopeSpan(),z={params:h,prerenderManifest:L,renderOpts:{experimental:{authInterrupts:!!O.experimental.authInterrupts},cacheComponents:!!O.cacheComponents,supportsDynamicResponse:F,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:O.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,n,a)=>m.onRequestError(e,t,n,a,y)},sharedContext:{buildId:v}},j=new s.NodeNextRequest(e),J=new s.NodeNextResponse(t),W=c.NextRequestAdapter.fromNodeNextRequest(j,(0,c.signalFromNodeResponse)(t));try{let o=async e=>m.handle(W,z).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=B.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${H} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${g}`)}),d=!!(0,a.getRequestMeta)(e,"minimalMode"),s=async a=>{var i,s;let c=async({previousCacheEntry:r})=>{try{if(!d&&k&&N&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await o(a);e.fetchMetrics=z.renderOpts.fetchMetrics;let s=z.renderOpts.pendingWaitUntil;s&&n.waitUntil&&(n.waitUntil(s),s=void 0);let c=z.renderOpts.collectedTags;if(!P)return await (0,u.sendResponse)(j,J,i,z.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,b.toNodeOutgoingHttpHeaders)(i.headers);c&&(t[E.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==z.renderOpts.collectedRevalidate&&!(z.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&z.renderOpts.collectedRevalidate,n=void 0===z.renderOpts.collectedExpire||z.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:z.renderOpts.collectedExpire;return{value:{kind:A.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==r?void 0:r.isStale)&&await m.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,_.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:k})},!1,y),t}},l=await m.handleResponse({req:e,nextConfig:O,cacheKey:D,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:L,isRoutePPREnabled:!1,isOnDemandRevalidate:k,revalidateOnlyGenerated:N,responseGenerator:c,waitUntil:n.waitUntil,isMinimalMode:d});if(!P)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==A.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(s=l.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});d||t.setHeader("x-nextjs-cache",k?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),R&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let S=(0,b.fromNodeOutgoingHttpHeaders)(l.value.headers);return d&&P||S.delete(E.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||S.get("Cache-Control")||S.set("Cache-Control",(0,p.getCacheControlHeader)(l.cacheControl)),await (0,u.sendResponse)(j,J,new Response(l.value.body,{headers:S,status:l.value.status||200})),null};q?await s(q):await B.withPropagatedContext(e.headers,()=>B.trace(l.BaseServerSpan.handleRequest,{spanName:`${H} ${g}`,kind:i.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},s))}catch(t){if(t instanceof S.NoFallbackError||await m.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,_.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:k})},!1,y),P)throw t;return await (0,u.sendResponse)(j,J,new Response(null,{status:500})),null}}e.s(["handler",()=>y,"patchFetch",()=>L,"routeModule",()=>m,"serverHooks",()=>R,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>f],57354)}];

//# sourceMappingURL=80686_next_dist_esm_build_templates_app-route_c33bd94c.js.map