import { supabase } from './_lib/supabase.js';

// The bot reports the outcome: { orderId, result: 'sent' | 'failed', error?, retry? }
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.BOT_SECRET}`) return res.status(401).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { orderId, result, error, retry } = req.body || {};
  if (!orderId || !['sent', 'failed'].includes(result)) {
    return res.status(400).json({ message: 'orderId and result (sent|failed) required' });
  }

  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return res.status(404).json({ message: 'order not found' });
  if (order.fulfilment_status !== 'processing') {
    // Already settled (or flagged as stale). Acknowledge without changing anything.
    return res.status(200).json({ ok: true, ignored: true, current: order.fulfilment_status });
  }

  const now = new Date().toISOString();
  let patch;
  if (result === 'sent') {
    patch = { fulfilment_status: 'sent', fulfilled_at: now, fulfilment_error: null, updated_at: now };
  } else if (retry === true && order.fulfilment_attempts < 3) {
    // Only retry when the bot is SURE nothing was delivered (e.g. USSD session never opened).
    patch = { fulfilment_status: 'queued', fulfilment_error: String(error || 'retry').slice(0, 300), updated_at: now };
  } else {
    patch = { fulfilment_status: 'failed', fulfilment_error: String(error || 'failed').slice(0, 300), updated_at: now };
  }

  const { error: upErr } = await supabase.from('orders').update(patch)
    .eq('id', orderId).eq('fulfilment_status', 'processing');
  if (upErr) return res.status(500).json({ message: 'update failed' });
  return res.status(200).json({ ok: true, fulfilment_status: patch.fulfilment_status });
}