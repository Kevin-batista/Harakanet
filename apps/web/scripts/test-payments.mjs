// End-to-end payment tests. Run:  node --env-file=.env.local scripts/test-payments.mjs
// Live parts hit the Daraja SANDBOX through your deployed site. Failure cases are
// simulated by inserting TEST_ orders into Supabase and posting fake callbacks.
import { createClient } from '@supabase/supabase-js';

const BASE = (process.env.BASE_URL || '').replace(/\/$/, '');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CALLBACK_SECRET, CRON_SECRET, REAL_CHECKOUT_ID } = process.env;
for (const [k, v] of Object.entries({ BASE_URL: BASE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CALLBACK_SECRET, CRON_SECRET })) {
  if (!v) { console.error(`Missing ${k} in .env.local`); process.exit(1); }
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PHONE = '254708374149';
const RECIPIENT = '254700000001'; // marks test rows for cleanup
let pass = 0, fail = 0, warn = 0, seq = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
};
const note = (name, extra = '') => { warn++; console.log(`  WARN  ${name} ${extra}`); };
const section = (t) => console.log(`\n== ${t}`);

async function call(method, path, body, headers = {}) {
  let lastErr;
  // Retry network-level failures (slow or flaky connections), not HTTP errors.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      return { status: res.status, body: await res.json().catch(() => null) };
    } catch (e) {
      lastErr = e;
      console.log(`  (network hiccup on ${method} ${path}, retry ${attempt}/3)`);
      await sleep(1500);
    }
  }
  throw lastErr;
}
const status = (id) => call('GET', `/api/payment-status?checkoutRequestId=${encodeURIComponent(id)}`);
const callback = (body, token = CALLBACK_SECRET) =>
  call('POST', `/api/pay-callback?token=${encodeURIComponent(token)}`, body);

async function seed(over = {}) {
  const checkout = `TEST_${Date.now()}_${seq++}`;
  const { data, error } = await db.from('orders').insert({
    checkout_request_id: checkout, plan_id: 'b20', amount: 20,
    recipient: RECIPIENT, payer: PHONE, status: 'pending', ...over,
  }).select().single();
  if (error) throw new Error(`seed failed: ${error.message}`);
  return data;
}
const row = async (id) => (await db.from('orders').select('*').eq('id', id).single()).data;
const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

const cbBody = (checkout, code, desc, items) => ({
  Body: { stkCallback: {
    MerchantRequestID: 'm-test', CheckoutRequestID: checkout, ResultCode: code, ResultDesc: desc,
    ...(items ? { CallbackMetadata: { Item: items } } : {}),
  } },
});
const paidItems = (amount, receipt) => [
  { Name: 'Amount', Value: amount }, { Name: 'MpesaReceiptNumber', Value: receipt },
  { Name: 'TransactionDate', Value: 20261023120000 }, { Name: 'PhoneNumber', Value: 254708374149 },
];
const receipt = () => `TST${Date.now().toString(36).toUpperCase()}${seq++}`;

