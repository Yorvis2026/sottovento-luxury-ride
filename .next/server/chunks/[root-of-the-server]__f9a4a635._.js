module.exports=[93695,(e,r,t)=>{r.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,r,t)=>{r.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,r,t)=>{r.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,r,t)=>{r.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},54799,(e,r,t)=>{r.exports=e.x("crypto",()=>require("crypto"))},27699,(e,r,t)=>{r.exports=e.x("events",()=>require("events"))},21517,(e,r,t)=>{r.exports=e.x("http",()=>require("http"))},24836,(e,r,t)=>{r.exports=e.x("https",()=>require("https"))},82092,e=>{"use strict";var r=e.i(57747);function t(e){let{ref_code:r,tablet_id:t,qr_code:a,campaign_id:n,partner_ref:o,source_driver_id:c,utm_source:s,utm_campaign:u,utm_medium:i,landing_page:_,referrer:l,booking_origin:d,captured_by:p,explicit_source_type:m,extra_metadata:b}=e,g={..._&&{landing_page:_},...s&&{utm_source:s},...u&&{utm_campaign:u},...i&&{utm_medium:i},...l&&{referrer:l},...t&&{tablet_id:t},...a&&{qr_code:a},...n&&{campaign_id:n},...o&&{partner_ref:o},...r&&{ref_code:r},...p&&{captured_by:p},...d&&{booking_origin:d},...b??{}};if(m&&"unknown"!==m)return function(e,r,t){let{ref_code:a,tablet_id:n,qr_code:o,campaign_id:c,partner_ref:s,source_driver_id:u}=r;return{source_type:e,source_driver_id:u??null,source_reference:({driver_direct:a??"DRIVER-DIRECT",tablet:n??"TABLET-UNKNOWN",qr:o??"QR-UNKNOWN",direct_web:"WEB-DIRECT",organic_web:"SEO-ORGANIC",manual_admin:"ADMIN-MANUAL",campaign:c??"CAMPAIGN-UNKNOWN",hotel_partner:s??"HOTEL-UNKNOWN",airbnb_partner:s??"AIRBNB-UNKNOWN",unknown:"UNKNOWN"})[e],source_tablet_id:"tablet"===e?n??null:null,source_campaign_id:"campaign"===e?c??null:null,source_channel:({driver_direct:"referral",tablet:"tablet",qr:"qr",direct_web:"website",organic_web:"organic",manual_admin:"admin",campaign:"campaign",hotel_partner:"partner",airbnb_partner:"partner",unknown:"unknown"})[e],source_metadata:t}}(m,e,g);if(r&&c)return{source_type:"driver_direct",source_driver_id:c,source_reference:r,source_tablet_id:null,source_campaign_id:null,source_channel:"referral",source_metadata:g};if(r&&!c)return{source_type:"driver_direct",source_driver_id:null,source_reference:r,source_tablet_id:null,source_campaign_id:null,source_channel:"referral",source_metadata:g};if(t||"tablet"===d){let e=t??("tablet"===d?"TABLET-UNKNOWN":null);return{source_type:"tablet",source_driver_id:c??null,source_reference:e??"TABLET-UNKNOWN",source_tablet_id:e,source_campaign_id:null,source_channel:"tablet",source_metadata:g}}if(a)return{source_type:"qr",source_driver_id:c??null,source_reference:a,source_tablet_id:null,source_campaign_id:null,source_channel:"qr",source_metadata:g};if(n||s&&u){let e=n??`${s?.toUpperCase()}-${u?.toUpperCase()}`;return{source_type:"campaign",source_driver_id:null,source_reference:e,source_tablet_id:null,source_campaign_id:n??e,source_channel:"campaign",source_metadata:g}}return o?{source_type:o.toLowerCase().includes("airbnb")?"airbnb_partner":"hotel_partner",source_driver_id:c??null,source_reference:o,source_tablet_id:null,source_campaign_id:null,source_channel:"partner",source_metadata:g}:"organic"===i||l&&/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\./.test(l)?{source_type:"organic_web",source_driver_id:null,source_reference:"SEO-ORGANIC",source_tablet_id:null,source_campaign_id:null,source_channel:"organic",source_metadata:g}:c||p?.trim()?p&&"public_site"!==p.trim().toLowerCase()?{source_type:"driver_direct",source_driver_id:c??null,source_reference:p.trim().toUpperCase(),source_tablet_id:null,source_campaign_id:null,source_channel:"referral",source_metadata:g}:{source_type:"unknown",source_driver_id:null,source_reference:"UNKNOWN",source_tablet_id:null,source_campaign_id:null,source_channel:"unknown",source_metadata:g}:{source_type:"direct_web",source_driver_id:null,source_reference:"WEB-DIRECT",source_tablet_id:null,source_campaign_id:null,source_channel:"website",source_metadata:g}}async function a(e,t){let a=(0,r.neon)(process.env.DATABASE_URL_UNPOOLED),[n]=await a`
    SELECT source_locked_at FROM bookings WHERE id = ${e}::uuid LIMIT 1
  `;if(!n)throw Error(`Booking ${e} not found`);if(n.source_locked_at)return{locked:!1,already_locked:!0};let o=new Date().toISOString();await a`
    UPDATE bookings
    SET
      source_type        = ${t.source_type},
      source_driver_id   = ${t.source_driver_id?`${t.source_driver_id}::uuid`:null},
      source_reference   = ${t.source_reference},
      source_tablet_id   = ${t.source_tablet_id},
      source_campaign_id = ${t.source_campaign_id},
      source_channel     = ${t.source_channel},
      source_metadata    = ${JSON.stringify(t.source_metadata)}::jsonb,
      source_locked_at   = ${o}::timestamptz,
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
    `}catch{console.warn("[lockLeadOrigin] snapshot insert failed for",e)}return{locked:!0}}e.s(["lockLeadOrigin",()=>a,"resolveLeadOrigin",()=>t])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__f9a4a635._.js.map