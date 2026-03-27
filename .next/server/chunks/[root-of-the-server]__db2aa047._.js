module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},54799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},27699,(e,t,r)=>{t.exports=e.x("events",()=>require("events"))},21517,(e,t,r)=>{t.exports=e.x("http",()=>require("http"))},24836,(e,t,r)=>{t.exports=e.x("https",()=>require("https"))},98425,e=>{"use strict";var t=e.i(66574),r=e.i(58350),n=e.i(10732),s=e.i(12768),a=e.i(75089),i=e.i(11299),o=e.i(66012),l=e.i(12480),u=e.i(64629),d=e.i(2078),p=e.i(99591),c=e.i(65698),_=e.i(29809),E=e.i(64157),h=e.i(56534),R=e.i(93695);e.i(22981);var T=e.i(4706),A=e.i(4333),g=e.i(16770),m=e.i(70485);let f=new A.default(process.env.STRIPE_SECRET_KEY??"sk_test_placeholder"),x=(0,m.neon)(process.env.DATABASE_URL_UNPOOLED);async function N(e){try{let{price:t,vehicle:r,pickupZone:n,dropoffZone:s,tripType:a="oneway",name:i,email:o,phone:l,date:u,time:d,pickupLocation:p,dropoffLocation:c,flightNumber:_,notes:E,sourceCode:h,passengers:R,luggage:T,bookingOrigin:A,capturedBy:m}=await e.json(),N=[];if(t||N.push("fare_total"),r||N.push("vehicle_type"),n||N.push("pickup_zone"),s||N.push("dropoff_zone"),p?.trim()||N.push("pickup_address"),c?.trim()||N.push("dropoff_address"),u||N.push("pickup_date"),d||N.push("pickup_time"),i?.trim()||N.push("client_name"),l?.trim()||N.push("client_phone"),o?.trim()||N.push("client_email"),N.length>0)return g.NextResponse.json({error:"booking_validation_failed",missing_fields:N,message:`Booking incomplete. Missing required fields: ${N.join(", ")}`},{status:400});let C=null,v=null,k=null,L=[];for(let e of[x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent VARCHAR(255)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_email VARCHAR(255)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_phone_raw VARCHAR(50)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS flight_number VARCHAR(50)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_code VARCHAR(50)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS passengers INTEGER`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS luggage VARCHAR(100)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dispatch_status VARCHAR(50)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_zone VARCHAR(50)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_zone VARCHAR(50)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20)`,x`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS readiness_status VARCHAR(30) DEFAULT 'ready'`])try{await e}catch{}try{await x`ALTER TABLE bookings ALTER COLUMN pickup_at DROP NOT NULL`}catch{}if(o)try{let e=await x`
          SELECT id FROM clients WHERE email = ${o.toLowerCase()} LIMIT 1
        `;e.length>0?(v=e[0].id,await x`
            UPDATE clients
            SET full_name = COALESCE(${i??null}, full_name),
                phone = COALESCE(${l??null}, phone),
                updated_at = NOW()
            WHERE id = ${v}::uuid
          `):v=(await x`
            INSERT INTO clients (full_name, email, phone, created_at, updated_at)
            VALUES (${i??"Guest"}, ${o.toLowerCase()}, ${l??null}, NOW(), NOW())
            RETURNING id
          `)[0].id}catch(e){L.push(`client_upsert: ${e.message}`),console.error("[create-checkout-session] client upsert failed:",e.message)}if(h)try{let e=await x`
          SELECT id, status FROM drivers
          WHERE driver_code = ${h.toUpperCase()}
          LIMIT 1
        `;e.length>0&&(k=e[0].id)}catch(e){L.push(`source_driver_lookup: ${e.message}`),console.error("[create-checkout-session] source driver lookup failed:",e.message)}let O=u&&d?`${u}T${d}:00+00`:null;try{let e=p||n,i=c||s;C=(await x`
        INSERT INTO bookings (
          status,
          dispatch_status,
          readiness_status,
          pickup_address,
          dropoff_address,
          pickup_zone,
          dropoff_zone,
          pickup_at,
          vehicle_type,
          total_price,
          client_id,
          client_email,
          client_phone_raw,
          flight_number,
          notes,
          source_code,
          source_driver_id,
          passengers,
          luggage,
          trip_type,
          booking_origin,
          captured_by_driver_code,
          created_at,
          updated_at
        ) VALUES (
          'pending_payment',
          'pending_payment',
          'ready',
          ${e},
          ${i},
          ${n??null},
          ${s??null},
          ${O}::timestamptz,
          ${r},
          ${t},
          ${v}::uuid,
          ${o??null},
          ${l??null},
          ${_??null},
          ${E??null},
          ${h??null},
          ${k}::uuid,
          ${R?Number(R):null},
          ${T??null},
          ${a},
          ${A??"website"},
          ${m??"public_site"},
          NOW(),
          NOW()
        )
        RETURNING id
      `)[0].id}catch(e){L.push(`booking_insert: ${e?.message}`),console.error("[create-checkout-session] booking pre-create failed:",e?.message)}let S=p||n,y=c||s,b=!!(m&&"public_site"!==m&&"PUBLIC_SITE"!==m),I=await f.checkout.sessions.create({payment_method_types:["card"],mode:"payment",customer_email:o??void 0,line_items:[{price_data:{currency:"usd",product_data:{name:`Sottovento Luxury Ride — ${r}`,description:`${S} → ${y}`},unit_amount:Math.round(100*t)},quantity:1}],metadata:{booking_id:C??"",client_id:v??"",client_name:i??"",client_email:o??"",client_phone:l??"",pickup_zone:n??"",dropoff_zone:s??"",pickup_location:S??"",dropoff_location:y??"",pickup_date:u??"",pickup_time:d??"",vehicle_type:r??"",trip_type:a??"oneway",fare:String(t),flight_number:_??"",notes:E??"",source_code:h??"",source_driver_id:k??"",passengers:String(R??""),luggage:T??"",captured_by:m??"public_site",captured_by_driver_code:b?m??"":"",booking_origin:b?"tablet":A??"website",tablet_code:b?m??"":""},success_url:"https://sottoventoluxuryride.com/confirmation?session_id={CHECKOUT_SESSION_ID}",cancel_url:"https://sottoventoluxuryride.com"});if(C&&I.id)try{await x`
          UPDATE bookings
          SET stripe_session_id = ${I.id},
              updated_at = NOW()
          WHERE id = ${C}::uuid
        `}catch{}return g.NextResponse.json({url:I.url,booking_id:C,source_driver_resolved:!!k,...L.length>0?{pre_create_errors:L}:{}})}catch(e){return console.error("[create-checkout-session]",e),g.NextResponse.json({error:e.message},{status:500})}}e.s(["POST",()=>N],74088);var C=e.i(74088);let v=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/create-checkout-session/route",pathname:"/api/create-checkout-session",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/create-checkout-session/route.ts",nextConfigOutput:"",userland:C}),{workAsyncStorage:k,workUnitAsyncStorage:L,serverHooks:O}=v;function S(){return(0,n.patchFetch)({workAsyncStorage:k,workUnitAsyncStorage:L})}async function y(e,t,n){v.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let A="/api/create-checkout-session/route";A=A.replace(/\/index$/,"")||"/";let g=await v.prepare(e,t,{srcPage:A,multiZoneDraftMode:!1});if(!g)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:m,params:f,nextConfig:x,parsedUrl:N,isDraftMode:C,prerenderManifest:k,routerServerContext:L,isOnDemandRevalidate:O,revalidateOnlyGenerated:S,resolvedPathname:y,clientReferenceManifest:b,serverActionsManifest:I}=g,w=(0,o.normalizeAppPath)(A),D=!!(k.dynamicRoutes[w]||k.routes[y]),$=async()=>((null==L?void 0:L.render404)?await L.render404(e,t,N,!1):t.end("This page could not be found"),null);if(D&&!C){let e=!!k.routes[y],t=k.dynamicRoutes[w];if(t&&!1===t.fallback&&!e){if(x.experimental.adapterPath)return await $();throw new R.NoFallbackError}}let U=null;!D||v.isDev||C||(U="/index"===(U=y)?"/":U);let M=!0===v.isDev||!D,H=D&&!M;I&&b&&(0,i.setManifestsSingleton)({page:A,clientReferenceManifest:b,serverActionsManifest:I});let P=e.method||"GET",q=(0,a.getTracer)(),F=q.getActiveScopeSpan(),B={params:f,prerenderManifest:k,renderOpts:{experimental:{authInterrupts:!!x.experimental.authInterrupts},cacheComponents:!!x.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:x.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,n,s)=>v.onRequestError(e,t,n,s,L)},sharedContext:{buildId:m}},j=new l.NodeNextRequest(e),X=new l.NodeNextResponse(t),V=u.NextRequestAdapter.fromNodeNextRequest(j,(0,u.signalFromNodeResponse)(t));try{let i=async e=>v.handle(V,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${P} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${A}`)}),o=!!(0,s.getRequestMeta)(e,"minimalMode"),l=async s=>{var a,l;let u=async({previousCacheEntry:r})=>{try{if(!o&&O&&S&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let a=await i(s);e.fetchMetrics=B.renderOpts.fetchMetrics;let l=B.renderOpts.pendingWaitUntil;l&&n.waitUntil&&(n.waitUntil(l),l=void 0);let u=B.renderOpts.collectedTags;if(!D)return await (0,c.sendResponse)(j,X,a,B.renderOpts.pendingWaitUntil),null;{let e=await a.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(a.headers);u&&(t[h.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,n=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:T.CachedRouteKind.APP_ROUTE,status:a.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==r?void 0:r.isStale)&&await v.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:O})},!1,L),t}},d=await v.handleResponse({req:e,nextConfig:x,cacheKey:U,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:k,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:S,responseGenerator:u,waitUntil:n.waitUntil,isMinimalMode:o});if(!D)return null;if((null==d||null==(a=d.value)?void 0:a.kind)!==T.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",O?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),C&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let R=(0,_.fromNodeOutgoingHttpHeaders)(d.value.headers);return o&&D||R.delete(h.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||R.get("Cache-Control")||R.set("Cache-Control",(0,E.getCacheControlHeader)(d.cacheControl)),await (0,c.sendResponse)(j,X,new Response(d.value.body,{headers:R,status:d.value.status||200})),null};F?await l(F):await q.withPropagatedContext(e.headers,()=>q.trace(d.BaseServerSpan.handleRequest,{spanName:`${P} ${A}`,kind:a.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},l))}catch(t){if(t instanceof R.NoFallbackError||await v.onRequestError(e,t,{routerKind:"App Router",routePath:w,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:O})},!1,L),D)throw t;return await (0,c.sendResponse)(j,X,new Response(null,{status:500})),null}}e.s(["handler",()=>y,"patchFetch",()=>S,"routeModule",()=>v,"serverHooks",()=>O,"workAsyncStorage",()=>k,"workUnitAsyncStorage",()=>L],98425)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__db2aa047._.js.map