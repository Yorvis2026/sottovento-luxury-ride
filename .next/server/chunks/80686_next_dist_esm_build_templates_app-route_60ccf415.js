module.exports=[20409,e=>{"use strict";var t=e.i(39743),i=e.i(37383),r=e.i(16108),a=e.i(1266),s=e.i(10171),n=e.i(44067),o=e.i(7601),l=e.i(3083),d=e.i(88890),_=e.i(37886),c=e.i(63388),p=e.i(46601),u=e.i(24139),v=e.i(78785),m=e.i(2640),h=e.i(93695);e.i(46509);var g=e.i(56592),y=e.i(50974);let E=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function f(e,{params:t}){let{id:i}=await t;if(!i)return y.NextResponse.json({error:"company_id required"},{status:400});try{let e=await E`
      SELECT
        pc.id,
        pc.name,
        pc.brand_name,
        pc.master_ref_code,
        pc.commission_split_company,
        pc.commission_split_staff,
        pc.status,
        pc.created_at
      FROM partner_companies pc
      WHERE pc.id = ${i}::uuid
    `;if(0===e.length)return y.NextResponse.json({error:"Company not found"},{status:404});let t=e[0],r=(await E`
      SELECT
        d.id,
        d.full_name                                                   AS driver_name,
        d.driver_code,
        d.driver_status,
        d.driver_score_tier,
        COALESCE(d.driver_score_total, 75)::integer                   AS driver_score_total,
        COALESCE(d.rides_completed, 0)::integer                       AS rides_completed,
        COALESCE(d.on_time_rides, 0)::integer                         AS on_time_rides,
        COALESCE(d.late_cancel_count, 0)::integer                     AS late_cancel_count,
        COALESCE(d.complaint_count, 0)::integer                       AS complaint_count,
        COALESCE(d.is_eligible_for_premium_dispatch, false)           AS is_eligible_for_premium_dispatch,
        COALESCE(d.is_eligible_for_airport_priority, false)           AS is_eligible_for_airport_priority,
        d.driver_status                                               AS status,
        d.provisional_completed_rides,
        d.provisional_ends_at,
        d.created_at
      FROM drivers d
      WHERE d.company_id = ${i}::uuid
      ORDER BY d.driver_score_total DESC NULLS LAST, d.rides_completed DESC
    `).map(e=>{let t=e.rides_completed>0?Math.round((e.rides_completed-e.late_cancel_count)/e.rides_completed*100):null,i=e.rides_completed>0?Math.round(e.on_time_rides/e.rides_completed*100):null;return{id:e.id,driver_name:e.driver_name,driver_code:e.driver_code,driver_status:e.driver_status,current_score_tier:e.driver_score_tier??"GOLD",driver_score_total:e.driver_score_total,rides_completed:e.rides_completed,completion_rate:t,on_time_rate:i,late_cancel_count:e.late_cancel_count,complaint_count:e.complaint_count,is_eligible_for_premium_dispatch:e.is_eligible_for_premium_dispatch,is_eligible_for_airport_priority:e.is_eligible_for_airport_priority,provisional_completed_rides:e.provisional_completed_rides??0,provisional_ends_at:e.provisional_ends_at??null,is_provisional:"provisional"===e.driver_status,created_at:e.created_at}}),a=(await E`
      SELECT
        v.id,
        v.make,
        v.model,
        v.plate,
        v.year,
        v.vehicle_status,
        v.city_permit_status,
        v.airport_permit_mco_status,
        v.port_permit_canaveral_status,
        v.insurance_status,
        v.registration_status,
        v.is_primary,
        v.driver_id,
        v.company_id,
        v.verified_at,
        v.expires_at,
        v.created_at,
        d.full_name                   AS driver_name,
        d.driver_code                 AS driver_code,
        -- Rides completed via this vehicle (bookings assigned to this vehicle's driver)
        COALESCE(
          (SELECT COUNT(*)::integer
           FROM bookings b
           WHERE b.assigned_driver_id = v.driver_id
             AND b.status = 'completed'),
          0
        )                             AS rides_completed
      FROM vehicles v
      LEFT JOIN drivers d ON v.driver_id = d.id
      WHERE
        v.company_id = ${i}::uuid
        OR (v.driver_id IN (
          SELECT id FROM drivers WHERE company_id = ${i}::uuid
        ))
      ORDER BY v.is_primary DESC, v.created_at ASC
    `).map(e=>{let t,i=[e.city_permit_status,e.airport_permit_mco_status,e.port_permit_canaveral_status,e.insurance_status,e.registration_status],r="active"===e.vehicle_status&&"approved"===e.airport_permit_mco_status&&"approved"===e.city_permit_status&&"approved"===e.insurance_status&&"approved"===e.registration_status,a="active"===e.vehicle_status&&"approved"===e.port_permit_canaveral_status&&"approved"===e.city_permit_status&&"approved"===e.insurance_status&&"approved"===e.registration_status,s=i.some(e=>"expired"===e),n=i.some(e=>"pending"===e),o=i.some(e=>"rejected"===e);t=s||o?"requires_action":n?"pending_review":"active"!==e.vehicle_status?"inactive":"compliant";let l=i.filter(e=>"approved"===e).length,d=Math.round(l/i.length*100);return{id:e.id,vehicle_model:`${e.year??""} ${e.make} ${e.model}`.trim(),plate:e.plate,vehicle_status:e.vehicle_status,rides_completed:e.rides_completed,airport_eligibility_status:r?"eligible":"not_eligible",port_eligibility_status:a?"eligible":"not_eligible",document_status:t,availability_index:d,city_permit_status:e.city_permit_status,airport_permit_mco_status:e.airport_permit_mco_status,port_permit_canaveral_status:e.port_permit_canaveral_status,insurance_status:e.insurance_status,registration_status:e.registration_status,is_primary:e.is_primary,driver_name:e.driver_name??null,driver_code:e.driver_code??null,verified_at:e.verified_at??null,expires_at:e.expires_at??null,created_at:e.created_at}}),s=(await E`
      SELECT
        COUNT(b.id)::integer                                          AS total_rides,
        COALESCE(SUM(b.total_price), 0)::numeric                     AS total_revenue,
        COALESCE(SUM(b.executor_share_amount), 0)::numeric           AS total_executor_share,
        COALESCE(SUM(b.source_driver_share_amount), 0)::numeric      AS total_source_share,
        COALESCE(SUM(b.platform_share_amount), 0)::numeric           AS total_platform_share,
        COALESCE(AVG(b.total_price), 0)::numeric                     AS avg_ride_value,
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::integer  AS completed_rides,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END)::integer  AS cancelled_rides,
        COUNT(CASE WHEN b.created_at >= date_trunc('month', NOW()) THEN 1 END)::integer AS rides_mtd,
        COALESCE(SUM(CASE WHEN b.created_at >= date_trunc('month', NOW()) THEN b.total_price ELSE 0 END), 0)::numeric AS revenue_mtd
      FROM bookings b
      INNER JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE d.company_id = ${i}::uuid
        AND b.status IN ('completed', 'cancelled', 'in_progress')
    `)[0]??{},n=r.length,o=a.length,l={total_rides:s.total_rides??0,completed_rides:s.completed_rides??0,cancelled_rides:s.cancelled_rides??0,rides_mtd:s.rides_mtd??0,total_revenue:parseFloat(s.total_revenue??"0"),revenue_mtd:parseFloat(s.revenue_mtd??"0"),avg_ride_value:parseFloat(s.avg_ride_value??"0"),total_executor_share:parseFloat(s.total_executor_share??"0"),total_source_share:parseFloat(s.total_source_share??"0"),total_platform_share:parseFloat(s.total_platform_share??"0"),rides_completed_per_driver:n>0?Math.round((s.completed_rides??0)/n):0,rides_completed_per_vehicle:o>0?Math.round((s.completed_rides??0)/o):0,estimated_network_revenue:parseFloat(s.total_executor_share??"0")},d=new Date,_=new Date(d.getTime()+2592e6),c=[];for(let e of r){if(e.complaint_count>=2&&c.push({type:"active_complaints",severity:"critical",entity_type:"driver",entity_id:e.id,entity_name:e.driver_name,message:`${e.complaint_count} active complaint(s) — score impact risk`}),e.late_cancel_count>=2&&c.push({type:"late_cancellations",severity:"warning",entity_type:"driver",entity_id:e.id,entity_name:e.driver_name,message:`${e.late_cancel_count} late cancellation(s) in record`}),"provisional"===e.driver_status&&e.provisional_ends_at){let t=new Date(e.provisional_ends_at);t<=_&&c.push({type:"provisional_expiring",severity:"info",entity_type:"driver",entity_id:e.id,entity_name:e.driver_name,message:`Provisional window ends ${t.toLocaleDateString()} — ${e.provisional_completed_rides}/10 rides completed`})}("suspended"===e.driver_status||"restricted"===e.driver_status)&&c.push({type:"inactive_driver",severity:"critical",entity_type:"driver",entity_id:e.id,entity_name:e.driver_name,message:`Driver status: ${e.driver_status} — excluded from dispatch`})}for(let e of a)if(("expired"===e.insurance_status||"rejected"===e.insurance_status)&&c.push({type:"insurance_issue",severity:"critical",entity_type:"vehicle",entity_id:e.id,entity_name:e.vehicle_model,message:`Insurance status: ${e.insurance_status} — vehicle excluded from dispatch`}),("expired"===e.registration_status||"rejected"===e.registration_status)&&c.push({type:"registration_issue",severity:"critical",entity_type:"vehicle",entity_id:e.id,entity_name:e.vehicle_model,message:`Registration status: ${e.registration_status} — vehicle excluded from dispatch`}),("pending"===e.city_permit_status||"expired"===e.city_permit_status)&&c.push({type:"missing_city_permit",severity:"expired"===e.city_permit_status?"critical":"warning",entity_type:"vehicle",entity_id:e.id,entity_name:e.vehicle_model,message:`City permit: ${e.city_permit_status} — vehicle may be ineligible for dispatch`}),"pending"===e.airport_permit_mco_status&&c.push({type:"missing_airport_permit_mco",severity:"warning",entity_type:"vehicle",entity_id:e.id,entity_name:e.vehicle_model,message:`MCO airport permit pending — vehicle excluded from airport pickups`}),"pending"===e.port_permit_canaveral_status&&c.push({type:"missing_port_permit_canaveral",severity:"warning",entity_type:"vehicle",entity_id:e.id,entity_name:e.vehicle_model,message:`Port Canaveral permit pending — vehicle excluded from port pickups`}),"active"!==e.vehicle_status&&c.push({type:"inactive_vehicle",severity:"warning",entity_type:"vehicle",entity_id:e.id,entity_name:e.vehicle_model,message:`Vehicle status: ${e.vehicle_status} — excluded from dispatch`}),e.expires_at){let t=new Date(e.expires_at);t>d&&t<=_&&c.push({type:"documents_expiring_soon",severity:"warning",entity_type:"vehicle",entity_id:e.id,entity_name:e.vehicle_model,message:`Vehicle documents expire on ${t.toLocaleDateString()} — renewal required`})}c.sort((e,t)=>{let i={critical:0,warning:1,info:2};return i[e.severity]-i[t.severity]});let p=a.filter(e=>"active"===e.vehicle_status).length,u=a.filter(e=>"eligible"===e.airport_eligibility_status).length,v=a.filter(e=>"eligible"===e.port_eligibility_status).length,m=a.filter(e=>"compliant"===e.document_status).length,h=r.filter(e=>"active"===e.driver_status).length,g=r.filter(e=>"provisional"===e.driver_status).length,f=r.filter(e=>e.is_eligible_for_premium_dispatch).length,C=r.filter(e=>e.is_eligible_for_airport_priority).length,S={total_drivers:n,active_drivers:h,provisional_drivers:g,premium_eligible_drivers:f,airport_priority_drivers:C,total_vehicles:o,active_vehicles:p,mco_eligible_vehicles:u,port_eligible_vehicles:v,compliant_vehicles:m,critical_alerts:c.filter(e=>"critical"===e.severity).length,warning_alerts:c.filter(e=>"warning"===e.severity).length,info_alerts:c.filter(e=>"info"===e.severity).length};return y.NextResponse.json({company:t,drivers:r,vehicles:a,revenue_analytics:l,fleet_health:S,alerts:c,generated_at:new Date().toISOString()})}catch(e){return y.NextResponse.json({error:String(e)},{status:500})}}e.s(["GET",()=>f,"dynamic",0,"force-dynamic"],20833);var C=e.i(20833);let S=new t.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/admin/companies/[id]/fleet-analytics/route",pathname:"/api/admin/companies/[id]/fleet-analytics",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/companies/[id]/fleet-analytics/route.ts",nextConfigOutput:"",userland:C}),{workAsyncStorage:R,workUnitAsyncStorage:A,serverHooks:b}=S;function w(){return(0,r.patchFetch)({workAsyncStorage:R,workUnitAsyncStorage:A})}async function x(e,t,r){S.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/admin/companies/[id]/fleet-analytics/route";y=y.replace(/\/index$/,"")||"/";let E=await S.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!E)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:f,params:C,nextConfig:R,parsedUrl:A,isDraftMode:b,prerenderManifest:w,routerServerContext:x,isOnDemandRevalidate:O,revalidateOnlyGenerated:N,resolvedPathname:T,clientReferenceManifest:D,serverActionsManifest:L}=E,H=(0,o.normalizeAppPath)(y),M=!!(w.dynamicRoutes[H]||w.routes[T]),U=async()=>((null==x?void 0:x.render404)?await x.render404(e,t,A,!1):t.end("This page could not be found"),null);if(M&&!b){let e=!!w.routes[T],t=w.dynamicRoutes[H];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await U();throw new h.NoFallbackError}}let $=null;!M||S.isDev||b||($="/index"===($=T)?"/":$);let P=!0===S.isDev||!M,k=M&&!P;L&&D&&(0,n.setManifestsSingleton)({page:y,clientReferenceManifest:D,serverActionsManifest:L});let F=e.method||"GET",I=(0,s.getTracer)(),q=I.getActiveScopeSpan(),j={params:C,prerenderManifest:w,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,i,r,a)=>S.onRequestError(e,t,r,a,x)},sharedContext:{buildId:f}},W=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),K=d.NextRequestAdapter.fromNodeNextRequest(W,(0,d.signalFromNodeResponse)(t));try{let n=async e=>S.handle(K,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let i=I.getRootSpanAttributes();if(!i)return;if(i.get("next.span_type")!==_.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${i.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=i.get("next.route");if(r){let t=`${F} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${F} ${y}`)}),o=!!(0,a.getRequestMeta)(e,"minimalMode"),l=async a=>{var s,l;let d=async({previousCacheEntry:i})=>{try{if(!o&&O&&N&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await n(a);e.fetchMetrics=j.renderOpts.fetchMetrics;let l=j.renderOpts.pendingWaitUntil;l&&r.waitUntil&&(r.waitUntil(l),l=void 0);let d=j.renderOpts.collectedTags;if(!M)return await (0,p.sendResponse)(W,B,s,j.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,u.toNodeOutgoingHttpHeaders)(s.headers);d&&(t[m.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let i=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,r=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:g.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:i,expire:r}}}}catch(t){throw(null==i?void 0:i.isStale)&&await S.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:O})},!1,x),t}},_=await S.handleResponse({req:e,nextConfig:R,cacheKey:$,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:w,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:N,responseGenerator:d,waitUntil:r.waitUntil,isMinimalMode:o});if(!M)return null;if((null==_||null==(s=_.value)?void 0:s.kind)!==g.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==_||null==(l=_.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",O?"REVALIDATED":_.isMiss?"MISS":_.isStale?"STALE":"HIT"),b&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let h=(0,u.fromNodeOutgoingHttpHeaders)(_.value.headers);return o&&M||h.delete(m.NEXT_CACHE_TAGS_HEADER),!_.cacheControl||t.getHeader("Cache-Control")||h.get("Cache-Control")||h.set("Cache-Control",(0,v.getCacheControlHeader)(_.cacheControl)),await (0,p.sendResponse)(W,B,new Response(_.value.body,{headers:h,status:_.value.status||200})),null};q?await l(q):await I.withPropagatedContext(e.headers,()=>I.trace(_.BaseServerSpan.handleRequest,{spanName:`${F} ${y}`,kind:s.SpanKind.SERVER,attributes:{"http.method":F,"http.target":e.url}},l))}catch(t){if(t instanceof h.NoFallbackError||await S.onRequestError(e,t,{routerKind:"App Router",routePath:H,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:O})},!1,x),M)throw t;return await (0,p.sendResponse)(W,B,new Response(null,{status:500})),null}}e.s(["handler",()=>x,"patchFetch",()=>w,"routeModule",()=>S,"serverHooks",()=>b,"workAsyncStorage",()=>R,"workUnitAsyncStorage",()=>A],20409)}];

//# sourceMappingURL=80686_next_dist_esm_build_templates_app-route_60ccf415.js.map