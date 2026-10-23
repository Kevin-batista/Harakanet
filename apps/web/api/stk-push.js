import { supabase } from './_lib/supabase.js';
import { stkPush } from './_lib/daraja.js';
import { PLAN_PRICES, nightWindowOpen, normalizePhone } from './_lib/plans.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { planId, recipient, payer } = req.body || {};

  // 1. Validate everything server-side. Never trust the browser.
  const plan = PLAN_PRICES[planId];
  if (!plan) return res.status(400).json({ message: 'Unknown bundle.' });
  if (plan.nightOnly && !nightWindowOpen()) {
    return res.status(400).json({ message: 'This bundle is only sold from 11 PM to 7 PM.' });
  }
  const recipientNorm = normalizePhone(recipient);
  const payerNorm = normalizePhone(payer);
  if (!recipientNorm || !payerNorm) {
    return res.status(400).json({ message: 'Enter a valid Safaricom number.' });
  }

  // 2. Double-tap guard: reuse a push sent in the last 60s for the same payer + bundle.
  const since = new Date(Date.now() - 60000).toISOString();
  const { data: dup } = await supabase
    .from('orders').select('checkout_request_id')
    .eq('payer', payerNorm).eq('plan_id', planId)
    .in('status', ['initiated', 'pending']).gte('created_at', since)
    .not('checkout_request_id', 'is', null).limit(1).maybeSingle();
  if (dup) return res.status(200).json({ checkoutRequestId: dup.checkout_request_id });

  // 3. Create the order BEFORE calling Daraja so the callback always finds a row.
  const { data: order, error: insertErr } = await supabase
    .from('orders')
    .insert({ plan_id: planId, amount: plan.price, recipient: recipientNorm, payer: payerNorm })
    .select().single();
  if (insertErr) {
    console.error('order insert failed', insertErr);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }

  // 4. Fire the STK Push.
  try {
    const { checkoutRequestId, merchantRequestId } = await stkPush({
      amount: plan.price,
      payer: payerNorm,
      reference: order.id.slice(0, 8),
    });
    await supabase.from('orders').update({
      checkout_request_id: checkoutRequestId,
      merchant_request_id: merchantRequestId,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }).eq('id', order.id);

    return res.status(200).json({ checkoutRequestId });
  } catch (err) {
    console.error('stk push failed', err.message);
    await supabase.from('orders').update({
      status: 'failed', result_desc: err.message, updated_at: new Date().toISOString(),
    }).eq('id', order.id);
    return res.status(502).json({ message: 'We could not start the payment. Please try again.' });
  }
}