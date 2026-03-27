(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["chunks/[root-of-the-server]__fdcf1c97._.js",51615,(e,t,a)=>{t.exports=e.x("node:buffer",()=>require("node:buffer"))},78500,(e,t,a)=>{t.exports=e.x("node:async_hooks",()=>require("node:async_hooks"))},79607,e=>{"use strict";async function t(){return"_ENTRIES"in globalThis&&_ENTRIES.middleware_instrumentation&&await _ENTRIES.middleware_instrumentation}let a=null;async function n(){if("phase-production-build"===process.env.NEXT_PHASE)return;a||(a=t());let e=await a;if(null==e?void 0:e.register)try{await e.register()}catch(e){throw e.message=`An error occurred while loading instrumentation hook: ${e.message}`,e}}async function r(...e){let a=await t();try{var n;await (null==a||null==(n=a.onRequestError)?void 0:n.call(a,...e))}catch(e){console.error("Error in instrumentation.onRequestError:",e)}}let i=null;function u(){return i||(i=n()),i}function d(e){return`The edge runtime does not support Node.js '${e}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`}process!==e.g.process&&(process.env=e.g.process.env,e.g.process=process);try{Object.defineProperty(globalThis,"__import_unsupported",{value:function(e){let t=new Proxy(function(){},{get(t,a){if("then"===a)return{};throw Object.defineProperty(Error(d(e)),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0})},construct(){throw Object.defineProperty(Error(d(e)),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0})},apply(a,n,r){if("function"==typeof r[0])return r[0](t);throw Object.defineProperty(Error(d(e)),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0})}});return new Proxy({},{get:()=>t})},enumerable:!1,configurable:!1})}catch{}u(),e.s(["edgeInstrumentationOnRequestError",()=>r,"ensureInstrumentationRegistered",()=>u,"getEdgeInstrumentationModule",()=>t])},59441,e=>{"use strict";let t=(0,e.i(10661).neon)(process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL);function a(e){let t=e??new Date,a=t.getUTCDay(),n=new Date(t);n.setUTCDate(t.getUTCDate()+(0===a?-6:1-a)),n.setUTCHours(0,0,0,0);let r=new Date(n);return r.setUTCDate(n.getUTCDate()+6),r.setUTCHours(23,59,59,999),{week_start:n.toISOString(),week_end:r.toISOString()}}function n(){let e=new Date,t=new Date(e);return t.setUTCDate(e.getUTCDate()-7),a(t)}async function r(e,a){let n=await t`
    SELECT
      id,
      driver_code,
      full_name,
      COALESCE(payouts_enabled, FALSE)            AS payouts_enabled,
      COALESCE(payout_onboarding_status, 'not_started') AS payout_onboarding_status,
      COALESCE(payout_method, 'not_set')          AS payout_method,
      stripe_account_id,
      COALESCE(stripe_account_status, 'not_connected') AS stripe_account_status
    FROM drivers
    WHERE driver_status = 'active'
      AND (${a??null}::uuid IS NULL OR id = ${a??null}::uuid)
    ORDER BY full_name
  `,r=[],i=[];for(let a of n){let n=a.id,u=(await t`
      SELECT
        id,
        booking_id,
        earning_role,
        amount_earned,
        pct_applied,
        posted_at,
        ledger_status
      FROM driver_earnings_ledger
      WHERE driver_id = ${n}::uuid
        AND earning_role IN ('source_driver', 'executor_driver')
        AND ledger_status = 'unpaid'
        AND payout_batch_uuid IS NULL
        AND posted_at >= ${e.week_start}::timestamptz
        AND posted_at <= ${e.week_end}::timestamptz
      ORDER BY posted_at ASC
    `).map(e=>({ledger_id:e.id,booking_id:e.booking_id,earning_role:e.earning_role,amount_earned:Number(e.amount_earned),pct_applied:Number(e.pct_applied),posted_at:e.posted_at,ledger_status:e.ledger_status})),d=u.reduce((e,t)=>e+t.amount_earned,0),s=!!a.payouts_enabled,o=a.payout_onboarding_status,_=null;s?"complete"!==o?_=`payout_onboarding_incomplete (status: ${o})`:0===u.length&&(_="no_unpaid_earnings_in_range"):_="payouts_not_enabled";let l={driver_id:n,driver_code:a.driver_code,driver_name:a.full_name,payouts_enabled:s,payout_onboarding_status:o,payout_method:a.payout_method,stripe_account_id:a.stripe_account_id,stripe_account_status:a.stripe_account_status,eligible:null===_,ineligible_reason:_,unpaid_earnings_count:u.length,total_amount:d,currency:"USD",earnings:u};null===_?r.push(l):i.push(l)}return{week_start:e.week_start,week_end:e.week_end,eligible_drivers:r,ineligible_drivers:i,total_eligible_amount:r.reduce((e,t)=>e+t.total_amount,0),total_eligible_drivers:r.length,preview_at:new Date().toISOString()}}async function i(e,a){let n=await r(e),i=[],u=[],d=0,s=0;for(let r of n.eligible_drivers){let n=await t`
      SELECT id, status FROM payout_batches
      WHERE driver_id  = ${r.driver_id}::uuid
        AND week_start = ${e.week_start}::timestamptz
        AND status NOT IN ('cancelled')
      LIMIT 1
    `;if(n.length>0){i.push({batch_id:n[0].id,driver_id:r.driver_id,driver_code:r.driver_code,driver_name:r.driver_name,total_amount:r.total_amount,earnings_count:r.unpaid_earnings_count,status:n[0].status,skipped:!0,skip_reason:"batch_already_exists"}),s++;continue}try{let[n]=await t`
        INSERT INTO payout_batches (
          driver_id, week_start, week_end,
          total_amount, earnings_count, currency,
          status, payment_method, created_by_admin_id
        ) VALUES (
          ${r.driver_id}::uuid,
          ${e.week_start}::timestamptz,
          ${e.week_end}::timestamptz,
          ${r.total_amount},
          ${r.unpaid_earnings_count},
          'USD',
          'pending_payout',
          ${r.payout_method??"not_set"},
          ${a??null}
        )
        RETURNING id, status
      `,u=n.id,s=r.earnings.map(e=>e.ledger_id);s.length>0&&await t`
          UPDATE driver_earnings_ledger
          SET
            ledger_status    = 'pending_payout',
            payout_batch_uuid = ${u}::uuid,
            updated_at        = NOW()
          WHERE id = ANY(${s}::uuid[])
            AND ledger_status = 'unpaid'
            AND payout_batch_uuid IS NULL
        `,i.push({batch_id:u,driver_id:r.driver_id,driver_code:r.driver_code,driver_name:r.driver_name,total_amount:r.total_amount,earnings_count:r.unpaid_earnings_count,status:"pending_payout",skipped:!1}),d++}catch(e){u.push(`driver ${r.driver_code}: ${e?.message}`)}}return{ok:0===u.length,batches_created:d,batches_skipped:s,batches:i,errors:u}}async function u(e,a){let[n]=await t`
    SELECT id, status, driver_id FROM payout_batches
    WHERE id = ${e}::uuid
    LIMIT 1
  `;if(!n)return{ok:!1,batch_id:e,previous_status:"unknown",new_status:"unknown",earnings_updated:0,error:"Batch not found"};let r=n.status;if("pending_payout"!==r)return{ok:!1,batch_id:e,previous_status:r,new_status:r,earnings_updated:0,error:`Cannot transition from '${r}' to 'paid'. Expected 'pending_payout'.`};let i=new Date().toISOString();await t`
    UPDATE payout_batches
    SET
      status             = 'paid',
      executed_at        = ${i}::timestamptz,
      external_reference = COALESCE(${a?.external_reference??null}, external_reference),
      notes              = COALESCE(${a?.notes??null}, notes),
      updated_at         = NOW()
    WHERE id = ${e}::uuid
  `;let u=await t`
    UPDATE driver_earnings_ledger
    SET
      ledger_status = 'paid',
      paid_out_at   = ${i}::timestamptz,
      updated_at    = NOW()
    WHERE payout_batch_uuid = ${e}::uuid
      AND ledger_status = 'pending_payout'
    RETURNING id
  `;return await t`
    UPDATE drivers
    SET last_payout_date = ${i}::timestamptz, updated_at = NOW()
    WHERE id = ${n.driver_id}::uuid
  `,{ok:!0,batch_id:e,previous_status:r,new_status:"paid",earnings_updated:u.length}}async function d(e,a){let[n]=await t`
    SELECT id, status FROM payout_batches
    WHERE id = ${e}::uuid
    LIMIT 1
  `;if(!n)return{ok:!1,batch_id:e,previous_status:"unknown",new_status:"unknown",earnings_updated:0,error:"Batch not found"};let r=n.status;if("paid"!==r)return{ok:!1,batch_id:e,previous_status:r,new_status:r,earnings_updated:0,error:`Cannot transition from '${r}' to 'reconciled'. Expected 'paid'.`};let i=new Date().toISOString();await t`
    UPDATE payout_batches
    SET
      status        = 'reconciled',
      reconciled_at = ${i}::timestamptz,
      notes         = COALESCE(${a?.notes??null}, notes),
      updated_at    = NOW()
    WHERE id = ${e}::uuid
  `;let u=await t`
    UPDATE driver_earnings_ledger
    SET
      ledger_status = 'reconciled',
      updated_at    = NOW()
    WHERE payout_batch_uuid = ${e}::uuid
      AND ledger_status = 'paid'
    RETURNING id
  `;return{ok:!0,batch_id:e,previous_status:r,new_status:"reconciled",earnings_updated:u.length}}async function s(e,a){let[n]=await t`
    SELECT id, status FROM payout_batches
    WHERE id = ${e}::uuid
    LIMIT 1
  `;if(!n)return{ok:!1,batch_id:e,previous_status:"unknown",new_status:"unknown",earnings_updated:0,error:"Batch not found"};let r=n.status;if(!["draft","pending_payout"].includes(r))return{ok:!1,batch_id:e,previous_status:r,new_status:r,earnings_updated:0,error:`Cannot cancel batch in status '${r}'.`};await t`
    UPDATE payout_batches
    SET
      status       = 'cancelled',
      cancelled_at = NOW(),
      notes        = COALESCE(${a?.notes??null}, notes),
      updated_at   = NOW()
    WHERE id = ${e}::uuid
  `;let i=await t`
    UPDATE driver_earnings_ledger
    SET
      ledger_status     = 'unpaid',
      payout_batch_uuid = NULL,
      updated_at        = NOW()
    WHERE payout_batch_uuid = ${e}::uuid
      AND ledger_status IN ('pending_payout')
    RETURNING id
  `;return{ok:!0,batch_id:e,previous_status:r,new_status:"cancelled",earnings_updated:i.length}}async function o(e){let a=e?.limit??50;return await t`
    SELECT
      pb.id,
      pb.driver_id,
      d.driver_code,
      d.full_name AS driver_name,
      pb.week_start,
      pb.week_end,
      pb.total_amount,
      pb.earnings_count,
      pb.currency,
      pb.status,
      pb.payment_method,
      pb.external_reference,
      pb.notes,
      pb.executed_at,
      pb.reconciled_at,
      pb.cancelled_at,
      pb.created_at
    FROM payout_batches pb
    JOIN drivers d ON d.id = pb.driver_id
    WHERE (${e?.driverId??null}::uuid IS NULL OR pb.driver_id = ${e?.driverId??null}::uuid)
      AND (${e?.status??null}::text IS NULL OR pb.status = ${e?.status??null})
    ORDER BY pb.created_at DESC
    LIMIT ${a}
  `}e.s(["cancelBatch",()=>s,"generateWeeklyPayoutBatch",()=>i,"getPayoutBatchHistory",()=>o,"getPreviousWeekRange",()=>n,"getWeekRange",()=>a,"markBatchPaid",()=>u,"markBatchReconciled",()=>d,"previewWeeklyPayout",()=>r])},46975,(e,t,a)=>{self._ENTRIES||={};let n=Promise.resolve().then(()=>e.i(75352));n.catch(()=>{}),self._ENTRIES["middleware_app/api/admin/test-payout-lifecycle/route"]=new Proxy(n,{get(e,t){if("then"===t)return(t,a)=>e.then(t,a);let a=(...a)=>e.then(e=>(0,e[t])(...a));return a.then=(a,n)=>e.then(e=>e[t]).then(a,n),a}})}]);

//# sourceMappingURL=%5Broot-of-the-server%5D__fdcf1c97._.js.map