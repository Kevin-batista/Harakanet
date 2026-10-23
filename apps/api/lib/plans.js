// SERVER-SIDE price list. Must match PLANS in HomePage.jsx (id and price).
// The browser only sends a planId; we decide the price here.
export const PLAN_PRICES = {
  b19: { price: 19, nightOnly: true },
  b20: { price: 20 },
  b49: { price: 49 },
  b50: { price: 50, nightOnly: true },
  b55: { price: 55 },
  b99: { price: 99 },
  p22: { price: 22, nightOnly: true },
  p52: { price: 52 },
  p120: { price: 120 },
  s5: { price: 5 },
  s10: { price: 10 },
  s30: { price: 30 },
  m23: { price: 23 },
  m51: { price: 51 },
  m250: { price: 250 },
};

/** Night window: open 23:00 to 19:00 East Africa Time (UTC+3). */
export function nightWindowOpen(now = new Date()) {
  const h = new Date(now.getTime() + 3 * 3600000).getUTCHours();
  return h >= 23 || h < 19;
}

/** 07XX / 01XX / +254 / 254 -> 2547XXXXXXXX, or null. */
export function normalizePhone(raw) {
  const cleaned = String(raw || '').replace(/[\s-]/g, '');
  const m = cleaned.match(/^(?:\+?254|0)([71]\d{8})$/);
  return m ? `254${m[1]}` : null;
}