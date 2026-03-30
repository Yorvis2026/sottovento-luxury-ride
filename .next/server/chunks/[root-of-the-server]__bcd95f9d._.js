module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},40090,e=>{"use strict";var t=e.i(50974);let r=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function i(){await r`
    CREATE TABLE IF NOT EXISTS vehicles (
      id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id                   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      make                        TEXT NOT NULL,
      model                       TEXT NOT NULL,
      year                        INTEGER,
      plate                       TEXT,
      color                       TEXT,
      vehicle_type                TEXT NOT NULL DEFAULT 'Sedan',
      -- Permit & compliance fields
      city_permit_status          TEXT NOT NULL DEFAULT 'pending',
      airport_permit_mco_status   TEXT NOT NULL DEFAULT 'pending',
      port_permit_canaveral_status TEXT NOT NULL DEFAULT 'pending',
      insurance_status            TEXT NOT NULL DEFAULT 'pending',
      registration_status         TEXT NOT NULL DEFAULT 'pending',
      vehicle_status              TEXT NOT NULL DEFAULT 'active',
      -- Dates
      verified_at                 TIMESTAMPTZ,
      expires_at                  TIMESTAMPTZ,
      -- Meta
      notes                       TEXT,
      is_primary                  BOOLEAN DEFAULT FALSE,
      created_at                  TIMESTAMPTZ DEFAULT NOW(),
      updated_at                  TIMESTAMPTZ DEFAULT NOW()
    )
  `,await r`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES vehicles(id),
      ADD COLUMN IF NOT EXISTS service_location_type TEXT DEFAULT ''
  `,await r`
    ALTER TABLE drivers
      ADD COLUMN IF NOT EXISTS primary_vehicle_id UUID REFERENCES vehicles(id)
  `}function a(e,t){let r=[],i=()=>{"active"!==e.vehicle_status&&r.push("inactive_vehicle"),"approved"!==e.city_permit_status&&r.push("city_permit_not_approved"),"approved"!==e.insurance_status&&r.push("insurance_expired"),"approved"!==e.registration_status&&r.push("registration_expired")};return"airport_pickup_mco"===t?(i(),"approved"!==e.airport_permit_mco_status&&r.push("missing_airport_permit_mco")):"port_pickup_canaveral"===t&&(i(),"approved"!==e.port_permit_canaveral_status&&r.push("missing_port_permit_canaveral")),{eligible:0===r.length,reasons:r}}function n(e){if(!e)return"";let t=e.toUpperCase();return"MCO"===t?"airport_pickup_mco":"PORT_CANAVERAL"===t?"port_pickup_canaveral":"SFB"===t?"airport_pickup_sfb":""}async function s(e){try{await i();let{searchParams:n}=new URL(e.url),s=n.get("driver_id"),o=n.get("eligible_for"),l=(s?await r`
          SELECT v.*, d.full_name AS driver_name, d.driver_code, d.driver_status
          FROM vehicles v
          JOIN drivers d ON v.driver_id = d.id
          WHERE v.driver_id = ${s}::uuid
          ORDER BY v.is_primary DESC, v.created_at DESC
        `:await r`
          SELECT v.*, d.full_name AS driver_name, d.driver_code, d.driver_status
          FROM vehicles v
          JOIN drivers d ON v.driver_id = d.id
          ORDER BY d.full_name, v.is_primary DESC, v.created_at DESC
        `).map(e=>{let t=a(e,"airport_pickup_mco"),r=a(e,"port_pickup_canaveral");return{...e,eligible_for_mco_pickup:t.eligible,eligible_for_port_pickup:r.eligible,mco_exclusion_reasons:t.reasons,port_exclusion_reasons:r.reasons}}),p="mco"===o?l.filter(e=>e.eligible_for_mco_pickup):"port_canaveral"===o?l.filter(e=>e.eligible_for_port_pickup):l,d={total:l.length,eligible_for_mco:l.filter(e=>e.eligible_for_mco_pickup).length,eligible_for_port:l.filter(e=>e.eligible_for_port_pickup).length,with_expired_permits:l.filter(e=>[e.city_permit_status,e.airport_permit_mco_status,e.port_permit_canaveral_status,e.insurance_status,e.registration_status].some(e=>"expired"===e)).length,with_pending_permits:l.filter(e=>[e.city_permit_status,e.airport_permit_mco_status,e.port_permit_canaveral_status,e.insurance_status,e.registration_status].some(e=>"pending"===e)).length,inactive:l.filter(e=>"active"!==e.vehicle_status).length};return t.NextResponse.json({vehicles:p,stats:d})}catch(e){return t.NextResponse.json({error:e.message},{status:500})}}async function o(e){try{await i();let{driver_id:n,company_id:s,make:o,model:l,year:p,plate:d,color:u,vehicle_type:c,city_permit_status:_,airport_permit_mco_status:v,port_permit_canaveral_status:m,insurance_status:E,registration_status:h,vehicle_status:T,verified_at:g,expires_at:R,notes:f,is_primary:y}=await e.json();if(!n&&!s)return t.NextResponse.json({error:"Either driver_id or company_id is required"},{status:400});if(!o||!l)return t.NextResponse.json({error:"make and model are required"},{status:400});y&&n&&await r`
        UPDATE vehicles SET is_primary = FALSE
        WHERE driver_id = ${n}::uuid
      `;let x=(await r`
      INSERT INTO vehicles (
        driver_id, company_id, make, model, year, plate, color, vehicle_type,
        city_permit_status, airport_permit_mco_status, port_permit_canaveral_status,
        insurance_status, registration_status, vehicle_status,
        verified_at, expires_at, notes, is_primary
      ) VALUES (
        ${n?`${n}::uuid`:null},
        ${s?`${s}::uuid`:null},
        ${o},
        ${l},
        ${p??null},
        ${d??null},
        ${u??null},
        ${c??"Sedan"},
        ${_??"pending"},
        ${v??"pending"},
        ${m??"pending"},
        ${E??"pending"},
        ${h??"pending"},
        ${T??"active"},
        ${g?`${g}::timestamptz`:null},
        ${R?`${R}::timestamptz`:null},
        ${f??null},
        ${y??!1}
      )
      RETURNING *
    `)[0];y&&x&&n&&await r`
        UPDATE drivers SET primary_vehicle_id = ${x.id}::uuid
        WHERE id = ${n}::uuid
      `;let N=a(x,"airport_pickup_mco"),A=a(x,"port_pickup_canaveral");try{await r`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'vehicle',
          ${x.id}::uuid,
          'vehicle_registered',
          'admin',
          ${JSON.stringify({driver_id:n??null,company_id:s??null,ownership:s?"company_owned":"driver_owned",make:o,model:l,year:p,plate:d,vehicle_type:c??"Sedan",city_permit_status:_??"pending",airport_permit_mco_status:v??"pending",port_permit_canaveral_status:m??"pending",insurance_status:E??"pending",registration_status:h??"pending",vehicle_status:T??"active",eligible_for_mco_pickup:N.eligible,eligible_for_port_pickup:A.eligible,timestamp:new Date().toISOString()})}::jsonb
        )
      `}catch{}if(s)try{await r`
          INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
          VALUES (
            'vehicle',
            ${x.id}::uuid,
            'vehicle_assigned_to_company',
            'admin',
            ${JSON.stringify({vehicle_id:x.id,company_id:s,driver_id:n??null,ownership:"company_owned",action:"company_relationship_created",timestamp:new Date().toISOString()})}::jsonb
          )
        `}catch{}return t.NextResponse.json({vehicle:{...x,eligible_for_mco_pickup:N.eligible,eligible_for_port_pickup:A.eligible,mco_exclusion_reasons:N.reasons,port_exclusion_reasons:A.reasons}},{status:201})}catch(e){return t.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>s,"POST",()=>o,"checkVehicleEligibility",()=>a,"deriveServiceLocationType",()=>n,"dynamic",0,"force-dynamic","ensureVehiclesTable",()=>i])},75457,e=>{"use strict";var t=e.i(39743),r=e.i(37383),i=e.i(16108),a=e.i(1266),n=e.i(10171),s=e.i(44067),o=e.i(7601),l=e.i(3083),p=e.i(88890),d=e.i(37886),u=e.i(63388),c=e.i(46601),_=e.i(24139),v=e.i(78785),m=e.i(2640),E=e.i(93695);e.i(46509);var h=e.i(56592),T=e.i(40090);let g=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/vehicles/route",pathname:"/api/admin/vehicles",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/vehicles/route.ts",nextConfigOutput:"",userland:T}),{workAsyncStorage:R,workUnitAsyncStorage:f,serverHooks:y}=g;function x(){return(0,i.patchFetch)({workAsyncStorage:R,workUnitAsyncStorage:f})}async function N(e,t,i){g.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let T="/api/admin/vehicles/route";T=T.replace(/\/index$/,"")||"/";let R=await g.prepare(e,t,{srcPage:T,multiZoneDraftMode:!1});if(!R)return t.statusCode=400,t.end("Bad Request"),null==i.waitUntil||i.waitUntil.call(i,Promise.resolve()),null;let{buildId:f,params:y,nextConfig:x,parsedUrl:N,isDraftMode:A,prerenderManifest:S,routerServerContext:w,isOnDemandRevalidate:O,revalidateOnlyGenerated:L,resolvedPathname:U,clientReferenceManifest:b,serverActionsManifest:C}=R,D=(0,o.normalizeAppPath)(T),k=!!(S.dynamicRoutes[D]||S.routes[U]),I=async()=>((null==w?void 0:w.render404)?await w.render404(e,t,N,!1):t.end("This page could not be found"),null);if(k&&!A){let e=!!S.routes[U],t=S.dynamicRoutes[D];if(t&&!1===t.fallback&&!e){if(x.experimental.adapterPath)return await I();throw new E.NoFallbackError}}let $=null;!k||g.isDev||A||($="/index"===($=U)?"/":$);let P=!0===g.isDev||!k,F=k&&!P;C&&b&&(0,s.setManifestsSingleton)({page:T,clientReferenceManifest:b,serverActionsManifest:C});let M=e.method||"GET",j=(0,n.getTracer)(),q=j.getActiveScopeSpan(),H={params:y,prerenderManifest:S,renderOpts:{experimental:{authInterrupts:!!x.experimental.authInterrupts},cacheComponents:!!x.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:x.cacheLife,waitUntil:i.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,i,a)=>g.onRequestError(e,t,i,a,w)},sharedContext:{buildId:f}},X=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),K=p.NextRequestAdapter.fromNodeNextRequest(X,(0,p.signalFromNodeResponse)(t));try{let s=async e=>g.handle(K,H).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=r.get("next.route");if(i){let t=`${M} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${T}`)}),o=!!(0,a.getRequestMeta)(e,"minimalMode"),l=async a=>{var n,l;let p=async({previousCacheEntry:r})=>{try{if(!o&&O&&L&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await s(a);e.fetchMetrics=H.renderOpts.fetchMetrics;let l=H.renderOpts.pendingWaitUntil;l&&i.waitUntil&&(i.waitUntil(l),l=void 0);let p=H.renderOpts.collectedTags;if(!k)return await (0,c.sendResponse)(X,B,n,H.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(n.headers);p&&(t[m.NEXT_CACHE_TAGS_HEADER]=p),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==H.renderOpts.collectedRevalidate&&!(H.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&H.renderOpts.collectedRevalidate,i=void 0===H.renderOpts.collectedExpire||H.renderOpts.collectedExpire>=m.INFINITE_CACHE?void 0:H.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:i}}}}catch(t){throw(null==r?void 0:r.isStale)&&await g.onRequestError(e,t,{routerKind:"App Router",routePath:T,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:F,isOnDemandRevalidate:O})},!1,w),t}},d=await g.handleResponse({req:e,nextConfig:x,cacheKey:$,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:S,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:L,responseGenerator:p,waitUntil:i.waitUntil,isMinimalMode:o});if(!k)return null;if((null==d||null==(n=d.value)?void 0:n.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",O?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let E=(0,_.fromNodeOutgoingHttpHeaders)(d.value.headers);return o&&k||E.delete(m.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||E.get("Cache-Control")||E.set("Cache-Control",(0,v.getCacheControlHeader)(d.cacheControl)),await (0,c.sendResponse)(X,B,new Response(d.value.body,{headers:E,status:d.value.status||200})),null};q?await l(q):await j.withPropagatedContext(e.headers,()=>j.trace(d.BaseServerSpan.handleRequest,{spanName:`${M} ${T}`,kind:n.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},l))}catch(t){if(t instanceof E.NoFallbackError||await g.onRequestError(e,t,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:F,isOnDemandRevalidate:O})},!1,w),k)throw t;return await (0,c.sendResponse)(X,B,new Response(null,{status:500})),null}}e.s(["handler",()=>N,"patchFetch",()=>x,"routeModule",()=>g,"serverHooks",()=>y,"workAsyncStorage",()=>R,"workUnitAsyncStorage",()=>f])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__bcd95f9d._.js.map