import { supabase } from './_lib/supabase.js';

// The bot calls this to get the next paid order to deliver.
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.BOT_SECRET}`) return res.status(401).end();
  if (req.method !== 'POST') return res.status(405).end();

  // A claim older than 10 minutes means the bot died mid-delivery. The bundle may
  // already have been sent, so DO NOT retry automatically. Flag it for a human.
  await supabase.from('orders').update({
    fulfilment_status: 'failed',
    fulfilment_error: 'STALE_CLAIM: check the recipient manually before retrying',
    updated_at: new Date().toISOString(),
  })
    .eq('fulfilment_status', 'processing')
    .lt('fulfilment_claimed_at', new Date(Date.now() - 10 * 60000).toISOString());

  const { data, error } = await supabase.rpc('claim_next_order');
  if (error) {
    console.error('claim failed', error);
    return res.status(500).json({ message: 'claim failed' });
  }
  const order = Array.isArray(data) ? data[0] : data;
  if (!order) return res.status(200).json({ order: null });

  return res.status(200).json({
    order: {
      id: order.id,
      planId: order.plan_id,
      recipient: order.recipient, // 2547XXXXXXXX
      amount: order.amount,
      attempt: order.fulfilment_attempts,
    },
  });
}