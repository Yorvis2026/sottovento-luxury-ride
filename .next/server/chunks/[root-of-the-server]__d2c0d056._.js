module.exports=[93695,(e,t,i)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,i)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,i)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,i)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,i)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,i)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},40090,e=>{"use strict";var t=e.i(50974);let i=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function r(){await i`
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
  `,await i`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS assigned_vehicle_id UUID REFERENCES vehicles(id),
      ADD COLUMN IF NOT EXISTS service_location_type TEXT DEFAULT ''
  `,await i`
    ALTER TABLE drivers
      ADD COLUMN IF NOT EXISTS primary_vehicle_id UUID REFERENCES vehicles(id)
  `}function a(e,t){let i=[],r=()=>{"active"!==e.vehicle_status&&i.push("inactive_vehicle"),"approved"!==e.city_permit_status&&i.push("city_permit_not_approved"),"approved"!==e.insurance_status&&i.push("insurance_expired"),"approved"!==e.registration_status&&i.push("registration_expired")};return"airport_pickup_mco"===t?(r(),"approved"!==e.airport_permit_mco_status&&i.push("missing_airport_permit_mco")):"port_pickup_canaveral"===t&&(r(),"approved"!==e.port_permit_canaveral_status&&i.push("missing_port_permit_canaveral")),{eligible:0===i.length,reasons:i}}function s(e){if(!e)return"";let t=e.toUpperCase();return"MCO"===t?"airport_pickup_mco":"PORT_CANAVERAL"===t?"port_pickup_canaveral":"SFB"===t?"airport_pickup_sfb":""}async function n(e){try{await r();let{searchParams:s}=new URL(e.url),n=s.get("driver_id"),o=s.get("eligible_for"),l=(n?await i`
          SELECT v.*, d.full_name AS driver_name, d.driver_code, d.driver_status
          FROM vehicles v
          JOIN drivers d ON v.driver_id = d.id
          WHERE v.driver_id = ${n}::uuid
          ORDER BY v.is_primary DESC, v.created_at DESC
        `:await i`
          SELECT v.*, d.full_name AS driver_name, d.driver_code, d.driver_status
          FROM vehicles v
          JOIN drivers d ON v.driver_id = d.id
          ORDER BY d.full_name, v.is_primary DESC, v.created_at DESC
        `).map(e=>{let t=a(e,"airport_pickup_mco"),i=a(e,"port_pickup_canaveral");return{...e,eligible_for_mco_pickup:t.eligible,eligible_for_port_pickup:i.eligible,mco_exclusion_reasons:t.reasons,port_exclusion_reasons:i.reasons}}),p="mco"===o?l.filter(e=>e.eligible_for_mco_pickup):"port_canaveral"===o?l.filter(e=>e.eligible_for_port_pickup):l,u={total:l.length,eligible_for_mco:l.filter(e=>e.eligible_for_mco_pickup).length,eligible_for_port:l.filter(e=>e.eligible_for_port_pickup).length,with_expired_permits:l.filter(e=>[e.city_permit_status,e.airport_permit_mco_status,e.port_permit_canaveral_status,e.insurance_status,e.registration_status].some(e=>"expired"===e)).length,with_pending_permits:l.filter(e=>[e.city_permit_status,e.airport_permit_mco_status,e.port_permit_canaveral_status,e.insurance_status,e.registration_status].some(e=>"pending"===e)).length,inactive:l.filter(e=>"active"!==e.vehicle_status).length};return t.NextResponse.json({vehicles:p,stats:u})}catch(e){return t.NextResponse.json({error:e.message},{status:500})}}async function o(e){try{await r();let{driver_id:s,company_id:n,make:o,model:l,year:p,plate:u,color:c,vehicle_type:d,city_permit_status:_,airport_permit_mco_status:E,port_permit_canaveral_status:v,insurance_status:m,registration_status:h,vehicle_status:g,verified_at:T,expires_at:y,notes:f,is_primary:R}=await e.json();if(!s&&!n)return t.NextResponse.json({error:"Either driver_id or company_id is required"},{status:400});if(!o||!l)return t.NextResponse.json({error:"make and model are required"},{status:400});R&&s&&await i`
        UPDATE vehicles SET is_primary = FALSE
        WHERE driver_id = ${s}::uuid
      `;let N=(await i`
      INSERT INTO vehicles (
        driver_id, company_id, make, model, year, plate, color, vehicle_type,
        city_permit_status, airport_permit_mco_status, port_permit_canaveral_status,
        insurance_status, registration_status, vehicle_status,
        verified_at, expires_at, notes, is_primary
      ) VALUES (
        ${s?`${s}::uuid`:null},
        ${n?`${n}::uuid`:null},
        ${o},
        ${l},
        ${p??null},
        ${u??null},
        ${c??null},
        ${d??"Sedan"},
        ${_??"pending"},
        ${E??"pending"},
        ${v??"pending"},
        ${m??"pending"},
        ${h??"pending"},
        ${g??"active"},
        ${T?`${T}::timestamptz`:null},
        ${y?`${y}::timestamptz`:null},
        ${f??null},
        ${R??!1}
      )
      RETURNING *
    `)[0];R&&N&&s&&await i`
        UPDATE drivers SET primary_vehicle_id = ${N.id}::uuid
        WHERE id = ${s}::uuid
      `;let x=a(N,"airport_pickup_mco"),S=a(N,"port_pickup_canaveral");try{await i`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'vehicle',
          ${N.id}::uuid,
          'vehicle_registered',
          'admin',
          ${JSON.stringify({driver_id:s??null,company_id:n??null,ownership:n?"company_owned":"driver_owned",make:o,model:l,year:p,plate:u,vehicle_type:d??"Sedan",city_permit_status:_??"pending",airport_permit_mco_status:E??"pending",port_permit_canaveral_status:v??"pending",insurance_status:m??"pending",registration_status:h??"pending",vehicle_status:g??"active",eligible_for_mco_pickup:x.eligible,eligible_for_port_pickup:S.eligible,timestamp:new Date().toISOString()})}::jsonb
        )
      `}catch{}if(n)try{await i`
          INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
          VALUES (
            'vehicle',
            ${N.id}::uuid,
            'vehicle_assigned_to_company',
            'admin',
            ${JSON.stringify({vehicle_id:N.id,company_id:n,driver_id:s??null,ownership:"company_owned",action:"company_relationship_created",timestamp:new Date().toISOString()})}::jsonb
          )
        `}catch{}return t.NextResponse.json({vehicle:{...N,eligible_for_mco_pickup:x.eligible,eligible_for_port_pickup:S.eligible,mco_exclusion_reasons:x.reasons,port_exclusion_reasons:S.reasons}},{status:201})}catch(e){return t.NextResponse.json({error:e.message},{status:500})}}e.s(["GET",()=>n,"POST",()=>o,"checkVehicleEligibility",()=>a,"deriveServiceLocationType",()=>s,"dynamic",0,"force-dynamic","ensureVehiclesTable",()=>r])},62709,e=>{"use strict";var t=e.i(39743),i=e.i(37383),r=e.i(16108),a=e.i(1266),s=e.i(10171),n=e.i(44067),o=e.i(7601),l=e.i(3083),p=e.i(88890),u=e.i(37886),c=e.i(63388),d=e.i(46601),_=e.i(24139),E=e.i(78785),v=e.i(2640),m=e.i(93695);e.i(46509);var h=e.i(56592),g=e.i(50974),T=e.i(57747),y=e.i(40090);let f=(0,T.neon)(process.env.DATABASE_URL_UNPOOLED);async function R(e,{params:t}){try{let{id:e}=t,i=await f`
      SELECT v.*, d.full_name AS driver_name, d.driver_code, d.driver_status
      FROM vehicles v
      JOIN drivers d ON v.driver_id = d.id
      WHERE v.id = ${e}::uuid
      LIMIT 1
    `;if(0===i.length)return g.NextResponse.json({error:"Vehicle not found"},{status:404});let r=i[0],a=(0,y.checkVehicleEligibility)(r,"airport_pickup_mco"),s=(0,y.checkVehicleEligibility)(r,"port_pickup_canaveral");return g.NextResponse.json({vehicle:{...r,eligible_for_mco_pickup:a.eligible,eligible_for_port_pickup:s.eligible,mco_exclusion_reasons:a.reasons,port_exclusion_reasons:s.reasons}})}catch(e){return g.NextResponse.json({error:e.message},{status:500})}}async function N(e,{params:t}){try{let{id:i}=t,r=await e.json(),a=["approved","pending","expired","rejected"],s=["active","inactive","suspended"];for(let e of["city_permit_status","airport_permit_mco_status","port_permit_canaveral_status","insurance_status","registration_status"])if(r[e]&&!a.includes(r[e]))return g.NextResponse.json({error:`Invalid value for ${e}: ${r[e]}. Must be one of: ${a.join(", ")}`},{status:400});if(r.vehicle_status&&!s.includes(r.vehicle_status))return g.NextResponse.json({error:`Invalid vehicle_status: ${r.vehicle_status}. Must be one of: ${s.join(", ")}`},{status:400});let n=await f`SELECT * FROM vehicles WHERE id = ${i}::uuid LIMIT 1`;if(0===n.length)return g.NextResponse.json({error:"Vehicle not found"},{status:404});let o=n[0];r.is_primary&&await f`
        UPDATE vehicles SET is_primary = FALSE
        WHERE driver_id = ${o.driver_id}::uuid AND id != ${i}::uuid
      `;let l={};for(let e of["city_permit_status","airport_permit_mco_status","port_permit_canaveral_status","insurance_status","registration_status","vehicle_status","verified_at","expires_at","notes","is_primary","make","model","year","plate","color","vehicle_type"])void 0!==r[e]&&(l[e]=r[e]);l.updated_at=new Date().toISOString();let p=(await f`
      UPDATE vehicles SET
        city_permit_status           = COALESCE(${l.city_permit_status??null}, city_permit_status),
        airport_permit_mco_status    = COALESCE(${l.airport_permit_mco_status??null}, airport_permit_mco_status),
        port_permit_canaveral_status = COALESCE(${l.port_permit_canaveral_status??null}, port_permit_canaveral_status),
        insurance_status             = COALESCE(${l.insurance_status??null}, insurance_status),
        registration_status          = COALESCE(${l.registration_status??null}, registration_status),
        vehicle_status               = COALESCE(${l.vehicle_status??null}, vehicle_status),
        verified_at                  = COALESCE(${l.verified_at?`${l.verified_at}::timestamptz`:null}, verified_at),
        expires_at                   = COALESCE(${l.expires_at?`${l.expires_at}::timestamptz`:null}, expires_at),
        notes                        = COALESCE(${l.notes??null}, notes),
        is_primary                   = COALESCE(${l.is_primary??null}, is_primary),
        make                         = COALESCE(${l.make??null}, make),
        model                        = COALESCE(${l.model??null}, model),
        year                         = COALESCE(${l.year??null}, year),
        plate                        = COALESCE(${l.plate??null}, plate),
        color                        = COALESCE(${l.color??null}, color),
        vehicle_type                 = COALESCE(${l.vehicle_type??null}, vehicle_type),
        updated_at                   = NOW()
      WHERE id = ${i}::uuid
      RETURNING *
    `)[0];r.is_primary&&await f`
        UPDATE drivers SET primary_vehicle_id = ${i}::uuid
        WHERE id = ${o.driver_id}::uuid
      `;let u=(0,y.checkVehicleEligibility)(p,"airport_pickup_mco"),c=(0,y.checkVehicleEligibility)(p,"port_pickup_canaveral"),d=Object.keys(l).filter(e=>"updated_at"!==e&&String(l[e])!==String(o[e]));try{await f`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'vehicle',
          ${i}::uuid,
          'vehicle_permit_updated',
          'admin',
          ${JSON.stringify({changed_fields:d,previous:Object.fromEntries(d.map(e=>[e,o[e]])),updated:Object.fromEntries(d.map(e=>[e,l[e]])),eligible_for_mco_pickup:u.eligible,eligible_for_port_pickup:c.eligible,mco_exclusion_reasons:u.reasons,port_exclusion_reasons:c.reasons,timestamp:new Date().toISOString()})}::jsonb
        )
      `}catch{}return g.NextResponse.json({vehicle:{...p,eligible_for_mco_pickup:u.eligible,eligible_for_port_pickup:c.eligible,mco_exclusion_reasons:u.reasons,port_exclusion_reasons:c.reasons}})}catch(e){return g.NextResponse.json({error:e.message},{status:500})}}async function x(e,{params:t}){try{let{id:e}=t,i=await f`
      DELETE FROM vehicles WHERE id = ${e}::uuid RETURNING id, driver_id, make, model, plate
    `;if(0===i.length)return g.NextResponse.json({error:"Vehicle not found"},{status:404});try{await f`
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, new_data)
        VALUES (
          'vehicle', ${e}::uuid, 'vehicle_deleted', 'admin',
          ${JSON.stringify({deleted:i[0],timestamp:new Date().toISOString()})}::jsonb
        )
      `}catch{}return g.NextResponse.json({success:!0,deleted:i[0]})}catch(e){return g.NextResponse.json({error:e.message},{status:500})}}e.s(["DELETE",()=>x,"GET",()=>R,"PATCH",()=>N,"dynamic",0,"force-dynamic"],52954);var S=e.i(52954);let A=new t.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/admin/vehicles/[id]/route",pathname:"/api/admin/vehicles/[id]",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/vehicles/[id]/route.ts",nextConfigOutput:"",userland:S}),{workAsyncStorage:O,workUnitAsyncStorage:C,serverHooks:L}=A;function w(){return(0,r.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:C})}async function b(e,t,r){A.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/admin/vehicles/[id]/route";g=g.replace(/\/index$/,"")||"/";let T=await A.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!T)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:y,params:f,nextConfig:R,parsedUrl:N,isDraftMode:x,prerenderManifest:S,routerServerContext:O,isOnDemandRevalidate:C,revalidateOnlyGenerated:L,resolvedPathname:w,clientReferenceManifest:b,serverActionsManifest:$}=T,U=(0,o.normalizeAppPath)(g),k=!!(S.dynamicRoutes[U]||S.routes[w]),D=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,N,!1):t.end("This page could not be found"),null);if(k&&!x){let e=!!S.routes[w],t=S.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(R.experimental.adapterPath)return await D();throw new m.NoFallbackError}}let I=null;!k||A.isDev||x||(I="/index"===(I=w)?"/":I);let j=!0===A.isDev||!k,P=k&&!j;$&&b&&(0,n.setManifestsSingleton)({page:g,clientReferenceManifest:b,serverActionsManifest:$});let F=e.method||"GET",M=(0,s.getTracer)(),H=M.getActiveScopeSpan(),q={params:f,prerenderManifest:S,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts},cacheComponents:!!R.cacheComponents,supportsDynamicResponse:j,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:R.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,i,r,a)=>A.onRequestError(e,t,r,a,O)},sharedContext:{buildId:y}},X=new l.NodeNextRequest(e),V=new l.NodeNextResponse(t),B=p.NextRequestAdapter.fromNodeNextRequest(X,(0,p.signalFromNodeResponse)(t));try{let n=async e=>A.handle(B,q).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let i=M.getRootSpanAttributes();if(!i)return;if(i.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${i.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=i.get("next.route");if(r){let t=`${F} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${F} ${g}`)}),o=!!(0,a.getRequestMeta)(e,"minimalMode"),l=async a=>{var s,l;let p=async({previousCacheEntry:i})=>{try{if(!o&&C&&L&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await n(a);e.fetchMetrics=q.renderOpts.fetchMetrics;let l=q.renderOpts.pendingWaitUntil;l&&r.waitUntil&&(r.waitUntil(l),l=void 0);let p=q.renderOpts.collectedTags;if(!k)return await (0,d.sendResponse)(X,V,s,q.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(s.headers);p&&(t[v.NEXT_CACHE_TAGS_HEADER]=p),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let i=void 0!==q.renderOpts.collectedRevalidate&&!(q.renderOpts.collectedRevalidate>=v.INFINITE_CACHE)&&q.renderOpts.collectedRevalidate,r=void 0===q.renderOpts.collectedExpire||q.renderOpts.collectedExpire>=v.INFINITE_CACHE?void 0:q.renderOpts.collectedExpire;return{value:{kind:h.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:i,expire:r}}}}catch(t){throw(null==i?void 0:i.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:C})},!1,O),t}},u=await A.handleResponse({req:e,nextConfig:R,cacheKey:I,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:S,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:L,responseGenerator:p,waitUntil:r.waitUntil,isMinimalMode:o});if(!k)return null;if((null==u||null==(s=u.value)?void 0:s.kind)!==h.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",C?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),x&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,_.fromNodeOutgoingHttpHeaders)(u.value.headers);return o&&k||m.delete(v.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,E.getCacheControlHeader)(u.cacheControl)),await (0,d.sendResponse)(X,V,new Response(u.value.body,{headers:m,status:u.value.status||200})),null};H?await l(H):await M.withPropagatedContext(e.headers,()=>M.trace(u.BaseServerSpan.handleRequest,{spanName:`${F} ${g}`,kind:s.SpanKind.SERVER,attributes:{"http.method":F,"http.target":e.url}},l))}catch(t){if(t instanceof m.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:C})},!1,O),k)throw t;return await (0,d.sendResponse)(X,V,new Response(null,{status:500})),null}}e.s(["handler",()=>b,"patchFetch",()=>w,"routeModule",()=>A,"serverHooks",()=>L,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>C],62709)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__d2c0d056._.js.map