module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},47130,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),n=e.i(1266),i=e.i(10171),s=e.i(44067),o=e.i(7601),d=e.i(3083),E=e.i(88890),p=e.i(37886),T=e.i(63388),l=e.i(46601),u=e.i(24139),c=e.i(78785),_=e.i(2640),N=e.i(93695);e.i(46509);var A=e.i(56592),R=e.i(50974);let U=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function m(){try{return await U`
      CREATE TABLE IF NOT EXISTS partner_companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        master_ref_code TEXT UNIQUE NOT NULL,
        commission_split_company NUMERIC(4,3) DEFAULT 0.10,
        commission_split_staff NUMERIC(4,3) DEFAULT 0.05,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,await U`
      CREATE TABLE IF NOT EXISTS partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL CHECK (type IN ('hotel', 'valet', 'airbnb', 'influencer', 'staff')),
        parent_company_id UUID REFERENCES partner_companies(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'inactive')),
        ref_code TEXT UNIQUE NOT NULL,
        commission_rate NUMERIC(4,3) DEFAULT 0.10,
        last_activity_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,await U`
      CREATE TABLE IF NOT EXISTS partner_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
        type TEXT NOT NULL CHECK (type IN ('company', 'individual')),
        email TEXT,
        phone TEXT,
        prefilled_data JSONB DEFAULT '{}',
        commission_rate NUMERIC(4,3) DEFAULT 0.10,
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
        status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'completed', 'expired')),
        created_by_admin_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,await U`
      CREATE TABLE IF NOT EXISTS partner_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID UNIQUE REFERENCES partners(id) ON DELETE CASCADE,
        legal_name TEXT,
        business_name TEXT,
        entity_type TEXT CHECK (entity_type IN ('individual', 'sole_prop', 'llc', 'corp')),
        tax_id_type TEXT CHECK (tax_id_type IN ('SSN', 'EIN')),
        tax_id_encrypted TEXT,
        address TEXT,
        country TEXT DEFAULT 'US',
        w9_status TEXT DEFAULT 'pending' CHECK (w9_status IN ('pending', 'submitted', 'verified')),
        agreement_signed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,await U`
      CREATE TABLE IF NOT EXISTS partner_payout_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
        provider TEXT DEFAULT 'stripe',
        account_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,await U`
      CREATE TABLE IF NOT EXISTS partner_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        commission_rate NUMERIC(4,3) NOT NULL DEFAULT 0.10,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'void')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,await U`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL
    `,await U`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS ref_code TEXT
    `,await U`CREATE INDEX IF NOT EXISTS idx_partners_ref_code ON partners(ref_code)`,await U`CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner_id ON partner_earnings(partner_id)`,await U`CREATE INDEX IF NOT EXISTS idx_partner_earnings_booking_id ON partner_earnings(booking_id)`,await U`CREATE INDEX IF NOT EXISTS idx_bookings_partner_id ON bookings(partner_id)`,await U`CREATE INDEX IF NOT EXISTS idx_partner_invites_token ON partner_invites(token)`,R.NextResponse.json({success:!0,message:"Partner System tables created successfully",tables:["partner_companies","partners","partner_invites","partner_profiles","partner_payout_accounts","partner_earnings","bookings.partner_id (column added)","bookings.ref_code (column added)"]})}catch(e){return console.error("Migration error:",e),R.NextResponse.json({success:!1,error:String(e)},{status:500})}}e.s(["GET",()=>m,"dynamic",0,"force-dynamic"],56828);var I=e.i(56828);let C=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/migrate-partners/route",pathname:"/api/admin/migrate-partners",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/migrate-partners/route.ts",nextConfigOutput:"",userland:I}),{workAsyncStorage:g,workUnitAsyncStorage:L,serverHooks:x}=C;function D(){return(0,a.patchFetch)({workAsyncStorage:g,workUnitAsyncStorage:L})}async function v(e,t,a){C.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let R="/api/admin/migrate-partners/route";R=R.replace(/\/index$/,"")||"/";let U=await C.prepare(e,t,{srcPage:R,multiZoneDraftMode:!1});if(!U)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:m,params:I,nextConfig:g,parsedUrl:L,isDraftMode:x,prerenderManifest:D,routerServerContext:v,isOnDemandRevalidate:S,revalidateOnlyGenerated:h,resolvedPathname:O,clientReferenceManifest:f,serverActionsManifest:y}=U,F=(0,o.normalizeAppPath)(R),w=!!(D.dynamicRoutes[F]||D.routes[O]),X=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,L,!1):t.end("This page could not be found"),null);if(w&&!x){let e=!!D.routes[O],t=D.dynamicRoutes[F];if(t&&!1===t.fallback&&!e){if(g.experimental.adapterPath)return await X();throw new N.NoFallbackError}}let b=null;!w||C.isDev||x||(b="/index"===(b=O)?"/":b);let M=!0===C.isDev||!w,P=w&&!M;y&&f&&(0,s.setManifestsSingleton)({page:R,clientReferenceManifest:f,serverActionsManifest:y});let k=e.method||"GET",H=(0,i.getTracer)(),K=H.getActiveScopeSpan(),q={params:I,prerenderManifest:D,renderOpts:{experimental:{authInterrupts:!!g.experimental.authInterrupts},cacheComponents:!!g.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:g.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>C.onRequestError(e,t,a,n,v)},sharedContext:{buildId:m}},j=new d.NodeNextRequest(e),B=new d.NodeNextResponse(t),Y=E.NextRequestAdapter.fromNodeNextRequest(j,(0,E.signalFromNodeResponse)(t));try{let s=async e=>C.handle(Y,q).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=H.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${k} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${k} ${R}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),d=async n=>{var i,d;let E=async({previousCacheEntry:r})=>{try{if(!o&&S&&h&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await s(n);e.fetchMetrics=q.renderOpts.fetchMetrics;let d=q.renderOpts.pendingWaitUntil;d&&a.waitUntil&&(a.waitUntil(d),d=void 0);let E=q.renderOpts.collectedTags;if(!w)return await (0,l.sendResponse)(j,B,i,q.renderOpts.pendingWaitUntil),null;{let e=await i.blob(),t=(0,u.toNodeOutgoingHttpHeaders)(i.headers);E&&(t[_.NEXT_CACHE_TAGS_HEADER]=E),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==q.renderOpts.collectedRevalidate&&!(q.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&q.renderOpts.collectedRevalidate,a=void 0===q.renderOpts.collectedExpire||q.renderOpts.collectedExpire>=_.INFINITE_CACHE?void 0:q.renderOpts.collectedExpire;return{value:{kind:A.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await C.onRequestError(e,t,{routerKind:"App Router",routePath:R,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:S})},!1,v),t}},p=await C.handleResponse({req:e,nextConfig:g,cacheKey:b,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:D,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:h,responseGenerator:E,waitUntil:a.waitUntil,isMinimalMode:o});if(!w)return null;if((null==p||null==(i=p.value)?void 0:i.kind)!==A.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(d=p.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",S?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),x&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let N=(0,u.fromNodeOutgoingHttpHeaders)(p.value.headers);return o&&w||N.delete(_.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||N.get("Cache-Control")||N.set("Cache-Control",(0,c.getCacheControlHeader)(p.cacheControl)),await (0,l.sendResponse)(j,B,new Response(p.value.body,{headers:N,status:p.value.status||200})),null};K?await d(K):await H.withPropagatedContext(e.headers,()=>H.trace(p.BaseServerSpan.handleRequest,{spanName:`${k} ${R}`,kind:i.SpanKind.SERVER,attributes:{"http.method":k,"http.target":e.url}},d))}catch(t){if(t instanceof N.NoFallbackError||await C.onRequestError(e,t,{routerKind:"App Router",routePath:F,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:S})},!1,v),w)throw t;return await (0,l.sendResponse)(j,B,new Response(null,{status:500})),null}}e.s(["handler",()=>v,"patchFetch",()=>D,"routeModule",()=>C,"serverHooks",()=>x,"workAsyncStorage",()=>g,"workUnitAsyncStorage",()=>L],47130)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__210c2dd7._.js.map