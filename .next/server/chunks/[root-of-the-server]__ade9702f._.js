module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},27308,e=>{"use strict";let t=(0,e.i(70485).neon)(process.env.DATABASE_URL);e.s(["db",0,{drivers:{findById:async e=>(await t`
      SELECT * FROM drivers WHERE id = ${e} LIMIT 1
    `)[0]??null,findByCode:async e=>(await t`
      SELECT * FROM drivers 
      WHERE driver_code = ${e} 
        AND driver_status = 'active'
      LIMIT 1
    `)[0]??null,findAvailable:async e=>await t`
      SELECT * FROM drivers
      WHERE driver_status = 'active'
        AND is_eligible = true
        AND ${e} = ANY(service_types)
        AND (license_expires_at IS NULL OR license_expires_at > NOW())
        AND (insurance_expires_at IS NULL OR insurance_expires_at > NOW())
      ORDER BY created_at ASC
    `},clients:{findById:async e=>(await t`
      SELECT * FROM clients WHERE id = ${e} LIMIT 1
    `)[0]??null,findByContact:async(e,r)=>e||r?(await t`
      SELECT * FROM clients
      WHERE (${e??null}::text IS NOT NULL AND phone = ${e??null})
         OR (${r??null}::text IS NOT NULL AND email = ${r??null})
      LIMIT 1
    `)[0]??null:null,create:async e=>(await t`
      INSERT INTO clients (
        full_name, phone, email,
        source_driver_id, source_type,
        tablet_id, company_id, ref_code,
        total_bookings, created_at, updated_at
      ) VALUES (
        ${e.full_name??null},
        ${e.phone??null},
        ${e.email??null},
        ${e.source_driver_id??null},
        ${e.source_type??"direct"},
        ${e.tablet_id??null},
        ${e.company_id??null},
        ${e.ref_code??null},
        0, NOW(), NOW()
      )
      RETURNING *
    `)[0],update:async(e,r)=>{await t`
      UPDATE clients
      SET
        total_bookings = COALESCE(${r.total_bookings??null}, total_bookings),
        last_booking_at = COALESCE(${r.last_booking_at??null}::timestamptz, last_booking_at),
        updated_at = NOW()
      WHERE id = ${e}
    `}},bookings:{create:async e=>(await t`
      INSERT INTO bookings (
        client_id, source_driver_id, service_type,
        pickup_address, dropoff_address,
        pickup_zone, dropoff_zone,
        vehicle_type,
        pickup_at,
        passengers, luggage, flight_number, notes,
        base_price, extras_price, total_price,
        stripe_session_id, payment_status, status,
        offer_timeout_secs, tracking_token, created_at, updated_at
      ) VALUES (
        ${e.client_id},
        ${e.source_driver_id??null},
        ${e.service_type},
        ${e.pickup_location??null},
        ${e.dropoff_location??null},
        ${e.pickup_zone??null},
        ${e.dropoff_zone??null},
        ${e.vehicle_type??"sedan"},
        ${e.pickup_at}::timestamptz,
        ${e.passengers??null},
        ${e.luggage??null},
        ${e.flight_number??null},
        ${e.notes??null},
        ${e.base_price},
        ${e.extras_price??0},
        ${e.total_price},
        ${e.stripe_session_id??null},
        ${e.payment_status??"pending"},
        ${e.status??"pending"},
        ${e.offer_timeout_secs??300},
        encode(gen_random_bytes(24), 'hex'),
        NOW(), NOW()
      )
      RETURNING *
    `)[0],update:async(e,r)=>{await t`
      UPDATE bookings
      SET
        status = COALESCE(${r.status??null}, status),
        assigned_driver_id = COALESCE(${r.assigned_driver_id??null}, assigned_driver_id),
        offer_sent_at = COALESCE(${r.offer_sent_at??null}::timestamptz, offer_sent_at),
        offer_accepted_at = COALESCE(${r.offer_accepted_at??null}::timestamptz, offer_accepted_at),
        completed_at = COALESCE(${r.completed_at??null}::timestamptz, completed_at),
        updated_at = NOW()
      WHERE id = ${e}
    `},findById:async e=>(await t`SELECT * FROM bookings WHERE id = ${e} LIMIT 1`)[0]??null},dispatchOffers:{create:async e=>(await t`
      INSERT INTO dispatch_offers (
        booking_id, driver_id, offer_round,
        is_source_offer, response, sent_at, expires_at
      ) VALUES (
        ${e.booking_id},
        ${e.driver_id},
        ${e.offer_round},
        ${e.is_source_offer},
        'pending',
        ${e.sent_at}::timestamptz,
        ${e.expires_at}::timestamptz
      )
      RETURNING *
    `)[0],findByBooking:async e=>await t`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
      ORDER BY offer_round ASC
    `,findPendingForBooking:async e=>(await t`
      SELECT * FROM dispatch_offers
      WHERE booking_id = ${e}
        AND response = 'pending'
      ORDER BY offer_round ASC
      LIMIT 1
    `)[0]??null,update:async(e,r)=>{await t`
      UPDATE dispatch_offers
      SET
        response = COALESCE(${r.status??null}, response),
        responded_at = COALESCE(${r.responded_at??null}::timestamptz, responded_at)
      WHERE id = ${e}
    `}},commissions:{create:async e=>(await t`
      INSERT INTO commissions (
        booking_id, source_driver_id, executor_driver_id,
        executor_pct, executor_amount,
        source_pct, source_amount,
        platform_pct, platform_amount,
        total_amount, status, created_at
      ) VALUES (
        ${e.booking_id},
        ${e.source_driver_id??null},
        ${e.executor_driver_id??null},
        ${e.executor_pct},
        ${parseFloat((e.total_amount*e.executor_pct/100).toFixed(2))},
        ${e.source_pct??null},
        ${e.source_amount??null},
        ${e.platform_pct},
        ${e.platform_amount},
        ${e.total_amount},
        ${e.status??"pending"},
        NOW()
      )
      RETURNING *
    `)[0],confirm:async(e,r)=>{await t`
      UPDATE commissions
      SET
        executor_driver_id = ${r},
        executor_amount = total_amount * executor_pct / 100,
        status = 'confirmed'
      WHERE booking_id = ${e}
    `}},auditLogs:{create:async e=>{await t`
      INSERT INTO audit_logs (
        entity_type, entity_id, action,
        actor_type, actor_id,
        old_data, new_data, created_at
      ) VALUES (
        ${e.entity_type},
        ${e.entity_id}::uuid,
        ${e.action},
        ${e.actor_type??"system"},
        ${e.actor_id??null}::uuid,
        ${e.old_data?JSON.stringify(e.old_data):null}::jsonb,
        ${e.new_data?JSON.stringify(e.new_data):null}::jsonb,
        NOW()
      )
    `}},sourceSummary:{findByDriverId:async e=>(await t`
      SELECT * FROM source_driver_summary
      WHERE driver_id = ${e}
      LIMIT 1
    `)[0]??null,findAll:async()=>await t`
      SELECT * FROM source_driver_summary
      ORDER BY lifetime_source_earnings DESC
    `},leads:{create:async e=>(await t`
      INSERT INTO leads (
        lead_source, tablet_id, driver_id, company_id,
        tablet_code, driver_code,
        full_name, phone, email, interested_package,
        status, created_at, updated_at
      ) VALUES (
        ${e.lead_source??"tablet"},
        ${e.tablet_id??null}::uuid,
        ${e.driver_id??null}::uuid,
        ${e.company_id??null}::uuid,
        ${e.tablet_code??null},
        ${e.driver_code??null},
        ${e.full_name??null},
        ${e.phone??null},
        ${e.email??null},
        ${e.interested_package??null},
        'new', NOW(), NOW()
      )
      RETURNING *
    `)[0]}}])},133,e=>{"use strict";var t=e.i(53099);function r(){let e=process.env.RESEND_API_KEY;return e?new t.Resend(e):(console.warn("[email] RESEND_API_KEY not set — emails will be skipped"),null)}let o=process.env.RESEND_FROM_EMAIL??"Sottovento Luxury Ride <noreply@sottoventoluxuryride.com>",a=process.env.ADMIN_EMAIL??"contact@sottoventoluxuryride.com";async function n(e){let t=r();if(!t)return;let n=e.destination?`New Quote Request — ${e.destination} — Sottovento`:`New Lead — Sottovento Luxury Ride`,i=`
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <p style="color:#b8960c;letter-spacing:0.3em;text-transform:uppercase;font-size:11px;margin:0;">Sottovento Luxury Ride</p>
        <h1 style="font-size:24px;font-weight:300;margin:8px 0;color:#fff;">New Quote Request</h1>
        ${e.destination?`<p style="color:#b8960c;font-size:16px;margin:4px 0;font-weight:600;">${e.destination}</p>`:""}
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${e.name?`<tr><td style="padding:8px 0;color:#888;font-size:13px;width:140px;">Name</td><td style="padding:8px 0;color:#fff;font-size:14px;">${e.name}</td></tr>`:""}
        ${e.phone?`<tr><td style="padding:8px 0;color:#888;font-size:13px;">Phone</td><td style="padding:8px 0;color:#fff;font-size:14px;"><a href="tel:${e.phone}" style="color:#b8960c;">${e.phone}</a></td></tr>`:""}
        ${e.email?`<tr><td style="padding:8px 0;color:#888;font-size:13px;">Email</td><td style="padding:8px 0;color:#fff;font-size:14px;"><a href="mailto:${e.email}" style="color:#b8960c;">${e.email}</a></td></tr>`:""}
        ${e.pickupDate?`<tr><td style="padding:8px 0;color:#888;font-size:13px;">Date</td><td style="padding:8px 0;color:#b8960c;font-size:14px;font-weight:600;">${e.pickupDate}</td></tr>`:""}
        ${e.pickupTime?`<tr><td style="padding:8px 0;color:#888;font-size:13px;">Time</td><td style="padding:8px 0;color:#b8960c;font-size:14px;font-weight:600;">${e.pickupTime}</td></tr>`:""}
        ${e.package?`<tr><td style="padding:8px 0;color:#888;font-size:13px;">Package</td><td style="padding:8px 0;color:#b8960c;font-size:14px;">${e.package}</td></tr>`:""}
        ${e.driverCode?`<tr><td style="padding:8px 0;color:#888;font-size:13px;">Driver Code</td><td style="padding:8px 0;color:#fff;font-size:14px;">${e.driverCode}</td></tr>`:""}
        ${e.tabletCode?`<tr><td style="padding:8px 0;color:#888;font-size:13px;">Tablet Code</td><td style="padding:8px 0;color:#fff;font-size:14px;">${e.tabletCode}</td></tr>`:""}
        <tr><td style="padding:8px 0;color:#888;font-size:13px;">Received</td><td style="padding:8px 0;color:#fff;font-size:14px;">${new Date().toLocaleString("en-US",{timeZone:"America/New_York"})} ET</td></tr>
      </table>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #222;text-align:center;">
        <a href="https://www.sottoventoluxuryride.com/admin" style="display:inline-block;padding:12px 24px;background:#b8960c;color:#000;text-decoration:none;border-radius:6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">View in Admin Panel</a>
      </div>
    </div>
  `;try{await t.emails.send({from:o,to:[a],subject:n,html:i})}catch(e){console.error("[email] sendLeadNotification failed:",e)}}async function i(e){let t=r();if(!t)return{success:!1,error:"Email service not configured"};let a=`Your Crown Moment — Sottovento Luxury Ride`,n=`
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0b0b0d;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
<tr><td align="center">
<table width="600" style="background:#111;border-radius:16px;overflow:hidden;">

<!-- HEADER -->
<tr>
<td align="center" style="padding:30px 30px 16px;">
  <div style="color:#D4AF37;letter-spacing:3px;font-size:12px;text-transform:uppercase;">Sottovento Luxury Ride</div>
  <h1 style="color:#fff;font-weight:300;font-size:28px;margin:8px 0;">Your Crown Moment</h1>
  <p style="color:#888;font-size:14px;margin:4px 0;">${e.frameName}</p>
</td>
</tr>

<!-- PHOTO -->
<tr>
<td align="center" style="padding:0 20px 8px;">
  <a href="${e.photoUrl??"#"}" target="_blank" style="display:block;">
    <img src="${e.photoUrl??"cid:crown-moment-photo"}" alt="Your Crown Moment"
      style="width:100%;max-width:540px;border-radius:12px;border:3px solid #D4AF37;display:block;cursor:pointer;" />
  </a>
</td>
</tr>

<!-- DOWNLOAD BUTTON -->
<tr>
<td align="center" style="padding:0 20px 20px;">
  <a href="${e.photoUrl??"#"}" download="sottovento-crown-moment.jpg" target="_blank"
    style="display:inline-block;margin-top:8px;padding:12px 28px;background:#222;color:#FFD700;
           border-radius:25px;text-decoration:none;font-weight:bold;font-size:14px;
           letter-spacing:1px;border:1px solid rgba(255,215,0,0.3);">
    &#11015; Download Your Photo
  </a>
  <p style="color:#666;font-size:11px;margin:10px 0 0;">Having trouble?
    <a href="${e.photoUrl??"#"}" target="_blank" style="color:#D4AF37;">Download your photo here</a>
  </p>
</td>
</tr>

<!-- EXCLUSIVE OFFER -->
<tr>
<td align="center" style="padding:0 20px 20px;">
  <div style="background:#1a1a1f;border-radius:12px;padding:24px;border:1px solid rgba(212,175,55,0.3);">
    <h2 style="color:#FFD700;margin:0 0 8px;font-size:20px;">&#127873; Exclusive Gift for You</h2>
    <p style="color:#ccc;margin:0 0 16px;font-size:15px;">Enjoy <strong>10% OFF</strong> your next ride with us</p>
    <div style="background:#0b0b0d;border-radius:8px;padding:14px 24px;display:inline-block;margin-bottom:8px;">
      <span style="font-size:22px;color:#fff;letter-spacing:3px;font-weight:bold;">CODE: CROWN10</span>
    </div>
    <p style="color:#666;font-size:12px;margin:8px 0 0;">Valid for your next booking. One use per customer.</p>
  </div>
</td>
</tr>

<!-- BOOK CTA -->
<tr>
<td align="center" style="padding:0 20px 20px;">
  <a href="https://www.sottoventoluxuryride.com/#booking"
    style="display:inline-block;background:linear-gradient(145deg,#FFD700,#C9A646);color:#000;font-weight:bold;
           font-size:15px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;
           padding:16px 40px;border-radius:50px;box-shadow:0 8px 25px rgba(255,215,120,0.35);">
    Book Your Next Ride
  </a>
</td>
</tr>

<!-- REFER A FRIEND -->
<tr>
<td align="center" style="padding:0 20px 20px;">
  <div style="background:#161618;border-radius:12px;padding:20px;border:1px solid rgba(255,255,255,0.06);">
    <p style="color:#aaa;font-size:14px;margin:0 0 12px;">
      &#128101; Share your experience and give a friend <strong style="color:#fff;">$10 OFF</strong> their first ride
    </p>
    <a href="https://www.sottoventoluxuryride.com"
      style="display:inline-block;color:#D4AF37;font-size:13px;letter-spacing:1px;text-transform:uppercase;
             text-decoration:none;border:1px solid rgba(212,175,55,0.4);padding:10px 28px;border-radius:50px;">
      Invite a Friend
    </a>
  </div>
</td>
</tr>

<!-- FOOTER -->
<tr>
<td align="center" style="padding:20px 20px 28px;border-top:1px solid #222;">
  <p style="color:#555;font-size:12px;margin:0 0 6px;">Thank you for choosing Sottovento Luxury Ride</p>
  <a href="https://www.sottoventoluxuryride.com" style="color:#D4AF37;font-size:12px;">sottoventoluxuryride.com</a>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>
  `,i=e.photoBase64.replace(/^data:image\/\w+;base64,/,""),s=Buffer.from(i,"base64"),d=e.photoUrl?[]:[{filename:"sottovento-crown-moment.jpg",content:s}];try{return await t.emails.send({from:o,to:[e.toEmail],subject:a,html:n,attachments:d}),{success:!0}}catch(e){return console.error("[email] sendCrownMomentPhoto failed:",e),{success:!1,error:String(e)}}}e.s(["sendCrownMomentPhoto",()=>i,"sendLeadNotification",()=>n])},32900,e=>{"use strict";var t=e.i(66574),r=e.i(58350),o=e.i(10732),a=e.i(12768),n=e.i(75089),i=e.i(11299),s=e.i(66012),d=e.i(12480),l=e.i(64629),p=e.i(2078),c=e.i(99591),u=e.i(65698),f=e.i(29809),x=e.i(64157),_=e.i(56534),g=e.i(93695);e.i(22981);var m=e.i(4706),y=e.i(16770),E=e.i(27308),h=e.i(133);async function v(e){try{let{full_name:t,phone:r,email:o,driver_code:a,tablet_code:n,lead_source:i="tablet",interested_package:s,destination:d,pickup_date:l,pickup_time:p}=await e.json();if(!t&&!r&&!o)return y.NextResponse.json({error:"At least one contact field required (full_name, phone, or email)"},{status:400});let c=null;if(a){let e=await E.db.drivers.findByCode(a);c=e?.id??null}let u=await E.db.leads.create({lead_source:i,driver_id:c,tablet_code:n??null,driver_code:a??null,full_name:t??null,phone:r??null,email:o??null,interested_package:s??d??null});return(0,h.sendLeadNotification)({name:t??void 0,phone:r??void 0,email:o??void 0,driverCode:a??void 0,tabletCode:n??void 0,package:s??void 0,destination:d??void 0,pickupDate:l??void 0,pickupTime:p??void 0}).catch(e=>console.error("[leads] email notification failed:",e)),y.NextResponse.json({success:!0,lead_id:u.id},{status:201})}catch(e){return console.error("[api/dispatch/leads]",e),y.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}e.s(["POST",()=>v],50425);var b=e.i(50425);let R=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/dispatch/leads/route",pathname:"/api/dispatch/leads",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/dispatch/leads/route.ts",nextConfigOutput:"",userland:b}),{workAsyncStorage:$,workUnitAsyncStorage:w,serverHooks:N}=R;function C(){return(0,o.patchFetch)({workAsyncStorage:$,workUnitAsyncStorage:w})}async function O(e,t,o){R.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let y="/api/dispatch/leads/route";y=y.replace(/\/index$/,"")||"/";let E=await R.prepare(e,t,{srcPage:y,multiZoneDraftMode:!1});if(!E)return t.statusCode=400,t.end("Bad Request"),null==o.waitUntil||o.waitUntil.call(o,Promise.resolve()),null;let{buildId:h,params:v,nextConfig:b,parsedUrl:$,isDraftMode:w,prerenderManifest:N,routerServerContext:C,isOnDemandRevalidate:O,revalidateOnlyGenerated:k,resolvedPathname:A,clientReferenceManifest:T,serverActionsManifest:S}=E,I=(0,s.normalizeAppPath)(y),L=!!(N.dynamicRoutes[I]||N.routes[A]),D=async()=>((null==C?void 0:C.render404)?await C.render404(e,t,$,!1):t.end("This page could not be found"),null);if(L&&!w){let e=!!N.routes[A],t=N.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(b.experimental.adapterPath)return await D();throw new g.NoFallbackError}}let z=null;!L||R.isDev||w||(z="/index"===(z=A)?"/":z);let U=!0===R.isDev||!L,F=L&&!U;S&&T&&(0,i.setManifestsSingleton)({page:y,clientReferenceManifest:T,serverActionsManifest:S});let P=e.method||"GET",M=(0,n.getTracer)(),H=M.getActiveScopeSpan(),W={params:v,prerenderManifest:N,renderOpts:{experimental:{authInterrupts:!!b.experimental.authInterrupts},cacheComponents:!!b.cacheComponents,supportsDynamicResponse:U,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:b.cacheLife,waitUntil:o.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,o,a)=>R.onRequestError(e,t,o,a,C)},sharedContext:{buildId:h}},j=new d.NodeNextRequest(e),B=new d.NodeNextResponse(t),q=l.NextRequestAdapter.fromNodeNextRequest(j,(0,l.signalFromNodeResponse)(t));try{let i=async e=>R.handle(q,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=M.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let o=r.get("next.route");if(o){let t=`${P} ${o}`;e.setAttributes({"next.route":o,"http.route":o,"next.span_name":t}),e.updateName(t)}else e.updateName(`${P} ${y}`)}),s=!!(0,a.getRequestMeta)(e,"minimalMode"),d=async a=>{var n,d;let l=async({previousCacheEntry:r})=>{try{if(!s&&O&&k&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(a);e.fetchMetrics=W.renderOpts.fetchMetrics;let d=W.renderOpts.pendingWaitUntil;d&&o.waitUntil&&(o.waitUntil(d),d=void 0);let l=W.renderOpts.collectedTags;if(!L)return await (0,u.sendResponse)(j,B,n,W.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(n.headers);l&&(t[_.NEXT_CACHE_TAGS_HEADER]=l),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,o=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=_.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:m.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:o}}}}catch(t){throw(null==r?void 0:r.isStale)&&await R.onRequestError(e,t,{routerKind:"App Router",routePath:y,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:F,isOnDemandRevalidate:O})},!1,C),t}},p=await R.handleResponse({req:e,nextConfig:b,cacheKey:z,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:N,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:k,responseGenerator:l,waitUntil:o.waitUntil,isMinimalMode:s});if(!L)return null;if((null==p||null==(n=p.value)?void 0:n.kind)!==m.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(d=p.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",O?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),w&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let g=(0,f.fromNodeOutgoingHttpHeaders)(p.value.headers);return s&&L||g.delete(_.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||g.get("Cache-Control")||g.set("Cache-Control",(0,x.getCacheControlHeader)(p.cacheControl)),await (0,u.sendResponse)(j,B,new Response(p.value.body,{headers:g,status:p.value.status||200})),null};H?await d(H):await M.withPropagatedContext(e.headers,()=>M.trace(p.BaseServerSpan.handleRequest,{spanName:`${P} ${y}`,kind:n.SpanKind.SERVER,attributes:{"http.method":P,"http.target":e.url}},d))}catch(t){if(t instanceof g.NoFallbackError||await R.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:F,isOnDemandRevalidate:O})},!1,C),L)throw t;return await (0,u.sendResponse)(j,B,new Response(null,{status:500})),null}}e.s(["handler",()=>O,"patchFetch",()=>C,"routeModule",()=>R,"serverHooks",()=>N,"workAsyncStorage",()=>$,"workUnitAsyncStorage",()=>w],32900)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__ade9702f._.js.map