async function main() {
  console.log(`Testing ${BASE}`);

  // ---------------------------------------------------------------- A
  section('A. Input validation (no Daraja call)');
  let r = await call('POST', '/api/stk-push', { planId: 'nope', recipient: PHONE, payer: PHONE });
  ok('unknown bundle rejected (400)', r.status === 400, `got ${r.status}`);
  r = await call('POST', '/api/stk-push', { planId: 'b20', recipient: '12345', payer: PHONE });
  ok('invalid recipient number rejected (400)', r.status === 400, `got ${r.status}`);
  r = await call('POST', '/api/stk-push', { planId: 'b20', recipient: PHONE, payer: 'abc' });
  ok('invalid payer number rejected (400)', r.status === 400, `got ${r.status}`);
  r = await call('POST', '/api/stk-push');
  ok('empty body rejected (400)', r.status === 400, `got ${r.status}`);
  r = await call('GET', '/api/stk-push');
  ok('GET on stk-push rejected (405)', r.status === 405, `got ${r.status}`);
  r = await status('does-not-exist');
  ok('unknown order returns failed + message', r.body?.status === 'failed' && !!r.body?.message, JSON.stringify(r.body));

  // ---------------------------------------------------------------- B
  section('B. LIVE sandbox push (real Daraja call, real callback)');
  r = await call('POST', '/api/stk-push', { planId: 'b20', recipient: PHONE, payer: PHONE });
  ok('STK push accepted by Daraja (200 + checkoutRequestId)', r.status === 200 && !!r.body?.checkoutRequestId, `${r.status} ${JSON.stringify(r.body)}`);
  const liveId = r.body?.checkoutRequestId;
  if (liveId) {
    const again = await call('POST', '/api/stk-push', { planId: 'b20', recipient: PHONE, payer: PHONE });
    ok('double-tap returns the SAME checkoutRequestId', again.body?.checkoutRequestId === liveId, JSON.stringify(again.body));
    const { count } = await db.from('orders').select('*', { count: 'exact', head: true }).eq('checkout_request_id', liveId);
    ok('only one order row created for the double-tap', count === 1, `count=${count}`);

    // Price tampering: browser claims Ksh 1 for the Ksh 120 bundle.
    const tamper = await call('POST', '/api/stk-push', { planId: 'p120', amount: 1, recipient: PHONE, payer: PHONE });
    if (tamper.body?.checkoutRequestId) {
      const t = (await db.from('orders').select('amount').eq('checkout_request_id', tamper.body.checkoutRequestId).single()).data;
      ok('server ignores client amount (Ksh 120 charged, not 1)', t?.amount === 120, `amount=${t?.amount}`);
    } else note('tamper test skipped', JSON.stringify(tamper.body));

    process.stdout.write('  ...waiting up to 90s for the sandbox callback ');
    let final = null;
    for (let i = 0; i < 30; i++) {
      await sleep(3000); process.stdout.write('.');
      const s = await status(liveId);
      if (s.body?.status && s.body.status !== 'pending') { final = s.body; break; }
    }
    console.log('');
    if (final?.status === 'success') {
      ok('sandbox callback (or STK Query fallback) marked order success', true);
      const o = (await db.from('orders').select('*').eq('checkout_request_id', liveId).single()).data;
      ok('receipt stored', !!o.mpesa_receipt, 'no receipt yet (backfilled by callback if it arrives later)');
      ok('fulfilment queued', o.fulfilment_status === 'queued', o.fulfilment_status);
      console.log(`  INFO  copy this for test D:  REAL_CHECKOUT_ID=${liveId}`);
    } else {
      ok('sandbox order reached a final state within 90s', false,
        `last=${JSON.stringify(final)}. Check PUBLIC_BASE_URL, CALLBACK_SECRET on Vercel, and Vercel function logs for pay-callback.`);
    }
  }

  // ---------------------------------------------------------------- C
  section('C. Simulated callbacks (seeded TEST_ orders)');
  let o, s;

  o = await seed(); const rc1 = receipt();
  r = await callback(cbBody(o.checkout_request_id, 0, 'ok', paidItems(20, rc1)));
  ok('success callback acknowledged (200 + ResultCode 0)', r.status === 200 && r.body?.ResultCode === 0, JSON.stringify(r));
  let d = await row(o.id);
  ok('status = success', d.status === 'success', d.status);
  ok('receipt saved', d.mpesa_receipt === rc1, d.mpesa_receipt);
  ok('paid_at set', !!d.paid_at);
  ok('fulfilment queued', d.fulfilment_status === 'queued', d.fulfilment_status);
  s = await status(o.checkout_request_id);
  ok('status endpoint says success', s.body?.status === 'success', JSON.stringify(s.body));

  await callback(cbBody(o.checkout_request_id, 0, 'ok', paidItems(20, rc1)));
  d = await row(o.id);
  ok('duplicate callback is harmless (still success, same receipt)', d.status === 'success' && d.mpesa_receipt === rc1);

  await callback(cbBody(o.checkout_request_id, 1032, 'cancelled'));
  d = await row(o.id);
  ok('failure callback AFTER success never downgrades the order', d.status === 'success', d.status);

  const failCases = [
    [1032, 'cancelled', 'cancelled', 'cancel'],
    [1, 'failed', 'failed', 'balance'],
    [2001, 'failed', 'failed', 'PIN'],
    [1037, 'failed', 'failed', 'timed out'],
    [1019, 'failed', 'failed', 'expired'],
    [1001, 'failed', 'failed', 'progress'],
    [4242, 'failed', 'failed', ''],
  ];
  for (const [code, dbStatus, apiStatus, word] of failCases) {
    o = await seed();
    await callback(cbBody(o.checkout_request_id, code, `code ${code}`));
    d = await row(o.id);
    s = await status(o.checkout_request_id);
    ok(`code ${code}: db=${dbStatus}, api=${apiStatus}, message OK`,
      d.status === dbStatus && s.body?.status === apiStatus && !!s.body?.message &&
      s.body.message.toLowerCase().includes(word.toLowerCase()) && d.fulfilment_status === 'none',
      `${d.status} / ${JSON.stringify(s.body)} / fulfil=${d.fulfilment_status}`);
  }

  o = await seed(); const rc2 = receipt();
  await callback(cbBody(o.checkout_request_id, 1, 'insufficient'));
  await callback(cbBody(o.checkout_request_id, 0, 'ok', paidItems(20, rc2)));
  d = await row(o.id);
  ok('late success after failure flips order to success (customer paid after we gave up)',
    d.status === 'success' && d.fulfilment_status === 'queued', `${d.status}/${d.fulfilment_status}`);

  o = await seed();
  await callback(cbBody(o.checkout_request_id, 0, 'ok', paidItems(5, receipt())));
  d = await row(o.id);
  ok('amount mismatch: marked success but NOT queued for fulfilment',
    d.status === 'success' && d.fulfilment_status === 'none' && String(d.result_desc).includes('AMOUNT_MISMATCH'),
    `${d.status}/${d.fulfilment_status}/${d.result_desc}`);

  r = await callback(cbBody('TEST_unknown_id', 0, 'ok', paidItems(20, receipt())));
  ok('callback for unknown order does not crash (200)', r.status === 200, `got ${r.status}`);
  r = await callback({});
  ok('malformed callback body does not crash (200)', r.status === 200, `got ${r.status}`);
  r = await callback(cbBody('x', 0, 'ok'), 'wrong-token');
  ok('wrong token rejected (401)', r.status === 401, `got ${r.status}`);
  r = await call('POST', '/api/pay-callback', cbBody('x', 0, 'ok'));
  ok('missing token rejected (401)', r.status === 401, `got ${r.status}`);
  r = await call('GET', `/api/pay-callback?token=${CALLBACK_SECRET}`);
  ok('GET on callback rejected (405)', r.status === 405, `got ${r.status}`);

  // ---------------------------------------------------------------- D
  section('D. Lost-callback fallback (STK Query)');
  if (!REAL_CHECKOUT_ID) {
    note('skipped', 'run again with REAL_CHECKOUT_ID=<id printed in section B> in .env.local');
  } else {
    const { data: real } = await db.from('orders').select('id').eq('checkout_request_id', REAL_CHECKOUT_ID).maybeSingle();
    if (!real) note('REAL_CHECKOUT_ID not found in orders');
    else {
      // Pretend the callback never arrived: reset the order to pending and age it.
      await db.from('orders').update({
        status: 'pending', result_code: null, result_desc: null, mpesa_receipt: null,
        paid_at: null, fulfilment_status: 'none', created_at: minsAgo(2), updated_at: minsAgo(1),
      }).eq('id', real.id);
      s = await status(REAL_CHECKOUT_ID);
      if (s.body?.status === 'success') ok('status endpoint recovered the payment via STK Query', true);
      else note('STK Query did not settle it', `${JSON.stringify(s.body)} (sandbox query is sometimes slow; retry in a minute)`);
    }
  }

  // ---------------------------------------------------------------- E
  section('E. Reconcile job');
  r = await call('GET', '/api/reconcile', undefined, { Authorization: 'Bearer wrong' });
  ok('reconcile rejects a wrong secret (401)', r.status === 401, `got ${r.status}`);

  const young = await seed({ created_at: minsAgo(3) });
  const old = await seed({ created_at: minsAgo(11) });
  const neverSent = await seed({ status: 'initiated', checkout_request_id: null, created_at: minsAgo(3) });
  r = await call('GET', '/api/reconcile', undefined, { Authorization: `Bearer ${CRON_SECRET}` });
  ok('reconcile runs (200)', r.status === 200, `got ${r.status} ${JSON.stringify(r.body)}`);
  ok('3-min-old pending order is left alone', (await row(young.id)).status === 'pending');
  d = await row(old.id);
  ok('11-min-old unresolved order becomes timeout', d.status === 'timeout', d.status);
  d = await row(neverSent.id);
  ok('order that never reached Daraja becomes failed', d.status === 'failed', d.status);

  s = await status(old.checkout_request_id);
  ok('timeout shows the customer a failed state + WhatsApp-style message',
    s.body?.status === 'failed' && /confirmation/i.test(s.body?.message || ''), JSON.stringify(s.body));
  await callback(cbBody(old.checkout_request_id, 0, 'ok', paidItems(20, receipt())));
  d = await row(old.id);
  ok('late callback rescues a timed-out order', d.status === 'success' && d.fulfilment_status === 'queued', `${d.status}/${d.fulfilment_status}`);

  // ---------------------------------------------------------------- cleanup
  await db.from('orders').delete().or(`checkout_request_id.like.TEST_%,recipient.eq.${RECIPIENT}`);
  console.log(`\nDone: ${pass} passed, ${fail} failed, ${warn} warnings.`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('\nTest run crashed:', e); process.exit(1); });