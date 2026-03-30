module.exports=[50242,e=>{"use strict";var t=e.i(39743),i=e.i(37383),a=e.i(16108),r=e.i(1266),o=e.i(10171),s=e.i(44067),n=e.i(7601),d=e.i(3083),l=e.i(88890),c=e.i(37886),p=e.i(63388),u=e.i(46601),_=e.i(24139),g=e.i(78785),E=e.i(2640),f=e.i(93695);e.i(46509);var h=e.i(56592),m=e.i(50974),v=e.i(57747),b=e.i(78934),y=e.i(25619),R=e.i(58673);let T=(0,v.neon)(process.env.DATABASE_URL_UNPOOLED);async function x(e){if(!process.env.RESEND_API_KEY)return;let t=e.pickupAt?new Date(e.pickupAt).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/New_York"}):"TBD";try{await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Sottovento Luxury Ride <noreply@sottoventoluxuryride.com>",to:[e.driverEmail],subject:"🚗 New Ride Assigned — Sottovento",html:`
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
        `})})}catch(e){console.error("Driver notification email error:",e)}}async function w(e,{params:t}){try{let{id:i}=await t,{status:a,dispatch_status:r,assigned_driver_id:o,edit_fields:s}=await e.json();if(s&&"object"==typeof s){let e=["pickup_at","pickup_address","dropoff_address","flight_number","notes","service_type","passengers","luggage","vehicle_type","total_price","client_name","client_phone","client_email"],t=Object.keys(s).filter(t=>e.includes(t));if(t.length>0){for(let e of t){let t=s[e];"pickup_at"===e?await T`UPDATE bookings SET pickup_at = ${t}::timestamptz, updated_at = NOW() WHERE id = ${i}::uuid`:"pickup_address"===e?await T`UPDATE bookings SET pickup_address = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"dropoff_address"===e?await T`UPDATE bookings SET dropoff_address = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"flight_number"===e?await T`UPDATE bookings SET flight_number = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"notes"===e?await T`UPDATE bookings SET notes = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"service_type"===e?await T`UPDATE bookings SET service_type = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"passengers"===e?await T`UPDATE bookings SET passengers = ${Number(t)}, updated_at = NOW() WHERE id = ${i}::uuid`:"luggage"===e?await T`UPDATE bookings SET luggage = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"vehicle_type"===e?await T`UPDATE bookings SET vehicle_type = ${t}, updated_at = NOW() WHERE id = ${i}::uuid`:"total_price"===e&&await T`UPDATE bookings SET total_price = ${Number(t)}, updated_at = NOW() WHERE id = ${i}::uuid`}let e=s.client_name,a=s.client_phone,r=s.client_email;if(void 0!==e||void 0!==a||void 0!==r)try{let t=await T`SELECT client_id FROM bookings WHERE id = ${i}::uuid LIMIT 1`,o=t[0]?.client_id??null;if(o)void 0!==e&&await T`UPDATE clients SET full_name = ${e}, updated_at = NOW() WHERE id = ${o}`,void 0!==a&&await T`UPDATE clients SET phone = ${a}, updated_at = NOW() WHERE id = ${o}`,void 0!==r&&await T`UPDATE clients SET email = ${r}, updated_at = NOW() WHERE id = ${o}`;else{let t=await T`
                INSERT INTO clients (full_name, phone, email, source_type, created_at, updated_at)
                VALUES (${e??"Guest"}, ${a??null}, ${r??null}, 'direct', NOW(), NOW())
                RETURNING id
              `,o=t[0]?.id;o&&await T`UPDATE bookings SET client_id = ${o}, updated_at = NOW() WHERE id = ${i}::uuid`}}catch(e){console.error("[PATCH] client upsert error:",e?.message)}try{await T`UPDATE bookings SET updated_at = NOW() WHERE id = ${i}::uuid`}catch{}}}if(void 0!==o&&o){let[e]=await T`
        SELECT pickup_at, pickup_address, dropoff_address, total_price,
               pickup_zone, COALESCE(service_location_type, '') AS service_location_type
        FROM bookings WHERE id = ${i}::uuid LIMIT 1
      `,t=[];if(e?.pickup_at||t.push("pickup_time"),e?.pickup_address&&"TBD"!==e.pickup_address||t.push("pickup_address"),e?.dropoff_address&&"TBD"!==e.dropoff_address||t.push("dropoff_address"),e?.total_price&&0!==Number(e.total_price)||t.push("total_price"),t.length>0)return m.NextResponse.json({error:`Cannot assign driver: booking is missing required fields: ${t.join(", ")}. Please edit the booking first.`,missingFields:t},{status:422});let a=e.service_location_type||(0,R.deriveServiceLocationType)(e.pickup_zone??"");if((0,R.requiresEligibilityGate)(a)){let t=await T`
          SELECT v.*
          FROM vehicles v
          WHERE v.driver_id = ${o}::uuid
            AND v.vehicle_status = 'active'
          ORDER BY v.is_primary DESC, v.created_at ASC
          LIMIT 1
        `;if(0===t.length){try{await T`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES (
                'booking', ${i}::uuid, 'dispatch_vehicle_gate_blocked', 'admin',
                ${JSON.stringify({reason:"no_vehicle_assigned",driver_id:o,service_location_type:a,pickup_zone:e.pickup_zone,timestamp:new Date().toISOString()})}::jsonb
              )
            `}catch{}return m.NextResponse.json({error:`Vehicle Eligibility Gate: driver has no active vehicle registered. A vehicle with the required permits must be registered before this driver can be assigned to a ${a} booking.`,gate_blocked:!0,exclusion_reasons:["no_vehicle_assigned"],service_location_type:a},{status:422})}let r=t[0],s=(0,R.checkVehicleEligibility)(r,a);if(!s.eligible){try{await T`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
              VALUES (
                'booking', ${i}::uuid, 'dispatch_vehicle_gate_blocked', 'admin',
                ${JSON.stringify({vehicle_id:r.id,driver_id:o,service_location_type:a,pickup_zone:e.pickup_zone,exclusion_reasons:s.reasons,vehicle_snapshot:{make:r.make,model:r.model,plate:r.plate,vehicle_status:r.vehicle_status,city_permit_status:r.city_permit_status,airport_permit_mco_status:r.airport_permit_mco_status,port_permit_canaveral_status:r.port_permit_canaveral_status,insurance_status:r.insurance_status,registration_status:r.registration_status},timestamp:new Date().toISOString()})}::jsonb
              )
            `}catch{}return m.NextResponse.json({error:`Vehicle Eligibility Gate: vehicle is not eligible for ${a}. Missing requirements: ${s.reasons.join(", ")}.`,gate_blocked:!0,exclusion_reasons:s.reasons,service_location_type:a,vehicle_id:r.id},{status:422})}if(!e.service_location_type&&a)try{await T`
              UPDATE bookings SET service_location_type = ${a}, updated_at = NOW()
              WHERE id = ${i}::uuid
            `}catch{}}}if(a){let e=r??function(e){switch(e){case"new":case"quote_sent":case"awaiting_payment":case"confirmed":return"awaiting_source_owner";case"accepted":case"assigned":case"in_service":case"in_progress":case"completed":return"assigned";case"cancelled":return"cancelled";default:return"not_required"}}(a);try{await T`
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
          `;e?.email&&x({driverEmail:e.email,driverName:e.full_name??"Driver",bookingId:e.booking_id??i,pickupAddress:e.pickup_address??"TBD",dropoffAddress:e.dropoff_address??"TBD",pickupAt:e.pickup_at??null,totalPrice:Number(e.total_price??0),clientName:e.client_name??null}).catch(()=>null)}catch{}}if("completed"===a)try{let[e]=await T`
          SELECT
            id, total_price, source_driver_id, executor_driver_id
          FROM bookings
          WHERE id = ${i}::uuid
          LIMIT 1
        `;e&&(await (0,b.lockCommission)({booking_id:i,total_price:Number(e.total_price??0),source_driver_id:e.source_driver_id??null,executor_driver_id:e.executor_driver_id??null}),await (0,y.postBookingLedger)(i))}catch(e){console.error("[PATCH] financial close error:",e?.message)}return m.NextResponse.json({success:!0})}catch(e){return m.NextResponse.json({error:e.message},{status:500})}}async function N(e,{params:t}){try{let{id:e}=await t,i=await T`
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
    `;if(!i[0])return m.NextResponse.json({error:"Booking not found"},{status:404});return m.NextResponse.json({booking:i[0]})}catch(e){return m.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>N,"PATCH",()=>w,"dynamic",0,"force-dynamic"],487);var k=e.i(487);let A=new t.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/admin/bookings/[id]/route",pathname:"/api/admin/bookings/[id]",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/bookings/[id]/route.ts",nextConfigOutput:"",userland:k}),{workAsyncStorage:$,workUnitAsyncStorage:O,serverHooks:S}=A;function C(){return(0,a.patchFetch)({workAsyncStorage:$,workUnitAsyncStorage:O})}async function P(e,t,a){A.isDev&&(0,r.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/admin/bookings/[id]/route";m=m.replace(/\/index$/,"")||"/";let v=await A.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!v)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:b,params:y,nextConfig:R,parsedUrl:T,isDraftMode:x,prerenderManifest:w,routerServerContext:N,isOnDemandRevalidate:k,revalidateOnlyGenerated:$,resolvedPathname:O,clientReferenceManifest:S,serverActionsManifest:C}=v,P=(0,n.normalizeAppPath)(m),W=!!(w.dynamicRoutes[P]||w.routes[O]),D=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,T,!1):t.end("This page could not be found"),null);if(W&&!x){let e=!!w.routes[O],t=w.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await D();throw new f.NoFallbackError}}let H=null;!W||A.isDev||x||(H="/index"===(H=O)?"/":H);let U=!0===A.isDev||!W,I=W&&!U;C&&S&&(0,s.setManifestsSingleton)({page:m,clientReferenceManifest:S,serverActionsManifest:C});let L=e.method||"GET",j=(0,o.getTracer)(),M=j.getActiveScopeSpan(),z={params:y,prerenderManifest:w,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,r.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,i,a,r)=>A.onRequestError(e,t,a,r,N)},sharedContext:{buildId:b}},q=new d.NodeNextRequest(e),F=new d.NodeNextResponse(t),B=l.NextRequestAdapter.fromNodeNextRequest(q,(0,l.signalFromNodeResponse)(t));try{let s=async e=>A.handle(B,z).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let i=j.getRootSpanAttributes();if(!i)return;if(i.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${i.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=i.get("next.route");if(a){let t=`${L} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${L} ${m}`)}),n=!!(0,r.getRequestMeta)(e,"minimalMode"),d=async r=>{var o,d;let l=async({previousCacheEntry:i})=>{try{if(!n&&k&&$&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await s(r);e.fetchMetrics=z.renderOpts.fetchMetrics;let d=z.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let l=z.renderOpts.collectedTags;if(!W)return await (0,u.sendResponse)(q,F,o,z.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(o.headers);l&&(t[E.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let i=void 0!==z.renderOpts.collectedRevalidate&&!(z.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&z.renderOpts.collectedRevalidate,a=void 0===z.renderOpts.collectedExpire||z.renderOpts.collectedExpire>=E.INFINITE_CACHE?void 0:z.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:i,expire:a}}}}catch(t){throw(null==i?void 0:i.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:k})},!1,N),t}},c=await A.handleResponse({req:e,nextConfig:R,cacheKey:H,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:w,isRoutePPREnabled:!1,isOnDemandRevalidate:k,revalidateOnlyGenerated:$,responseGenerator:l,waitUntil:a.waitUntil,isMinimalMode:n});if(!W)return null;if((null==c||null==(o=c.value)?void 0:o.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(d=c.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});n||t.setHeader("x-nextjs-cache",k?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),x&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let f=(0,_.fromNodeOutgoingHttpHeaders)(c.value.headers);return n&&W||f.delete(E.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||f.get("Cache-Control")||f.set("Cache-Control",(0,g.getCacheControlHeader)(c.cacheControl)),await (0,u.sendResponse)(q,F,new Response(c.value.body,{headers:f,status:c.value.status||200})),null};M?await d(M):await j.withPropagatedContext(e.headers,()=>j.trace(c.BaseServerSpan.handleRequest,{spanName:`${L} ${m}`,kind:o.SpanKind.SERVER,attributes:{"http.method":L,"http.target":e.url}},d))}catch(t){if(t instanceof f.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:k})},!1,N),W)throw t;return await (0,u.sendResponse)(q,F,new Response(null,{status:500})),null}}e.s(["handler",()=>P,"patchFetch",()=>C,"routeModule",()=>A,"serverHooks",()=>S,"workAsyncStorage",()=>$,"workUnitAsyncStorage",()=>O],50242)}];

//# sourceMappingURL=80686_next_dist_esm_build_templates_app-route_6259d00b.js.map