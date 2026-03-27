module.exports=[67120,e=>{"use strict";var t=e.i(66574),i=e.i(58350),a=e.i(10732),r=e.i(12768),o=e.i(75089),n=e.i(11299),s=e.i(66012),d=e.i(12480),l=e.i(64629),p=e.i(2078),u=e.i(99591),c=e.i(65698),_=e.i(29809),E=e.i(64157),f=e.i(56534),g=e.i(93695);e.i(22981);var m=e.i(4706),h=e.i(16770),v=e.i(70485),R=e.i(91501),x=e.i(20622);let T=(0,v.neon)(process.env.DATABASE_URL_UNPOOLED);async function b(e){if(!process.env.RESEND_API_KEY)return;let t=e.pickupAt?new Date(e.pickupAt).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/New_York"}):"TBD";try{await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Sottovento Luxury Ride <noreply@sottoventoluxuryride.com>",to:[e.driverEmail],subject:"🚗 New Ride Assigned — Sottovento",html:`
          <div style="font-family: Georgia, serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
              <p style="color: #C8A96A; letter-spacing: 4px; font-size: 11px; text-transform: uppercase; margin: 0 0 8px;">SOTTOVENTO LUXURY NETWORK</p>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 300;">New Ride Assigned</h1>
            </div>

            <p style="color: #a0a0a0; line-height: 1.8; margin-bottom: 24px;">
              Hi <strong style="color: #fff;">${e.driverName}</strong>, you have a new ride assigned.
            </p>

            <div style="background: #1a1a1a; border: 1px solid #C8A96A33; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0; width: 120px;">Pickup</td>
                  <td style="color: #fff; font-size: 14px; padding: 8px 0;">${e.pickupAddress}</td>
                </tr>
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0;">Dropoff</td>
                  <td style="color: #fff; font-size: 14px; padding: 8px 0;">${e.dropoffAddress}</td>
                </tr>
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0;">Time</td>
                  <td style="color: #C8A96A; font-size: 14px; font-weight: bold; padding: 8px 0;">${t}</td>
                </tr>
                ${e.clientName?`
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0;">Client</td>
                  <td style="color: #fff; font-size: 14px; padding: 8px 0;">${e.clientName}</td>
                </tr>`:""}
                <tr>
                  <td style="color: #888; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 8px 0;">Fare</td>
                  <td style="color: #4ade80; font-size: 18px; font-weight: bold; padding: 8px 0;">$${e.totalPrice.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="https://www.sottoventoluxuryride.com/driver/${e.driverName.replace(/\s+/g,"")}"
                style="background: #C8A96A; color: #0a0a0a; padding: 16px 40px; text-decoration: none; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; display: inline-block; border-radius: 4px;">
                Open Driver Panel →
              </a>
            </div>

            <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
              Booking ID: ${e.bookingId.substring(0,8).toUpperCase()}<br/>
              Sottovento Luxury Network — Premium Transportation
            </p>
          </div>
        `})})}catch(e){console.error("Driver notification email error:",e)}}async function w(e,{params:t}){try{let{id:i}=await t,{status:a,dispatch_status:r,assigned_driver_id:o,edit_fields:n}=await e.json();if(n&&"object"==typeof n){let e=["pickup_at","pickup_address","dropoff_address","flight_number","notes","service_type","passengers","luggage","vehicle_type","total_price","client_name","client_phone","client_email"],t=Object.keys(n).filter(t=>e.includes(t));if(t.length>0){for(let e of t){let t=n[e];"pickup_at"===e?await T`UPDATE bookings SET pickup_at = ${t}::timestamptz, updated_at = NOW() WHERE id = ${i}::uuid`:"pickup_address"===e?await T`UPDATE bookings SET pickup_address = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"dropoff_address"===e?await T`UPDATE bookings SET dropoff_address = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"flight_number"===e?await T`UPDATE bookings SET flight_number = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"notes"===e?await T`UPDATE bookings SET notes = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"service_type"===e?await T`UPDATE bookings SET service_type = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"passengers"===e?await T`UPDATE bookings SET passengers = ${Number(t)}, updated_at = NOW() WHERE id = ${i}::uuid`:"luggage"===e?await T`UPDATE bookings SET luggage = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"vehicle_type"===e?await T`UPDATE bookings SET vehicle_type = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"total_price"===e&&await T`UPDATE bookings SET total_price = ${Number(t)}, updated_at = NOW() WHERE id = ${i}::uuid`}let e=n.client_name,a=n.client_phone,r=n.client_email;if(void 0!==e||void 0!==a||void 0!==r)try{let t=await T`SELECT client_id FROM bookings WHERE id = ${i}::uuid LIMIT 1`,o=t[0]?.client_id??null;if(o)void 0!==e&&await T`UPDATE clients SET full_name = ${e}, updated_at = NOW() WHERE id = ${o}`,void 0!==a&&await T`UPDATE clients SET phone = ${a}, updated_at = NOW() WHERE id = ${o}`,void 0!==r&&await T`UPDATE clients SET email = ${r}, updated_at = NOW() WHERE id = ${o}`;else{let t=await T`
                INSERT INTO clients (full_name, phone, email, source_type, created_at, updated_at)
                VALUES (${e??"Guest"}, ${a??null}, ${r??null}, 'direct', NOW(), NOW())
                RETURNING id
              `,o=t[0]?.id;o&&await T`UPDATE bookings SET client_id = ${o}, updated_at = NOW() WHERE id = ${i}::uuid`}}catch(e){console.error("[PATCH] client upsert error:",e?.message)}try{await T`UPDATE bookings SET updated_at = NOW() WHERE id = ${i}::uuid`}catch{}}}if(void 0!==o&&o){let[e]=await T`
        SELECT pickup_at, pickup_address, dropoff_address, total_price
        FROM bookings WHERE id = ${i}::uuid LIMIT 1
      `,t=[];if(e?.pickup_at||t.push("pickup_time"),e?.pickup_address&&"TBD"!==e.pickup_address||t.push("pickup_address"),e?.dropoff_address&&"TBD"!==e.dropoff_address||t.push("dropoff_address"),e?.total_price&&0!==Number(e.total_price)||t.push("total_price"),t.length>0)return h.NextResponse.json({error:`Cannot assign driver: booking is missing required fields: ${t.join(", ")}. Please edit the booking first.`,missingFields:t},{status:422})}if(a){let e=r??function(e){switch(e){case"new":case"quote_sent":case"awaiting_payment":case"confirmed":return"awaiting_source_owner";case"accepted":case"assigned":case"in_service":case"in_progress":case"completed":return"assigned";case"cancelled":return"cancelled";default:return"not_required"}}(a);try{await T`
          UPDATE bookings
          SET
            status = ${a},
            dispatch_status = ${e},
            updated_at = NOW()
          WHERE id = ${i}::uuid
        `}catch(e){if(e.message?.includes("dispatch_status"))await T`
            UPDATE bookings
            SET status = ${a}, updated_at = NOW()
            WHERE id = ${i}::uuid
          `;else throw e}}if(r&&!a)try{await T`
          UPDATE bookings
          SET dispatch_status = ${r}, updated_at = NOW()
          WHERE id = ${i}::uuid
        `}catch(e){if(!e.message?.includes("dispatch_status"))throw e}if(void 0!==o){if(o){let e=a??"assigned",t=r??"offer_pending";try{await T`
            UPDATE bookings
            SET
              assigned_driver_id = ${o}::uuid,
              status = ${e},
              dispatch_status = ${t},
              updated_at = NOW()
            WHERE id = ${i}::uuid
          `,"offer_pending"===t&&await T`
              INSERT INTO dispatch_offers (
                booking_id, driver_id, offer_round,
                is_source_offer, response, sent_at, expires_at
              ) VALUES (
                ${i}::uuid,
                ${o}::uuid,
                1,
                false,
                'pending',
                NOW(),
                NOW() + interval '24 hours'
              )
              ON CONFLICT DO NOTHING
            `}catch(t){if(t.message?.includes("dispatch_status"))await T`
              UPDATE bookings
              SET assigned_driver_id = ${o}::uuid, status = ${e}, updated_at = NOW()
              WHERE id = ${i}::uuid
            `;else throw t}}else await T`
          UPDATE bookings
          SET assigned_driver_id = NULL, updated_at = NOW()
          WHERE id = ${i}::uuid
        `;if(o)try{let[e]=await T`
            SELECT d.email, d.full_name, d.driver_code,
                   b.pickup_address, b.dropoff_address, b.pickup_at,
                   b.total_price, b.id AS booking_id,
                   c.full_name AS client_name
            FROM drivers d
            JOIN bookings b ON b.id = ${i}::uuid
            LEFT JOIN clients c ON b.client_id = c.id
            WHERE d.id = ${o}::uuid
            LIMIT 1
          `;e?.email&&b({driverEmail:e.email,driverName:e.full_name??"Driver",bookingId:e.booking_id??i,pickupAddress:e.pickup_address??"TBD",dropoffAddress:e.dropoff_address??"TBD",pickupAt:e.pickup_at??null,totalPrice:Number(e.total_price??0),clientName:e.client_name??null}).catch(()=>null)}catch{}}if("completed"===a)try{let[e]=await T`
          SELECT
            id, total_price, source_driver_id, executor_driver_id
          FROM bookings
          WHERE id = ${i}::uuid
          LIMIT 1
        `;e&&(await (0,R.lockCommission)({booking_id:i,total_price:Number(e.total_price??0),source_driver_id:e.source_driver_id??null,executor_driver_id:e.executor_driver_id??null}),await (0,x.postBookingLedger)(i))}catch(e){console.error("[PATCH] financial close error:",e?.message)}return h.NextResponse.json({success:!0})}catch(e){return h.NextResponse.json({error:e.message},{status:500})}}async function N(e,{params:t}){try{let{id:e}=await t,i=await T`
      SELECT
        b.*,
        c.full_name AS client_name,
        c.phone AS client_phone,
        c.email AS client_email,
        d.full_name AS driver_name,
        d.driver_code AS driver_code,
        d.email AS driver_email
      FROM bookings b
      LEFT JOIN clients c ON b.client_id = c.id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.id
      WHERE b.id = ${e}::uuid
    `;if(!i[0])return h.NextResponse.json({error:"Booking not found"},{status:404});return h.NextResponse.json({booking:i[0]})}catch(e){return h.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>N,"PATCH",()=>w],95057);var A=e.i(95057);let k=new t.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/admin/bookings/[id]/route",pathname:"/api/admin/bookings/[id]",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/admin/bookings/[id]/route.ts",nextConfigOutput:"",userland:A}),{workAsyncStorage:y,workUnitAsyncStorage:$,serverHooks:O}=k;function S(){return(0,a.patchFetch)({workAsyncStorage:y,workUnitAsyncStorage:$})}async function P(e,t,a){k.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/admin/bookings/[id]/route";h=h.replace(/\/index$/,"")||"/";let v=await k.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!v)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:R,params:x,nextConfig:T,parsedUrl:b,isDraftMode:w,prerenderManifest:N,routerServerContext:A,isOnDemandRevalidate:y,revalidateOnlyGenerated:$,resolvedPathname:O,clientReferenceManifest:S,serverActionsManifest:P}=v,C=(0,s.normalizeAppPath)(h),W=!!(N.dynamicRoutes[C]||N.routes[O]),D=async()=>((null==A?void 0:A.render404)?await A.render404(e,t,b,!1):t.end("This page could not be found"),null);if(W&&!w){let e=!!N.routes[O],t=N.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(T.experimental.adapterPath)return await D();throw new g.NoFallbackError}}let H=null;!W||k.isDev||w||(H="/index"===(H=O)?"/":H);let U=!0===k.isDev||!W,I=W&&!U;P&&S&&(0,n.setManifestsSingleton)({page:h,clientReferenceManifest:S,serverActionsManifest:P});let L=e.method||"GET",M=(0,o.getTracer)(),j=M.getActiveScopeSpan(),F={params:x,prerenderManifest:N,renderOpts:{experimental:{authInterrupts:!!T.experimental.authInterrupts},cacheComponents:!!T.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,r.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:T.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,i,a,r)=>k.onRequestError(e,t,a,r,A)},sharedContext:{buildId:R}},q=new d.NodeNextRequest(e),z=new d.NodeNextResponse(t),B=l.NextRequestAdapter.fromNodeNextRequest(q,(0,l.signalFromNodeResponse)(t));try{let n=async e=>k.handle(B,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let i=M.getRootSpanAttributes();if(!i)return;if(i.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${i.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=i.get("next.route");if(a){let t=`${L} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${L} ${h}`)}),s=!!(0,r.getRequestMeta)(e,"minimalMode"),d=async r=>{var o,d;let l=async({previousCacheEntry:i})=>{try{if(!s&&y&&$&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await n(r);e.fetchMetrics=F.renderOpts.fetchMetrics;let d=F.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let l=F.renderOpts.collectedTags;if(!W)return await (0,c.sendResponse)(q,z,o,F.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(o.headers);l&&(t[f.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let i=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=f.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,a=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=f.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:m.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:i,expire:a}}}}catch(t){throw(null==i?void 0:i.isStale)&&await k.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:y})},!1,A),t}},p=await k.handleResponse({req:e,nextConfig:T,cacheKey:H,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:y,revalidateOnlyGenerated:$,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:s});if(!W)return null;if((null==p||null==(o=p.value)?void 0:o.kind)!==m.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(d=p.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",y?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),w&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,_.fromNodeOutgoingHttpHeaders)(p.value.headers);return s&&W||g.delete(f.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,E.getCacheControlHeader)(p.cacheControl)),await (0,c.sendResponse)(q,z,new Response(p.value.body,{headers:g,status:p.value.status||200})),null};j?await d(j):await M.withPropagatedContext(e.headers,()=>M.trace(p.BaseServerSpan.handleRequest,{spanName:`${L} ${h}`,kind:o.SpanKind.SERVER,attributes:{"http.method":L,"http.target":e.url}},d))}catch(t){if(t instanceof g.NoFallbackError||await k.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:y})},!1,A),W)throw t;return await (0,c.sendResponse)(q,z,new Response(null,{status:500})),null}}e.s(["handler",()=>P,"patchFetch",()=>S,"routeModule",()=>k,"serverHooks",()=>O,"workAsyncStorage",()=>y,"workUnitAsyncStorage",()=>$],67120)}];

//# sourceMappingURL=84ad8_next_dist_esm_build_templates_app-route_b35f5b9a.js.map