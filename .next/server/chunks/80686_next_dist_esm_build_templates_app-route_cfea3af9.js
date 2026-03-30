module.exports=[58205,e=>{"use strict";var t=e.i(39743),a=e.i(37383),i=e.i(16108),o=e.i(1266),s=e.i(10171),r=e.i(44067),n=e.i(7601),d=e.i(3083),c=e.i(88890),u=e.i(37886),_=e.i(63388),p=e.i(46601),l=e.i(24139),g=e.i(78785),m=e.i(2640),b=e.i(93695);e.i(46509);var f=e.i(56592),h=e.i(50974),y=e.i(13271),w=e.i(57747),v=e.i(82092);let k=new y.default(process.env.STRIPE_SECRET_KEY??"sk_test_placeholder"),E=(0,w.neon)(process.env.DATABASE_URL_UNPOOLED);async function $(e){let t,a=await e.text(),i=e.headers.get("stripe-signature")??"";try{t=k.webhooks.constructEvent(a,i,process.env.STRIPE_WEBHOOK_SECRET??"")}catch(e){return console.error(`[webhook] signature verification failed: ${e.message}`),h.NextResponse.json({error:`Webhook Error: ${e.message}`},{status:400})}switch(console.log(`[webhook] received event: ${t.type}`),t.type){case"checkout.session.completed":await T(t.data.object);break;case"payment_intent.succeeded":await R(t.data.object);break;case"account.updated":await I(t.data.object);break;case"account.application.deauthorized":await N(t.data.object);break;default:console.log(`[webhook] unhandled event type: ${t.type}`)}return h.NextResponse.json({received:!0})}async function T(e){let t=e.metadata??{},a=t.booking_id,i=e.id,o="string"==typeof e.payment_intent?e.payment_intent:"",s=e.customer_details?.email||t.client_email,r=e.customer_details?.name||t.client_name,n=e.customer_details?.phone||t.client_phone,d=Number(t.fare||0),c=t.client_id,u=(t.pickup_location||t.pickup_address||"").trim(),_=(t.dropoff_location||t.dropoff_address||"").trim(),p=(t.pickup_zone||t.pickup_zone_selected||"").trim(),l=(t.dropoff_zone||t.dropoff_zone_selected||"").trim(),g=t.pickup_date,m=t.pickup_time,b=(t.vehicle_type||t.vehicle||"").trim(),f=t.trip_type||"oneway",h=t.flight_number,y=t.notes,w=t.source_code,k=t.source_driver_id,$=t.passengers?Number(t.passengers):1,T=t.luggage,R="awaiting_sln_member",I="default_manual_dispatch",N=!1;k&&(R="awaiting_source_owner",I="source_driver_priority",N=!0);let L=(t.captured_by||t.source_code||"").trim().toUpperCase(),U=!!(L&&"PUBLIC_SITE"!==L),P=!!(g&&m)||!!t.pickup_at,x=!!(r&&n&&s&&u&&_&&b&&P),D=!!((u&&_||p&&l)&&b),H=U&&D,M=H?"offer_pending":x?"ready_for_dispatch":"needs_review";console.log("[webhook] booking classification:",JSON.stringify({isDriverCaptured:U,isDriverCapturedBypass:H,hasRequiredFields:x,hasPickupTime:P,hasDriverCapturedCriticalFields:D,initialBookingStatus:M,captured_by:L,pickup_date_meta:g||"(empty)",pickup_time_meta:m||"(empty)",pickup_at_meta:t.pickup_at||"(empty)"}));let W=new Date().toISOString(),F=new Date(Date.now()+12e4).toISOString(),B=g&&m?`${g}T${m}:00+00`:null,z=a;try{if(a){let e=null;try{let[t]=await E`
          SELECT status, dispatch_status, payment_status, assigned_driver_id, captured_by_driver_code
          FROM bookings WHERE id = ${a}::uuid LIMIT 1
        `;e=t?.status??null,console.log("[webhook] STEP2 pre-update state:",JSON.stringify({booking_id:a,status:t?.status,dispatch_status:t?.dispatch_status,payment_status:t?.payment_status,assigned_driver_id:t?.assigned_driver_id,captured_by_driver_code:t?.captured_by_driver_code}))}catch{}let r=await E`
        UPDATE bookings
        SET
          payment_status = 'paid',
          status = 'new',
          dispatch_status = ${M},
          booking_origin = ${t.tablet_code?"tablet":t.booking_origin||"website"},
          lead_source = ${t.tablet_code?"tablet":t.booking_origin||"website"},
          captured_by_driver_code = ${t.captured_by||t.source_code||"public_site"},
          paid_at = ${W}::timestamptz,
          stripe_session_id = ${i},
          stripe_payment_intent = ${o},
          client_id = ${c}::uuid,
          client_email = ${s},
          client_phone_raw = ${n},
          flight_number = ${h},
          notes = ${y},
          source_code = ${w},
          source_driver_id = ${k?`${k}::uuid`:null},
          passengers = ${$},
          luggage = ${T},
          trip_type = ${f},
          offer_expires_at = ${F}::timestamptz,
          offer_stage = ${"awaiting_source_owner"===R?"source_owner":"sln_member"},
          offer_status = 'pending',
          updated_at = NOW()
        WHERE id = ${a}::uuid
          AND status IN ('pending_payment', 'pending', 'pending_dispatch', 'new')
          AND payment_status != 'paid'
        RETURNING id, status, dispatch_status
      `;if(0===r.length){let[t]=await E`
          SELECT status, dispatch_status, payment_status, assigned_driver_id
          FROM bookings WHERE id = ${a}::uuid LIMIT 1
        `;console.log("[webhook] STEP2 UPDATE skipped — current state:",JSON.stringify({booking_id:a,pre_status:e,current_status:t?.status,current_dispatch:t?.dispatch_status,current_payment:t?.payment_status,current_assigned:t?.assigned_driver_id})),t?.payment_status==="paid"?console.log("[webhook] STEP2: booking already paid, proceeding to auto-assign check"):(console.warn("[webhook] STEP2 WARNING: booking not updated, unexpected status:",t?.status,"for booking:",a),await C(a,"webhook_step2_skipped",{pre_status:e,current_status:t?.status,current_payment:t?.payment_status,stripe_session:i}))}else console.log("[webhook] STEP2 SUCCESS: booking finalized:",JSON.stringify({booking_id:a,new_status:r[0]?.status,new_dispatch:r[0]?.dispatch_status}))}else z=(await E`
        INSERT INTO bookings (
          payment_status, status, dispatch_status,
          pickup_address, dropoff_address, pickup_zone, dropoff_zone, pickup_at,
          vehicle_type, total_price,
          client_id, client_email, client_phone_raw,
          flight_number, notes, source_code, source_driver_id,
          passengers, luggage, trip_type,
          booking_origin, lead_source, captured_by_driver_code,
          paid_at, stripe_session_id, stripe_payment_intent,
          offer_expires_at, offer_stage, offer_status,
          created_at, updated_at
        ) VALUES (
          'paid', 'new', ${M},
          ${u}, ${_}, ${p}, ${l},
          ${B||null}::timestamptz,
          ${b}, ${d},
          ${c}::uuid,
          ${s}, ${n},
          ${h}, ${y}, ${w},
          ${k?`${k}::uuid`:null},
          ${$}, ${T}, ${f},
          ${t.tablet_code?"tablet":t.booking_origin||"website"},
          ${t.tablet_code?"tablet":t.booking_origin||"website"},
          ${t.captured_by||t.source_code||"public_site"},
          ${W}::timestamptz, ${i}, ${o},
          ${F}::timestamptz,
          ${"awaiting_source_owner"===R?"source_owner":"sln_member"},
          'pending',
          NOW(), NOW()
        )
        RETURNING id
      `)[0].id}catch(e){console.error("[webhook] CRITICAL: booking finalization failed:",e.message),await C(z??"00000000-0000-0000-0000-000000000000","payment_finalization_failed",{stripe_session_id:i,error:e.message,client_email:s,fare:d});return}await C(z,"payment_confirmed",{stripe_session_id:i,payment_intent:o,amount:d,client_email:s}),await C(z,"booking_persisted",{booking_status:"new",payment_status:"paid"});try{let e=(0,v.resolveLeadOrigin)({ref_code:w??void 0,tablet_id:t.tablet_code??void 0,source_driver_id:k??void 0,booking_origin:t.booking_origin??void 0,captured_by:t.captured_by??void 0,utm_source:t.utm_source??void 0,utm_campaign:t.utm_campaign??void 0,utm_medium:t.utm_medium??void 0,landing_page:t.landing_page??void 0,extra_metadata:{stripe_session_id:i,client_email:s}});await (0,v.lockLeadOrigin)(z,e),console.log("[webhook] lead origin locked:",e.source_type,e.source_reference)}catch(e){console.error("[webhook] lead origin lock failed (non-blocking):",e.message)}await C(z,"dispatch_status_assigned",{dispatch_status:M,reason:I,source_code:w,source_driver_id:k,source_driver_eligible:N}),await A(z,"not_required",M,`payment_confirmed: ${I}`,{stripe_session_id:i,fare:d,source_code:w});let q=(t.captured_by||t.source_code||"").trim(),j=q.toUpperCase();if(!j||"PUBLIC_SITE"===j)try{let[e]=await E`
        SELECT captured_by_driver_code FROM bookings
        WHERE id = ${z}::uuid LIMIT 1
      `,t=(e?.captured_by_driver_code||"").trim().toUpperCase();t&&"PUBLIC_SITE"!==t&&(j=t,console.log("[webhook] auto-assign: resolved captured_by from DB:",j))}catch{}let K=(u??"").trim()||(p??"").trim(),V=(_??"").trim()||(l??"").trim();if((!K||!V)&&z)try{let[e]=await E`
        SELECT pickup_address, dropoff_address FROM bookings
        WHERE id = ${z}::uuid LIMIT 1
      `;!K&&e?.pickup_address&&(K=(e.pickup_address??"").trim(),console.log("[webhook] auto-assign: resolved pickup_address from DB:",K)),!V&&e?.dropoff_address&&(V=(e.dropoff_address??"").trim(),console.log("[webhook] auto-assign: resolved dropoff_address from DB:",V))}catch{}if(z&&j&&"PUBLIC_SITE"!==j&&K&&V){console.log("[webhook] auto-assign: attempting for captured_by_code:",j,"booking:",z);try{let[e]=await E`
        SELECT id, full_name, driver_status FROM drivers
        WHERE UPPER(TRIM(driver_code)) = ${j}
        LIMIT 1
      `;if(e)if("active"!==e.driver_status)console.warn("[webhook] auto-assign: driver found but not active:",j,"status:",e.driver_status),await C(z,"auto_assign_driver_not_active",{captured_by_code:j,driver_id:e.id,driver_status:e.driver_status});else{let t=await E`
          UPDATE bookings
          SET
            assigned_driver_id = ${e.id}::uuid,
            offered_driver_id  = ${e.id}::uuid,
            status             = 'assigned',
            dispatch_status    = 'offer_pending',
            updated_at         = NOW()
          WHERE id = ${z}::uuid
            AND assigned_driver_id IS NULL
          RETURNING id
        `;if(0===t.length)console.warn("[webhook] auto-assign: booking already assigned, skipping offer creation for",z);else{await E`
            INSERT INTO dispatch_offers (
              booking_id, driver_id, offer_round,
              is_source_offer, response, sent_at, expires_at
            ) VALUES (
              ${z}::uuid,
              ${e.id}::uuid,
              1,
              true,
              'pending',
              NOW(),
              NOW() + interval '15 minutes'  -- source-driver exclusive window
            )
            ON CONFLICT DO NOTHING
          `;try{await E`
              INSERT INTO commissions (
                booking_id, source_driver_id,
                executor_pct, source_pct, platform_pct,
                total_amount, status
              ) VALUES (
                ${z}::uuid,
                ${e.id}::uuid,
                65, 15, 20,
                (SELECT total_price FROM bookings WHERE id = ${z}::uuid LIMIT 1),
                'pending'
              )
              ON CONFLICT (booking_id) DO NOTHING
            `}catch(e){console.error("[webhook] commission row creation failed:",e.message)}await C(z,"auto_assigned_capturing_driver",{driver_id:e.id,driver_name:e.full_name,captured_by_code:j,dispatch_status:"offer_pending"}),console.log("[webhook] auto-assign SUCCESS: driver",e.full_name,"(",e.id,") assigned to booking",z)}}else console.warn("[webhook] auto-assign: driver not found for code:",j),await C(z,"auto_assign_driver_not_found",{captured_by_code:j,reason:"no_driver_matching_code"})}catch(e){console.error("[webhook] auto-assign capturing driver failed:",e.message),await C(z,"auto_assign_error",{captured_by_code:j,error:e.message})}}else console.log("[webhook] auto-assign: skipped —",JSON.stringify({reason:j&&"PUBLIC_SITE"!==j?K?"dropoff_location_empty_after_db_fallback":"pickup_location_empty_after_db_fallback":"no_valid_captured_by_code",raw_captured_by:q,resolved_captured_by:j,pickup_resolved:K||"(empty)",dropoff_resolved:V||"(empty)",booking:z}));try{let[e]=await E`
      SELECT status, dispatch_status, payment_status, assigned_driver_id, captured_by_driver_code
      FROM bookings WHERE id = ${z}::uuid LIMIT 1
    `;console.log("[webhook] FINAL STATE after auto-assign:",JSON.stringify({booking_id:z,status:e?.status,dispatch_status:e?.dispatch_status,payment_status:e?.payment_status,assigned_driver_id:e?.assigned_driver_id,captured_by:e?.captured_by_driver_code})),await C(z,"webhook_final_state",{status:e?.status,dispatch_status:e?.dispatch_status,payment_status:e?.payment_status,assigned_driver_id:e?.assigned_driver_id,captured_by:e?.captured_by_driver_code})}catch{}"awaiting_source_owner"===R&&k&&await S({bookingId:z,sourceDriverId:k,sourceCode:w,pickupLocation:u,dropoffLocation:_,pickupDate:g,pickupTime:m,vehicleType:b,fare:d,offerTimeoutSecs:120}),await O({bookingId:z,clientName:r,clientEmail:s,clientPhone:n,pickupLocation:u,dropoffLocation:_,pickupDate:g,pickupTime:m,vehicleType:b,fare:d,flightNumber:h,notes:y,dispatchStatus:R,sourceCode:w})}async function R(e){try{let t=await E`
      SELECT id, status, dispatch_status, source_code, source_driver_id
      FROM bookings
      WHERE stripe_payment_intent = ${e.id}
        AND status IN ('pending_payment', 'pending')
      LIMIT 1
    `;if(0===t.length)return;let a=t[0],i=new Date(Date.now()+6e4).toISOString();await E`
      UPDATE bookings
      SET
        payment_status = 'paid',
        status = 'new',
        dispatch_status = 'needs_review',
        booking_origin = 'public_website', -- This is a fallback, usually metadata is present
        paid_at = NOW(),
        offer_expires_at = ${i}::timestamptz,
        offer_status = 'pending',
        updated_at = NOW()
      WHERE id = ${a.id}::uuid
    `,await C(a.id,"payment_confirmed_via_intent",{payment_intent:e.id,previous_status:a.status}),console.log("[webhook] payment_intent.succeeded: updated booking",a.id)}catch(e){console.error("[webhook] payment_intent.succeeded handler failed:",e.message)}}async function S(e){let{bookingId:t,sourceDriverId:a,sourceCode:i,pickupLocation:o,dropoffLocation:s,pickupDate:r,pickupTime:n,vehicleType:d,fare:c,offerTimeoutSecs:u}=e;try{let e=await E`
      SELECT id, full_name, phone, email FROM drivers WHERE id = ${a}::uuid LIMIT 1
    `;if(0===e.length)return;let i=e[0],_=r&&n?`${r} at ${n}`:r||"To be confirmed";if(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&i.phone)try{let e=`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,a=`🚗 SLN OFFER — Booking #${t.slice(0,8).toUpperCase()}
Pickup: ${o}
Drop-off: ${s}
Date: ${_}
Vehicle: ${d}
Fare: $${c.toFixed(2)}
⏱ You have ${u}s to accept.
Reply YES to accept or NO to decline.`,r=new URLSearchParams({From:process.env.TWILIO_PHONE_NUMBER??"",To:i.phone,Body:a});(await fetch(e,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:r.toString()})).ok&&console.log("[webhook] SMS offer sent to driver",i.phone)}catch(e){console.error("[webhook] SMS notification failed:",e.message)}}catch(e){console.error("[webhook] triggerSourceOwnerOffer failed:",e.message)}}async function I(e){let t=e.id;console.log(`[webhook] account.updated: ${t}`);try{let a,i,o,s=await E`
      SELECT id, driver_code, payouts_enabled, payout_onboarding_status
      FROM drivers
      WHERE stripe_account_id = ${t}
      LIMIT 1
    `;if(0===s.length)return void console.log(`[webhook] account.updated: no driver found for account ${t}`);let r=s[0],n=!0===e.charges_enabled,d=!0===e.payouts_enabled,c=!0===e.details_submitted,u=e.requirements??{},_=(u.currently_due??[]).length>0,p=(u.past_due??[]).length>0,l=e.disabled_reason??null;d&&n&&!_&&!p?(a="connected",i="complete",o=!0):(l||p?(a="restricted",i="suspended"):c&&_?(a="restricted",i="pending"):c?(a="pending_verification",i="pending"):(a="pending_verification",i="not_started"),o=!1);let g=null,m=null,b=null,f=e.external_accounts?.data??[];if(f.length>0){let e=f[0];g=e.last4??null,m=e.bank_name??e.brand??null,b="card"===e.object?"debit_card":"bank_account"}await E`
      UPDATE drivers
      SET
        stripe_account_status    = ${a},
        payout_onboarding_status = ${i},
        payouts_enabled          = ${o},
        stripe_bank_last4        = ${g},
        stripe_bank_name         = ${m},
        stripe_bank_type         = ${b},
        payout_method            = ${"stripe"},
        updated_at               = NOW()
      WHERE id = ${r.id}
    `,console.log(`[webhook] account.updated: driver ${r.driver_code} → status=${a} payouts_enabled=${o}`);try{await E`
        INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
        VALUES (
          ${r.id}::uuid,
          'driver',
          'stripe_account_updated',
          ${JSON.stringify({stripeAccountId:t,stripeAccountStatus:a,payoutsEnabledFinal:o,payoutOnboardingStatus:i})},
          NOW()
        )
      `}catch{}}catch(e){console.error(`[webhook] account.updated handler failed: ${e.message}`)}}async function N(e){console.log(`[webhook] account.application.deauthorized: ${e.id}`)}async function O(e){console.log("[webhook] notifications triggered for booking",e.bookingId)}async function C(e,t,a){try{await E`
      INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
      VALUES (${e}::uuid, 'booking', ${t}, ${JSON.stringify(a)}, NOW())
    `}catch{}}async function A(e,t,a,i,o){try{await E`
      INSERT INTO dispatch_logs (booking_id, from_status, to_status, reason, metadata, created_at)
      VALUES (${e}::uuid, ${t}, ${a}, ${i}, ${JSON.stringify(o)}, NOW())
    `}catch{}}e.s(["POST",()=>$,"dynamic",0,"force-dynamic"],41619);var L=e.i(41619);let U=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/stripe/webhook/route",pathname:"/api/stripe/webhook",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/stripe/webhook/route.ts",nextConfigOutput:"",userland:L}),{workAsyncStorage:P,workUnitAsyncStorage:x,serverHooks:D}=U;function H(){return(0,i.patchFetch)({workAsyncStorage:P,workUnitAsyncStorage:x})}async function M(e,t,i){U.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/stripe/webhook/route";h=h.replace(/\/index$/,"")||"/";let y=await U.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!y)return t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve()),null;let{buildId:w,params:v,nextConfig:k,parsedUrl:E,isDraftMode:$,prerenderManifest:T,routerServerContext:R,isOnDemandRevalidate:S,revalidateOnlyGenerated:I,resolvedPathname:N,clientReferenceManifest:O,serverActionsManifest:C}=y,A=(0,n.normalizeAppPath)(h),L=!!(T.dynamicRoutes[A]||T.routes[N]),P=async()=>((null==R?void 0:R.render404)?await R.render404(e,t,E,!1):t.end("This page could not be found"),null);if(L&&!$){let e=!!T.routes[N],t=T.dynamicRoutes[A];if(t&&!1===t.fallback&&!e){if(k.experimental.adapterPath)return await P();throw new b.NoFallbackError}}let x=null;!L||U.isDev||$||(x="/index"===(x=N)?"/":x);let D=!0===U.isDev||!L,H=L&&!D;C&&O&&(0,r.setManifestsSingleton)({page:h,clientReferenceManifest:O,serverActionsManifest:C});let M=e.method||"GET",W=(0,s.getTracer)(),F=W.getActiveScopeSpan(),B={params:v,prerenderManifest:T,renderOpts:{experimental:{authInterrupts:!!k.experimental.authInterrupts},cacheComponents:!!k.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:k.cacheLife,waitUntil:i.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,i,o)=>U.onRequestError(e,t,i,o,R)},sharedContext:{buildId:w}},z=new d.NodeNextRequest(e),q=new d.NodeNextResponse(t),j=c.NextRequestAdapter.fromNodeNextRequest(z,(0,c.signalFromNodeResponse)(t));try{let r=async e=>U.handle(j,B).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=W.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=a.get("next.route");if(i){let t=`${M} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${h}`)}),n=!!(0,o.getRequestMeta)(e,"minimalMode"),d=async o=>{var s,d;let c=async({previousCacheEntry:a})=>{try{if(!n&&S&&I&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await r(o);e.fetchMetrics=B.renderOpts.fetchMetrics;let d=B.renderOpts.pendingWaitUntil;d&&i.waitUntil&&(i.waitUntil(d),d=void 0);let c=B.renderOpts.collectedTags;if(!L)return await (0,p.sendResponse)(z,q,s,B.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,l.toNodeOutgoingHttpHeaders)(s.headers);c&&(t[m.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==B.renderOpts.collectedRevalidate&&!(B.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&B.renderOpts.collectedRevalidate,i=void 0===B.renderOpts.collectedExpire||B.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:B.renderOpts.collectedExpire;return{value:{kind:f.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:i}}}}catch(t){throw(null==a?void 0:a.isStale)&&await U.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,_.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:S})},!1,R),t}},u=await U.handleResponse({req:e,nextConfig:k,cacheKey:x,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:I,responseGenerator:c,waitUntil:i.waitUntil,isMinimalMode:n});if(!L)return null;if((null==u||null==(s=u.value)?void 0:s.kind)!==f.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(d=u.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});n||t.setHeader("x-nextjs-cache",S?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),$&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let b=(0,l.fromNodeOutgoingHttpHeaders)(u.value.headers);return n&&L||b.delete(m.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||b.get("Cache-Control")||b.set("Cache-Control",(0,g.getCacheControlHeader)(u.cacheControl)),await (0,p.sendResponse)(z,q,new Response(u.value.body,{headers:b,status:u.value.status||200})),null};F?await d(F):await W.withPropagatedContext(e.headers,()=>W.trace(u.BaseServerSpan.handleRequest,{spanName:`${M} ${h}`,kind:s.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},d))}catch(t){if(t instanceof b.NoFallbackError||await U.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,_.getRevalidateReason)({isStaticGeneration:H,isOnDemandRevalidate:S})},!1,R),L)throw t;return await (0,p.sendResponse)(z,q,new Response(null,{status:500})),null}}e.s(["handler",()=>M,"patchFetch",()=>H,"routeModule",()=>U,"serverHooks",()=>D,"workAsyncStorage",()=>P,"workUnitAsyncStorage",()=>x],58205)}];

//# sourceMappingURL=80686_next_dist_esm_build_templates_app-route_cfea3af9.js.map