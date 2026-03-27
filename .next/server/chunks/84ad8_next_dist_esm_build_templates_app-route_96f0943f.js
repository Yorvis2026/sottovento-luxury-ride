module.exports=[80478,e=>{"use strict";var t=e.i(66574),r=e.i(58350),i=e.i(10732),o=e.i(12768),n=e.i(75089),s=e.i(11299),a=e.i(66012),d=e.i(12480),u=e.i(64629),c=e.i(2078),l=e.i(99591),p=e.i(65698),_=e.i(29809),f=e.i(64157),g=e.i(56534),h=e.i(93695);e.i(22981);var E=e.i(4706),v=e.i(16770),R=e.i(91501),w=e.i(27308);let m=(0,e.i(70485).neon)(process.env.DATABASE_URL);async function N(e){try{let t=await e.json();if(!t.offer_id&&!t.booking_id||!t.driver_id||!t.response)return v.NextResponse.json({error:"Missing required fields: (offer_id or booking_id), driver_id, response"},{status:400});if(!["accepted","declined"].includes(t.response))return v.NextResponse.json({error:"response must be 'accepted' or 'declined'"},{status:400});let r=null,i=!1;if(t.offer_id?r=(await m`
        SELECT * FROM dispatch_offers WHERE id = ${t.offer_id} LIMIT 1
      `)[0]??null:t.booking_id&&((r=(await m`
        SELECT * FROM dispatch_offers 
        WHERE booking_id = ${t.booking_id}::uuid
          AND driver_id = ${t.driver_id}::uuid
          AND response IN ('pending', 'timeout')
        ORDER BY created_at DESC LIMIT 1
      `)[0]??null)||"accepted"!==t.response||(await m`
          SELECT id, status, dispatch_status, assigned_driver_id
          FROM bookings
          WHERE id = ${t.booking_id}::uuid
            AND assigned_driver_id = ${t.driver_id}::uuid
            AND dispatch_status IN ('offer_pending', 'assigned')
            AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
          LIMIT 1
        `)[0]&&(i=!0,r={id:null,booking_id:t.booking_id,driver_id:t.driver_id,response:"pending",offer_round:1,is_source_offer:!0,expires_at:new Date(Date.now()+6e4).toISOString()},console.log("[respond-offer] no dispatch_offer row found — using booking-level fallback for",t.booking_id))),!r)return v.NextResponse.json({error:"Offer not found"},{status:404});if(r.driver_id!==t.driver_id)return v.NextResponse.json({error:"Unauthorized"},{status:403});if("pending"!==r.response&&"timeout"!==r.response&&!i)return v.NextResponse.json({error:"Offer already responded to",current_status:r.response},{status:409});let o=new Date,n=new Date(r.expires_at);if(t.offer_id&&o>n&&"accepted"===t.response&&!i)return r.id&&await m`
          UPDATE dispatch_offers
          SET response = 'timeout', responded_at = NOW()
          WHERE id = ${r.id}
        `,await b(r.booking_id,r.offer_round+1),v.NextResponse.json({error:"Offer has expired. Booking dispatched to network."},{status:410});let s=await w.db.bookings.findById(r.booking_id);if(!s)return v.NextResponse.json({error:"Booking not found"},{status:404});let a=o.toISOString();if("accepted"===t.response){await m`
        UPDATE dispatch_offers
        SET response = 'accepted', responded_at = ${a}::timestamptz
        WHERE booking_id = ${r.booking_id}::uuid
          AND response IN ('pending', 'timeout')
      `,r.id&&await m`
          UPDATE dispatch_offers
          SET response = 'accepted', responded_at = ${a}::timestamptz
          WHERE id = ${r.id}
        `,await m`
        UPDATE bookings
        SET
          assigned_driver_id    = ${t.driver_id}::uuid,
          offered_driver_id     = COALESCE(offered_driver_id, ${t.driver_id}::uuid),
          accepted_driver_id    = ${t.driver_id}::uuid,
          executor_driver_id    = ${t.driver_id}::uuid,
          offer_accepted        = true,
          offer_accepted_at     = ${a}::timestamptz,
          status                = 'accepted',
          dispatch_status       = 'assigned',
          updated_at            = NOW()
        WHERE id = ${s.id}
      `;let e=await (0,R.lockCommission)({booking_id:s.id,total_price:s.total_price,source_driver_id:s.source_driver_id??null,executor_driver_id:t.driver_id});await w.db.auditLogs.create({entity_type:"booking",entity_id:s.id,action:"offer_accepted",actor_type:"driver",actor_id:t.driver_id,new_data:{assigned_driver_id:t.driver_id,is_source_driver:r.is_source_offer,commission_model:e.commission_model,commission_locked:e.locked,platform_pct:e.platform_pct,source_pct:e.source_pct,executor_pct:e.executor_pct}});let i={booking_id:s.id,assigned_driver_id:t.driver_id,fallback_dispatched:!1,message:"Offer accepted. You are assigned to this booking."};return v.NextResponse.json(i)}{await m`
        UPDATE dispatch_offers
        SET response = 'declined', responded_at = ${a}::timestamptz
        WHERE booking_id = ${s.id}::uuid
          AND response IN ('pending', 'timeout')
      `,await m`
        UPDATE bookings
        SET
          assigned_driver_id = NULL,
          dispatch_status    = 'network_pool_pending',
          updated_at         = NOW()
        WHERE id = ${s.id}
      `,await b(s.id,r.offer_round+1),await w.db.auditLogs.create({entity_type:"booking",entity_id:s.id,action:"offer_declined",actor_type:"driver",actor_id:t.driver_id,new_data:{declined_by:t.driver_id,is_source_offer:r.is_source_offer,fallback_round:r.offer_round+1}});let e={booking_id:s.id,assigned_driver_id:null,fallback_dispatched:!0,message:"Offer declined. Booking dispatched to network drivers."};return v.NextResponse.json(e)}}catch(e){return console.error("[dispatch/respond-offer]",e),v.NextResponse.json({error:"Internal server error",detail:e?.message},{status:500})}}async function k(e){try{let{offer_id:t}=await e.json();if(!t)return v.NextResponse.json({error:"offer_id required"},{status:400});let r=(await m`
      SELECT * FROM dispatch_offers WHERE id = ${t} LIMIT 1
    `)[0]??null;if(!r||"pending"!==r.response)return v.NextResponse.json({message:"Offer already resolved"});return await m`
      UPDATE dispatch_offers
      SET response = 'timeout', responded_at = NOW()
      WHERE id = ${t}
    `,await m`
      UPDATE bookings
      SET
        assigned_driver_id = NULL,
        dispatch_status = 'offer_pending',
        updated_at = NOW()
      WHERE id = ${r.booking_id}::uuid
        AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show', 'accepted', 'en_route', 'arrived', 'in_trip')
    `,await b(r.booking_id,r.offer_round+1),v.NextResponse.json({message:"Offer timed out. Dispatched to network.",booking_id:r.booking_id})}catch(e){return console.error("[dispatch/timeout-offer]",e),v.NextResponse.json({error:e?.message},{status:500})}}async function b(e,t){try{await m`
      UPDATE bookings
      SET
        assigned_driver_id = NULL,
        dispatch_status = 'offer_pending',
        updated_at = NOW()
      WHERE id = ${e}::uuid
        AND status NOT IN ('completed', 'cancelled', 'archived', 'no_show')
    `,console.log(`[dispatch] release_to_network_pool — Booking ${e} — Round ${t}`)}catch(t){console.error(`[dispatch] release_to_network_pool error — Booking ${e}:`,t?.message)}}e.s(["POST",()=>N,"PUT",()=>k],35251);var T=e.i(35251);let x=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/dispatch/respond-offer/route",pathname:"/api/dispatch/respond-offer",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/dispatch/respond-offer/route.ts",nextConfigOutput:"",userland:T}),{workAsyncStorage:A,workUnitAsyncStorage:O,serverHooks:y}=x;function C(){return(0,i.patchFetch)({workAsyncStorage:A,workUnitAsyncStorage:O})}async function S(e,t,i){x.isDev&&(0,o.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let v="/api/dispatch/respond-offer/route";v=v.replace(/\/index$/,"")||"/";let R=await x.prepare(e,t,{srcPage:v,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve()),null;let{buildId:w,params:m,nextConfig:N,parsedUrl:k,isDraftMode:b,prerenderManifest:T,routerServerContext:A,isOnDemandRevalidate:O,revalidateOnlyGenerated:y,resolvedPathname:C,clientReferenceManifest:S,serverActionsManifest:D}=R,$=(0,a.normalizeAppPath)(v),I=!!(T.dynamicRoutes[$]||T.routes[C]),P=async()=>((null==A?void 0:A.render404)?await A.render404(e,t,k,!1):t.end("This page could not be found"),null);if(I&&!b){let e=!!T.routes[C],t=T.dynamicRoutes[$];if(t&&!1===t.fallback&&!e){if(N.experimental.adapterPath)return await P();throw new h.NoFallbackError}}let U=null;!I||x.isDev||b||(U="/index"===(U=C)?"/":U);let H=!0===x.isDev||!I,j=I&&!H;D&&S&&(0,s.setManifestsSingleton)({page:v,clientReferenceManifest:S,serverActionsManifest:D});let L=e.method||"GET",M=(0,n.getTracer)(),W=M.getActiveScopeSpan(),q={params:m,prerenderManifest:T,renderOpts:{experimental:{authInterrupts:!!N.experimental.authInterrupts},cacheComponents:!!N.cacheComponents,supportsDynamicResponse:H,incrementalCache:(0,o.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:N.cacheLife,waitUntil:i.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,i,o)=>x.onRequestError(e,t,i,o,A)},sharedContext:{buildId:w}},B=new d.NodeNextRequest(e),F=new d.NodeNextResponse(t),K=u.NextRequestAdapter.fromNodeNextRequest(B,(0,u.signalFromNodeResponse)(t));try{let s=async e=>x.handle(K,q).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=M.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==c.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=r.get("next.route");if(i){let t=`${L} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${L} ${v}`)}),a=!!(0,o.getRequestMeta)(e,"minimalMode"),d=async o=>{var n,d;let u=async({previousCacheEntry:r})=>{try{if(!a&&O&&y&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(o);e.fetchMetrics=q.renderOpts.fetchMetrics;let d=q.renderOpts.pendingWaitUntil;d&&i.waitUntil&&(i.waitUntil(d),d=void 0);let u=q.renderOpts.collectedTags;if(!I)return await (0,p.sendResponse)(B,F,n,q.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(n.headers);u&&(t[g.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==q.renderOpts.collectedRevalidate&&!(q.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&q.renderOpts.collectedRevalidate,i=void 0===q.renderOpts.collectedExpire||q.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:q.renderOpts.collectedExpire;return{value:{kind:E.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:i}}}}catch(t){throw(null==r?void 0:r.isStale)&&await x.onRequestError(e,t,{routerKind:"App Router",routePath:v,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:O})},!1,A),t}},c=await x.handleResponse({req:e,nextConfig:N,cacheKey:U,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:y,responseGenerator:u,waitUntil:i.waitUntil,isMinimalMode:a});if(!I)return null;if((null==c||null==(n=c.value)?void 0:n.kind)!==E.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(d=c.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});a||t.setHeader("x-nextjs-cache",O?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),b&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let h=(0,_.fromNodeOutgoingHttpHeaders)(c.value.headers);return a&&I||h.delete(g.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||h.get("Cache-Control")||h.set("Cache-Control",(0,f.getCacheControlHeader)(c.cacheControl)),await (0,p.sendResponse)(B,F,new Response(c.value.body,{headers:h,status:c.value.status||200})),null};W?await d(W):await M.withPropagatedContext(e.headers,()=>M.trace(c.BaseServerSpan.handleRequest,{spanName:`${L} ${v}`,kind:n.SpanKind.SERVER,attributes:{"http.method":L,"http.target":e.url}},d))}catch(t){if(t instanceof h.NoFallbackError||await x.onRequestError(e,t,{routerKind:"App Router",routePath:$,routeType:"route",revalidateReason:(0,l.getRevalidateReason)({isStaticGeneration:j,isOnDemandRevalidate:O})},!1,A),I)throw t;return await (0,p.sendResponse)(B,F,new Response(null,{status:500})),null}}e.s(["handler",()=>S,"patchFetch",()=>C,"routeModule",()=>x,"serverHooks",()=>y,"workAsyncStorage",()=>A,"workUnitAsyncStorage",()=>O],80478)}];

//# sourceMappingURL=84ad8_next_dist_esm_build_templates_app-route_96f0943f.js.map