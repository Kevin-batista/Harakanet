import { supabase } from './_lib/supabase.js';
import { stkQuery, resultMessage } from './_lib/daraja.js';
import { settle } from './_lib/orders.js';

// How the DB row maps to the shape the React page expects.
function view(o) {
  if (o.status === 'success') return { status: 'success' };
  if (o.status === 'cancelled') return { status: 'cancelled', message: resultMessage(1032) };
  if (o.status === 'failed') return { status: 'failed', message: resultMessage(o.result_code, 'The payment did not go through.') };
  if (o.status === 'timeout') {
    return { status: 'failed', message: 'We did not get a confirmation in time. If M-Pesa charged you, message us on WhatsApp with your confirmation message.' };
  }
  return { status: 'pending' };
}

export default async function handler(req, res) {
  const id = String(req.query.checkoutRequestId || '');
  if (!id) return res.status(400).json({ status: 'failed', message: 'Missing order.' });

  const { data: order } = await supabase
    .from('orders').select('*').eq('checkout_request_id', id).maybeSingle();
  if (!order) return res.status(404).json({ status: 'failed', message: 'Order not found.' });

  // Still pending after 20s? The callback may be late or lost, so ask Daraja directly.
  // Throttled to once per 8s per order so we never hammer the API.
  const age = Date.now() - new Date(order.created_at).getTime();
  const sinceUpdate = Date.now() - new Date(order.updated_at).getTime();
  if (order.status === 'pending' && age > 20000 && sinceUpdate > 8000) {
    const q = await stkQuery(id);
    if (q) {
      const settled = await settle(id, q);
      return res.status(200).json(view(settled || order));
    }
    await supabase.from('orders').update({ updated_at: new Date().toISOString() }).eq('id', order.id);
  }

  return res.status(200).json(view(order));
}