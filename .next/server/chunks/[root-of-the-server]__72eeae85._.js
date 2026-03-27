module.exports=[93695,(e,t,o)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},70406,(e,t,o)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,o)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,o)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,o)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,o)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},51615,(e,t,o)=>{t.exports=e.x("node:buffer",()=>require("node:buffer"))},78500,(e,t,o)=>{t.exports=e.x("node:async_hooks",()=>require("node:async_hooks"))},88947,(e,t,o)=>{t.exports=e.x("stream",()=>require("stream"))},133,e=>{"use strict";var t=e.i(53099);function o(){let e=process.env.RESEND_API_KEY;return e?new t.Resend(e):(console.warn("[email] RESEND_API_KEY not set — emails will be skipped"),null)}let r=process.env.RESEND_FROM_EMAIL??"Sottovento Luxury Ride <noreply@sottoventoluxuryride.com>",n=process.env.ADMIN_EMAIL??"contact@sottoventoluxuryride.com";async function i(e){let t=o();if(!t)return;let i=e.destination?`New Quote Request — ${e.destination} — Sottovento`:`New Lead — Sottovento Luxury Ride`,d=`
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
  `;try{await t.emails.send({from:r,to:[n],subject:i,html:d})}catch(e){console.error("[email] sendLeadNotification failed:",e)}}async function d(e){let t=o();if(!t)return{success:!1,error:"Email service not configured"};let n=`Your Crown Moment — Sottovento Luxury Ride`,i=`
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
  `,d=e.photoBase64.replace(/^data:image\/\w+;base64,/,""),a=Buffer.from(d,"base64"),p=e.photoUrl?[]:[{filename:"sottovento-crown-moment.jpg",content:a}];try{return await t.emails.send({from:r,to:[e.toEmail],subject:n,html:i,attachments:p}),{success:!0}}catch(e){return console.error("[email] sendCrownMomentPhoto failed:",e),{success:!1,error:String(e)}}}e.s(["sendCrownMomentPhoto",()=>d,"sendLeadNotification",()=>i])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__72eeae85._.js.map