const BASE =
  process.env.DARAJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

// Sandbox shortcode 174379 is Paybill-style, so the sandbox only accepts PayBill.
// A real Till (production) must use BuyGoods. Chosen automatically from DARAJA_ENV.
const TX_TYPE =
  process.env.DARAJA_ENV === 'production'
    ? 'CustomerBuyGoodsOnline'
    : 'CustomerPayBillOnline';

let tokenCache = { value: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  const basic = Buffer.from(
    `${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`
  ).toString('base64');
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`Daraja auth failed (${res.status})`);
  const data = await res.json();
  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
  };
  return tokenCache.value;
}

/** YYYYMMDDHHmmss in East Africa Time. */
function timestamp() {
  return new Date(Date.now() + 3 * 3600000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

function password(ts) {
  return Buffer.from(
    `${process.env.DARAJA_SHORTCODE}${process.env.DARAJA_PASSKEY}${ts}`
  ).toString('base64');
}

/** STK Push for a Till: TransactionType CustomerBuyGoodsOnline, PartyB = the Till. */
export async function stkPush({ amount, payer, reference }) {
  const ts = timestamp();
  const token = await getToken();
  // Keep "mpesa", "safaricom", "daraja" out of this URL: Daraja rejects such callback URLs.
  const callbackUrl = `${process.env.PUBLIC_BASE_URL}/api/pay-callback?token=${process.env.CALLBACK_SECRET}`;

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: process.env.DARAJA_SHORTCODE,
      Password: password(ts),
      Timestamp: ts,
      TransactionType: TX_TYPE,
      Amount: Math.round(amount),
      PartyA: payer,
      PartyB: process.env.DARAJA_TILL,
      PhoneNumber: payer,
      CallBackURL: callbackUrl,
      AccountReference: String(reference).slice(0, 12),
      TransactionDesc: 'Haraka Net',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || String(data.ResponseCode) !== '0') {
    throw new Error(data.errorMessage || data.ResponseDescription || 'Daraja rejected the request');
  }
  return { checkoutRequestId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID };
}

/** Returns { resultCode, resultDesc }, or null while Daraja is still processing. */
export async function stkQuery(checkoutRequestId) {
  const ts = timestamp();
  const token = await getToken();
  const res = await fetch(`${BASE}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: process.env.DARAJA_SHORTCODE,
      Password: password(ts),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ResultCode === undefined) return null;
  return { resultCode: Number(data.ResultCode), resultDesc: data.ResultDesc };
}

export function resultMessage(code, fallback) {
  const map = {
    0: 'Payment received.',
    1: 'Your M-Pesa balance is too low for this bundle. Top up and try again.',
    1001: 'Another M-Pesa request is already in progress on your phone. Wait a minute and retry.',
    1019: 'The payment request expired. Please try again.',
    1025: 'We could not send the prompt to your phone. Check your network and try again.',
    1032: 'The payment request was cancelled on your phone.',
    1037: 'The prompt timed out because your phone could not be reached. Try again.',
    2001: 'Wrong M-Pesa PIN. Please try again.',
    9999: 'We could not send the prompt to your phone. Please try again.',
  };
  return map[Number(code)] || fallback || 'The payment did not go through.';
}