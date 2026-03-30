module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},24515,e=>{"use strict";var t=e.i(39743),r=e.i(37383),n=e.i(16108),a=e.i(1266),o=e.i(10171),i=e.i(44067),s=e.i(7601),l=e.i(3083),p=e.i(88890),d=e.i(37886),u=e.i(63388),c=e.i(46601),x=e.i(24139),h=e.i(78785),v=e.i(2640),m=e.i(93695);e.i(46509);var R=e.i(56592),g=e.i(50974);let f=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function y(){try{let e=await f`
      SELECT
        id,
        token,
        type,
        email,
        phone,
        prefilled_data,
        commission_rate,
        expires_at,
        status,
        created_at
      FROM partner_invites
      ORDER BY created_at DESC
      LIMIT 100
    `;return g.NextResponse.json({invites:e})}catch(e){return g.NextResponse.json({error:String(e)},{status:500})}}async function E(e){try{let{type:t,email:r,phone:n,prefilled_data:a,commission_rate:o,send_email:i}=await e.json();if(!t)return g.NextResponse.json({error:"type required"},{status:400});let s=(await f`
      INSERT INTO partner_invites (type, email, phone, prefilled_data, commission_rate)
      VALUES (
        ${t},
        ${r??null},
        ${n??null},
        ${JSON.stringify(a??{})},
        ${o??.1}
      )
      RETURNING *
    `)[0],l=`https://www.sottoventoluxuryride.com/partner/invite/${s.token}`;if(i&&r&&process.env.RESEND_API_KEY)try{let e=a?.name??"Partner";(await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Sottovento Network <partners@sottoventoluxuryride.com>",to:[r],subject:"You're invited to join Sottovento Partner Network",html:`
              <div style="font-family: Georgia, serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <p style="color: #C8A96A; letter-spacing: 4px; font-size: 12px; text-transform: uppercase; margin: 0;">SOTTOVENTO LUXURY NETWORK</p>
                  <h1 style="color: #ffffff; font-size: 28px; margin: 8px 0;">Partner Invitation</h1>
                </div>
                <p style="color: #a0a0a0; line-height: 1.8;">Dear ${e},</p>
                <p style="color: #a0a0a0; line-height: 1.8;">
                  You have been invited to join the <strong style="color: #C8A96A;">Sottovento Partner Network</strong> — 
                  Orlando's premier luxury transportation referral program.
                </p>
                <p style="color: #a0a0a0; line-height: 1.8;">
                  As a partner, you'll earn <strong style="color: #C8A96A;">${Math.round((o??.1)*100)}% commission</strong> 
                  on every booking you generate.
                </p>
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${l}" style="background: #C8A96A; color: #0a0a0a; padding: 16px 40px; text-decoration: none; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; display: inline-block;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center;">
                  This invitation expires in 7 days.<br>
                  ${l}
                </p>
              </div>
            `})})).ok&&await f`
            UPDATE partner_invites SET status = 'sent' WHERE id = ${s.id}
          `}catch(e){console.error("Email send error:",e)}return g.NextResponse.json({invite:s,invite_link:l})}catch(e){return g.NextResponse.json({error:String(e)},{status:500})}}async function w(e){try{let{id:t,status:r}=await e.json();return await f`
      UPDATE partner_invites SET status = ${r} WHERE id = ${t}
    `,g.NextResponse.json({success:!0})}catch(e){return g.NextResponse.json({error:String(e)},{status:500})}}e.s(["GET",()=>y,"PATCH",()=>w,"POST",()=>E,"dynamic",0,"force-dynamic"],83078);var A=e.i(83078);let N=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/admin/partner-invites/route",pathname:"/api/admin/partner-invites",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/admin/partner-invites/route.ts",nextConfigOutput:"",userland:A}),{workAsyncStorage:T,workUnitAsyncStorage:C,serverHooks:S}=N;function _(){return(0,n.patchFetch)({workAsyncStorage:T,workUnitAsyncStorage:C})}async function b(e,t,n){N.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/admin/partner-invites/route";g=g.replace(/\/index$/,"")||"/";let f=await N.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!f)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:y,params:E,nextConfig:w,parsedUrl:A,isDraftMode:T,prerenderManifest:C,routerServerContext:S,isOnDemandRevalidate:_,revalidateOnlyGenerated:b,resolvedPathname:O,clientReferenceManifest:P,serverActionsManifest:k}=f,j=(0,s.normalizeAppPath)(g),I=!!(C.dynamicRoutes[j]||C.routes[O]),U=async()=>((null==S?void 0:S.render404)?await S.render404(e,t,A,!1):t.end("This page could not be found"),null);if(I&&!T){let e=!!C.routes[O],t=C.dynamicRoutes[j];if(t&&!1===t.fallback&&!e){if(w.experimental.adapterPath)return await U();throw new m.NoFallbackError}}let $=null;!I||N.isDev||T||($="/index"===($=O)?"/":$);let D=!0===N.isDev||!I,q=I&&!D;k&&P&&(0,i.setManifestsSingleton)({page:g,clientReferenceManifest:P,serverActionsManifest:k});let H=e.method||"GET",M=(0,o.getTracer)(),K=M.getActiveScopeSpan(),L={params:E,prerenderManifest:C,renderOpts:{experimental:{authInterrupts:!!w.experimental.authInterrupts},cacheComponents:!!w.cacheComponents,supportsDynamicResponse:D,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:w.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,n,a)=>N.onRequestError(e,t,n,a,S)},sharedContext:{buildId:y}},F=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),G=p.NextRequestAdapter.fromNodeNextRequest(F,(0,p.signalFromNodeResponse)(t));try{let i=async e=>N.handle(G,L).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=M.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${H} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${H} ${g}`)}),s=!!(0,a.getRequestMeta)(e,"minimalMode"),l=async a=>{var o,l;let p=async({previousCacheEntry:r})=>{try{if(!s&&_&&b&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await i(a);e.fetchMetrics=L.renderOpts.fetchMetrics;let l=L.renderOpts.pendingWaitUntil;l&&n.waitUntil&&(n.waitUntil(l),l=void 0);let p=L.renderOpts.collectedTags;if(!I)return await (0,c.sendResponse)(F,B,o,L.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,x.toNodeOutgoingHttpHeaders)(o.headers);p&&(t[v.NEXT_CACHE_TAGS_HEADER]=p),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==L.renderOpts.collectedRevalidate&&!(L.renderOpts.collectedRevalidate>=v.INFINITE_CACHE)&&L.renderOpts.collectedRevalidate,n=void 0===L.renderOpts.collectedExpire||L.renderOpts.collectedExpire>=v.INFINITE_CACHE?void 0:L.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==r?void 0:r.isStale)&&await N.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:_})},!1,S),t}},d=await N.handleResponse({req:e,nextConfig:w,cacheKey:$,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:C,isRoutePPREnabled:!1,isOnDemandRevalidate:_,revalidateOnlyGenerated:b,responseGenerator:p,waitUntil:n.waitUntil,isMinimalMode:s});if(!I)return null;if((null==d||null==(o=d.value)?void 0:o.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});s||t.setHeader("x-nextjs-cache",_?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),T&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,x.fromNodeOutgoingHttpHeaders)(d.value.headers);return s&&I||m.delete(v.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,h.getCacheControlHeader)(d.cacheControl)),await (0,c.sendResponse)(F,B,new Response(d.value.body,{headers:m,status:d.value.status||200})),null};K?await l(K):await M.withPropagatedContext(e.headers,()=>M.trace(d.BaseServerSpan.handleRequest,{spanName:`${H} ${g}`,kind:o.SpanKind.SERVER,attributes:{"http.method":H,"http.target":e.url}},l))}catch(t){if(t instanceof m.NoFallbackError||await N.onRequestError(e,t,{routerKind:"App Router",routePath:j,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:_})},!1,S),I)throw t;return await (0,c.sendResponse)(F,B,new Response(null,{status:500})),null}}e.s(["handler",()=>b,"patchFetch",()=>_,"routeModule",()=>N,"serverHooks",()=>S,"workAsyncStorage",()=>T,"workUnitAsyncStorage",()=>C],24515)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__8995a2b6._.js.map