module.exports=[87436,e=>{"use strict";var t=e.i(66574),a=e.i(58350),r=e.i(10732),i=e.i(12768),o=e.i(75089),n=e.i(11299),s=e.i(66012),d=e.i(12480),c=e.i(64629),u=e.i(2078),_=e.i(99591),l=e.i(65698),p=e.i(29809),g=e.i(64157),b=e.i(56534),m=e.i(93695);e.i(22981);var f=e.i(4706),h=e.i(16770),w=e.i(4333),y=e.i(70485);async function v(e,t){let a=(0,y.neon)(process.env.DATABASE_URL_UNPOOLED),[r]=await a`
    SELECT source_locked_at FROM bookings WHERE id = ${e}::uuid LIMIT 1
  `;if(!r)throw Error(`Booking ${e} not found`);if(r.source_locked_at)return{locked:!1,already_locked:!0};let i=new Date().toISOString();await a`
    UPDATE bookings
    SET
      source_type        = ${t.source_type},
      source_driver_id   = ${t.source_driver_id?`${t.source_driver_id}::uuid`:null},
      source_reference   = ${t.source_reference},
      source_tablet_id   = ${t.source_tablet_id},
      source_campaign_id = ${t.source_campaign_id},
      source_channel     = ${t.source_channel},
      source_metadata    = ${JSON.stringify(t.source_metadata)}::jsonb,
      source_locked_at   = ${i}::timestamptz,
      updated_at         = NOW()
    WHERE id = ${e}::uuid
      AND source_locked_at IS NULL
  `;try{await a`
      INSERT INTO lead_origin_snapshots (
        booking_id, source_type, source_driver_id,
        source_reference, source_tablet_id, source_campaign_id,
        source_channel, source_metadata, created_at
      ) VALUES (
        ${e}::uuid,
        ${t.source_type},
        ${t.source_driver_id?`${t.source_driver_id}::uuid`:null},
        ${t.source_reference},
        ${t.source_tablet_id},
        ${t.source_campaign_id},
        ${t.source_channel},
        ${JSON.stringify(t.source_metadata)}::jsonb,
        NOW()
      )
      ON CONFLICT (booking_id) DO NOTHING
    `}catch{console.warn("[lockLeadOrigin] snapshot insert failed for",e)}return{locked:!0}}let E=new w.default(process.env.STRIPE_SECRET_KEY??"sk_test_placeholder"),k=(0,y.neon)(process.env.DATABASE_URL_UNPOOLED);async function $(e){let t,a=await e.text(),r=e.headers.get("stripe-signature")??"";try{t=E.webhooks.constructEvent(a,r,process.env.STRIPE_WEBHOOK_SECRET??"")}catch(e){return console.error(`[webhook] signature verification failed: ${e.message}`),h.NextResponse.json({error:`Webhook Error: ${e.message}`},{status:400})}switch(console.log(`[webhook] received event: ${t.type}`),t.type){case"checkout.session.completed":await N(t.data.object);break;case"payment_intent.succeeded":await T(t.data.object);break;case"account.updated":await O(t.data.object);break;case"account.application.deauthorized":await I(t.data.object);break;default:console.log(`[webhook] unhandled event type: ${t.type}`)}return h.NextResponse.json({received:!0})}async function N(e){let t=e.metadata??{},a=t.booking_id,r=e.id,i="string"==typeof e.payment_intent?e.payment_intent:"",o=e.customer_details?.email||t.client_email,n=e.customer_details?.name||t.client_name,s=e.customer_details?.phone||t.client_phone,d=Number(t.fare||0),c=t.client_id,u=t.pickup_location,_=t.dropoff_location,l=t.pickup_zone,p=t.dropoff_zone,g=t.pickup_date,b=t.pickup_time,m=t.vehicle_type,f=t.trip_type||"oneway",h=t.flight_number,w=t.notes,y=t.source_code,E=t.source_driver_id,$=t.passengers?Number(t.passengers):1,N=t.luggage,T="awaiting_sln_member",O="default_manual_dispatch",I=!1;E&&(T="awaiting_source_owner",O="source_driver_priority",I=!0);let U=(t.captured_by||t.source_code||"").trim().toUpperCase(),L=!!(U&&"PUBLIC_SITE"!==U),W=!!(g&&b)||!!t.pickup_at,P=!!(n&&s&&o&&u&&_&&m&&W),D=!!(u&&_&&m),x=L&&D,M=x?"offer_pending":P?"ready_for_dispatch":"needs_review";console.log("[webhook] booking classification:",JSON.stringify({isDriverCaptured:L,isDriverCapturedBypass:x,hasRequiredFields:P,hasPickupTime:W,hasDriverCapturedCriticalFields:D,initialBookingStatus:M,captured_by:U,pickup_date_meta:g||"(empty)",pickup_time_meta:b||"(empty)",pickup_at_meta:t.pickup_at||"(empty)"}));let H=new Date().toISOString(),B=new Date(Date.now()+12e4).toISOString(),F=g&&b?`${g}T${b}:00+00`:null,q=a;try{if(a){let e=null;try{let[t]=await k`
          SELECT status, dispatch_status, payment_status, assigned_driver_id, captured_by_driver_code
          FROM bookings WHERE id = ${a}::uuid LIMIT 1
        `;e=t?.status??null,console.log("[webhook] STEP2 pre-update state:",JSON.stringify({booking_id:a,status:t?.status,dispatch_status:t?.dispatch_status,payment_status:t?.payment_status,assigned_driver_id:t?.assigned_driver_id,captured_by_driver_code:t?.captured_by_driver_code}))}catch{}let n=await k`
        UPDATE bookings
        SET
          payment_status = 'paid',
          status = 'new',
          dispatch_status = ${M},
          booking_origin = ${t.tablet_code?"tablet":t.booking_origin||"website"},
          lead_source = ${t.tablet_code?"tablet":t.booking_origin||"website"},
          captured_by_driver_code = ${t.captured_by||t.source_code||"public_site"},
          paid_at = ${H}::timestamptz,
          stripe_session_id = ${r},
          stripe_payment_intent = ${i},
          client_id = ${c}::uuid,
          client_email = ${o},
          client_phone_raw = ${s},
          flight_number = ${h},
          notes = ${w},
          source_code = ${y},
          source_driver_id = ${E?`${E}::uuid`:null},
          passengers = ${$},
          luggage = ${N},
          trip_type = ${f},
          offer_expires_at = ${B}::timestamptz,
          offer_stage = ${"awaiting_source_owner"===T?"source_owner":"sln_member"},
          offer_status = 'pending',
          updated_at = NOW()
        WHERE id = ${a}::uuid
          AND status IN ('pending_payment', 'pending', 'pending_dispatch', 'new')
          AND payment_status != 'paid'
        RETURNING id, status, dispatch_status
      `;if(0===n.length){let[t]=await k`
          SELECT status, dispatch_status, payment_status, assigned_driver_id
          FROM bookings WHERE id = ${a}::uuid LIMIT 1
        `;console.log("[webhook] STEP2 UPDATE skipped — current state:",JSON.stringify({booking_id:a,pre_status:e,current_status:t?.status,current_dispatch:t?.dispatch_status,current_payment:t?.payment_status,current_assigned:t?.assigned_driver_id})),t?.payment_status==="paid"?console.log("[webhook] STEP2: booking already paid, proceeding to auto-assign check"):(console.warn("[webhook] STEP2 WARNING: booking not updated, unexpected status:",t?.status,"for booking:",a),await C(a,"webhook_step2_skipped",{pre_status:e,current_status:t?.status,current_payment:t?.payment_status,stripe_session:r}))}else console.log("[webhook] STEP2 SUCCESS: booking finalized:",JSON.stringify({booking_id:a,new_status:n[0]?.status,new_dispatch:n[0]?.dispatch_status}))}else q=(await k`
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
          ${u}, ${_}, ${l}, ${p},
          ${F||null}::timestamptz,
          ${m}, ${d},
          ${c}::uuid,
          ${o}, ${s},
          ${h}, ${w}, ${y},
          ${E?`${E}::uuid`:null},
          ${$}, ${N}, ${f},
          ${t.tablet_code?"tablet":t.booking_origin||"website"},
          ${t.tablet_code?"tablet":t.booking_origin||"website"},
          ${t.captured_by||t.source_code||"public_site"},
          ${H}::timestamptz, ${r}, ${i},
          ${B}::timestamptz,
          ${"awaiting_source_owner"===T?"source_owner":"sln_member"},
          'pending',
          NOW(), NOW()
        )
        RETURNING id
      `)[0].id}catch(e){console.error("[webhook] CRITICAL: booking finalization failed:",e.message),await C(q??"00000000-0000-0000-0000-000000000000","payment_finalization_failed",{stripe_session_id:r,error:e.message,client_email:o,fare:d});return}await C(q,"payment_confirmed",{stripe_session_id:r,payment_intent:i,amount:d,client_email:o}),await C(q,"booking_persisted",{booking_status:"new",payment_status:"paid"});try{let e=function(e){let{ref_code:t,tablet_id:a,qr_code:r,campaign_id:i,partner_ref:o,source_driver_id:n,utm_source:s,utm_campaign:d,utm_medium:c,landing_page:u,referrer:_,booking_origin:l,captured_by:p,explicit_source_type:g,extra_metadata:b}=e,m={...u&&{landing_page:u},...s&&{utm_source:s},...d&&{utm_campaign:d},...c&&{utm_medium:c},..._&&{referrer:_},...a&&{tablet_id:a},...r&&{qr_code:r},...i&&{campaign_id:i},...o&&{partner_ref:o},...t&&{ref_code:t},...p&&{captured_by:p},...l&&{booking_origin:l},...b??{}};if(g&&"unknown"!==g)return function(e,t,a){let{ref_code:r,tablet_id:i,qr_code:o,campaign_id:n,partner_ref:s,source_driver_id:d}=t;return{source_type:e,source_driver_id:d??null,source_reference:({driver_direct:r??"DRIVER-DIRECT",tablet:i??"TABLET-UNKNOWN",qr:o??"QR-UNKNOWN",direct_web:"WEB-DIRECT",organic_web:"SEO-ORGANIC",manual_admin:"ADMIN-MANUAL",campaign:n??"CAMPAIGN-UNKNOWN",hotel_partner:s??"HOTEL-UNKNOWN",airbnb_partner:s??"AIRBNB-UNKNOWN",unknown:"UNKNOWN"})[e],source_tablet_id:"tablet"===e?i??null:null,source_campaign_id:"campaign"===e?n??null:null,source_channel:({driver_direct:"referral",tablet:"tablet",qr:"qr",direct_web:"website",organic_web:"organic",manual_admin:"admin",campaign:"campaign",hotel_partner:"partner",airbnb_partner:"partner",unknown:"unknown"})[e],source_metadata:a}}(g,e,m);if(t&&n)return{source_type:"driver_direct",source_driver_id:n,source_reference:t,source_tablet_id:null,source_campaign_id:null,source_channel:"referral",source_metadata:m};if(t&&!n)return{source_type:"driver_direct",source_driver_id:null,source_reference:t,source_tablet_id:null,source_campaign_id:null,source_channel:"referral",source_metadata:m};if(a||"tablet"===l){let e=a??("tablet"===l?"TABLET-UNKNOWN":null);return{source_type:"tablet",source_driver_id:n??null,source_reference:e??"TABLET-UNKNOWN",source_tablet_id:e,source_campaign_id:null,source_channel:"tablet",source_metadata:m}}if(r)return{source_type:"qr",source_driver_id:n??null,source_reference:r,source_tablet_id:null,source_campaign_id:null,source_channel:"qr",source_metadata:m};if(i||s&&d){let e=i??`${s?.toUpperCase()}-${d?.toUpperCase()}`;return{source_type:"campaign",source_driver_id:null,source_reference:e,source_tablet_id:null,source_campaign_id:i??e,source_channel:"campaign",source_metadata:m}}return o?{source_type:o.toLowerCase().includes("airbnb")?"airbnb_partner":"hotel_partner",source_driver_id:n??null,source_reference:o,source_tablet_id:null,source_campaign_id:null,source_channel:"partner",source_metadata:m}:"organic"===c||_&&/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\./.test(_)?{source_type:"organic_web",source_driver_id:null,source_reference:"SEO-ORGANIC",source_tablet_id:null,source_campaign_id:null,source_channel:"organic",source_metadata:m}:n||p?.trim()?p&&"public_site"!==p.trim().toLowerCase()?{source_type:"driver_direct",source_driver_id:n??null,source_reference:p.trim().toUpperCase(),source_tablet_id:null,source_campaign_id:null,source_channel:"referral",source_metadata:m}:{source_type:"unknown",source_driver_id:null,source_reference:"UNKNOWN",source_tablet_id:null,source_campaign_id:null,source_channel:"unknown",source_metadata:m}:{source_type:"direct_web",source_driver_id:null,source_reference:"WEB-DIRECT",source_tablet_id:null,source_campaign_id:null,source_channel:"website",source_metadata:m}}({ref_code:y??void 0,tablet_id:t.tablet_code??void 0,source_driver_id:E??void 0,booking_origin:t.booking_origin??void 0,captured_by:t.captured_by??void 0,utm_source:t.utm_source??void 0,utm_campaign:t.utm_campaign??void 0,utm_medium:t.utm_medium??void 0,landing_page:t.landing_page??void 0,extra_metadata:{stripe_session_id:r,client_email:o}});await v(q,e),console.log("[webhook] lead origin locked:",e.source_type,e.source_reference)}catch(e){console.error("[webhook] lead origin lock failed (non-blocking):",e.message)}await C(q,"dispatch_status_assigned",{dispatch_status:M,reason:O,source_code:y,source_driver_id:E,source_driver_eligible:I}),await A(q,"not_required",M,`payment_confirmed: ${O}`,{stripe_session_id:r,fare:d,source_code:y});let K=(t.captured_by||t.source_code||"").trim(),z=K.toUpperCase();if(!z||"PUBLIC_SITE"===z)try{let[e]=await k`
        SELECT captured_by_driver_code FROM bookings
        WHERE id = ${q}::uuid LIMIT 1
      `,t=(e?.captured_by_driver_code||"").trim().toUpperCase();t&&"PUBLIC_SITE"!==t&&(z=t,console.log("[webhook] auto-assign: resolved captured_by from DB:",z))}catch{}let j=(u??"").trim(),G=(_??"").trim();if((!j||!G)&&q)try{let[e]=await k`
        SELECT pickup_address, dropoff_address FROM bookings
        WHERE id = ${q}::uuid LIMIT 1
      `;!j&&e?.pickup_address&&(j=(e.pickup_address??"").trim(),console.log("[webhook] auto-assign: resolved pickup_address from DB:",j)),!G&&e?.dropoff_address&&(G=(e.dropoff_address??"").trim(),console.log("[webhook] auto-assign: resolved dropoff_address from DB:",G))}catch{}if(q&&z&&"PUBLIC_SITE"!==z&&j&&G){console.log("[webhook] auto-assign: attempting for captured_by_code:",z,"booking:",q);try{let[e]=await k`
        SELECT id, full_name, driver_status FROM drivers
        WHERE UPPER(TRIM(driver_code)) = ${z}
        LIMIT 1
      `;if(e)if("active"!==e.driver_status)console.warn("[webhook] auto-assign: driver found but not active:",z,"status:",e.driver_status),await C(q,"auto_assign_driver_not_active",{captured_by_code:z,driver_id:e.id,driver_status:e.driver_status});else{let t=await k`
          UPDATE bookings
          SET
            assigned_driver_id = ${e.id}::uuid,
            offered_driver_id  = ${e.id}::uuid,
            status             = 'assigned',
            dispatch_status    = 'offer_pending',
            updated_at         = NOW()
          WHERE id = ${q}::uuid
            AND assigned_driver_id IS NULL
          RETURNING id
        `;if(0===t.length)console.warn("[webhook] auto-assign: booking already assigned, skipping offer creation for",q);else{await k`
            INSERT INTO dispatch_offers (
              booking_id, driver_id, offer_round,
              is_source_offer, response, sent_at, expires_at
            ) VALUES (
              ${q}::uuid,
              ${e.id}::uuid,
              1,
              true,
              'pending',
              NOW(),
              NOW() + interval '15 minutes'  -- source-driver exclusive window
            )
            ON CONFLICT DO NOTHING
          `;try{await k`
              INSERT INTO commissions (
                booking_id, source_driver_id,
                executor_pct, source_pct, platform_pct,
                total_amount, status
              ) VALUES (
                ${q}::uuid,
                ${e.id}::uuid,
                65, 15, 20,
                (SELECT total_price FROM bookings WHERE id = ${q}::uuid LIMIT 1),
                'pending'
              )
              ON CONFLICT (booking_id) DO NOTHING
            `}catch(e){console.error("[webhook] commission row creation failed:",e.message)}await C(q,"auto_assigned_capturing_driver",{driver_id:e.id,driver_name:e.full_name,captured_by_code:z,dispatch_status:"offer_pending"}),console.log("[webhook] auto-assign SUCCESS: driver",e.full_name,"(",e.id,") assigned to booking",q)}}else console.warn("[webhook] auto-assign: driver not found for code:",z),await C(q,"auto_assign_driver_not_found",{captured_by_code:z,reason:"no_driver_matching_code"})}catch(e){console.error("[webhook] auto-assign capturing driver failed:",e.message),await C(q,"auto_assign_error",{captured_by_code:z,error:e.message})}}else console.log("[webhook] auto-assign: skipped —",JSON.stringify({reason:z&&"PUBLIC_SITE"!==z?j?"dropoff_location_empty_after_db_fallback":"pickup_location_empty_after_db_fallback":"no_valid_captured_by_code",raw_captured_by:K,resolved_captured_by:z,pickup_resolved:j||"(empty)",dropoff_resolved:G||"(empty)",booking:q}));try{let[e]=await k`
      SELECT status, dispatch_status, payment_status, assigned_driver_id, captured_by_driver_code
      FROM bookings WHERE id = ${q}::uuid LIMIT 1
    `;console.log("[webhook] FINAL STATE after auto-assign:",JSON.stringify({booking_id:q,status:e?.status,dispatch_status:e?.dispatch_status,payment_status:e?.payment_status,assigned_driver_id:e?.assigned_driver_id,captured_by:e?.captured_by_driver_code})),await C(q,"webhook_final_state",{status:e?.status,dispatch_status:e?.dispatch_status,payment_status:e?.payment_status,assigned_driver_id:e?.assigned_driver_id,captured_by:e?.captured_by_driver_code})}catch{}"awaiting_source_owner"===T&&E&&await R({bookingId:q,sourceDriverId:E,sourceCode:y,pickupLocation:u,dropoffLocation:_,pickupDate:g,pickupTime:b,vehicleType:m,fare:d,offerTimeoutSecs:120}),await S({bookingId:q,clientName:n,clientEmail:o,clientPhone:s,pickupLocation:u,dropoffLocation:_,pickupDate:g,pickupTime:b,vehicleType:m,fare:d,flightNumber:h,notes:w,dispatchStatus:T,sourceCode:y})}async function T(e){try{let t=await k`
      SELECT id, status, dispatch_status, source_code, source_driver_id
      FROM bookings
      WHERE stripe_payment_intent = ${e.id}
        AND status IN ('pending_payment', 'pending')
      LIMIT 1
    `;if(0===t.length)return;let a=t[0],r=new Date(Date.now()+6e4).toISOString();await k`
      UPDATE bookings
      SET
        payment_status = 'paid',
        status = 'new',
        dispatch_status = 'needs_review',
        booking_origin = 'public_website', -- This is a fallback, usually metadata is present
        paid_at = NOW(),
        offer_expires_at = ${r}::timestamptz,
        offer_status = 'pending',
        updated_at = NOW()
      WHERE id = ${a.id}::uuid
    `,await C(a.id,"payment_confirmed_via_intent",{payment_intent:e.id,previous_status:a.status}),console.log("[webhook] payment_intent.succeeded: updated booking",a.id)}catch(e){console.error("[webhook] payment_intent.succeeded handler failed:",e.message)}}async function R(e){let{bookingId:t,sourceDriverId:a,sourceCode:r,pickupLocation:i,dropoffLocation:o,pickupDate:n,pickupTime:s,vehicleType:d,fare:c,offerTimeoutSecs:u}=e;try{let e=await k`
      SELECT id, full_name, phone, email FROM drivers WHERE id = ${a}::uuid LIMIT 1
    `;if(0===e.length)return;let r=e[0],_=n&&s?`${n} at ${s}`:n||"To be confirmed";if(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&r.phone)try{let e=`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,a=`🚗 SLN OFFER — Booking #${t.slice(0,8).toUpperCase()}
Pickup: ${i}
Drop-off: ${o}
Date: ${_}
Vehicle: ${d}
Fare: $${c.toFixed(2)}
⏱ You have ${u}s to accept.
Reply YES to accept or NO to decline.`,n=new URLSearchParams({From:process.env.TWILIO_PHONE_NUMBER??"",To:r.phone,Body:a});(await fetch(e,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:n.toString()})).ok&&console.log("[webhook] SMS offer sent to driver",r.phone)}catch(e){console.error("[webhook] SMS notification failed:",e.message)}}catch(e){console.error("[webhook] triggerSourceOwnerOffer failed:",e.message)}}async function O(e){let t=e.id;console.log(`[webhook] account.updated: ${t}`);try{let a,r,i,o=await k`
      SELECT id, driver_code, payouts_enabled, payout_onboarding_status
      FROM drivers
      WHERE stripe_account_id = ${t}
      LIMIT 1
    `;if(0===o.length)return void console.log(`[webhook] account.updated: no driver found for account ${t}`);let n=o[0],s=!0===e.charges_enabled,d=!0===e.payouts_enabled,c=!0===e.details_submitted,u=e.requirements??{},_=(u.currently_due??[]).length>0,l=(u.past_due??[]).length>0,p=e.disabled_reason??null;d&&s&&!_&&!l?(a="connected",r="complete",i=!0):(p||l?(a="restricted",r="suspended"):c&&_?(a="restricted",r="pending"):c?(a="pending_verification",r="pending"):(a="pending_verification",r="not_started"),i=!1);let g=null,b=null,m=null,f=e.external_accounts?.data??[];if(f.length>0){let e=f[0];g=e.last4??null,b=e.bank_name??e.brand??null,m="card"===e.object?"debit_card":"bank_account"}await k`
      UPDATE drivers
      SET
        stripe_account_status    = ${a},
        payout_onboarding_status = ${r},
        payouts_enabled          = ${i},
        stripe_bank_last4        = ${g},
        stripe_bank_name         = ${b},
        stripe_bank_type         = ${m},
        payout_method            = ${"stripe"},
        updated_at               = NOW()
      WHERE id = ${n.id}
    `,console.log(`[webhook] account.updated: driver ${n.driver_code} → status=${a} payouts_enabled=${i}`);try{await k`
        INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
        VALUES (
          ${n.id}::uuid,
          'driver',
          'stripe_account_updated',
          ${JSON.stringify({stripeAccountId:t,stripeAccountStatus:a,payoutsEnabledFinal:i,payoutOnboardingStatus:r})},
          NOW()
        )
      `}catch{}}catch(e){console.error(`[webhook] account.updated handler failed: ${e.message}`)}}async function I(e){console.log(`[webhook] account.application.deauthorized: ${e.id}`)}async function S(e){console.log("[webhook] notifications triggered for booking",e.bookingId)}async function C(e,t,a){try{await k`
      INSERT INTO audit_logs (entity_id, entity_type, action, notes, created_at)
      VALUES (${e}::uuid, 'booking', ${t}, ${JSON.stringify(a)}, NOW())
    `}catch{}}async function A(e,t,a,r,i){try{await k`
      INSERT INTO dispatch_logs (booking_id, from_status, to_status, reason, metadata, created_at)
      VALUES (${e}::uuid, ${t}, ${a}, ${r}, ${JSON.stringify(i)}, NOW())
    `}catch{}}e.s(["POST",()=>$],23976);var U=e.i(23976);let L=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/stripe/webhook/route",pathname:"/api/stripe/webhook",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/stripe/webhook/route.ts",nextConfigOutput:"",userland:U}),{workAsyncStorage:W,workUnitAsyncStorage:P,serverHooks:D}=L;function x(){return(0,r.patchFetch)({workAsyncStorage:W,workUnitAsyncStorage:P})}async function M(e,t,r){L.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/stripe/webhook/route";h=h.replace(/\/index$/,"")||"/";let w=await L.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!w)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:y,params:v,nextConfig:E,parsedUrl:k,isDraftMode:$,prerenderManifest:N,routerServerContext:T,isOnDemandRevalidate:R,revalidateOnlyGenerated:O,resolvedPathname:I,clientReferenceManifest:S,serverActionsManifest:C}=w,A=(0,s.normalizeAppPath)(h),U=!!(N.dynamicRoutes[A]||N.routes[I]),W=async()=>((null==T?void 0:T.render404)?await T.render404(e,t,k,!1):t.end("This page could not be found"),null);if(U&&!$){let e=!!N.routes[I],t=N.dynamicRoutes[A];if(t&&!1===t.fallback&&!e){if(E.experimental.adapterPath)return await W();throw new m.NoFallbackError}}let P=null;!U||L.isDev||$||(P="/index"===(P=I)?"/":P);let D=!0===L.isDev||!U,x=U&&!D;C&&S&&(0,n.setManifestsSingleton)({page:h,clientReferenceManifest:S,serverActionsManifest:C});let M=e.method||"GET",H=(0,o.getTracer)(),B=H.getActiveScopeSpan(),F={params:v,prerenderManifest:N,renderOpts:{experimental:{authInterrupts:!!E.experimental.authInterrupts},cacheComponents:!!E.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,i.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:E.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,i)=>L.onRequestError(e,t,r,i,T)},sharedContext:{buildId:y}},q=new d.NodeNextRequest(e),K=new d.NodeNextResponse(t),z=c.NextRequestAdapter.fromNodeNextRequest(q,(0,c.signalFromNodeResponse)(t));try{let n=async e=>L.handle(z,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=H.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${M} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${h}`)}),s=!!(0,i.getRequestMeta)(e,"minimalMode"),d=async i=>{var o,d;let c=async({previousCacheEntry:a})=>{try{if(!s&&R&&O&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await n(i);e.fetchMetrics=F.renderOpts.fetchMetrics;let d=F.renderOpts.pendingWaitUntil;d&&r.waitUntil&&(r.waitUntil(d),d=void 0);let c=F.renderOpts.collectedTags;if(!U)return await (0,l.sendResponse)(q,K,o,F.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(o.headers);c&&(t[b.NEXT_CACHE_TAGS_HEADER]=c),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=b.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,r=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=b.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:f.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await L.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,_.getRevalidateReason)({isStaticGeneration:x,isOnDemandRevalidate:R})},!1,T),t}},u=await L.handleResponse({req:e,nextConfig:E,cacheKey:P,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:R,revalidateOnlyGenerated:O,responseGenerator:c,waitUntil:r.waitUntil,isMinimalMode:s});if(!U)return null;if((null==u||null==(o=u.value)?void 0:o.kind)!==f.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(d=u.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",R?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),$&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(u.value.headers);return s&&U||m.delete(b.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,g.getCacheControlHeader)(u.cacheControl)),await (0,l.sendResponse)(q,K,new Response(u.value.body,{headers:m,status:u.value.status||200})),null};B?await d(B):await H.withPropagatedContext(e.headers,()=>H.trace(u.BaseServerSpan.handleRequest,{spanName:`${M} ${h}`,kind:o.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},d))}catch(t){if(t instanceof m.NoFallbackError||await L.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,_.getRevalidateReason)({isStaticGeneration:x,isOnDemandRevalidate:R})},!1,T),U)throw t;return await (0,l.sendResponse)(q,K,new Response(null,{status:500})),null}}e.s(["handler",()=>M,"patchFetch",()=>x,"routeModule",()=>L,"serverHooks",()=>D,"workAsyncStorage",()=>W,"workUnitAsyncStorage",()=>P],87436)}];

//# sourceMappingURL=84ad8_next_dist_esm_build_templates_app-route_416bde35.js.map