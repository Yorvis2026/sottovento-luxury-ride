module.exports=[53239,e=>{"use strict";var t=e.i(66574),r=e.i(58350),a=e.i(10732),i=e.i(12768),o=e.i(75089),n=e.i(11299),d=e.i(66012),s=e.i(12480),l=e.i(64629),p=e.i(2078),c=e.i(99591),u=e.i(65698),g=e.i(29809),h=e.i(64157),_=e.i(56534),f=e.i(93695);e.i(22981);var y=e.i(4706),m=e.i(16770),x=e.i(70485),R=e.i(53099);let b=(0,x.neon)(process.env.DATABASE_URL),v=new R.Resend(process.env.RESEND_API_KEY),E="contact@sottoventoluxuryride.com",w="SLN System <bookings@sottoventoluxuryride.com>";async function $(e){try{let{booking_id:t,driver_code:r,action:a,missing_fields:i,note:o}=await e.json();if(!t||!r||!a)return m.NextResponse.json({error:"booking_id, driver_code, and action are required"},{status:400});let n=await b`
      SELECT
        b.id, b.status, b.dispatch_status, b.pickup_at, b.pickup_address,
        b.dropoff_address, b.vehicle_type, b.total_price, b.assigned_driver_id,
        c.full_name AS client_name, c.phone AS client_phone,
        d.full_name AS driver_name, d.driver_code AS d_code
      FROM bookings b
      LEFT JOIN clients c ON c.id = b.client_id
      LEFT JOIN drivers d ON d.id = b.assigned_driver_id
      WHERE b.id = ${t}::uuid
      LIMIT 1
    `;if(0===n.length)return m.NextResponse.json({error:"Booking not found"},{status:404});let d=n[0];if((d.d_code??"").toUpperCase()!==r.toUpperCase())return m.NextResponse.json({error:"Driver not authorized for this booking"},{status:403});let s=t.slice(0,8).toUpperCase(),l=d.driver_name??r,p=(i??[]).join(", ")||"unspecified",c=o?`<br><strong>Driver note:</strong> ${o}`:"";if("return_to_dispatch"===a){let e=d.status;if(!["accepted","assigned"].includes(e))return m.NextResponse.json({error:`Cannot return to dispatch from status: ${e}`},{status:422});await b`
        UPDATE bookings
        SET
          status            = 'pending_dispatch',
          dispatch_status   = 'manual_dispatch_required',
          assigned_driver_id = NULL,
          updated_at        = NOW()
        WHERE id = ${t}::uuid
      `;try{await b`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES ('booking', ${t}::uuid, 'driver_returned_to_dispatch',
            ${JSON.stringify({driver_code:r,previous_status:e,reason:o??"incomplete_data"})}::jsonb,
            NOW())
        `}catch{}try{await v.emails.send({from:w,to:E,subject:`⚠️ Ride Returned to Dispatch — Booking #${s}`,html:`
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 24px; border-radius: 12px;">
              <h2 style="color: #C8A96A; margin-top: 0;">Ride Returned to Dispatch</h2>
              <p>Driver <strong>${l}</strong> (${r}) has returned booking <strong>#${s}</strong> to manual dispatch.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Booking ID</td><td style="padding: 6px 0;">${t}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Previous Status</td><td style="padding: 6px 0;">${e}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">New Status</td><td style="padding: 6px 0; color: #f59e0b;">pending_dispatch / manual_dispatch_required</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Route</td><td style="padding: 6px 0;">${d.pickup_address??"?"} → ${d.dropoff_address??"?"}</td></tr>
              </table>
              ${c?`<p style="color: #fca5a5;">${c}</p>`:""}
              <p style="color: #f59e0b; font-weight: bold;">Action required: Reassign this ride from the Dispatch panel.</p>
            </div>
          `})}catch{}return m.NextResponse.json({success:!0,action:a,new_status:"pending_dispatch"})}if("report_incomplete"===a){await b`
        UPDATE bookings
        SET
          dispatch_status    = 'needs_correction',
          assigned_driver_id = NULL,
          updated_at         = NOW()
        WHERE id = ${t}::uuid
      `;try{await b`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES ('booking', ${t}::uuid, 'driver_reported_incomplete',
            ${JSON.stringify({driver_code:r,missing_fields:i??[],note:o})}::jsonb,
            NOW())
        `}catch{}try{await v.emails.send({from:w,to:E,subject:`🚨 Incomplete Booking Data Reported — #${s}`,html:`
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 24px; border-radius: 12px;">
              <h2 style="color: #ef4444; margin-top: 0;">Incomplete Booking Data Reported</h2>
              <p>Driver <strong>${l}</strong> (${r}) has reported that booking <strong>#${s}</strong> is missing required data.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Booking ID</td><td style="padding: 6px 0;">${t}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Missing Fields</td><td style="padding: 6px 0; color: #fca5a5;"><strong>${p}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Client</td><td style="padding: 6px 0;">${d.client_name??"?"} \xb7 ${d.client_phone??"?"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Route</td><td style="padding: 6px 0;">${d.pickup_address??"?"} → ${d.dropoff_address??"?"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Pickup Time</td><td style="padding: 6px 0;">${d.pickup_at??"MISSING"}</td></tr>
              </table>
              ${c?`<p style="color: #fca5a5;">${c}</p>`:""}
              <p style="color: #ef4444; font-weight: bold;">Action required: Edit the booking in the admin panel and re-assign the driver.</p>
            </div>
          `})}catch{}return m.NextResponse.json({success:!0,action:a,notified:!0})}if("request_correction"===a){await b`
        UPDATE bookings
        SET
          dispatch_status    = 'needs_correction',
          assigned_driver_id = NULL,
          updated_at         = NOW()
        WHERE id = ${t}::uuid
      `;try{await b`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES ('booking', ${t}::uuid, 'driver_requested_correction',
            ${JSON.stringify({driver_code:r,note:o})}::jsonb,
            NOW())
        `}catch{}try{await v.emails.send({from:w,to:E,subject:`✏️ Booking Correction Requested — #${s}`,html:`
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 24px; border-radius: 12px;">
              <h2 style="color: #f59e0b; margin-top: 0;">Booking Correction Requested</h2>
              <p>Driver <strong>${l}</strong> (${r}) is requesting a correction for booking <strong>#${s}</strong> before they can proceed.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Booking ID</td><td style="padding: 6px 0;">${t}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Current Status</td><td style="padding: 6px 0;">${d.status}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Client</td><td style="padding: 6px 0;">${d.client_name??"?"} \xb7 ${d.client_phone??"?"}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Route</td><td style="padding: 6px 0;">${d.pickup_address??"?"} → ${d.dropoff_address??"?"}</td></tr>
              </table>
              ${c?`<p style="color: #fbbf24;">${c}</p>`:""}
              <p style="color: #f59e0b; font-weight: bold;">Action required: Edit the booking and notify the driver when corrected.</p>
            </div>
          `})}catch{}return m.NextResponse.json({success:!0,action:a,notified:!0})}if("reject_ride"===a){if(!(!d.pickup_at||!d.pickup_address||!d.client_phone))return m.NextResponse.json({error:"Reject is only allowed when critical data (pickup_time, pickup_address, passenger_phone) is missing"},{status:422});await b`
        UPDATE bookings
        SET
          status            = 'pending_dispatch',
          dispatch_status   = 'driver_rejected',
          assigned_driver_id = NULL,
          updated_at        = NOW()
        WHERE id = ${t}::uuid
      `;try{await b`
          INSERT INTO audit_logs (entity_type, entity_id, action, new_data, created_at)
          VALUES ('booking', ${t}::uuid, 'driver_rejected_incomplete_ride',
            ${JSON.stringify({driver_code:r,missing_fields:i??[],note:o})}::jsonb,
            NOW())
        `}catch{}try{await v.emails.send({from:w,to:E,subject:`🚫 Ride Rejected by Driver — Incomplete Data — #${s}`,html:`
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 24px; border-radius: 12px;">
              <h2 style="color: #ef4444; margin-top: 0;">Ride Rejected — Incomplete Data</h2>
              <p>Driver <strong>${l}</strong> (${r}) has rejected booking <strong>#${s}</strong> due to missing critical data.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #9ca3af;">Booking ID</td><td style="padding: 6px 0;">${t}</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Missing Fields</td><td style="padding: 6px 0; color: #fca5a5;"><strong>${p}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">New Status</td><td style="padding: 6px 0; color: #f59e0b;">pending_dispatch / manual_dispatch_required</td></tr>
                <tr><td style="padding: 6px 0; color: #9ca3af;">Route</td><td style="padding: 6px 0;">${d.pickup_address??"?"} → ${d.dropoff_address??"?"}</td></tr>
              </table>
              ${c?`<p style="color: #fca5a5;">${c}</p>`:""}
              <p style="color: #ef4444; font-weight: bold;">URGENT: Complete the booking data and reassign immediately.</p>
            </div>
          `})}catch{}return m.NextResponse.json({success:!0,action:a,new_status:"pending_dispatch"})}return m.NextResponse.json({error:`Unknown action: ${a}`},{status:400})}catch(e){return console.error("[driver/report]",e),m.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}e.s(["POST",()=>$],16068);var N=e.i(16068);let k=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/driver/report/route",pathname:"/api/driver/report",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/driver/report/route.ts",nextConfigOutput:"",userland:N}),{workAsyncStorage:S,workUnitAsyncStorage:A,serverHooks:T}=k;function C(){return(0,a.patchFetch)({workAsyncStorage:S,workUnitAsyncStorage:A})}async function O(e,t,a){k.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/driver/report/route";m=m.replace(/\/index$/,"")||"/";let x=await k.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!x)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:R,params:b,nextConfig:v,parsedUrl:E,isDraftMode:w,prerenderManifest:$,routerServerContext:N,isOnDemandRevalidate:S,revalidateOnlyGenerated:A,resolvedPathname:T,clientReferenceManifest:C,serverActionsManifest:O}=x,I=(0,d.normalizeAppPath)(m),D=!!($.dynamicRoutes[I]||$.routes[T]),j=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,E,!1):t.end("This page could not be found"),null);if(D&&!w){let e=!!$.routes[T],t=$.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(v.experimental.adapterPath)return await j();throw new f.NoFallbackError}}let U=null;!D||k.isDev||w||(U="/index"===(U=T)?"/":U);let P=!0===k.isDev||!D,q=D&&!P;O&&C&&(0,n.setManifestsSingleton)({page:m,clientReferenceManifest:C,serverActionsManifest:O});let L=e.method||"GET",H=(0,o.getTracer)(),M=H.getActiveScopeSpan(),B={params:b,prerenderManifest:$,renderOpts:{experimental:{authInterrupts:!!v.experimental.authInterrupts},cacheComponents:!!v.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:v.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,i)=>k.onRequestError(e,t,a,i,N)},sharedContext:{buildId:R}},W=new s.NodeNextRequest(e),F=new s.NodeNextResponse(t),K=l.NextRequestAdapter.fromNodeNextRequest(W,(0,l.signalFromNodeResponse)(t));try{let n=async e=>k.handle(K,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=H.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${L} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${L} ${m}`)}),d=!!(0,i.getRequestMeta)(e,"minimalMode"),s=async i=>{var o,s;let l=async({previousCacheEntry:r})=>{try{if(!d&&S&&A&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await n(i);e.fetchMetrics=B.renderOpts.fetchMetrics;let s=B.renderOpts.pendingWaitUntil;s&&a.waitUntil&&(a.waitUntil(s),s=void 0);let l=B.renderOpts.collectedTags;if(!D)return await (0,u.sendResponse)(W,F,o,B.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,g.toNodeOutgoingHttpHeaders)(o.headers);l&&(t[_.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,a=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=_.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:y.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await k.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:S})},!1,N),t}},p=await k.handleResponse({req:e,nextConfig:v,cacheKey:U,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:$,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:A,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:d});if(!D)return null;if((null==p||null==(o=p.value)?void 0:o.kind)!==y.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(s=p.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});d||t.setHeader("x-nextjs-cache",S?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),w&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let f=(0,g.fromNodeOutgoingHttpHeaders)(p.value.headers);return d&&D||f.delete(_.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||f.get("Cache-Control")||f.set("Cache-Control",(0,h.getCacheControlHeader)(p.cacheControl)),await (0,u.sendResponse)(W,F,new Response(p.value.body,{headers:f,status:p.value.status||200})),null};M?await s(M):await H.withPropagatedContext(e.headers,()=>H.trace(p.BaseServerSpan.handleRequest,{spanName:`${L} ${m}`,kind:o.SpanKind.SERVER,attributes:{"http.method":L,"http.target":e.url}},s))}catch(t){if(t instanceof f.NoFallbackError||await k.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:S})},!1,N),D)throw t;return await (0,u.sendResponse)(W,F,new Response(null,{status:500})),null}}e.s(["handler",()=>O,"patchFetch",()=>C,"routeModule",()=>k,"serverHooks",()=>T,"workAsyncStorage",()=>S,"workUnitAsyncStorage",()=>A],53239)}];

//# sourceMappingURL=84ad8_next_dist_esm_build_templates_app-route_6d97e651.js.map