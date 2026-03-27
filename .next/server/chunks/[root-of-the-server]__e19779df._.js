module.exports=[93695,(e,t,a)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,a)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,a)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,a)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},38754,e=>{"use strict";var t=e.i(66574),a=e.i(58350),r=e.i(10732),s=e.i(12768),n=e.i(75089),i=e.i(11299),o=e.i(66012),d=e.i(12480),u=e.i(64629),l=e.i(2078),p=e.i(99591),c=e.i(65698),_=e.i(29809),T=e.i(64157),h=e.i(56534),E=e.i(93695);e.i(22981);var y=e.i(4706),g=e.i(16770);let N=(0,e.i(70485).neon)(process.env.DATABASE_URL_UNPOOLED);async function A(e){if("SLN_ADMIN_2026"!==e.headers.get("x-admin-key"))return g.NextResponse.json({error:"Unauthorized"},{status:401});let t=[];for(let{step:e,fn:a}of[{step:"drivers.payout_method",fn:()=>N`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'not_set'`},{step:"drivers.payout_onboarding_status",fn:()=>N`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS payout_onboarding_status TEXT DEFAULT 'not_started'`},{step:"drivers.payouts_enabled",fn:()=>N`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE`},{step:"drivers.last_payout_date",fn:()=>N`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_payout_date TIMESTAMPTZ`},{step:"drivers.payout_notes",fn:()=>N`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS payout_notes TEXT`}])try{await a(),t.push({step:e,status:"ok"})}catch(a){t.push({step:e,status:"error",detail:a?.message})}try{await N`
      ALTER TABLE driver_earnings_ledger
        ADD COLUMN IF NOT EXISTS payout_batch_uuid UUID
    `,t.push({step:"ledger.payout_batch_uuid",status:"ok"})}catch(e){t.push({step:"ledger.payout_batch_uuid",status:"error",detail:e?.message})}try{await N`
      CREATE TABLE IF NOT EXISTS payout_batches (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        -- Driver
        driver_id           UUID NOT NULL REFERENCES drivers(id),
        -- Week range
        week_start          TIMESTAMPTZ NOT NULL,
        week_end            TIMESTAMPTZ NOT NULL,
        -- Amounts
        total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
        earnings_count      INT NOT NULL DEFAULT 0,
        currency            TEXT NOT NULL DEFAULT 'USD',
        -- Status lifecycle
        -- draft | pending_payout | paid | reconciled | cancelled
        status              TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','pending_payout','paid','reconciled','cancelled')),
        -- Payment info
        payment_method      TEXT,
        -- stripe | bank_wire | zelle | check | other
        external_reference  TEXT,
        -- Stripe payout ID, wire ref, etc.
        notes               TEXT,
        -- Admin tracking
        created_by_admin_id TEXT,
        executed_at         TIMESTAMPTZ,
        reconciled_at       TIMESTAMPTZ,
        cancelled_at        TIMESTAMPTZ,
        -- Timestamps
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,t.push({step:"create_payout_batches",status:"ok"})}catch(e){t.push({step:"create_payout_batches",status:"error",detail:e?.message})}try{await N`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_batch_driver_week
        ON payout_batches (driver_id, week_start)
        WHERE status NOT IN ('cancelled')
    `,t.push({step:"uq_payout_batch_driver_week",status:"ok"})}catch(e){e?.message?.includes("already exists")?t.push({step:"uq_payout_batch_driver_week",status:"already_exists"}):t.push({step:"uq_payout_batch_driver_week",status:"error",detail:e?.message})}try{await N`
      CREATE INDEX IF NOT EXISTS idx_payout_batches_driver
        ON payout_batches (driver_id)
    `,t.push({step:"idx_payout_batches_driver",status:"ok"})}catch(e){t.push({step:"idx_payout_batches_driver",status:"error",detail:e?.message})}try{await N`
      CREATE INDEX IF NOT EXISTS idx_payout_batches_status
        ON payout_batches (status)
    `,t.push({step:"idx_payout_batches_status",status:"ok"})}catch(e){t.push({step:"idx_payout_batches_status",status:"error",detail:e?.message})}try{await N`
      CREATE INDEX IF NOT EXISTS idx_ledger_payout_batch_uuid
        ON driver_earnings_ledger (payout_batch_uuid)
        WHERE payout_batch_uuid IS NOT NULL
    `,t.push({step:"idx_ledger_payout_batch_uuid",status:"ok"})}catch(e){t.push({step:"idx_ledger_payout_batch_uuid",status:"error",detail:e?.message})}try{await N`
      ALTER TABLE driver_earnings_ledger
        ADD CONSTRAINT fk_ledger_payout_batch
        FOREIGN KEY (payout_batch_uuid)
        REFERENCES payout_batches(id)
    `,t.push({step:"fk_ledger_payout_batch",status:"ok"})}catch(e){e?.message?.includes("already exists")?t.push({step:"fk_ledger_payout_batch",status:"already_exists"}):t.push({step:"fk_ledger_payout_batch",status:"error",detail:e?.message})}try{await N`
      ALTER TABLE driver_earnings_ledger
        DROP CONSTRAINT IF EXISTS driver_earnings_ledger_ledger_status_check
    `,await N`
      ALTER TABLE driver_earnings_ledger
        ADD CONSTRAINT driver_earnings_ledger_ledger_status_check
        CHECK (ledger_status IN ('unpaid','pending','posted','pending_payout','paid','reconciled','voided','adjusted'))
    `,t.push({step:"update_ledger_status_check",status:"ok"})}catch(e){t.push({step:"update_ledger_status_check",status:"error",detail:e?.message})}try{let e=await N`
      UPDATE driver_earnings_ledger
      SET ledger_status = 'unpaid', updated_at = NOW()
      WHERE ledger_status = 'posted'
        AND payout_batch_uuid IS NULL
        AND earning_role IN ('source_driver', 'executor_driver')
    `;t.push({step:"migrate_posted_to_unpaid",status:"ok",detail:`${e.length??0} rows updated`})}catch(e){t.push({step:"migrate_posted_to_unpaid",status:"error",detail:e?.message})}let a=t.filter(e=>"error"===e.status),r=!1;try{let e=await N`SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_name = 'payout_batches'`;r=Number(e[0]?.cnt??0)>0}catch{}let s=0;try{let e=await N`
      SELECT COUNT(*) AS cnt FROM information_schema.columns
      WHERE table_name = 'drivers'
        AND column_name IN ('payout_method','payout_onboarding_status','payouts_enabled','last_payout_date','payout_notes')
    `;s=Number(e[0]?.cnt??0)}catch{}return g.NextResponse.json({ok:0===a.length,steps:t,errors:a.length>0?a:void 0,summary:{payout_batches_table:r,driver_payout_cols:s,driver_payout_cols_expected:5}})}e.s(["GET",()=>A],16428);var R=e.i(16428);let m=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/admin/migrate-weekly-payout/route",pathname:"/api/admin/migrate-weekly-payout",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/admin/migrate-weekly-payout/route.ts",nextConfigOutput:"",userland:R}),{workAsyncStorage:v,workUnitAsyncStorage:x,serverHooks:b}=m;function I(){return(0,r.patchFetch)({workAsyncStorage:v,workUnitAsyncStorage:x})}async function L(e,t,r){m.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/admin/migrate-weekly-payout/route";g=g.replace(/\/index$/,"")||"/";let N=await m.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!N)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:A,params:R,nextConfig:v,parsedUrl:x,isDraftMode:b,prerenderManifest:I,routerServerContext:L,isOnDemandRevalidate:O,revalidateOnlyGenerated:S,resolvedPathname:f,clientReferenceManifest:w,serverActionsManifest:C}=N,U=(0,o.normalizeAppPath)(g),D=!!(I.dynamicRoutes[U]||I.routes[f]),k=async()=>((null==L?void 0:L.render404)?await L.render404(e,t,x,!1):t.end("This page could not be found"),null);if(D&&!b){let e=!!I.routes[f],t=I.dynamicRoutes[U];if(t&&!1===t.fallback&&!e){if(v.experimental.adapterPath)return await k();throw new E.NoFallbackError}}let M=null;!D||m.isDev||b||(M="/index"===(M=f)?"/":M);let F=!0===m.isDev||!D,P=D&&!F;C&&w&&(0,i.setManifestsSingleton)({page:g,clientReferenceManifest:w,serverActionsManifest:C});let X=e.method||"GET",q=(0,n.getTracer)(),H=q.getActiveScopeSpan(),j={params:R,prerenderManifest:I,renderOpts:{experimental:{authInterrupts:!!v.experimental.authInterrupts},cacheComponents:!!v.cacheComponents,supportsDynamicResponse:F,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:v.cacheLife,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,s)=>m.onRequestError(e,t,r,s,L)},sharedContext:{buildId:A}},B=new d.NodeNextRequest(e),K=new d.NodeNextResponse(t),W=u.NextRequestAdapter.fromNodeNextRequest(B,(0,u.signalFromNodeResponse)(t));try{let i=async e=>m.handle(W,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=q.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==l.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route");if(r){let t=`${X} ${r}`;e.setAttributes({"next.route":r,"http.route":r,"next.span_name":t}),e.updateName(t)}else e.updateName(`${X} ${g}`)}),o=!!(0,s.getRequestMeta)(e,"minimalMode"),d=async s=>{var n,d;let u=async({previousCacheEntry:a})=>{try{if(!o&&O&&S&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await i(s);e.fetchMetrics=j.renderOpts.fetchMetrics;let d=j.renderOpts.pendingWaitUntil;d&&r.waitUntil&&(r.waitUntil(d),d=void 0);let u=j.renderOpts.collectedTags;if(!D)return await (0,c.sendResponse)(B,K,n,j.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(n.headers);u&&(t[h.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=h.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,r=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=h.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:y.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await m.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:O})},!1,L),t}},l=await m.handleResponse({req:e,nextConfig:v,cacheKey:M,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:I,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:S,responseGenerator:u,waitUntil:r.waitUntil,isMinimalMode:o});if(!D)return null;if((null==l||null==(n=l.value)?void 0:n.kind)!==y.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(d=l.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",O?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),b&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let E=(0,_.fromNodeOutgoingHttpHeaders)(l.value.headers);return o&&D||E.delete(h.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||t.getHeader("Cache-Control")||E.get("Cache-Control")||E.set("Cache-Control",(0,T.getCacheControlHeader)(l.cacheControl)),await (0,c.sendResponse)(B,K,new Response(l.value.body,{headers:E,status:l.value.status||200})),null};H?await d(H):await q.withPropagatedContext(e.headers,()=>q.trace(l.BaseServerSpan.handleRequest,{spanName:`${X} ${g}`,kind:n.SpanKind.SERVER,attributes:{"http.method":X,"http.target":e.url}},d))}catch(t){if(t instanceof E.NoFallbackError||await m.onRequestError(e,t,{routerKind:"App Router",routePath:U,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:O})},!1,L),D)throw t;return await (0,c.sendResponse)(B,K,new Response(null,{status:500})),null}}e.s(["handler",()=>L,"patchFetch",()=>I,"routeModule",()=>m,"serverHooks",()=>b,"workAsyncStorage",()=>v,"workUnitAsyncStorage",()=>x],38754)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__e19779df._.js.map