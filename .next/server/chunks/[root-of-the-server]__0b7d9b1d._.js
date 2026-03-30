module.exports=[93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},28438,e=>{"use strict";var t=e.i(39743),r=e.i(37383),a=e.i(16108),n=e.i(1266),o=e.i(10171),s=e.i(44067),i=e.i(7601),l=e.i(3083),d=e.i(88890),p=e.i(37886),u=e.i(63388),c=e.i(46601),x=e.i(24139),m=e.i(78785),g=e.i(2640),h=e.i(93695);e.i(46509);var E=e.i(56592),f=e.i(50974);let v=(0,e.i(57747).neon)(process.env.DATABASE_URL_UNPOOLED);async function R(e){try{let{searchParams:t}=new URL(e.url),r=t.get("token");if(!r)return f.NextResponse.json({error:"token required"},{status:400});let a=await v`
      SELECT * FROM partner_invites
      WHERE token = ${r}
        AND status != 'completed'
        AND status != 'expired'
        AND expires_at > NOW()
      LIMIT 1
    `;if(0===a.length)return f.NextResponse.json({error:"Invalid or expired invitation"},{status:404});let n=a[0];return await v`
      UPDATE partner_invites SET status = 'opened' WHERE id = ${n.id} AND status = 'sent'
    `,f.NextResponse.json({invite:n})}catch(e){return f.NextResponse.json({error:String(e)},{status:500})}}async function _(e){try{let{token:t,name:r,phone:a,email:n,company:o,type:s,legal_name:i,business_name:l,entity_type:d,tax_id_type:p,tax_id:u,address:c,agreement_accepted:x}=await e.json();if(!t)return f.NextResponse.json({error:"token required"},{status:400});if(!x)return f.NextResponse.json({error:"You must accept the Partner Agreement to activate your account"},{status:400});let m=await v`
      SELECT * FROM partner_invites
      WHERE token = ${t}
        AND status != 'completed'
        AND status != 'expired'
        AND expires_at > NOW()
      LIMIT 1
    `;if(0===m.length)return f.NextResponse.json({error:"Invalid or expired invitation"},{status:404});let g=m[0],h=(r??"PARTNER").toUpperCase().replace(/[^A-Z0-9]/g,"").substring(0,8),E=Math.random().toString(36).substring(2,5).toUpperCase(),R=`${h}${E}`,_=u?Buffer.from(u).toString("base64"):null,y=(await v`
      INSERT INTO partners (
        type, name, email, phone, status, ref_code, commission_rate
      ) VALUES (
        ${s??g.type??"individual"},
        ${r},
        ${n??g.email??null},
        ${a??g.phone??null},
        'active',
        ${R},
        ${g.commission_rate??.1}
      )
      RETURNING *
    `)[0];if(await v`
      INSERT INTO partner_profiles (
        partner_id, legal_name, business_name, entity_type,
        tax_id_type, tax_id_encrypted, address,
        w9_status, agreement_signed_at
      ) VALUES (
        ${y.id},
        ${i??r},
        ${l??o??null},
        ${d??"individual"},
        ${p??"SSN"},
        ${_},
        ${c??null},
        ${u?"submitted":"pending"},
        NOW()
      )
      ON CONFLICT (partner_id) DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        business_name = EXCLUDED.business_name,
        entity_type = EXCLUDED.entity_type,
        tax_id_type = EXCLUDED.tax_id_type,
        tax_id_encrypted = EXCLUDED.tax_id_encrypted,
        address = EXCLUDED.address,
        w9_status = EXCLUDED.w9_status,
        agreement_signed_at = NOW()
    `,await v`
      INSERT INTO dispatch_log (booking_id, previous_dispatch_status, new_dispatch_status, reason, metadata)
      VALUES (
        ${y.id},
        'pending',
        'agreement_accepted',
        'Partner accepted SLN Master Partner Agreement v1.0',
        ${JSON.stringify({partner_name:r,partner_email:n??null,agreement_version:"SLN-MPA-v1.0",accepted_at:new Date().toISOString()})}
      )
    `.catch(()=>null),await v`
      UPDATE partner_invites SET status = 'completed' WHERE id = ${g.id}
    `,n&&process.env.RESEND_API_KEY)try{let e=`https://www.sottoventoluxuryride.com/partner/${R}`,t=`https://www.sottoventoluxuryride.com/?ref=${R}`;await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:"Sottovento Network <partners@sottoventoluxuryride.com>",to:[n],subject:"Welcome to Sottovento Partner Network — Your account is active",html:`
              <div style="font-family: Georgia, serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 32px;">
                  <p style="color: #C8A96A; letter-spacing: 4px; font-size: 12px; text-transform: uppercase; margin: 0;">SOTTOVENTO LUXURY NETWORK</p>
                  <h1 style="color: #ffffff; font-size: 28px; margin: 8px 0;">Welcome, ${r}!</h1>
                </div>
                <p style="color: #a0a0a0; line-height: 1.8;">
                  Your partner account is now <strong style="color: #4ade80;">active</strong>. 
                  Your referral code is <strong style="color: #C8A96A;">${R}</strong>.
                </p>
                <div style="background: #1a1a1a; border: 1px solid #C8A96A33; padding: 20px; margin: 24px 0; border-radius: 4px;">
                  <p style="color: #C8A96A; font-size: 12px; letter-spacing: 2px; margin: 0 0 8px;">YOUR REFERRAL LINK</p>
                  <p style="color: #ffffff; word-break: break-all; margin: 0; font-size: 14px;">${t}</p>
                </div>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${e}" style="background: #C8A96A; color: #0a0a0a; padding: 16px 40px; text-decoration: none; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; display: inline-block;">
                    View My Dashboard
                  </a>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center;">
                  Commission rate: ${Math.round(100*Number(g.commission_rate??.1))}% per completed booking
                </p>
              </div>
            `})})}catch(e){console.error("Welcome email error:",e)}return f.NextResponse.json({success:!0,partner:{id:y.id,name:y.name,ref_code:y.ref_code,status:y.status},partner_link:`https://www.sottoventoluxuryride.com/partner/${R}`,referral_link:`https://www.sottoventoluxuryride.com/?ref=${R}`})}catch(e){return f.NextResponse.json({error:String(e)},{status:500})}}e.s(["GET",()=>R,"POST",()=>_,"dynamic",0,"force-dynamic"],61408);var y=e.i(61408);let w=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/partner/onboard/route",pathname:"/api/partner/onboard",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/sottovento/app/api/partner/onboard/route.ts",nextConfigOutput:"",userland:y}),{workAsyncStorage:N,workUnitAsyncStorage:A,serverHooks:C}=w;function b(){return(0,a.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:A})}async function T(e,t,a){w.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/partner/onboard/route";f=f.replace(/\/index$/,"")||"/";let v=await w.prepare(e,t,{srcPage:f,multiZoneDraftMode:!1});if(!v)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:R,params:_,nextConfig:y,parsedUrl:N,isDraftMode:A,prerenderManifest:C,routerServerContext:b,isOnDemandRevalidate:T,revalidateOnlyGenerated:S,resolvedPathname:O,clientReferenceManifest:D,serverActionsManifest:$}=v,k=(0,i.normalizeAppPath)(f),U=!!(C.dynamicRoutes[k]||C.routes[O]),P=async()=>((null==b?void 0:b.render404)?await b.render404(e,t,N,!1):t.end("This page could not be found"),null);if(U&&!A){let e=!!C.routes[O],t=C.dynamicRoutes[k];if(t&&!1===t.fallback&&!e){if(y.experimental.adapterPath)return await P();throw new h.NoFallbackError}}let I=null;!U||w.isDev||A||(I="/index"===(I=O)?"/":I);let j=!0===w.isDev||!U,L=U&&!j;$&&D&&(0,s.setManifestsSingleton)({page:f,clientReferenceManifest:D,serverActionsManifest:$});let q=e.method||"GET",H=(0,o.getTracer)(),M=H.getActiveScopeSpan(),W={params:_,prerenderManifest:C,renderOpts:{experimental:{authInterrupts:!!y.experimental.authInterrupts},cacheComponents:!!y.cacheComponents,supportsDynamicResponse:j,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:y.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>w.onRequestError(e,t,a,n,b)},sharedContext:{buildId:R}},F=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),X=d.NextRequestAdapter.fromNodeNextRequest(F,(0,d.signalFromNodeResponse)(t));try{let s=async e=>w.handle(X,W).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=H.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${q} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${q} ${f}`)}),i=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var o,l;let d=async({previousCacheEntry:r})=>{try{if(!i&&T&&S&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let o=await s(n);e.fetchMetrics=W.renderOpts.fetchMetrics;let l=W.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let d=W.renderOpts.collectedTags;if(!U)return await (0,c.sendResponse)(F,K,o,W.renderOpts.pendingWaitUntil),null;{let e=await o.blob(),t=(0,x.toNodeOutgoingHttpHeaders)(o.headers);d&&(t[g.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==W.renderOpts.collectedRevalidate&&!(W.renderOpts.collectedRevalidate>=g.INFINITE_CACHE)&&W.renderOpts.collectedRevalidate,a=void 0===W.renderOpts.collectedExpire||W.renderOpts.collectedExpire>=g.INFINITE_CACHE?void 0:W.renderOpts.collectedExpire;return{value:{kind:E.CachedRouteKind.APP_ROUTE,status:o.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await w.onRequestError(e,t,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:L,isOnDemandRevalidate:T})},!1,b),t}},p=await w.handleResponse({req:e,nextConfig:y,cacheKey:I,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:C,isRoutePPREnabled:!1,isOnDemandRevalidate:T,revalidateOnlyGenerated:S,responseGenerator:d,waitUntil:a.waitUntil,isMinimalMode:i});if(!U)return null;if((null==p||null==(o=p.value)?void 0:o.kind)!==E.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==p||null==(l=p.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",T?"REVALIDATED":p.isMiss?"MISS":p.isStale?"STALE":"HIT"),A&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let h=(0,x.fromNodeOutgoingHttpHeaders)(p.value.headers);return i&&U||h.delete(g.NEXT_CACHE_TAGS_HEADER),!p.cacheControl||t.getHeader("Cache-Control")||h.get("Cache-Control")||h.set("Cache-Control",(0,m.getCacheControlHeader)(p.cacheControl)),await (0,c.sendResponse)(F,K,new Response(p.value.body,{headers:h,status:p.value.status||200})),null};M?await l(M):await H.withPropagatedContext(e.headers,()=>H.trace(p.BaseServerSpan.handleRequest,{spanName:`${q} ${f}`,kind:o.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},l))}catch(t){if(t instanceof h.NoFallbackError||await w.onRequestError(e,t,{routerKind:"App Router",routePath:k,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:L,isOnDemandRevalidate:T})},!1,b),U)throw t;return await (0,c.sendResponse)(F,K,new Response(null,{status:500})),null}}e.s(["handler",()=>T,"patchFetch",()=>b,"routeModule",()=>w,"serverHooks",()=>C,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>A],28438)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0b7d9b1d._.js.map