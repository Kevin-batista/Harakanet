import { settle } from './_lib/orders.js';

export default async function handler(req, res) {
  // Daraja callbacks are unsigned, so a secret in the URL is how we know it's really us being called.
  if (req.query.token !== process.env.CALLBACK_SECRET) return res.status(401).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const cb = req.body?.Body?.stkCallback;
    if (cb?.CheckoutRequestID) {
      // On success, CallbackMetadata.Item is [{Name, Value}, ...]
      const items = cb.CallbackMetadata?.Item || [];
      const pick = (name) => items.find((i) => i.Name === name)?.Value;

      await settle(cb.CheckoutRequestID, {
        resultCode: cb.ResultCode,
        resultDesc: cb.ResultDesc,
        receipt: pick('MpesaReceiptNumber'),
        amount: pick('Amount'),
      });
    }
  } catch (err) {
    // Log, but still answer 200. The reconcile job will fix anything we missed.
    console.error('callback error', err);
  }

  // Always acknowledge quickly, or Safaricom may retry.
  return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
}