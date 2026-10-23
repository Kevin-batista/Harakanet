import { supabase } from './_lib/supabase.js';
import { stkQuery } from './_lib/daraja.js';
import { settle } from './_lib/orders.js';

// Hit this every minute. It resolves orders the callback never reported.
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  const now = Date.now();
  const { data: rows } = await supabase
    .from('orders').select('*')
    .in('status', ['initiated', 'pending'])
    .lt('created_at', new Date(now - 90000).toISOString())
    .limit(25);

  let resolved = 0;
  for (const o of rows || []) {
    const ageMin = (now - new Date(o.created_at).getTime()) / 60000;

    // Never reached Daraja (crashed mid-request).
    if (!o.checkout_request_id) {
      if (ageMin > 2) {
        await supabase.from('orders').update({ status: 'failed', result_desc: 'NEVER_SENT' }).eq('id', o.id);
        resolved++;
      }
      continue;
    }

    const q = await stkQuery(o.checkout_request_id);
    if (q) { await settle(o.checkout_request_id, q); resolved++; }
    else if (ageMin > 10) {
      // 'timeout' can still flip to 'success' if a late callback arrives.
      await supabase.from('orders').update({ status: 'timeout' }).eq('id', o.id);
      resolved++;
    }
  }
  return res.status(200).json({ checked: rows?.length || 0, resolved });
}