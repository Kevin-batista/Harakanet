import { supabase } from './supabase.js';

export function statusFromCode(code) {
  const c = Number(code);
  if (c === 0) return 'success';
  if (c === 1032) return 'cancelled';
  return 'failed';
}

/**
 * Idempotent: safe to call many times for the same order.
 * - Never downgrades a 'success'.
 * - A late success still overrides 'failed' / 'timeout' (customer paid after we gave up).
 * - Only queues fulfilment when the amount paid matches the order.
 */
export async function settle(checkoutRequestId, { resultCode, resultDesc, receipt, amount }) {
  const { data: order } = await supabase
    .from('orders').select('*').eq('checkout_request_id', checkoutRequestId).maybeSingle();
  if (!order) return null;

  // Already paid: only backfill the receipt (STK Query has none, the callback does).
  if (order.status === 'success') {
    if (receipt && !order.mpesa_receipt) {
      await supabase.from('orders').update({ mpesa_receipt: receipt }).eq('id', order.id);
    }
    return order;
  }

  const status = statusFromCode(resultCode);
  const patch = {
    status,
    result_code: Number(resultCode),
    result_desc: resultDesc ?? null,
    updated_at: new Date().toISOString(),
  };

  if (status === 'success') {
    patch.paid_at = new Date().toISOString();
    if (receipt) patch.mpesa_receipt = receipt;
    const amountOk = amount === undefined || Number(amount) === order.amount;
    patch.fulfilment_status = amountOk ? 'queued' : 'none';
    if (!amountOk) patch.result_desc = `AMOUNT_MISMATCH: paid ${amount}, expected ${order.amount}`;
  }

  const { data } = await supabase
    .from('orders').update(patch).eq('id', order.id).neq('status', 'success').select().maybeSingle();
  return data || order;
}