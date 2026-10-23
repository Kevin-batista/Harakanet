/**
 * ============================================================================
 *  HomePage.jsx  -  Haraka Net
 *  Fast, reliable, connected.
 * ============================================================================
 *
 *  A single, paste-in storefront page for selling data, SMS and minutes
 *  bundles. Everything lives in this one file: config, data, payment helpers,
 *  components and CSS (inlined through a <style> tag, no CSS files needed).
 *
 *  DEPENDENCIES
 *    npm i lucide-react
 *    (React 17+; works with Vite, CRA or Next client components)
 *
 *  HOW THE PAGE WORKS
 *    1. Customer browses bundles grouped by category (tabs filter them).
 *    2. Customer taps "Buy" -> checkout dialog opens.
 *    3. Customer enters the number that should receive the bundle.
 *    4. We call your backend, which fires an M-Pesa STK Push (Daraja).
 *       The customer gets the PIN prompt on their phone automatically, so
 *       nobody has to dig through the SIM toolkit.
 *    5. The dialog polls your backend until M-Pesa confirms or rejects.
 *    6. The Paybill number is shown as a manual fallback only.
 *
 *  SEARCH THIS FILE FOR  "CONNECT:"  TO FIND EVERY SPOT THAT TALKS TO YOUR
 *  BACKEND OR NEEDS YOUR REAL DETAILS.
 *
 *  DEMO MODE
 *    CONFIG.DEMO_MODE is true so the whole flow can be previewed without a
 *    backend (the fake payment "succeeds" after a few seconds). Set it to
 *    false once your endpoints exist.
 * ============================================================================
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Wifi,
  Zap,
  MessageSquare,
  PhoneCall,
  Clock,
  ShoppingCart,
  ShieldCheck,
  Smartphone,
  Moon,
  Copy,
  Check,
  X,
  Menu,
  ChevronDown,
  Headphones,
  Repeat,
  Loader2,
  AlertCircle,
  Lock,
  MessageCircle,
  ListChecks,
  Send,
  Star,
  Wallet,
} from 'lucide-react';

/* ============================================================================
 *  1. CONFIG
 * ========================================================================== */

const CONFIG = {
  BRAND: 'Haraka Net',
  TAGLINE: 'Fast, reliable, connected',

  // Your real icon files, exactly as named in your pack. They must sit
  // directly inside /public. Tried in order; first one that loads wins.
  // Write paths as "/file.png", never "/public/file.png".
  LOGO_FILES: [
    '/android-chrome-192x192.png',
    '/apple-touch-icon.png',
    '/favicon-48x48.png',
    '/favicon-32x32.png',
    '/favicon.ico',
  ],

  // Manual-payment fallback (shown in the checkout dialog and the footer).
  PAYBILL: '1836150',
  // What the customer types as the Account number when paying manually.
  // CONNECT: change this text if your fulfilment bot expects something else.
  ACCOUNT_HINT: 'the phone number that should get the bundle',

  // CONNECT: replace with your real support WhatsApp number (format 2547XXXXXXXX).
  SUPPORT_WHATSAPP: '254700000000',
  // Pre-filled text customers see when the WhatsApp chat opens.
  SUPPORT_MESSAGE: 'Hello Haraka Net, I need help with my bundle.',

  // CONNECT: flip to false when your backend endpoints below are live.
  DEMO_MODE: true,

  // CONNECT: base URL of your backend (Express on Vercel/Render, Supabase edge
  // functions, etc.). Example: 'https://api.harakanet.co.ke'
  API_BASE: '/api',

  // Payment polling: ask the backend for the result every 3s, give up at 90s.
  POLL_INTERVAL_MS: 3000,
  POLL_TIMEOUT_MS: 90000,

  // Night data window (East Africa Time, 24h clock).
  // Ksh 19, 22 and 50 data bundles are sold from 11:00 PM until 7:00 PM
  // the following evening, then they pause until 11:00 PM again.
  NIGHT_OPEN_HOUR: 23,
  NIGHT_CLOSE_HOUR: 19,
};

/* ============================================================================
 *  2. BUNDLE CATALOGUE
 *  Edit this array to change what is sold. Nothing else in the file needs to
 *  change. `mb` is only used to work out the "Ksh per GB" line on data plans.
 *  `nightOnly: true` marks the three bundles bound by the night window.
 * ========================================================================== */

const CATEGORIES = [
  {
    id: 'bingwa',
    name: 'Bingwa Offers',
    blurb: 'Everyday data at the lowest prices.',
    icon: Wifi,
    accent: '#1473C8',
  },
  {
    id: 'pata',
    name: 'Pata More Deals',
    blurb: 'A little extra data for a little extra.',
    icon: Zap,
    accent: '#0E9BC0',
  },
  {
    id: 'sms',
    name: 'SMS Deals',
    blurb: 'Text as much as you like, for less.',
    icon: MessageSquare,
    accent: '#3F5FD0',
  },
  {
    id: 'minutes',
    name: 'Minutes Deals',
    blurb: 'Talk time for calls that matter.',
    icon: PhoneCall,
    accent: '#E0640A',
  },
];

const PLANS = [
  // ---- Bingwa Offers -------------------------------------------------------
  { id: 'b19', cat: 'bingwa', price: 19, qty: '1', unit: 'GB', mb: 1024, validity: '1 hour', nightOnly: true, badge: 'Lowest price per GB' },
  { id: 'b20', cat: 'bingwa', price: 20, qty: '250', unit: 'MB', mb: 250, validity: '24 hours' },
  { id: 'b49', cat: 'bingwa', price: 49, qty: '400', unit: 'MB', mb: 400, validity: '7 days' },
  { id: 'b50', cat: 'bingwa', price: 50, qty: '1.5', unit: 'GB', mb: 1536, validity: '3 hours', nightOnly: true },
  { id: 'b55', cat: 'bingwa', price: 55, qty: '1', unit: 'GB', mb: 1024, validity: 'Till midnight' },
  { id: 'b99', cat: 'bingwa', price: 99, qty: '1.5', unit: 'GB', mb: 1536, validity: '24 hours' },

  // ---- Pata More Deals -----------------------------------------------------
  { id: 'p22', cat: 'pata', price: 22, qty: '1', unit: 'GB', mb: 1024, validity: '1 hour', nightOnly: true },
  { id: 'p52', cat: 'pata', price: 52, qty: '750', unit: 'MB', mb: 750, validity: '24 hours' },
  { id: 'p120', cat: 'pata', price: 120, qty: '2', unit: 'GB', mb: 2048, validity: '24 hours', badge: 'Best value for a full day' },

  // ---- SMS Deals -----------------------------------------------------------
  { id: 's5', cat: 'sms', price: 5, qty: '20', unit: 'SMS', validity: '24 hours' },
  { id: 's10', cat: 'sms', price: 10, qty: '200', unit: 'SMS', validity: '24 hours' },
  { id: 's30', cat: 'sms', price: 30, qty: '1,000', unit: 'SMS', validity: '7 days' },

  // ---- Minutes Deals -------------------------------------------------------
  { id: 'm23', cat: 'minutes', price: 23, qty: '45', unit: 'min', validity: '3 hours' },
  { id: 'm51', cat: 'minutes', price: 51, qty: '60', unit: 'min', validity: 'Till midnight' },
  { id: 'm250', cat: 'minutes', price: 250, qty: '200', unit: 'min', validity: '7 days' },
];

// Bundles shown as quick picks inside the hero card.
const QUICK_PICK_IDS = ['b20', 'b55', 'b99', 'p120'];

// Billboard behaviour
const QUICK_CYCLE_MS = 4800; // how long each offer stays on the board
const QUICK_RESUME_MS = 15000; // idle time before auto-rotation restarts
const BILLBOARD_TICKER = [
  'Lowest prices',
  'Buy many times daily',
  'Sent right after payment',
  'Secure M-Pesa checkout',
];

// Price filter chips above the bundle list.
const BUDGETS = [
  { id: 'all', label: 'Any', test: () => true },
  { id: 'u30', label: 'Under 30', test: (p) => p.price < 30 },
  { id: 'mid', label: '30–99', test: (p) => p.price >= 30 && p.price < 100 },
  { id: 'big', label: '100+', test: (p) => p.price >= 100 },
];

const FAQ_ITEMS = [
  {
    q: 'How do I pay?',
    a: 'Choose a bundle, enter your number and tap Pay with M-Pesa. A prompt appears on your phone automatically. Enter your M-Pesa PIN to approve it. You never need to open the SIM toolkit.',
  },
  {
    q: 'When do I get my bundle?',
    a: 'Your bundle is sent to your number as soon as M-Pesa confirms the payment. If it has not arrived after a few minutes, message us on WhatsApp with your M-Pesa confirmation message.',
  },
  {
    q: 'The M-Pesa prompt did not show up. What now?',
    a: 'Check that your phone has network and is unlocked, then try again. If it still does not appear, pay manually with our Paybill. The steps are in the checkout dialog.',
  },
  {
    q: 'Why are some bundles unavailable?',
    a: 'The Ksh 19, 22 and 50 data bundles are sold from 11:00 PM until 7:00 PM the next evening. Outside that window they pause and return at 11:00 PM.',
  },
  {
    q: 'Can I buy for someone else?',
    a: 'Yes. Enter their number as the receiving number at checkout. You can also pay from a different M-Pesa number than the one receiving the bundle.',
  },
  {
    q: 'How many times can I buy a bundle?',
    a: 'As many times as you need. Every bundle on this page can be bought again whenever you run low.',
  },
];

/* ============================================================================
 *  3. SMALL HELPERS
 * ========================================================================== */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Accepts 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX (spaces allowed)
 * and returns the Daraja-ready format 2547XXXXXXXX. Returns null if invalid.
 */
function normalizePhone(raw) {
  const cleaned = String(raw || '').replace(/[\s-]/g, '');
  const match = cleaned.match(/^(?:\+?254|0)([71]\d{8})$/);
  return match ? `254${match[1]}` : null;
}

/** 254712345678 -> 0712 345 678 (for friendly display) */
function formatLocal(normalized) {
  const local = `0${normalized.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** Current time in East Africa Time (UTC+3, no daylight saving). */
function getEatTime(date = new Date()) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + 3 * 3600000);
}

/**
 * Is the night data window open right now?
 * Open: 23:00 -> 19:00 next day.  Closed: 19:00 -> 23:00.
 */
function getNightWindow(date = new Date()) {
  const eat = getEatTime(date);
  const minutesNow = eat.getHours() * 60 + eat.getMinutes();
  const open =
    eat.getHours() >= CONFIG.NIGHT_OPEN_HOUR ||
    eat.getHours() < CONFIG.NIGHT_CLOSE_HOUR;

  let minutesUntilOpen = 0;
  if (!open) minutesUntilOpen = CONFIG.NIGHT_OPEN_HOUR * 60 - minutesNow;

  const h = Math.floor(minutesUntilOpen / 60);
  const m = minutesUntilOpen % 60;
  const countdown = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return { open, countdown };
}

/** Re-evaluates the night window every 30 seconds. */
function useNightWindow() {
  const [state, setState] = useState(() => getNightWindow());
  useEffect(() => {
    const id = setInterval(() => setState(getNightWindow()), 30000);
    return () => clearInterval(id);
  }, []);
  return state;
}

function perGb(plan) {
  if (!plan.mb) return null;
  return Math.round(plan.price / (plan.mb / 1024));
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================================
 *  4. PAYMENT API LAYER
 *
 *  Your backend needs two endpoints. Shapes below are what this page expects.
 *
 *  POST  {API_BASE}/stk-push
 *    body     { planId, amount, recipient, payer }
 *               recipient = number that receives the bundle  (2547XXXXXXXX)
 *               payer     = number that gets the M-Pesa prompt (2547XXXXXXXX)
 *    returns  { checkoutRequestId: string }
 *    server   Calls Daraja STK Push (CustomerPayBillOnline) for `amount`
 *             against Paybill 1836150, stores the pending order (e.g. in a
 *             Supabase `orders` table) keyed by CheckoutRequestID, and uses
 *             `recipient` as the AccountReference so your fulfilment bot
 *             knows who to credit.
 *
 *  GET   {API_BASE}/payment-status?checkoutRequestId=...
 *    returns  { status: 'pending' | 'success' | 'failed' | 'cancelled',
 *               message?: string }
 *    server   Reads the order row your Daraja callback URL updates:
 *               ResultCode 0    -> 'success'
 *               ResultCode 1032 -> 'cancelled' (customer dismissed the prompt)
 *               other codes     -> 'failed'
 * ========================================================================== */

const demoOrders = {}; // demo mode only: remembers when each fake order began

async function requestStkPush({ plan, recipient, payer }) {
  if (CONFIG.DEMO_MODE) {
    await sleep(1400);
    const id = `demo-${Date.now()}`;
    demoOrders[id] = Date.now();
    return { checkoutRequestId: id };
  }

  // CONNECT: STK Push request to your backend.
  const res = await fetch(`${CONFIG.API_BASE}/stk-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planId: plan.id,
      amount: plan.price,
      recipient,
      payer,
    }),
  });

  if (!res.ok) {
    let message = 'We could not start the payment. Please try again.';
    try {
      const body = await res.json();
      if (body && body.message) message = body.message;
    } catch (e) {
      /* response had no JSON body, keep the default message */
    }
    throw new Error(message);
  }
  return res.json();
}

async function checkPaymentStatus(checkoutRequestId) {
  if (CONFIG.DEMO_MODE) {
    const started = demoOrders[checkoutRequestId] || Date.now();
    return Date.now() - started > 6500
      ? { status: 'success' }
      : { status: 'pending' };
  }

  // CONNECT: payment status lookup on your backend.
  const res = await fetch(
    `${CONFIG.API_BASE}/payment-status?checkoutRequestId=${encodeURIComponent(
      checkoutRequestId
    )}`
  );
  if (!res.ok) return { status: 'pending' }; // transient error, keep polling
  return res.json();
}

/* ============================================================================
 *  5. LOGO
 *  Loads your icon files from /public (see CONFIG.LOGO_FILES), with an
 *  embedded copy of the same icon as a safety net.
 * ========================================================================== */

/**
 * Last-resort copy of your own icon (80px, embedded), used only if none of
 * the files in CONFIG.LOGO_FILES can be served.
 */
const LOGO_FALLBACK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAADAFBMVEXt9/vY7Pbd8PkAAAAPydj5hwgTd7D8/v8UhrYUqMcQaKji6/EVt9AL0tz3eAoQ1eH1ZxHV19AvyNOy2uMQlbvI2+QUmsIwia0ul7cJWJlQydOpx9VRl7NQ1Npq1duRyNWPtsuS2+FpmLey5OnYx6/z+vz1Vwot0NhSusrsli8rtcrct5nphS5uxtPsZyjqqFL1+/73/P0sapmwhk7ndi0KXaFztsi20t0veKaT4eXZmm7itnjkxZMSY5wzpLxKhauGqcLSu6vc4dnU6vze9Pvc8fvskRfll0z1/P801uJriodsqcOP1N3MiUjYqoXliU3ku4ctcp1YupRpt4uQjG6NtLaq///WfCnb8fnd8vvhzazh1bf8/v7x+/8np8VRa4ZZoLxVq8OVqqrRdkfYkVnKzMvd1L3immLmq2UAAP8YjMAGzeApbaFOXXdXZHlUh49akZVP1+JwanV1iHltqLh33OKKm36QloOIpm2SpZKwZk+5lFCmomavsrijv9DWXi3WiTzNn4fX5Pje9/8BS4knXIs7zuBDdJhDfqtbwJpTxbxhh6p6k4Vsr4ZwxLGYhl6IjZWMnquCs3uJt5ejxbHaZDLfjBXVjGHIo0/ZoH7cwJznfEHgp4ntsV/r0Jnk2sHk5twAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADqDeclAAAAyHRSTlP+/v4A////Bf//////////////////////////////////////y/////////////8yef//////////////////////EnvJ//9G/////////////////wP/L4r//4q///////////////8B////////////////////////////////J0f//////////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPXUE7IAAAczSURBVHjardmHX9vWFgfwe2RZ1rBsS7a8J2aDTdmEBAJJIEAgq0nT7KZZbV/3fG1fd9/ee48/9f3OlcEmwyLB55OQfGT7y7nnnHuVCBHyIxLB740bA+KZY+DGRsT/vAzR8vBr8jm0ljkZkUQbjIAThwqQkTYYCb1wUxwybr7gi8L3RA/CF0XPvJYoeuf5oohEIgO9AgeAiUhoUvQsJkMAI6KHAa2XCXKKoncV9KsoNkRPY0Pc6C14Qxx+xUr9yJ+svTUfEqP6RyXXvvg36xlzeEpi5SHbtlX74l8mDp5BrZzPu65bKn1Up/0vlVVVhReP/3w9fOxgWr3sqrsRt+2h0pFOk0o2Ltr2xZHw+n8PwiXz0eiepyKTeNweKkuS8nUhLIjsrYfDIwcoIQ1H/XDz+UYjX3Jd9QdM2jW85qpuXZB1BN6LYcQBSrg9KrXhSpJakayhBfH4UJIzi6vbljiixuMvrjN4LDg9A9poI0kWdcaQ6vqeXUN+qIPvha8HecuGETWGZXIdV62a9PKqrbIH9teSC4/8L8hLG8ZyZZ8mr7suvkceHYJXw/K5fv+eQAm794TupI1UFqk8+oLr56cyW8Yc/QHeUToxEj6vdAXn0kb6cY9EftSz6hjMPLwS0vyh9IhOnL7W1avo6V2vXnuvRLubrzJMVhK9b6BRJTXOXgwexvEEdV1wNp1KFdjjNGyVLN8rVMjaRufxRx3jM/SjcCx8nui6JQKG+oye1uek52LM1HJr6d48UcWQna+p7I2Hx/uJ/hPUEJHUdT3L7eXqY35rliw4rmA2bzVIls92Px8f/xreMZTxtYAENV2vcFa1KINDRAAVhURyOTWMLLFcO/6Lz2eu7Di+t36ta4qU0fUiJ2jxyRC3y/x3cEpDz/JgYlrim7+ZvnLlHryjPNMPqCtY0XStwu8g9JNXjAQVRSSz+pyH6qGs9ublna+vLHpkTcTgOdS1xaKo6RmP37KNzRyXK1YEzWXOoBn1Epqubv5xZ2f6LE9fLBwL9CijaUVUULGGDaO1YqVQ/JA5HNBxVS19Oj09vUrkjMCbIAro8bymaVW+g9AtBrFi8i5XPYuSZRenYdQtfQwP7b2GKeRtEnSwVk1Nm5e1xPEQt120wcHAJPNyJqM/KX88/dtL94nOgwv3U8B6eWhMbcHjfTucNqKYak6Banl5D4ga75U/uXTpE5TttVhMlu+oEwT2ASS5/1JpzCF2dOs+FTUMY7Pxq0sffOqhHYlYbMIhZyJ8vfsxY4miqWW4r5VU2sAxVd+W96koc8Zmfmvrg1c9csaR3xjxsRU+Fgyax1EZ6w5AHATyvmL44Q5vbW29StQPj3cxOeFAkHZBXjEMqaVx+Ejv3XffYQ/pLTq0CwZMIWpoXkDrKrpEgEFLLTdGDdctFt+5TDSWSCQw1SgLPQB4LQg8k7tQIFHI6ilQOkf2ToUaqehotpjxvVi/71E/wAdB4MqUJ+gVTX/jDViapher2MGVlDGazWQ+hJFIjDvSU0g5D9AJGkTPE4WMJi2cOnPyPppEMeEVPeqfSZz2fE/hYQyPBE02Xue9IsPvDmI5Hb2VzcJzZhIPWxyDIzHeywHgnmfmvl/hD5NooD2ZbKYAb3Bxz1Pouj+NAV5hyedmc7mlpCwVZQ0jldGrRKf3ecpRgE5ghlOmZmYys7OzpvaK7KU1lzLSGR0LHhu81/bwjTDfp+X9oesY5sxcn7cwa+rpVEWCHuZH13nBiRnqTBDnTewf8vjt1uMpM7diVXMmepz1ZAXnMOK63ke0mHA68+MNPe5f6NaR2SV0oo/B1ooJI67rC5zgaueClYcJ2RKlm8grRip0weROVzlBa5497bhH3+zs88YSscS5vStPHcKFKXStkGNwIbm7YoC/J7rb3+k56HCs44ryFHCqj9OcBchTzSsu8na+8AU5f/WHvOXNIMGzHSk/WST6aRVf3gRomlUfxDbUtNuryv2x9j+Lfe/hPu+JJJLDSfNljr2fyV3SAt9eJcdpe/1NHGHnvEfBx0RUrFCQo2jmpuZbn87wvnn77x3p0dkEew49Bu6JSnu6cBeeyuVyx3c9KnLDp+46uxWk1ZlEopm453V8i0djH6g4v+zDwveiir1tmp+d8z/mjP1zcLB1ZHdGF/CxWEBBtdvN5uLY2L/ONZkbnFl90hs7RoieKLWisMQ9eh/UoEwu0Vx0qFso8rbeJb6cYvH2Z39uNptffXX3m/vUPeT/6bu+Y77vzdySmfvxW2+9/7svkhQU4K6KgPd4herKSrVaCNYYvCo2BPUwwJ0c6KEoBk6K0Klegqf4cZ+i9MpTFPm4r3cpIkGAL0XWeiSKNWD8yPRl0ZNFK+JlfmQa6pXoe+3Hzodeb/uxM4vf3jykKG5+234wHgq9FIpMKs+/bnx0MgJk/w8XTp5aey4TH1o7dfKRHy6EQq8z+d3VtWcWlbWr3zH3egv6Px/F35uyuIOeAAAAAElFTkSuQmCC';

/** Drawn mark: only used if even the embedded copy cannot be decoded. */
function DrawnMark({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Haraka Net logo">
      <defs>
        <linearGradient id="hk-drawn-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12B5E5" />
          <stop offset="1" stopColor="#1060B8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#hk-drawn-grad)" />
      <path d="M19 20v26M19 33h24M43 33v13" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M34 38 L50 17" stroke="#FF8A2A" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <path d="M43 14 L54 11 L51.5 22 Z" fill="#FF8A2A" />
    </svg>
  );
}

/**
 * Header and footer logo. Order tried:
 *   1. each file in CONFIG.LOGO_FILES (from /public)
 *   2. the embedded copy of your icon (LOGO_FALLBACK)
 *   3. the drawn mark (DrawnMark)
 * Failed files are logged in the browser console (F12) so you can see which
 * paths are not being served.
 */
function LogoMark({ size = 40 }) {
  const sources = [...CONFIG.LOGO_FILES, LOGO_FALLBACK];
  const [index, setIndex] = useState(0);

  if (index >= sources.length) return <DrawnMark size={size} />;

  const src = sources[index];
  return (
    <img
      key={src}
      src={src}
      width={size}
      height={size}
      alt="Haraka Net logo"
      decoding="async"
      style={{ display: 'block', borderRadius: Math.round(size * 0.28), objectFit: 'contain' }}
      onError={() => {
        console.warn('[Haraka logo] could not load:', src.startsWith('data:') ? 'embedded copy' : src);
        setIndex((i) => i + 1);
      }}
    />
  );
}

function Logo({ light = false }) {
  return (
    <span className="hk-logo">
      <LogoMark size={40} />
      <span className="hk-logo-text">
        <span className="hk-logo-name" style={light ? { color: '#fff' } : undefined}>
          Haraka Net
        </span>
        <span className="hk-logo-tag" style={light ? { color: 'rgba(255,255,255,.7)' } : undefined}>
          {CONFIG.TAGLINE}
        </span>
      </span>
    </span>
  );
}

/* ============================================================================

- 6. BUNDLE BOARD
- One baby-blue card with three labelled sections: Data bundles, Minutes,
- SMS. Every bundle is a small square tile. Tap a tile and its details open
- right under that row. Tap it again, or press Close, to dismiss.
- ========================================================================== */

const catIndex = (id) => CATEGORIES.findIndex((c) => c.id === id);

// Section order on the board: data first, then minutes, then SMS.
const BUNDLE_GROUPS = [
{ id: 'data', label: 'Data bundles', cats: ['bingwa', 'pata'] },
{ id: 'minutes', label: 'Minutes', cats: ['minutes'] },
{ id: 'sms', label: 'SMS', cats: ['sms'] },
];

/** "1 hour" -> "1 hr", "24 hours" -> "24 hrs" so labels fit a small square. */
const shortValidity = (v) => v.replace('hours', 'hrs').replace('hour', 'hr');

/** Phones get 3 tiles per row, everything else 5. */
function useGridColumns() {
const query = '(max-width: 560px)';
const [phone, setPhone] = useState(() =>
typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
);
useEffect(() => {
if (typeof window === 'undefined' || !window.matchMedia) return undefined;
const mq = window.matchMedia(query);
const onChange = (e) => setPhone(e.matches);
setPhone(mq.matches);
if (mq.addEventListener) mq.addEventListener('change', onChange);
else mq.addListener(onChange);
return () => {
if (mq.removeEventListener) mq.removeEventListener('change', onChange);
else mq.removeListener(onChange);
};
}, []);
return phone ? 3 : 5;
}

/** Fixed-width segmented control with a sliding thumb. No scrolling, no swiping. */
function Segmented({ items, value, onChange, label }) {
const idx = Math.max(0, items.findIndex((i) => i.id === value));
return (
<div className="hk-seg" role="group" aria-label={label} style={{ '--n': items.length, '--idx': idx }}>
{items.map((item) => (
<button
key={item.id}
type="button"
className={`hk-seg-btn${value === item.id ? ' is-active' : ''}`}
aria-pressed={value === item.id}
onClick={() => onChange(item.id)}
>
{item.label}
</button>
))}
</div>
);
}

function BundleTile({ plan, locked, selected, panelId, onSelect }) {
return (
<button
type="button"
className={`hk-tile${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}${plan.qty.length > 3 ? ' is-long' : ''}`}
aria-expanded={selected}
aria-controls={selected ? panelId : undefined}
aria-label={`${plan.qty} ${plan.unit}, ${plan.validity}, Ksh ${plan.price}${plan.nightOnly ? ', night bundle' : ''}${locked ? ', opens at 11 PM' : ''}`}
onClick={() => onSelect(plan.id)}
>
{plan.nightOnly && <span className="hk-tile-night"><Moon size={12} aria-hidden="true" /></span>}
<span className="hk-tile-qty">{plan.qty}</span>
<span className="hk-tile-unit">{plan.unit}</span>
<span className="hk-tile-valid">{shortValidity(plan.validity)}</span>
<span className="hk-tile-price">Ksh {plan.price}</span>
</button>
);
}

function BundleDetail({ plan, category, locked, countdown, col, cols, panelId, panelRef, onBuy, onClose }) {
const gb = perGb(plan);
return (
<div
id={panelId}
ref={panelRef}
className="hk-detail"
role="region"
aria-label={`${plan.qty} ${plan.unit} details`}
style={{ '--col': col, '--cols': cols }}
>
  <button type="button" className="hk-detail-close" aria-label="Close bundle details" onClick={onClose}>
    <X size={16} aria-hidden="true" />
  </button>

  <div className="hk-detail-head">
    <p className="hk-detail-kicker">{category.name}</p>
    <h4 className="hk-detail-title">
      {plan.qty} <span>{plan.unit}</span>
    </h4>
  </div>

  <dl className="hk-detail-list">
    <div>
      <dt>Valid for</dt>
      <dd>{plan.validity}</dd>
    </div>
    <div>
      <dt>Price</dt>
      <dd>Ksh {plan.price}</dd>
    </div>
    {gb !== null && (
      <div>
        <dt>Rate</dt>
        <dd>Ksh {gb} per GB</dd>
      </div>
    )}
    <div>
      <dt>Available</dt>
      <dd>{plan.nightOnly ? '11 PM to 7 PM' : 'Anytime'}</dd>
    </div>
  </dl>

  {plan.badge && <p className="hk-detail-badge">{plan.badge}</p>}

  <button
    type="button"
    className="hk-btn hk-btn-primary hk-detail-cta"
    disabled={locked}
    onClick={() => onBuy(plan)}
  >
    {locked ? `Opens at 11 PM, in ${countdown}` : `Buy for Ksh ${plan.price}`}
  </button>
</div>
);
}

function BundleBoard({ budget, onBudget, night, onBuy }) {
const cols = useGridColumns();
const [selectedId, setSelectedId] = useState(null);
const panelRef = useRef(null);
const boardRef = useRef(null);

const activeBudget = BUDGETS.find((b) => b.id === budget) || BUDGETS[0];

// Per section: catalogue order, available before locked, then cheapest first.
const groups = useMemo(() => {
const isLocked = (p) => p.nightOnly && !night.open;
return BUNDLE_GROUPS.map((g) => ({
...g,
plans: PLANS.filter((p) => g.cats.includes(p.cat) && activeBudget.test(p)).sort(
(a, b) =>
catIndex(a.cat) - catIndex(b.cat) ||
Number(isLocked(a)) - Number(isLocked(b)) ||
a.price - b.price
),
})).filter((g) => g.plans.length > 0);
}, [activeBudget, night.open]);

const total = groups.reduce((n, g) => n + g.plans.length, 0);

// Each section pops its tiles in the first time it scrolls into view.
useEffect(() => {
const root = boardRef.current;
if (!root) return undefined;
const secs = root.querySelectorAll('.hk-sec:not(.is-seen)');
if (!('IntersectionObserver' in window)) {
secs.forEach((s) => s.classList.add('is-seen'));
return undefined;
}
const io = new IntersectionObserver(
(entries) =>
entries.forEach((e) => {
if (e.isIntersecting) {
e.target.classList.add('is-seen');
io.unobserve(e.target);
}
}),
{ threshold: 0.2 }
);
secs.forEach((s) => io.observe(s));
return () => io.disconnect();
}, [groups]);
const selected = groups.flatMap((g) => g.plans).find((p) => p.id === selectedId) || null;

// Bring the details into view if they open below the visible screen.
useEffect(() => {
if (selectedId && panelRef.current) {
panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
}, [selectedId]);

const toggle = (id) => setSelectedId((cur) => (cur === id ? null : id));
const changeBudget = (id) => {
setSelectedId(null);
onBudget(id);
};

return (
<div
ref={boardRef}
className="hk-board"
onKeyDown={(e) => {
if (e.key === 'Escape') setSelectedId(null);
}}
>
  <div className="hk-board-meta">
    <span className="hk-board-cap">Budget in Ksh</span>
    <span className="hk-board-count" aria-live="polite">
      {total} bundle{total === 1 ? '' : 's'}
    </span>
  </div>

  <Segmented items={BUDGETS} value={budget} onChange={changeBudget} label="Budget in Ksh" />

  {groups.length > 0 ? (
    <div className="hk-secs">
      {groups.map((g) => {
        const selIndex = selected ? g.plans.findIndex((p) => p.id === selected.id) : -1;
        const insertAfter =
          selIndex < 0
            ? -1
            : Math.min(Math.floor(selIndex / cols) * cols + cols - 1, g.plans.length - 1);

        const cells = [];
        g.plans.forEach((plan, i) => {
          const locked = plan.nightOnly && !night.open;
          cells.push(
            <BundleTile
              key={plan.id}
              plan={plan}
              locked={locked}
              selected={selected !== null && selected.id === plan.id}
              panelId="hk-detail"
              onSelect={toggle}
            />
          );
          if (i === insertAfter) {
            cells.push(
              <BundleDetail
                key={`detail-${selected.id}`}
                plan={selected}
                category={CATEGORIES[catIndex(selected.cat)]}
                locked={selected.nightOnly && !night.open}
                countdown={night.countdown}
                col={selIndex % cols}
                cols={cols}
                panelId="hk-detail"
                panelRef={panelRef}
                onBuy={onBuy}
                onClose={() => setSelectedId(null)}
              />
            );
          }
        });

        return (
          <section key={g.id} className="hk-sec" aria-labelledby={`bundles-${g.id}`}>
            <div className="hk-sec-head">
              <h3 id={`bundles-${g.id}`} className="hk-sec-title">
                {g.label}
              </h3>
              <span className="hk-sec-rule" aria-hidden="true" />
              <span className="hk-sec-count">
                {g.plans.length} bundle{g.plans.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="hk-grid">{cells}</div>
          </section>
        );
      })}
    </div>
  ) : (
    <div className="hk-empty">
      <p>Nothing in that price range.</p>
      <button
        type="button"
        className="hk-btn hk-btn-outline"
        onClick={() => {
          setSelectedId(null);
          onBudget('all');
        }}
      >
        Show all bundles
      </button>
    </div>
  )}

  <p className="hk-board-status" role="status">
    <span>Night bundles, tagged</span>
    <span className="hk-night-tag">Night</span>
    <span>{night.open ? 'are open until 7:00 PM.' : `open at 11:00 PM, in ${night.countdown}.`}</span>
  </p>
</div>
);
}  

/* ============================================================================
 *  7. CHECKOUT DIALOG
 *  Steps: form -> processing -> success | failed
 * ========================================================================== */

function Checkout({ plan, initialPhone, onClose }) {
  const [step, setStep] = useState('form');
  const [phase, setPhase] = useState('sending'); // sending | waiting
  const [recipient, setRecipient] = useState(initialPhone || '');
  const [otherPayer, setOtherPayer] = useState(false);
  const [payer, setPayer] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const [doneRecipient, setDoneRecipient] = useState('');
  const cancelled = useRef(false);

  const category = CATEGORIES.find((c) => c.id === plan.cat);

  // Lock page scroll while the dialog is open and close on Escape.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && step !== 'processing') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      cancelled.current = true; // stop any polling loop still running
    };
  }, [onClose, step]);

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    } catch (e) {
      /* clipboard blocked, the number is still visible to copy by hand */
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setFieldError('');

    const recipientNorm = normalizePhone(recipient);
    if (!recipientNorm) {
      setFieldError('Enter a valid Safaricom number, like 0712 345 678.');
      return;
    }
    let payerNorm = recipientNorm;
    if (otherPayer) {
      payerNorm = normalizePhone(payer);
      if (!payerNorm) {
        setFieldError('Enter a valid M-Pesa number to pay from.');
        return;
      }
    }

    cancelled.current = false;
    setDoneRecipient(recipientNorm);
    setStep('processing');
    setPhase('sending');

    try {
      const { checkoutRequestId } = await requestStkPush({
        plan,
        recipient: recipientNorm,
        payer: payerNorm,
      });
      if (cancelled.current) return;

      setPhase('waiting');
      const started = Date.now();

      while (Date.now() - started < CONFIG.POLL_TIMEOUT_MS) {
        await sleep(CONFIG.POLL_INTERVAL_MS);
        if (cancelled.current) return;

        const result = await checkPaymentStatus(checkoutRequestId);
        if (cancelled.current) return;

        if (result.status === 'success') {
          setStep('success');
          return;
        }
        if (result.status === 'failed' || result.status === 'cancelled') {
          setErrorMsg(
            result.message ||
              (result.status === 'cancelled'
                ? 'The payment request was cancelled on your phone.'
                : 'The payment did not go through.')
          );
          setStep('failed');
          return;
        }
      }

      setErrorMsg(
        'We did not get a confirmation in time. If M-Pesa charged you, message us on WhatsApp with your confirmation message and we will sort it out.'
      );
      setStep('failed');
    } catch (err) {
      if (cancelled.current) return;
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setStep('failed');
    }
  };

  const cancelWaiting = () => {
    cancelled.current = true;
    setStep('form');
  };

  return (
    <div
      className="hk-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && step !== 'processing') onClose();
      }}
    >
      <div
        className="hk-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hk-dialog-title"
      >
        {step !== 'processing' && (
          <button
            type="button"
            className="hk-icon-btn hk-dialog-close"
            onClick={onClose}
            aria-label="Close checkout"
          >
            <X size={20} />
          </button>
        )}

        {/* ------------------------------ FORM ------------------------------ */}
        {step === 'form' && (
          <form onSubmit={submit} noValidate>
            <h2 id="hk-dialog-title" className="hk-dialog-title">
              Complete your purchase
            </h2>

            <div className="hk-summary" style={{ '--accent': category.accent }}>
              <div>
                <p className="hk-summary-name">{category.name}</p>
                <p className="hk-summary-amount">
                  {plan.qty} {plan.unit}
                </p>
                <p className="hk-summary-validity">
                  <Clock size={14} aria-hidden="true" /> {plan.validity}
                </p>
              </div>
              <p className="hk-summary-price">
                <span>Ksh</span>
                {plan.price}
              </p>
            </div>

            <label className="hk-label" htmlFor="hk-recipient">
              Number to receive the bundle
            </label>
            <div className="hk-input-wrap">
              <Smartphone size={18} aria-hidden="true" />
              <input
                id="hk-recipient"
                className="hk-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                placeholder="0712 345 678"
                maxLength={16}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            <label className="hk-check">
              <input
                type="checkbox"
                checked={otherPayer}
                onChange={(e) => setOtherPayer(e.target.checked)}
              />
              <span>Pay from a different M-Pesa number</span>
            </label>

            {otherPayer && (
              <>
                <label className="hk-label" htmlFor="hk-payer">
                  M-Pesa number to pay from
                </label>
                <div className="hk-input-wrap">
                  <Lock size={18} aria-hidden="true" />
                  <input
                    id="hk-payer"
                    className="hk-input"
                    type="tel"
                    inputMode="tel"
                    placeholder="0722 000 000"
                    maxLength={16}
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                  />
                </div>
              </>
            )}

            {fieldError && (
              <p className="hk-field-error" role="alert">
                <AlertCircle size={15} aria-hidden="true" /> {fieldError}
              </p>
            )}

            <button type="submit" className="hk-btn hk-btn-primary hk-btn-block">
              <Lock size={17} aria-hidden="true" /> Pay Ksh {plan.price} with M-Pesa
            </button>
            <p className="hk-fineprint">
              A prompt will appear on your phone. Enter your M-Pesa PIN to approve it.
            </p>

            {/* Manual Paybill fallback, collapsed by default */}
            <button
              type="button"
              className="hk-manual-toggle"
              aria-expanded={manualOpen}
              onClick={() => setManualOpen((v) => !v)}
            >
              <span>Prefer to pay manually?</span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
            <div className={`hk-collapse${manualOpen ? ' is-open' : ''}`}>
              <div>
                <ol className="hk-manual-steps">
                  <li>Open M-Pesa and choose Lipa na M-Pesa, then Pay Bill.</li>
                  <li>
                    Business number:{' '}
                    <button
                      type="button"
                      className="hk-copy"
                      onClick={() => copy(CONFIG.PAYBILL, 'paybill')}
                    >
                      {CONFIG.PAYBILL}
                      {copied === 'paybill' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </li>
                  <li>Account number: {CONFIG.ACCOUNT_HINT}.</li>
                  <li>Amount: Ksh {plan.price}, then enter your PIN.</li>
                </ol>
              </div>
            </div>
          </form>
        )}

        {/* --------------------------- PROCESSING --------------------------- */}
        {step === 'processing' && (
          <div className="hk-state">
            <h2 id="hk-dialog-title" className="hk-dialog-title">
              {phase === 'sending' ? 'Sending payment request' : 'Check your phone'}
            </h2>

            <ol className="hk-progress-steps">
              <li className={phase === 'sending' ? 'is-active' : 'is-done'}>
                <span className="hk-step-ico">
                  {phase === 'sending' ? (
                    <Loader2 size={18} className="hk-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                </span>
                Sending the M-Pesa request
              </li>
              <li className={phase === 'waiting' ? 'is-active' : ''}>
                <span className="hk-step-ico">
                  {phase === 'waiting' ? (
                    <Loader2 size={18} className="hk-spin" />
                  ) : (
                    <Smartphone size={18} />
                  )}
                </span>
                Waiting for you to enter your PIN
              </li>
            </ol>

            <p className="hk-state-text">
              {phase === 'waiting'
                ? `Approve the Ksh ${plan.price} prompt on your phone to finish.`
                : 'This only takes a moment.'}
            </p>

            {phase === 'waiting' && (
              <div className="hk-wait-bar" aria-hidden="true">
                <span style={{ animationDuration: `${CONFIG.POLL_TIMEOUT_MS}ms` }} />
              </div>
            )}

            <button type="button" className="hk-btn hk-btn-ghost hk-btn-block" onClick={cancelWaiting}>
              Cancel and go back
            </button>
          </div>
        )}

        {/* ---------------------------- SUCCESS ---------------------------- */}
        {step === 'success' && (
          <div className="hk-state hk-state-center">
            <svg className="hk-tick" viewBox="0 0 52 52" aria-hidden="true">
              <circle className="hk-tick-circle" cx="26" cy="26" r="23" />
              <path className="hk-tick-check" d="M15 27l8 8 14-16" />
            </svg>
            <h2 id="hk-dialog-title" className="hk-dialog-title">
              Payment received
            </h2>
            <p className="hk-state-text">
              {plan.qty} {plan.unit} ({plan.validity}) is on its way to{' '}
              <strong>{formatLocal(doneRecipient)}</strong>.
            </p>
            <button type="button" className="hk-btn hk-btn-primary hk-btn-block" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {/* ----------------------------- FAILED ----------------------------- */}
        {step === 'failed' && (
          <div className="hk-state hk-state-center">
            <span className="hk-fail-ico">
              <AlertCircle size={34} />
            </span>
            <h2 id="hk-dialog-title" className="hk-dialog-title">
              Payment not completed
            </h2>
            <p className="hk-state-text">{errorMsg}</p>
            <button type="button" className="hk-btn hk-btn-primary hk-btn-block" onClick={() => setStep('form')}>
              Try again
            </button>
            <a
              className="hk-btn hk-btn-ghost hk-btn-block"
              href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} aria-hidden="true" /> Message support
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 *  8. FAQ ITEM
 * ========================================================================== */

function FaqItem({ index, q, a, open, onToggle }) {
  const id = `hk-faq-${index}`;
  return (
    <div className={`hk-faq-item${open ? ' is-open' : ''}`}>
      <button
        type="button"
        id={`${id}-q`}
        className="hk-faq-q"
        aria-expanded={open}
        aria-controls={`${id}-a`}
        onClick={onToggle}
      >
        <span className="hk-faq-num" aria-hidden="true">{index + 1}</span>
        <span className="hk-faq-text">{q}</span>
        <span className="hk-faq-ico" aria-hidden="true" />
      </button>

      <div
        id={`${id}-a`}
        role="region"
        aria-labelledby={`${id}-q`}
        className={`hk-faq-drop${open ? ' is-open' : ''}`}
      >
        <div>
          <div className="hk-faq-panel">
            <p className="hk-faq-a">{a}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 *  8b. FLOATING CUSTOMER CARE BUTTON (WhatsApp)
 *  Fixed to the bottom-right corner on every screen size. To move it to the
 *  bottom-left, change `right:` to `left:` in the .hk-wa CSS rule.
 * ========================================================================== */

/** WhatsApp brand glyph (lucide has no brand icons, so it is drawn here). */
function WhatsAppIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function WhatsAppFloat() {
  const href = `https://wa.me/${CONFIG.SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    CONFIG.SUPPORT_MESSAGE
  )}`;
  return (
    <a
      className="hk-wa"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with Haraka Net customer care on WhatsApp"
    >
      <span className="hk-wa-icon">
        <WhatsAppIcon size={30} />
      </span>
      <span className="hk-wa-label">
        <strong>Customer care</strong>
        <span>Chat on WhatsApp</span>
      </span>
    </a>
  );
}

/* ============================================================================
 *  8c. QUICK BUY BILLBOARD
 *  FlapText: split-flap tiles that shuffle through random characters and
 *  settle left to right. QuickBillboard: the LED-style screen in the hero card.
 * ========================================================================== */

const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function FlapText({ value, width = 6, align = 'start', size = 'lg' }) {
  const target = String(value).toUpperCase();
  const padded = align === 'end' ? target.padStart(width) : target.padEnd(width);

  const [chars, setChars] = useState(() => padded.split(''));
  const [flips, setFlips] = useState(() => padded.split('').map(() => 0));

  useEffect(() => {
    const goal = padded.split('');
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setChars(goal);
      return undefined;
    }

    const timers = [];
    goal.forEach((finalChar, i) => {
      const rounds = 4 + i * 2;
      for (let r = 0; r < rounds; r++) {
        timers.push(
          setTimeout(() => {
            const isLast = r === rounds - 1;
            const next = isLast
              ? finalChar
              : FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
            setChars((prev) => {
              const copy = prev.slice();
              copy[i] = next;
              return copy;
            });
            setFlips((prev) => {
              const copy = prev.slice();
              copy[i] = (copy[i] || 0) + 1;
              return copy;
            });
          }, i * 70 + r * 70)
        );
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [padded]);

  return (
    <span className={`hk-flap hk-flap-${size}`} aria-hidden="true">
      {chars.map((ch, i) => (
        <span
          key={`${ch}-${i}-${flips[i]}`}
          className={`hk-flap-tile${ch === ' ' ? ' is-space' : ''}`}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

function QuickBillboard({ plan, autoPlay, cycleMs }) {
  const idx = QUICK_PICK_IDS.indexOf(plan.id);

  return (
    <div className="hk-bb">
      <span className="hk-bb-splash" aria-hidden="true" />

      <span className="hk-sr">
        {plan.qty} {plan.unit}, valid {plan.validity}, Ksh {plan.price}
      </span>

      <div key={plan.id} className="hk-bb-body" aria-hidden="true">
        <span className="hk-bb-tag">
          <Zap size={13} /> Fresh deal
        </span>

        <div className="hk-bb-main">
          <div className="hk-bb-left">
            <div className="hk-bb-amount">
              <span className="hk-bb-qty">
                {plan.qty.split('').map((ch, i) => (
                  <span className="hk-bb-ch" key={i} style={{ '--i': i }}>
                    {ch}
                  </span>
                ))}
              </span>
              <span className="hk-bb-unit">{plan.unit}</span>
            </div>
            <span className="hk-bb-valid">
              <Clock size={15} /> {plan.validity}
            </span>
          </div>

          <div className="hk-bb-sticker">
            <small>Ksh</small>
            <strong>{plan.price}</strong>
          </div>
        </div>
      </div>

      <div key={`${plan.id}-${autoPlay}`} className="hk-bb-dots" aria-hidden="true">
        {QUICK_PICK_IDS.map((id, i) => (
          <span
            key={id}
            className={`hk-bb-pip${i === idx ? ' is-on' : ''}${i === idx && autoPlay ? ' is-run' : ''}`}
            style={{ '--cycle': `${cycleMs}ms` }}
          >
            <b />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
 *  8d. BUBBLY TEXT
 *  Splits a phrase into words (which never break mid-word) and letters
 *  (which animate one after another).
 * ========================================================================== */

function BubblyText({ text, offset = 0 }) {
  let n = offset;
  return text.split(' ').map((word, w) => (
    <span className="hk-bub-word" key={`${word}-${w}`} aria-hidden="true">
      {word.split('').map((ch, i) => (
        <span className="hk-bub-ch" key={i} style={{ '--i': n++ }}>
          {ch}
        </span>
      ))}
      {' '}
    </span>
  ));
}

/* ============================================================================
 *  9. THE PAGE
 * ========================================================================== */

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkout, setCheckout] = useState(null); // { plan, phone }
  const [quickPick, setQuickPick] = useState('b55');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickError, setQuickError] = useState('');
  const [openFaq, setOpenFaq] = useState(0);
  const [copiedPaybill, setCopiedPaybill] = useState(false);
  const [budget, setBudget] = useState('all');

  const night = useNightWindow();
  const [autoPlay, setAutoPlay] = useState(true);
  const resumeTimer = useRef(null);

  const quickPlan = PLANS.find((p) => p.id === quickPick);
  const quickCategory = CATEGORIES.find((c) => c.id === quickPlan.cat);

  // Rotate the billboard through the quick picks.
  useEffect(() => {
    if (!autoPlay || checkout) return undefined;
    const id = setInterval(() => {
      setQuickPick((current) => {
        const i = QUICK_PICK_IDS.indexOf(current);
        return QUICK_PICK_IDS[(i + 1) % QUICK_PICK_IDS.length];
      });
    }, QUICK_CYCLE_MS);
    return () => clearInterval(id);
  }, [autoPlay, checkout]);

  // Customer touched the card: stop rotating, then resume after a quiet spell.
  const pauseAutoPlay = useCallback(() => {
    setAutoPlay(false);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setAutoPlay(true), QUICK_RESUME_MS);
  }, []);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openCheckout = useCallback((plan, phone = '') => {
    setCheckout({ plan, phone });
  }, []);
  const closeCheckout = useCallback(() => setCheckout(null), []);

  const navTo = (id) => {
    setMenuOpen(false);
    scrollToId(id);
  };

  const submitQuick = (e) => {
    e.preventDefault();
    setQuickError('');
    const norm = normalizePhone(quickPhone);
    if (!norm) {
      setQuickError('Enter a valid Safaricom number, like 0712 345 678.');
      return;
    }
    const plan = PLANS.find((p) => p.id === quickPick);
    openCheckout(plan, quickPhone);
  };

  const copyPaybill = async () => {
    try {
      await navigator.clipboard.writeText(CONFIG.PAYBILL);
      setCopiedPaybill(true);
      setTimeout(() => setCopiedPaybill(false), 1800);
    } catch (e) {
      /* clipboard blocked, number is visible on screen */
    }
  };

  return (
    <div className="hk-root">
      <style>{CSS}</style>

      {/* ============================ NAVIGATION ============================ */}
      <header className={`hk-nav${scrolled ? ' is-scrolled' : ''}`}>
        <div className="hk-container hk-nav-inner">
          <a href="#top" className="hk-nav-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <Logo />
          </a>

          <nav className="hk-nav-links" aria-label="Main">
            <button type="button" onClick={() => navTo('bundles')}>Bundles</button>
            <button type="button" onClick={() => navTo('how')}>How it works</button>
            <button type="button" onClick={() => navTo('why')}>Why Haraka Net</button>
            <button type="button" onClick={() => navTo('faq')}>FAQ</button>
          </nav>

          <button type="button" className="hk-btn hk-btn-primary hk-nav-cta" onClick={() => navTo('bundles')}>
            <ShoppingCart size={16} aria-hidden="true" /> Buy a bundle
          </button>

          <button
            type="button"
            className="hk-icon-btn hk-nav-burger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div className={`hk-mobile-menu${menuOpen ? ' is-open' : ''}`}>
          <div className="hk-container">
            <button type="button" onClick={() => navTo('bundles')}>Bundles</button>
            <button type="button" onClick={() => navTo('how')}>How it works</button>
            <button type="button" onClick={() => navTo('why')}>Why Haraka Net</button>
            <button type="button" onClick={() => navTo('faq')}>FAQ</button>
            <button type="button" className="hk-btn hk-btn-primary hk-btn-block" onClick={() => navTo('bundles')}>
              <ShoppingCart size={16} aria-hidden="true" /> Buy a bundle
            </button>
          </div>
        </div>
      </header>

      {/* The header is position:fixed, so this spacer keeps page content from sliding under it. */}
      <div className="hk-nav-spacer" aria-hidden="true" />

      <main id="top">
        {/* ============================== HERO ============================== */}
        <section className="hk-hero">
          <div className="hk-hero-bg" aria-hidden="true">
            <span className="hk-blob hk-blob-a" />
            <span className="hk-blob hk-blob-b" />
          </div>

          <div className="hk-container hk-hero-grid">
            <div className="hk-hero-copy">
              <h1
                className="hk-hero-title hk-rise"
                style={{ '--d': '0ms' }}
                aria-label="Low on data? Haraka Net to the rescue, with bundles that save you more."
              >
                <span className="hk-ht-l1"><BubblyText text="Low on data?" /></span>
                <span className="hk-ht-l2"><BubblyText text="Haraka Net" offset={10} /></span>
                <span className="hk-ht-l3"><BubblyText text="to the rescue," offset={19} /></span>
                <span className="hk-ht-l4" aria-hidden="true">
                  with <mark className="hk-pill hk-pill-a">bundles</mark> that{' '}
                  <mark className="hk-pill hk-pill-b">save you more.</mark>
                </span>
              </h1>
              <p className="hk-lead hk-rise" style={{ '--d': '120ms' }}>
                Pick a bundle, enter your number and approve the M-Pesa prompt that
                appears on your phone. No menus to dial, no waiting in a queue.
              </p>

              <div className="hk-hero-actions hk-rise" style={{ '--d': '240ms' }}>
                <button type="button" className="hk-btn hk-btn-primary hk-btn-lg" onClick={() => navTo('bundles')}>
                  <ShoppingCart size={18} aria-hidden="true" /> Browse bundles
                </button>
                <button type="button" className="hk-btn hk-btn-outline hk-btn-lg" onClick={() => navTo('how')}>
                  <ListChecks size={18} aria-hidden="true" /> How it works
                </button>
              </div>

              <ul className="hk-hero-facts hk-rise" style={{ '--d': '360ms' }}>
                <li><Lock size={17} aria-hidden="true" /> Secure M-Pesa payment</li>
                <li><Repeat size={17} aria-hidden="true" /> Buy as often as you like</li>
                <li><Zap size={17} aria-hidden="true" /> Sent right after payment</li>
              </ul>
            </div>

            {/* Quick-buy card: the memorable moment of the page */}
            <div className="hk-hero-panel hk-rise" style={{ '--d': '200ms' }}>
              <svg className="hk-panel-art" viewBox="0 0 400 400" aria-hidden="true">
                <circle cx="330" cy="70" r="150" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="2" />
                <circle cx="330" cy="70" r="105" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="2" />
                <circle cx="330" cy="70" r="60" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="2" />
                <path d="M-20 360 C 120 300, 220 380, 430 250" fill="none" stroke="rgba(255,138,42,.55)" strokeWidth="3" />
              </svg>

              <form className="hk-quick" onSubmit={submitQuick} noValidate>
                <h2 className="hk-quick-title">Quick buy</h2>

                <QuickBillboard
                  plan={quickPlan}
                  category={quickCategory}
                  autoPlay={autoPlay}
                  cycleMs={QUICK_CYCLE_MS}
                />

                <fieldset className="hk-quick-picks">
                  <legend className="hk-sr">Choose a bundle</legend>
                  {QUICK_PICK_IDS.map((id) => {
                    const p = PLANS.find((x) => x.id === id);
                    return (
                      <label key={id} className={`hk-chip${quickPick === id ? ' is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="quick"
                          value={id}
                          checked={quickPick === id}
                          onChange={() => { setQuickPick(id); pauseAutoPlay(); }}
                        />
                        <span className="hk-chip-amount">{p.qty} {p.unit}</span>
                        <span className="hk-chip-meta">{p.validity}</span>
                        <span className="hk-chip-price">Ksh {p.price}</span>
                      </label>
                    );
                  })}
                </fieldset>

                <label className="hk-label" htmlFor="hk-quick-phone">Your number</label>
                <div className="hk-input-wrap">
                  <Smartphone size={18} aria-hidden="true" />
                  <input
                    id="hk-quick-phone"
                    className="hk-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0712 345 678"
                    maxLength={16}
                    value={quickPhone}
                    onFocus={pauseAutoPlay}
                    onChange={(e) => { setQuickPhone(e.target.value); pauseAutoPlay(); }}
                  />
                </div>
                {quickError && (
                  <p className="hk-field-error" role="alert">
                    <AlertCircle size={15} aria-hidden="true" /> {quickError}
                  </p>
                )}

                <button type="submit" className="hk-btn hk-btn-primary hk-btn-block hk-btn-lg">
                  <Lock size={17} aria-hidden="true" /> Continue to payment
                </button>
              </form>

              <p className="hk-panel-note">
                <Moon size={16} aria-hidden="true" />
                {night.open
                  ? 'Night data bundles (Ksh 19, 22, 50) are open now.'
                  : `Night data bundles reopen at 11:00 PM, in ${night.countdown}.`}
              </p>
            </div>
          </div>
        </section>

        {/* ============================= BUNDLES ============================= */}
        <section id="bundles" className="hk-section hk-bundles">
          <div className="hk-container">
            <div className="hk-section-head">
              <h2 className="hk-h2"></h2>
              <p className="hk-sub">
                Tap a bundle to see its details, then buy in one tap. The M-Pesa prompt
                comes straight to your phone.
              </p>
            </div>

            <BundleBoard
              budget={budget}
              onBudget={setBudget}
              night={night}
              onBuy={(p) => openCheckout(p)}
            />
          </div>
        </section>

        {/* ============================ HOW IT WORKS ============================ */}
        <section id="how" className="hk-section hk-how">
          <div className="hk-container">
            <div className="hk-section-head">
              <h2 className="hk-h2">Three steps, one prompt</h2>
              <p className="hk-sub">
                Buying a bundle works like checking out in any online store.
              </p>
            </div>

            <ol className="hk-steps">
              <li>
                <span className="hk-step-num">1</span>
                <h3 className="hk-h4">Choose a bundle</h3>
                <p>Pick the data, SMS or minutes bundle that fits what you need today.</p>
              </li>
              <li>
                <span className="hk-step-num">2</span>
                <h3 className="hk-h4">Enter your number</h3>
                <p>Type the number that should receive the bundle. You can top up someone else too.</p>
              </li>
              <li>
                <span className="hk-step-num">3</span>
                <h3 className="hk-h4">Approve the M-Pesa prompt</h3>
                <p>The prompt appears on your phone by itself. Enter your PIN and your bundle is sent.</p>
              </li>
            </ol>

            <div className="hk-paybill">
              <div className="hk-paybill-copy">
                <h3 className="hk-h4">Prefer the long way? Pay by Paybill.</h3>
                <p>
                  Go to Lipa na M-Pesa, choose Pay Bill, enter the business number
                  below, use {CONFIG.ACCOUNT_HINT} as the account number and pay the
                  price of your bundle.
                </p>
              </div>
              <div className="hk-paybill-box">
                <span className="hk-paybill-label">Paybill number</span>
                <span className="hk-paybill-number">{CONFIG.PAYBILL}</span>
                <button type="button" className="hk-btn hk-btn-outline" onClick={copyPaybill}>
                  {copiedPaybill ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {copiedPaybill ? 'Copied' : 'Copy number'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================== WHY US ============================== */}
        <section id="why" className="hk-section hk-why">
          <div className="hk-container">
            <div className="hk-section-head">
              <h2 className="hk-h2">Built so you never get stuck without data</h2>
              <p className="hk-sub">
                Low prices matter, but so does a checkout that simply works.
              </p>
            </div>

            <div className="hk-why-grid">
              {[
                { icon: ShieldCheck, t: 'Pay with the M-Pesa you trust', d: 'Every payment goes through the official M-Pesa prompt on your phone. Your PIN stays with you and with Safaricom.' },
                { icon: Zap, t: 'Sent after payment', d: 'Your bundle is delivered to your number as soon as M-Pesa confirms the payment.' },
                { icon: Repeat, t: 'Buy many times a day', d: 'Run low again? Buy the same bundle or a different one as often as you need.' },
                { icon: Smartphone, t: 'Top up any number', d: 'Enter a friend or family member’s number at checkout and pay from your own M-Pesa.' },
                { icon: Clock, t: 'From one hour to seven days', d: 'Short boosts for a quick task, longer packs for the whole week. Pick the validity that suits you.' },
                { icon: Headphones, t: 'Help when you need it', d: 'Something not right? Message us on WhatsApp with your M-Pesa message and we will fix it.' },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="hk-why-item">
                  <span className="hk-why-icon" aria-hidden="true"><Icon size={22} /></span>
                  <h3 className="hk-h4">{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =============================== FAQ =============================== */}
        <section id="faq" className="hk-section hk-faq">
          <div className="hk-container">
            <div className="hk-faq-card">
              <div className="hk-faq-top">
                <span className="hk-faq-badge"><i aria-hidden="true" /> FAQs</span>
                <h2 className="hk-faq-title">Common questions</h2>
                <p className="hk-faq-lead">
                  Quick answers about paying, delivery and night bundles.
                </p>
              </div>

              <div className="hk-faq-list">
                {FAQ_ITEMS.map((item, i) => (
                  <FaqItem
                    key={item.q}
                    index={i}
                    q={item.q}
                    a={item.a}
                    open={openFaq === i}
                    onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
                  />
                ))}
              </div>

              <div className="hk-faq-foot">
                <p>Have any other questions?</p>
                <a
                  className="hk-btn hk-btn-primary"
                  href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}?text=${encodeURIComponent(CONFIG.SUPPORT_MESSAGE)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={17} aria-hidden="true" /> Chat with us on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ CLOSING CTA ============================ */}
        <section className="hk-cta">
          <div className="hk-cta-bubbles" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </div>

          <div className="hk-container hk-cta-inner">
            <h2
              className="hk-cta-title"
              aria-label="Data imeisha? Tebu usipanic! Haraka Net ni cheap na reliable just for you!"
            >
              <span className="hk-cta-l1"><BubblyText text="Data imeisha?" /></span>
              <span className="hk-cta-l2"><BubblyText text="Tebu usipanic!" offset={13} /></span>
              <span className="hk-cta-l3" aria-hidden="true">
                Haraka Net ni <mark className="hk-pill hk-pill-a">cheap</mark> na{' '}
                <mark className="hk-pill hk-pill-b">reliable</mark> just for you!
              </span>
            </h2>

            <button type="button" className="hk-btn hk-btn-primary hk-btn-lg hk-cta-btn" onClick={() => navTo('bundles')}>
              <ShoppingCart size={18} aria-hidden="true" /> See all bundles
            </button>
          </div>
        </section>
      </main>

      {/* ============================== FOOTER ============================== */}
      <footer className="hk-footer">
        <div className="hk-container hk-footer-grid">
          <div className="hk-footer-brand">
            <Logo light />
            <p>
              Data, SMS and minutes bundles at honest prices, paid for with M-Pesa
              in a few taps.
            </p>
          </div>

          <div>
            <h4 className="hk-footer-h">Bundles</h4>
            <ul>
              {BUNDLE_GROUPS.map((g) => (
                <li key={g.id}>
                  <button type="button" onClick={() => scrollToId(`bundles-${g.id}`)}>
                    {g.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="hk-footer-h">Pay manually</h4>
            <p className="hk-footer-paybill">Paybill {CONFIG.PAYBILL}</p>
            <p className="hk-footer-small">Account: {CONFIG.ACCOUNT_HINT}</p>
          </div>

          <div>
            <h4 className="hk-footer-h">Support</h4>
            <a
              className="hk-footer-link"
              href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noreferrer"
            >
              <Send size={16} aria-hidden="true" /> WhatsApp us
            </a>
          </div>
        </div>

        <div className="hk-container hk-footer-bottom">
          <p>© {new Date().getFullYear()} {CONFIG.BRAND}. {CONFIG.TAGLINE}.</p>
        </div>
      </footer>

      {/* ======================= FLOATING CUSTOMER CARE ======================= */}
      <WhatsAppFloat />

      {/* ============================== CHECKOUT ============================== */}
      {checkout && (
        <Checkout
          key={checkout.plan.id}
          plan={checkout.plan}
          initialPhone={checkout.phone}
          onClose={closeCheckout}
        />
      )}
    </div>
  );
}

/* ============================================================================
 *  10. STYLES (inlined)
 *  Palette comes straight from the logo: deep navy wordmark, blue to cyan
 *  gradient, orange arrow. Orange is reserved for the main actions so buy
 *  buttons are always the first thing the eye finds.
 * ========================================================================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap');

.hk-root {
  --navy: #0B2A5B;
  --navy-deep: #071E44;
  --blue: #1473C8;
  --cyan: #12B5E5;
  --orange: #F57C1F;
  --orange-deep: #DF6509;
  --paper: #F4F8FD;
  --white: #FFFFFF;
  --ink: #10223F;
  --muted: #5A6B86;
  --line: #DAE5F2;
  --ok: #1A9B5B;
  --bad: #C8372D;
  --radius: 20px;
  --shadow-sm: 0 1px 2px rgba(11,42,91,.06), 0 4px 14px rgba(11,42,91,.05);
  --shadow-md: 0 2px 4px rgba(11,42,91,.05), 0 14px 34px rgba(11,42,91,.10);
  --shadow-lg: 0 6px 12px rgba(11,42,91,.08), 0 30px 70px rgba(11,42,91,.22);

  font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: var(--ink);
  background: var(--white);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  overflow-x: clip; /* clip (unlike hidden) does not break position: sticky inside the page */
}
.hk-root *, .hk-root *::before, .hk-root *::after { box-sizing: border-box; }
.hk-root h1, .hk-root h2, .hk-root h3, .hk-root h4, .hk-root p, .hk-root ul, .hk-root ol, .hk-root fieldset { margin: 0; padding: 0; }
.hk-root ul, .hk-root ol { list-style: none; }
.hk-root button, .hk-root input { font: inherit; color: inherit; }
.hk-root button { cursor: pointer; }
.hk-root a { color: inherit; text-decoration: none; }
.hk-root :focus-visible { outline: 3px solid var(--cyan); outline-offset: 3px; border-radius: 8px; }
.hk-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.hk-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 clamp(18px, 4vw, 32px); }

/* ---------- Type scale ---------- */
.hk-h1, .hk-h2, .hk-h3, .hk-h4, .hk-cta-title, .hk-plan-amount, .hk-summary-amount, .hk-dialog-title,
.hk-paybill-number, .hk-plan-price, .hk-summary-price, .hk-logo-name { font-family: 'Sora', 'Manrope', sans-serif; }
.hk-h1 { font-size: clamp(2.25rem, 5.2vw, 3.9rem); line-height: 1.07; letter-spacing: -0.03em; font-weight: 800; color: var(--navy); max-width: 16ch; }
.hk-h2 { font-size: clamp(1.7rem, 3.4vw, 2.5rem); line-height: 1.15; letter-spacing: -0.02em; font-weight: 700; color: var(--navy); }
.hk-h3 { font-size: 1.3rem; line-height: 1.25; letter-spacing: -0.01em; font-weight: 700; color: var(--navy); }
.hk-h4 { font-size: 1.08rem; line-height: 1.3; font-weight: 600; color: var(--navy); }
.hk-lead { font-size: clamp(1.02rem, 1.6vw, 1.2rem); color: var(--muted); max-width: 52ch; }
.hk-sub { color: var(--muted); font-size: 1.05rem; max-width: 60ch; }

/* Bubbly hero headline */
.hk-hero-title { display: grid; gap: 2px; margin: 0; font-family: 'Fredoka', 'Sora', sans-serif; font-weight: 700; line-height: 1.06; letter-spacing: .005em; font-size: clamp(2.1rem, 8.8vw, 3.9rem); }
.hk-hero-title > span { display: block; }

.hk-ht-l1 { color: var(--navy); text-shadow: 0 3px 0 rgba(20,115,200,.14); }
.hk-ht-l2 { color: var(--orange); text-shadow: 0 3px 0 rgba(223,101,9,.16); }
.hk-ht-l3 { color: var(--navy); text-shadow: 0 3px 0 rgba(20,115,200,.14); font-size: .86em; }
.hk-ht-l1 .hk-bub-ch:nth-child(3n+2) { color: var(--cyan); }
.hk-ht-l2 .hk-bub-ch:nth-child(3n) { color: var(--cyan); }
.hk-ht-l3 .hk-bub-ch:nth-child(4n+1) { color: var(--cyan); }

/* Supporting line with colour pills */
.hk-ht-l4 { margin-top: 10px; font-family: 'Fredoka', 'Manrope', sans-serif; font-size: clamp(1.05rem, 4.4vw, 1.5rem); font-weight: 500; line-height: 2.1; color: var(--ink); animation: hk-rise .8s cubic-bezier(.2,.7,.2,1) 1.1s backwards; }
.hk-ht-l4 .hk-pill { white-space: nowrap; box-shadow: 0 6px 14px rgba(11,42,91,.18); }

/* Faster, tighter timing for the hero so it feels instant */
.hk-hero-title .hk-bub-ch { animation-delay: calc(var(--i) * 32ms), calc(.9s + var(--i) * 90ms); }

/* ---------- Buttons ---------- */
.hk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 20px; border-radius: 14px; border: 1.5px solid transparent; font-weight: 700; font-size: .95rem; line-height: 1.2; white-space: nowrap; transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease, color .18s ease; }
.hk-btn:active:not(:disabled) { transform: translateY(1px) scale(.985); }
.hk-btn-lg { padding: 15px 26px; font-size: 1rem; border-radius: 16px; }
.hk-btn-block { width: 100%; }
.hk-btn-primary { color: #fff; background: linear-gradient(135deg, #FF8E2E, var(--orange-deep)); box-shadow: 0 8px 20px rgba(245,124,31,.32); }
.hk-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(245,124,31,.42); }
.hk-btn-outline { background: var(--white); color: var(--navy); border-color: var(--line); }
.hk-btn-outline:hover { border-color: var(--blue); color: var(--blue); transform: translateY(-2px); }
.hk-btn-ghost { background: transparent; color: var(--navy); border-color: var(--line); margin-top: 10px; }
.hk-btn-ghost:hover { background: var(--paper); border-color: var(--blue); }
.hk-btn:disabled { cursor: not-allowed; }
.hk-icon-btn { display: inline-grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--white); color: var(--navy); transition: background .18s ease; }
.hk-icon-btn:hover { background: var(--paper); }

/* ---------- Navigation ---------- */
/* Fixed header: always on top. On scroll it tightens (shorter bar, smaller logo, tagline fades). */
.hk-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 60; background: rgba(255,255,255,.9); backdrop-filter: saturate(160%) blur(14px); -webkit-backdrop-filter: saturate(160%) blur(14px); border-bottom: 1px solid transparent; transition: background .3s ease, border-color .3s ease, box-shadow .3s ease; }
.hk-nav.is-scrolled { background: rgba(255,255,255,.97); border-bottom-color: var(--line); box-shadow: 0 8px 28px rgba(11,42,91,.10); }
.hk-nav-inner { display: flex; align-items: center; gap: 24px; height: 72px; transition: height .3s cubic-bezier(.2,.7,.2,1); }
.hk-nav.is-scrolled .hk-nav-inner { height: 60px; }
.hk-nav-spacer { height: 72px; }
.hk-nav-logo { display: inline-flex; margin-right: auto; }
.hk-nav-links { display: flex; gap: 6px; }
.hk-nav-links button, .hk-mobile-menu button:not(.hk-btn) { background: none; border: 0; padding: 9px 14px; border-radius: 10px; font-weight: 600; color: var(--muted); transition: color .18s ease, background .18s ease; }
.hk-nav-links button:hover { color: var(--navy); background: var(--paper); }
.hk-nav-burger { display: none; }
.hk-mobile-menu { display: none; }

.hk-logo { display: inline-flex; align-items: center; gap: 12px; transform-origin: left center; transition: transform .3s cubic-bezier(.2,.7,.2,1); }
.hk-nav.is-scrolled .hk-logo { transform: scale(.9); }
.hk-logo-text { display: flex; flex-direction: column; line-height: 1.1; }
.hk-logo-name { font-weight: 800; font-size: 1.2rem; letter-spacing: -0.02em; color: var(--navy); }
.hk-logo-tag { font-size: .7rem; color: var(--muted); margin-top: 3px; max-height: 16px; overflow: hidden; transition: opacity .25s ease, max-height .3s ease, margin-top .3s ease; }
.hk-nav.is-scrolled .hk-logo-tag { opacity: 0; max-height: 0; margin-top: 0; }

/* ---------- Hero ---------- */
.hk-hero { position: relative; padding: clamp(36px, 6vw, 84px) 0 clamp(48px, 7vw, 96px); background: linear-gradient(180deg, #FFFFFF 0%, var(--paper) 100%); overflow: hidden; }
.hk-hero-bg { position: absolute; inset: 0; pointer-events: none; }
.hk-blob { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .55; }
.hk-blob-a { width: 520px; height: 520px; top: -160px; right: -120px; background: radial-gradient(circle, rgba(18,181,229,.55), transparent 70%); animation: hk-drift-a 26s ease-in-out infinite alternate; }
.hk-blob-b { width: 460px; height: 460px; bottom: -180px; left: -140px; background: radial-gradient(circle, rgba(245,124,31,.28), transparent 70%); animation: hk-drift-b 30s ease-in-out infinite alternate; }
@keyframes hk-drift-a { to { transform: translate(-60px, 50px); } }
@keyframes hk-drift-b { to { transform: translate(70px, -40px); } }

.hk-hero-grid { position: relative; display: grid; grid-template-columns: 1.08fr .92fr; gap: clamp(28px, 5vw, 72px); align-items: center; }
.hk-hero-copy { display: flex; flex-direction: column; gap: 22px; }
.hk-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; }
.hk-hero-facts { display: flex; flex-wrap: wrap; gap: 10px 26px; margin-top: 6px; color: var(--navy); font-weight: 600; font-size: .92rem; }
.hk-hero-facts li { display: inline-flex; align-items: center; gap: 8px; }
.hk-hero-facts svg { color: var(--blue); }

/* The single orchestrated load sequence */
.hk-rise { animation: hk-rise .8s cubic-bezier(.2,.7,.2,1) both; animation-delay: var(--d, 0ms); }
@keyframes hk-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }

.hk-hero-panel { position: relative; padding: clamp(18px, 3vw, 30px); border-radius: 32px; background: linear-gradient(150deg, var(--navy) 0%, #0E4A93 60%, #1473C8 100%); box-shadow: var(--shadow-lg); overflow: hidden; }
.hk-panel-art { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.hk-quick { position: relative; background: var(--white); border-radius: 24px; padding: clamp(18px, 2.6vw, 26px); box-shadow: 0 18px 40px rgba(4,20,52,.35); }
.hk-quick-title { font-family: 'Sora', sans-serif; font-size: 1.25rem; font-weight: 700; color: var(--navy); margin-bottom: 14px; }
.hk-quick-picks { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border: 0; margin-bottom: 18px; min-width: 0; }
.hk-chip { position: relative; display: grid; gap: 1px; padding: 12px 14px; border: 1.5px solid var(--line); border-radius: 14px; cursor: pointer; transition: border-color .18s ease, background .18s ease, box-shadow .18s ease; }
.hk-chip input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
.hk-chip:hover { border-color: #9CC4EA; }
.hk-chip.is-selected { border-color: var(--blue); background: #EEF6FD; box-shadow: 0 0 0 3px rgba(20,115,200,.14); }
.hk-chip:focus-within { outline: 3px solid var(--cyan); outline-offset: 2px; }
.hk-chip-amount { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 1.05rem; color: var(--navy); }
.hk-chip-meta { font-size: .78rem; color: var(--muted); }
.hk-chip-price { font-weight: 700; font-size: .92rem; color: var(--orange-deep); margin-top: 4px; }
.hk-panel-note { position: relative; display: flex; align-items: flex-start; gap: 10px; margin-top: 16px; color: rgba(255,255,255,.88); font-size: .88rem; font-weight: 500; }
.hk-panel-note svg { flex: none; margin-top: 2px; color: #8FD8F2; }

/* ---------- Quick buy: bouncy baby-blue card ---------- */
.hk-bb { position: relative; margin-bottom: 18px; border-radius: 26px; overflow: hidden; background: linear-gradient(160deg, #E4F3FE 0%, #BFE0FA 100%); border: 3px solid #fff; box-shadow: 0 8px 0 rgba(11,42,91,.16), 0 18px 30px rgba(30,123,208,.18); color: var(--navy); isolation: isolate; }

/* Cartoon splash: an orange circle swooshes across on every change */
.hk-bb-splash { position: absolute; z-index: 0; right: 28px; top: 56px; width: 70px; height: 70px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #FFB066, #FF8E2E); transform: scale(0); animation: hk-bb-splash .75s cubic-bezier(.2,.7,.2,1) both; pointer-events: none; }
@keyframes hk-bb-splash { 0% { transform: scale(0); opacity: .75; } 70% { transform: scale(7); opacity: .55; } 100% { transform: scale(8); opacity: 0; } }

/* Floating decorations */
.hk-bb-bit { position: absolute; z-index: 0; border-radius: 50%; pointer-events: none; animation: hk-bb-drift 5s ease-in-out infinite; }
.hk-bb-bit-a { top: 12px; right: 96px; width: 18px; height: 18px; background: rgba(245,124,31,.45); }
.hk-bb-bit-b { bottom: 42px; left: -14px; width: 54px; height: 54px; background: rgba(255,255,255,.55); animation-delay: -2s; }
.hk-bb-bit-c { bottom: 56px; right: 16px; width: 22px; height: 22px; border: 3px solid rgba(255,255,255,.9); animation-delay: -3.4s; }
@keyframes hk-bb-drift { 0%, 100% { translate: 0 0; } 50% { translate: 0 -9px; } }

.hk-bb-body { position: relative; z-index: 1; padding: 16px 16px 6px; }

.hk-bb-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px 4px 10px; border-radius: 999px; background: #fff; color: var(--orange-deep); font-family: 'Fredoka', 'Sora', sans-serif; font-size: .82rem; font-weight: 600; box-shadow: 0 3px 0 rgba(11,42,91,.12); animation: hk-bb-tag-in .6s cubic-bezier(.34,1.56,.64,1) both, hk-bb-wiggle 3s ease-in-out 1s infinite; }
@keyframes hk-bb-tag-in { from { opacity: 0; transform: translateX(-30px) rotate(-12deg) scale(.6); } to { opacity: 1; transform: none; } }
@keyframes hk-bb-wiggle { 0%, 88%, 100% { rotate: 0deg; } 92% { rotate: -4deg; } 96% { rotate: 4deg; } }

.hk-bb-main { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; }
.hk-bb-left { flex: 1; min-width: 0; }
.hk-bb-amount { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }

.hk-bb-qty { display: inline-flex; font-family: 'Fredoka', 'Sora', sans-serif; font-weight: 700; font-size: clamp(3rem, 15vw, 4.4rem); line-height: .98; letter-spacing: -.01em; color: var(--navy); text-shadow: 0 4px 0 rgba(255,255,255,.95); }
.hk-bb-ch { display: inline-block; transform-origin: 50% 90%; animation: hk-bb-pop .85s cubic-bezier(.34,1.56,.64,1) backwards, hk-bb-bob 2.6s ease-in-out infinite; animation-delay: calc(var(--i) * 70ms), calc(1s + var(--i) * 140ms); }
@keyframes hk-bb-pop {
  0% { opacity: 0; transform: translateY(56px) scale(.4, 1.5) rotate(-10deg); }
  55% { opacity: 1; transform: translateY(-16px) scale(1.15, .85) rotate(3deg); }
  75% { transform: translateY(4px) scale(.96, 1.05); }
  100% { transform: none; }
}
@keyframes hk-bb-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -5px; } }

.hk-bb-unit { padding: 2px 12px 3px; border-radius: 12px; background: linear-gradient(135deg, #FF8E2E, var(--orange-deep)); color: #fff; font-family: 'Fredoka', 'Sora', sans-serif; font-size: 1.15rem; font-weight: 700; letter-spacing: .04em; box-shadow: 0 4px 0 #B94F00; transform: rotate(-4deg); animation: hk-bb-unit-in .7s cubic-bezier(.34,1.56,.64,1) .25s backwards; }
@keyframes hk-bb-unit-in { from { opacity: 0; transform: scale(0) rotate(-40deg); } to { opacity: 1; transform: rotate(-4deg); } }

.hk-bb-valid { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 5px 12px; border-radius: 999px; background: #fff; color: var(--navy); font-family: 'Fredoka', 'Manrope', sans-serif; font-size: .92rem; font-weight: 600; box-shadow: 0 3px 0 rgba(11,42,91,.12); animation: hk-bb-slide .6s cubic-bezier(.34,1.56,.64,1) .35s backwards; }
.hk-bb-valid svg { color: var(--sky, #1E7BD0); }
@keyframes hk-bb-slide { from { opacity: 0; transform: translateX(-36px) scale(.8); } to { opacity: 1; transform: none; } }

/* Price sticker */
.hk-bb-sticker { flex: none; display: grid; place-items: center; align-content: center; width: 86px; height: 86px; border-radius: 50%; background: radial-gradient(circle at 30% 28%, #FFB066, #FF8E2E 55%, #E8700F); color: #fff; border: 3px solid #fff; box-shadow: 0 6px 0 #B94F00, 0 14px 20px rgba(223,101,9,.3); transform: rotate(-8deg); font-family: 'Fredoka', 'Sora', sans-serif; line-height: 1; animation: hk-bb-sticker .85s cubic-bezier(.34,1.56,.64,1) .2s backwards, hk-bb-wob 2.8s ease-in-out 1.2s infinite; }
.hk-bb-sticker small { font-size: .66rem; font-weight: 700; letter-spacing: .16em; opacity: .95; }
.hk-bb-sticker strong { font-size: 1.9rem; font-weight: 700; margin-top: 2px; text-shadow: 0 2px 0 rgba(150,60,0,.35); }
@keyframes hk-bb-sticker { 0% { opacity: 0; transform: scale(0) rotate(160deg); } 70% { transform: scale(1.2) rotate(-14deg); } 100% { opacity: 1; transform: rotate(-8deg); } }
@keyframes hk-bb-wob { 0%, 100% { scale: 1; } 50% { scale: 1.07; } }

/* Pill dots instead of a progress bar */
.hk-bb-dots { position: relative; z-index: 1; display: flex; justify-content: center; align-items: center; gap: 8px; padding: 10px 0 15px; }
.hk-bb-pip { position: relative; width: 10px; height: 10px; border-radius: 999px; background: rgba(23,96,159,.22); overflow: hidden; transition: width .45s cubic-bezier(.34,1.56,.64,1), background .3s ease; }
.hk-bb-pip b { position: absolute; inset: 0; width: 0; border-radius: inherit; background: linear-gradient(90deg, #FF8E2E, #FFB066); }
.hk-bb-pip.is-on { width: 38px; background: rgba(245,124,31,.25); }
.hk-bb-pip.is-on b { width: 100%; }
.hk-bb-pip.is-run b { width: 0; animation: hk-bb-fill var(--cycle) linear forwards; }
@keyframes hk-bb-fill { to { width: 100%; } }

@media (max-width: 380px) {
  .hk-bb-sticker { width: 74px; height: 74px; }
  .hk-bb-sticker strong { font-size: 1.6rem; }
  .hk-bb-qty { font-size: clamp(2.6rem, 14vw, 3.2rem); }
}

/* ---------- Form controls ---------- */
.hk-label { display: block; font-weight: 700; font-size: .88rem; color: var(--navy); margin: 0 0 7px; }
.hk-input-wrap { position: relative; display: flex; align-items: center; margin-bottom: 14px; }
.hk-input-wrap svg { position: absolute; left: 14px; color: var(--muted); pointer-events: none; }
.hk-input { width: 100%; padding: 14px 14px 14px 44px; border: 1.5px solid var(--line); border-radius: 14px; background: var(--white); font-size: 1rem; font-weight: 600; letter-spacing: .02em; transition: border-color .18s ease, box-shadow .18s ease; }
.hk-input::placeholder { color: #9AA9C0; font-weight: 500; }
.hk-input:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 4px rgba(20,115,200,.16); }
.hk-field-error { display: flex; align-items: center; gap: 7px; color: var(--bad); font-size: .86rem; font-weight: 600; margin: -4px 0 14px; }
.hk-check { display: flex; align-items: center; gap: 10px; font-size: .9rem; font-weight: 600; color: var(--navy); margin: 0 0 14px; cursor: pointer; }
.hk-check input { width: 18px; height: 18px; accent-color: var(--blue); }

/* ---------- Sections ---------- */
.hk-section { padding: clamp(56px, 8vw, 104px) 0; scroll-margin-top: 64px; }
.hk-section-head { display: grid; gap: 12px; margin-bottom: clamp(26px, 4vw, 44px); }

/* ---------- Bundles section ---------- */
.hk-bundles { padding-top: clamp(36px, 6vw, 72px); }
.hk-bundles .hk-section-head { justify-items: center; margin-bottom: 22px; text-align: center; }

/* The board: one baby-blue card, labelled sections, square tiles (8-point rhythm) */
.hk-board { --baby: #CDE6FA; --baby-soft: #EEF7FE; --baby-edge: #BBDBF4; --sky: #1E7BD0; --sky-deep: #17609F; display: grid; gap: 16px; max-width: 760px; margin: 0 auto; padding: clamp(12px, 3vw, 24px); border-radius: 26px; background: var(--baby-soft); border: 1px solid var(--baby-edge); box-shadow: var(--shadow-md); }
.hk-board-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: -8px; }
.hk-board-cap { font-size: .74rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--sky-deep); }
.hk-board-count { font-size: .82rem; font-weight: 700; color: var(--navy); }
.hk-board-status { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding-top: 12px; border-top: 1px solid var(--baby-edge); font-size: .82rem; line-height: 1.4; color: var(--muted); }
.hk-empty { display: grid; justify-items: center; gap: 14px; padding: 36px 16px; text-align: center; color: var(--muted); border: 1px dashed var(--baby-edge); border-radius: 18px; background: var(--white); }

/* Segmented control: fixed width, sliding thumb, nothing to swipe */
.hk-seg { position: relative; display: grid; grid-template-columns: repeat(var(--n), 1fr); padding: 3px; border-radius: 12px; background: var(--baby); }
.hk-seg::before { content: ''; position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc((100% - 6px) / var(--n)); border-radius: 9px; background: var(--sky); transform: translateX(calc(var(--idx) * 100%)); transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.hk-seg-btn { position: relative; z-index: 1; min-height: 40px; padding: 0 4px; border: 0; border-radius: 9px; background: none; font-weight: 700; font-size: .84rem; color: var(--sky-deep); white-space: nowrap; transition: color .2s ease; }
.hk-seg-btn.is-active { color: #fff; }

/* Labelled sections: Data bundles, Minutes, SMS */
.hk-secs { display: grid; gap: 24px; }
.hk-sec { display: grid; gap: 12px; }
.hk-sec-head { display: flex; align-items: center; gap: 16px; }
.hk-sec-title { display: inline-flex; align-items: center; gap: 10px; flex: none; padding-left: 0; font-family: 'Sora', sans-serif; font-size: 1.02rem; font-weight: 800; letter-spacing: -0.01em; line-height: 1.2; color: var(--navy); white-space: nowrap; scroll-margin-top: 88px; }
.hk-sec-title::before { content: ''; flex: none; position: static; width: 4px; height: 18px; border-radius: 2px; background: var(--sky); transform: none; }
.hk-sec-rule { flex: 1 1 auto; min-width: 12px; height: 1px; margin: 0 6px; background: var(--baby-edge); }
.hk-sec-count { flex: none; padding-left: 6px; font-size: .78rem; font-weight: 700; white-space: nowrap; color: var(--sky-deep); }

/* Tile grid: 5 across on larger screens, 3 across on phones */
.hk-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }

/* Square tile. Text sizes scale with the tile's own width (cqw), so nothing is squeezed. */
.hk-tile { --foot: 28px; container-type: inline-size; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; aspect-ratio: 1 / 1; padding: 0 4px var(--foot); border-radius: 16px; border: 1.5px solid var(--baby-edge); background: var(--white); text-align: center; overflow: hidden; cursor: pointer; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
@media (hover: hover) {
  .hk-tile:hover { transform: translateY(-2px); border-color: var(--sky); box-shadow: var(--shadow-sm); }
}
.hk-tile:active { transform: scale(.97); }
.hk-tile.is-selected { border-color: var(--sky); box-shadow: 0 0 0 3px var(--baby); }
.hk-tile-qty { font-family: 'Sora', sans-serif; font-weight: 800; font-size: clamp(1.05rem, 22cqw, 1.7rem); line-height: 1; letter-spacing: -0.03em; color: var(--navy); }
.hk-tile.is-long .hk-tile-qty { font-size: clamp(.9rem, 17cqw, 1.35rem); }
.hk-tile-unit { margin-top: 4cqw; font-size: clamp(.6rem, 8cqw, .72rem); font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--sky); }
.hk-tile-valid { margin-top: 5cqw; font-size: clamp(.6rem, 8cqw, .7rem); font-weight: 700; line-height: 1.2; color: var(--muted); }
.hk-tile-price { position: absolute; left: 0; right: 0; bottom: 0; display: grid; place-items: center; height: var(--foot); background: var(--baby); border-top: 1px solid var(--baby-edge); font-size: clamp(.72rem, 10cqw, .82rem); font-weight: 800; color: var(--navy); transition: background .18s ease, color .18s ease; }
.hk-tile.is-selected .hk-tile-price { background: var(--sky); border-top-color: var(--sky); color: #fff; }
.hk-night-tag { padding: 1px 6px; border-radius: 999px; background: var(--baby-soft); border: 1px solid var(--baby-edge); font-size: .56rem; font-weight: 800; letter-spacing: .08em; line-height: 1.5; text-transform: uppercase; color: var(--sky-deep); }
.hk-tile .hk-night-tag { position: absolute; top: 6px; right: 6px; }
.hk-tile-night { position: absolute; top: 7px; right: 7px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--baby-soft); border: 1px solid var(--baby-edge); color: var(--sky-deep); }
.hk-tile-night svg { display: block; }
.hk-tile.is-locked .hk-tile-qty, .hk-tile.is-locked .hk-tile-unit, .hk-tile.is-locked .hk-tile-valid { opacity: .45; }
.hk-tile.is-locked .hk-tile-price { color: #6F7E98; }
.hk-tile.is-locked.is-selected .hk-tile-price { color: #fff; }

/* Details panel: opens under the tapped tile's row, arrow points at the tile */
.hk-detail { position: relative; grid-column: 1 / -1; display: grid; gap: 14px; margin: 6px 0 4px; padding: 16px; border-radius: 18px; background: var(--white); border: 1.5px solid var(--sky); box-shadow: var(--shadow-sm); animation: hk-reveal .28s cubic-bezier(.2,.8,.2,1) both; }
.hk-detail::before { content: ''; position: absolute; top: -8px; left: calc((var(--col) + .5) / var(--cols) * 100%); width: 14px; height: 14px; background: var(--white); border-left: 1.5px solid var(--sky); border-top: 1.5px solid var(--sky); transform: translateX(-50%) rotate(45deg); }
@keyframes hk-reveal { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
.hk-detail-close { position: absolute; top: 12px; right: 12px; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--baby-edge); background: var(--baby-soft); font-size: .78rem; font-weight: 700; color: var(--sky-deep); }
.hk-detail-close:hover { background: var(--baby); }
.hk-detail-head { padding-right: 76px; }
.hk-detail-kicker { font-size: .78rem; font-weight: 800; color: var(--sky-deep); }
.hk-detail-title { margin-top: 2px; font-family: 'Sora', sans-serif; font-size: 1.7rem; font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; color: var(--navy); }
.hk-detail-title span { font-size: 1rem; font-weight: 700; letter-spacing: 0; color: var(--sky); }
.hk-detail-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin: 0; }
.hk-detail-list div { display: grid; gap: 1px; }
.hk-detail-list dt { font-size: .7rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.hk-detail-list dd { margin: 0; font-size: .95rem; font-weight: 800; color: var(--navy); }
.hk-detail-badge { justify-self: start; padding: 3px 10px; border-radius: 999px; background: var(--baby); border: 1px solid var(--baby-edge); font-size: .76rem; font-weight: 700; color: var(--sky-deep); }
.hk-detail-cta { width: 100%; min-height: 48px; }
.hk-detail .hk-btn:disabled { background: #E7EDF5; color: #6F7E98; box-shadow: none; transform: none; }

/* Wider screens: details lay out in a single row */
@media (min-width: 561px) {
.hk-detail { grid-template-columns: auto 1fr auto; align-items: center; gap: 14px 28px; padding: 18px 22px; }
.hk-detail-badge { grid-column: 1 / -1; }
.hk-detail-cta { width: auto; min-width: 210px; }
}

/* Phones: 3 tiles per row, roomy tiles, text scales with tile width */
@media (max-width: 560px) {
  .hk-bundles .hk-container { padding-left: 12px; padding-right: 12px; }
  .hk-board { padding: 12px; border-radius: 22px; gap: 14px; }
  .hk-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .hk-tile { aspect-ratio: 1 / 1.08; --foot: 32px; border-radius: 14px; padding-left: 6px; padding-right: 6px; }
  .hk-tile-qty { font-size: clamp(1.4rem, 24cqw, 1.9rem); }
  .hk-tile.is-long .hk-tile-qty { font-size: clamp(1.15rem, 19cqw, 1.5rem); }
  .hk-tile-unit { margin-top: 6px; font-size: .7rem; }
  .hk-tile-valid { margin-top: 6px; font-size: .68rem; }
  .hk-tile-price { font-size: .82rem; }
}

/* Very small phones: keep 3 across but tighten a little */
@media (max-width: 340px) {
  .hk-grid { gap: 7px; }
  .hk-tile-qty { font-size: clamp(1.2rem, 22cqw, 1.5rem); }
}

/* ---------- How it works ---------- */
.hk-how { background: var(--paper); }
.hk-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(22px, 3vw, 40px); position: relative; }
.hk-steps li { position: relative; display: grid; gap: 8px; align-content: start; }
.hk-steps li p { color: var(--muted); }
.hk-step-num { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; font-family: 'Sora', sans-serif; font-weight: 700; color: #fff; background: linear-gradient(135deg, var(--cyan), var(--blue)); box-shadow: 0 8px 18px rgba(20,115,200,.3); margin-bottom: 6px; }
.hk-steps li:not(:last-child)::after { content: ''; position: absolute; top: 23px; left: 60px; right: calc(-1 * clamp(22px, 3vw, 40px) + 14px); height: 2px; background: repeating-linear-gradient(90deg, #A8C6E6 0 7px, transparent 7px 14px); }
.hk-paybill { display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; align-items: center; margin-top: clamp(34px, 5vw, 56px); padding: clamp(20px, 3vw, 32px); background: var(--white); border: 1px solid var(--line); border-radius: 24px; box-shadow: var(--shadow-sm); }
.hk-paybill-copy { display: grid; gap: 8px; }
.hk-paybill-copy p { color: var(--muted); }
.hk-paybill-box { display: grid; justify-items: start; gap: 10px; padding: 20px 24px; border-radius: 18px; background: var(--paper); border: 1px dashed #A8C6E6; }
.hk-paybill-label { font-size: .84rem; font-weight: 700; color: var(--muted); }
.hk-paybill-number { font-size: clamp(1.9rem, 4vw, 2.5rem); font-weight: 800; color: var(--navy); letter-spacing: .02em; line-height: 1; }

/* ---------- Why us ---------- */
.hk-why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 clamp(26px, 4vw, 56px); }
.hk-why-item { display: grid; gap: 8px; align-content: start; padding: 28px 0; border-top: 1px solid var(--line); }
.hk-why-item p { color: var(--muted); }
.hk-why-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: var(--blue); background: #E8F3FC; margin-bottom: 6px; }

/* ---------- FAQ ---------- */
/* ---------- FAQ ---------- */
.hk-faq { --f-soft: #EEF7FE; --f-row: #E4F1FC; --f-edge: #BBDBF4; --f-sky: #1E7BD0; --f-deep: #17609F; background: linear-gradient(180deg, var(--paper) 0%, #DDEEFB 100%); }

.hk-faq-card { position: relative; max-width: 760px; margin: 0 auto; padding: clamp(24px, 5vw, 48px) clamp(12px, 4vw, 40px) clamp(22px, 4vw, 34px); border-radius: clamp(26px, 5vw, 36px); background: linear-gradient(180deg, #FFFFFF 0%, var(--f-soft) 100%); border: 1px solid var(--f-edge); box-shadow: var(--shadow-md); overflow: hidden; }
.hk-faq-card::before { content: ''; position: absolute; top: -130px; right: -90px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(255,142,46,.20), transparent 70%); pointer-events: none; }
.hk-faq-card::after { content: ''; position: absolute; bottom: -140px; left: -100px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(18,181,229,.18), transparent 70%); pointer-events: none; }
.hk-faq-card > * { position: relative; z-index: 1; }

.hk-faq-top { display: grid; justify-items: center; gap: 12px; text-align: center; }
.hk-faq-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: #fff; border: 1px solid var(--f-edge); font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--f-deep); }
.hk-faq-badge i { width: 8px; height: 8px; border-radius: 50%; background: var(--orange); box-shadow: 0 0 0 3px rgba(245,124,31,.2); }
.hk-faq-title { font-family: 'Sora', sans-serif; font-size: clamp(1.9rem, 7.5vw, 2.9rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.035em; color: var(--navy); }
.hk-faq-lead { max-width: 36ch; font-size: .96rem; color: var(--muted); }

.hk-faq-list { display: grid; gap: 10px; margin-top: 26px; }

.hk-faq-item { border: 1.5px solid transparent; border-radius: 22px; background: var(--f-row); overflow: hidden; transition: box-shadow .25s ease, background-color .25s ease; }
.hk-faq-item:hover { background: #DCEBFA; }
.hk-faq-item.is-open { background: linear-gradient(#FFFFFF, #FFFFFF) padding-box, linear-gradient(135deg, #12B5E5 0%, #1E7BD0 45%, #FF8E2E 100%) border-box; box-shadow: 0 14px 30px rgba(30,123,208,.16); }

.hk-faq-q { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 64px; padding: 12px 12px 12px 14px; background: none; border: 0; border-radius: 22px; text-align: left; color: var(--navy); font-weight: 700; }
.hk-faq-num { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: #fff; font-family: 'Sora', sans-serif; font-size: .74rem; font-weight: 800; color: var(--f-deep); transition: background .25s ease, color .25s ease; }
.hk-faq-item.is-open .hk-faq-num { background: #FFF0E0; color: var(--orange-deep); }
.hk-faq-text { flex: 1; min-width: 0; font-family: 'Sora', 'Manrope', sans-serif; font-weight: 700; font-size: .98rem; line-height: 1.35; letter-spacing: -0.01em; color: var(--navy); }

/* Plus / X icon drawn in CSS (no icon import needed) */
.hk-faq-ico { position: relative; flex: none; width: 38px; height: 38px; border-radius: 50%; background: var(--navy); transition: background .25s ease, box-shadow .25s ease; }
.hk-faq-ico::before, .hk-faq-ico::after { content: ''; position: absolute; left: 50%; top: 50%; width: 14px; height: 2px; border-radius: 2px; background: #fff; transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.hk-faq-ico::before { transform: translate(-50%, -50%); }
.hk-faq-ico::after { transform: translate(-50%, -50%) rotate(90deg); }
.hk-faq-item.is-open .hk-faq-ico { background: linear-gradient(135deg, #FF8E2E, var(--orange-deep)); box-shadow: 0 6px 14px rgba(245,124,31,.35); }
.hk-faq-item.is-open .hk-faq-ico::before { transform: translate(-50%, -50%) rotate(45deg); }
.hk-faq-item.is-open .hk-faq-ico::after { transform: translate(-50%, -50%) rotate(-45deg); }

/* The curtain: drops down from the question, answer sits on its own padded card */
.hk-faq-drop { display: grid; grid-template-rows: 0fr; visibility: hidden; transition: grid-template-rows .45s cubic-bezier(.2,.8,.2,1), visibility 0s linear .45s; }
.hk-faq-drop.is-open { grid-template-rows: 1fr; visibility: visible; transition: grid-template-rows .45s cubic-bezier(.2,.8,.2,1), visibility 0s; }
.hk-faq-drop > div { min-height: 0; overflow: hidden; }

.hk-faq-panel { margin: 2px 10px 12px; padding: 16px 18px 18px; border-radius: 16px; background: linear-gradient(180deg, #F3F9FF 0%, #E6F2FC 100%); border: 1px solid var(--f-edge); border-top: 3px solid var(--orange); opacity: 0; transform: translateY(-16px); transition: opacity .25s ease, transform .45s cubic-bezier(.2,.8,.2,1); }
.hk-faq-drop.is-open .hk-faq-panel { opacity: 1; transform: none; transition-delay: .08s; }

.hk-faq-a { font-size: .93rem; line-height: 1.7; font-weight: 500; color: var(--ink); max-width: 60ch; }

.hk-faq-foot { display: grid; justify-items: center; gap: 12px; margin-top: 26px; text-align: center; font-size: .92rem; font-weight: 600; color: var(--muted); }
.hk-faq-foot .hk-btn { width: 100%; }

@media (min-width: 561px) {
  .hk-faq-foot .hk-btn { width: auto; }
  .hk-faq-q { padding: 12px 12px 12px 18px; }
  .hk-faq-text { font-size: 1rem; }
  .hk-faq-panel { margin: 2px 14px 14px; padding: 18px 22px 20px; }
}
@media (max-width: 560px) {
  .hk-faq { padding: 44px 0 52px; }
  .hk-faq .hk-container { padding-left: 12px; padding-right: 12px; }
}

/* Smooth height animation for any collapsible block */
.hk-collapse { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .32s ease; }
.hk-collapse > div { overflow: hidden; }
.hk-collapse.is-open { grid-template-rows: 1fr; }

/* ---------- Closing CTA ---------- */
.hk-cta { background: linear-gradient(135deg, var(--navy-deep), var(--navy) 55%, #0F5CAE); color: #fff; position: relative; overflow: hidden; }
.hk-cta::after { content: ''; position: absolute; right: -120px; top: -140px; width: 460px; height: 460px; border-radius: 50%; border: 2px solid rgba(255,255,255,.08); box-shadow: 0 0 0 60px rgba(255,255,255,.03), 0 0 0 120px rgba(255,255,255,.02); pointer-events: none; }
.hk-cta-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 30px; padding-top: clamp(48px, 7vw, 80px); padding-bottom: clamp(48px, 7vw, 80px); }
/* Bubbly headline */
.hk-cta-title { flex: 1; min-width: 0; max-width: none; display: grid; gap: 4px; font-family: 'Fredoka', 'Sora', sans-serif; font-weight: 700; line-height: 1.08; letter-spacing: .005em; }
.hk-cta-l1, .hk-cta-l2 { display: block; font-size: clamp(2.1rem, 9vw, 3.8rem); }
.hk-cta-l1 { color: #fff; text-shadow: 0 4px 0 rgba(4,20,52,.35); }
.hk-cta-l2 { color: #FFB066; text-shadow: 0 4px 0 rgba(4,20,52,.4); }
.hk-cta-l1 .hk-bub-ch:nth-child(3n+2) { color: #8FD8F2; }
.hk-cta-l2 .hk-bub-ch:nth-child(3n+1) { color: #fff; }

.hk-bub-word { display: inline-block; white-space: nowrap; margin-right: .26em; }
.hk-bub-ch { display: inline-block; transform-origin: 50% 80%; cursor: default; transition: transform .25s cubic-bezier(.34,1.56,.64,1); animation: hk-bub-in .75s cubic-bezier(.34,1.56,.64,1) backwards, hk-bub-bob 2.8s ease-in-out infinite; animation-delay: calc(var(--i) * 55ms), calc(1.1s + var(--i) * 110ms); }
.hk-bub-ch:hover { transform: scale(1.3) rotate(-8deg); }
@keyframes hk-bub-in { from { opacity: 0; transform: translateY(44px) scale(.3) rotate(-14deg); } to { opacity: 1; transform: none; } }
@keyframes hk-bub-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -6px; } }

.hk-cta-l3 { display: block; margin-top: 12px; font-family: 'Fredoka', 'Manrope', sans-serif; font-size: clamp(1.1rem, 4.4vw, 1.5rem); font-weight: 500; line-height: 1.9; color: rgba(255,255,255,.94); animation: hk-rise .8s cubic-bezier(.2,.7,.2,1) 1.2s backwards; }
.hk-pill { display: inline-block; padding: 0 .6em; margin: 0 .08em; border-radius: 999px; font-weight: 700; color: #fff; box-shadow: 0 6px 14px rgba(4,20,52,.3); animation: hk-wobble 3.2s ease-in-out infinite; }
.hk-pill-a { background: linear-gradient(135deg, #FF8E2E, #DF6509); }
.hk-pill-b { background: linear-gradient(135deg, #12B5E5, #1E7BD0); animation-delay: -1.6s; }
@keyframes hk-wobble { 0%, 100% { transform: rotate(-3deg) scale(1); } 50% { transform: rotate(3deg) scale(1.07); } }

/* Pulsing button */
.hk-cta-btn { flex: none; animation: hk-cta-pulse 2.4s ease-out infinite; }
@keyframes hk-cta-pulse {
  0%, 100% { box-shadow: 0 8px 20px rgba(245,124,31,.32), 0 0 0 0 rgba(255,142,46,.55); }
  70% { box-shadow: 0 8px 20px rgba(245,124,31,.32), 0 0 0 16px rgba(255,142,46,0); }
}

/* Floating bubbles behind the text */
.hk-cta-bubbles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
.hk-cta-bubbles i { position: absolute; bottom: -90px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.55), rgba(255,255,255,.07) 62%); border: 1px solid rgba(255,255,255,.22); animation: hk-float-up 10s linear infinite; }
.hk-cta-bubbles i:nth-child(1) { left: 6%;  width: 46px; height: 46px; animation-duration: 9s; }
.hk-cta-bubbles i:nth-child(2) { left: 24%; width: 24px; height: 24px; animation-duration: 12s; animation-delay: -4s; }
.hk-cta-bubbles i:nth-child(3) { left: 46%; width: 62px; height: 62px; animation-duration: 14s; animation-delay: -7s; }
.hk-cta-bubbles i:nth-child(4) { left: 68%; width: 30px; height: 30px; animation-duration: 10s; animation-delay: -2s; }
.hk-cta-bubbles i:nth-child(5) { left: 84%; width: 52px; height: 52px; animation-duration: 13s; animation-delay: -9s; }
.hk-cta-bubbles i:nth-child(6) { left: 94%; width: 20px; height: 20px; animation-duration: 8s;  animation-delay: -5s; }
@keyframes hk-float-up { 0% { transform: translateY(0) translateX(0); opacity: 0; } 12% { opacity: 1; } 100% { transform: translateY(-560px) translateX(18px); opacity: 0; } }

@media (max-width: 560px) {
  .hk-cta-inner { align-items: stretch; text-align: center; }
  .hk-cta-title { text-align: center; }
  .hk-cta-btn { width: 100%; }
}

/* ---------- Footer ---------- */
.hk-footer { background: var(--navy-deep); color: rgba(255,255,255,.78); padding-top: clamp(40px, 6vw, 64px); }
.hk-footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 32px; }
.hk-footer-brand { display: grid; gap: 16px; align-content: start; max-width: 36ch; font-size: .94rem; }
.hk-footer-h { font-family: 'Sora', sans-serif; font-size: .98rem; font-weight: 600; color: #fff; margin: 0 0 14px; }
.hk-footer ul { display: grid; gap: 8px; }
.hk-footer li button { background: none; border: 0; padding: 0; color: rgba(255,255,255,.78); transition: color .18s ease; }
.hk-footer li button:hover, .hk-footer-link:hover { color: #fff; }
.hk-footer-paybill { font-family: 'Sora', sans-serif; font-size: 1.15rem; font-weight: 700; color: #fff; }
.hk-footer-small { font-size: .86rem; margin-top: 6px; max-width: 28ch; }
.hk-footer-link { display: inline-flex; align-items: center; gap: 8px; transition: color .18s ease; }
.hk-footer-bottom { margin-top: 40px; padding-top: 20px; padding-bottom: 28px; border-top: 1px solid rgba(255,255,255,.12); font-size: .86rem; color: rgba(255,255,255,.6); }

/* ---------- Checkout dialog ---------- */
.hk-overlay { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 16px; background: rgba(7,30,68,.55); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: hk-fade .22s ease both; overflow-y: auto; }
@keyframes hk-fade { from { opacity: 0; } to { opacity: 1; } }
.hk-dialog { position: relative; width: 100%; max-width: 460px; max-height: calc(100vh - 32px); overflow-y: auto; background: var(--white); border-radius: 26px; padding: clamp(22px, 4vw, 32px); box-shadow: var(--shadow-lg); animation: hk-dialog-in .35s cubic-bezier(.2,.8,.2,1) both; }
@keyframes hk-dialog-in { from { opacity: 0; transform: translateY(26px) scale(.97); } to { opacity: 1; transform: none; } }
.hk-dialog-close { position: absolute; top: 14px; right: 14px; width: 38px; height: 38px; }
.hk-dialog-title { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; color: var(--navy); margin-bottom: 18px; padding-right: 40px; }
.hk-summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 18px; margin-bottom: 20px; border-radius: 18px; background: var(--paper); border: 1px solid var(--line); border-left: 5px solid var(--accent); }
.hk-summary-name { font-size: .8rem; font-weight: 700; color: var(--muted); }
.hk-summary-amount { font-size: 1.55rem; font-weight: 800; color: var(--navy); letter-spacing: -0.02em; line-height: 1.2; }
.hk-summary-validity { display: inline-flex; align-items: center; gap: 6px; font-size: .86rem; font-weight: 600; color: var(--muted); }
.hk-summary-price { font-size: 1.6rem; font-weight: 800; color: var(--navy); line-height: 1; }
.hk-summary-price span { font-size: .8rem; font-weight: 700; color: var(--muted); margin-right: 4px; }
.hk-fineprint { margin-top: 12px; font-size: .82rem; color: var(--muted); text-align: center; }
.hk-manual-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 18px; padding: 14px 0 6px; background: none; border: 0; border-top: 1px solid var(--line); font-weight: 700; color: var(--navy); }
.hk-manual-toggle svg { transition: transform .3s ease; color: var(--blue); }
.hk-manual-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
.hk-manual-steps { display: grid; gap: 8px; padding: 6px 0 4px 20px; list-style: decimal; color: var(--muted); font-size: .9rem; }
.hk-manual-steps li::marker { color: var(--blue); font-weight: 700; }
.hk-copy { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 8px; border: 1px solid var(--line); background: var(--paper); font-weight: 800; color: var(--navy); }
.hk-copy:hover { border-color: var(--blue); }

.hk-state { display: grid; gap: 4px; }
.hk-state-center { justify-items: center; text-align: center; }
.hk-state-center .hk-dialog-title { padding-right: 0; }
.hk-state-text { color: var(--muted); margin-bottom: 18px; max-width: 38ch; }
.hk-progress-steps { display: grid; gap: 12px; margin: 4px 0 18px; }
.hk-progress-steps li { display: flex; align-items: center; gap: 12px; font-weight: 600; color: #8C9AB2; }
.hk-progress-steps li.is-active { color: var(--navy); }
.hk-progress-steps li.is-done { color: var(--ok); }
.hk-step-ico { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--paper); border: 1px solid var(--line); }
.hk-progress-steps li.is-active .hk-step-ico { background: #E8F3FC; border-color: #A8C6E6; color: var(--blue); }
.hk-progress-steps li.is-done .hk-step-ico { background: #E5F6EC; border-color: #A9DFC2; color: var(--ok); }
.hk-spin { animation: hk-spin 1s linear infinite; }
@keyframes hk-spin { to { transform: rotate(360deg); } }
.hk-wait-bar { height: 6px; border-radius: 999px; background: var(--paper); overflow: hidden; margin-bottom: 8px; }
.hk-wait-bar span { display: block; height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, var(--cyan), var(--blue)); animation-name: hk-fill; animation-timing-function: linear; animation-fill-mode: forwards; }
@keyframes hk-fill { to { width: 100%; } }

.hk-tick { width: 84px; height: 84px; margin-bottom: 10px; }
.hk-tick-circle { fill: #E5F6EC; stroke: var(--ok); stroke-width: 2.5; stroke-dasharray: 145; stroke-dashoffset: 145; animation: hk-draw .6s ease forwards; }
.hk-tick-check { fill: none; stroke: var(--ok); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 40; animation: hk-draw .4s ease .5s forwards; }
@keyframes hk-draw { to { stroke-dashoffset: 0; } }
.hk-fail-ico { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; background: #FDECEA; color: var(--bad); margin-bottom: 10px; }

/* ---------- Floating customer care (WhatsApp) ---------- */
.hk-wa { position: fixed; right: max(18px, env(safe-area-inset-right)); bottom: max(18px, env(safe-area-inset-bottom)); z-index: 70; display: inline-flex; align-items: center; border-radius: 999px; background: linear-gradient(135deg, #2BDC6E, #1FA855); color: #fff; box-shadow: 0 12px 30px rgba(18,140,70,.38), 0 2px 6px rgba(0,0,0,.12); transition: transform .22s ease, box-shadow .22s ease; animation: hk-wa-in .6s cubic-bezier(.2,.8,.2,1) 1.2s backwards; }
.hk-wa:hover { transform: translateY(-3px); box-shadow: 0 18px 38px rgba(18,140,70,.46), 0 2px 8px rgba(0,0,0,.14); }
.hk-wa:active { transform: translateY(0) scale(.97); }
.hk-wa-icon { display: grid; place-items: center; flex: none; width: 58px; height: 58px; }
.hk-wa-label { display: grid; line-height: 1.2; padding-right: 22px; margin-left: -4px; text-align: left; }
.hk-wa-label strong { font-size: .95rem; font-weight: 800; }
.hk-wa-label span { font-size: .74rem; opacity: .92; }
@keyframes hk-wa-in { from { opacity: 0; transform: translateY(22px) scale(.92); } }
@media (max-width: 640px) {
  .hk-wa-label { display: none; }
  .hk-wa-icon { width: 56px; height: 56px; }
}

/* ---------- Responsive ---------- */
@media (max-width: 1020px) {
  .hk-hero-grid { grid-template-columns: 1fr; }
  .hk-h1 { max-width: 20ch; }
  .hk-hero-panel { max-width: 560px; }
  .hk-why-grid { grid-template-columns: repeat(2, 1fr); }
  .hk-footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 860px) {
  .hk-nav-links, .hk-nav-cta { display: none; }
  .hk-nav-burger { display: inline-grid; }
  .hk-mobile-menu { display: block; max-height: 0; overflow: hidden; background: var(--white); border-top: 1px solid transparent; transition: max-height .35s ease, border-color .35s ease; }
  .hk-mobile-menu.is-open { max-height: 420px; border-top-color: var(--line); }
  .hk-mobile-menu .hk-container { display: grid; gap: 4px; padding-top: 12px; padding-bottom: 18px; }
  .hk-mobile-menu button:not(.hk-btn) { text-align: left; padding: 13px 10px; font-size: 1.02rem; }
  .hk-steps { grid-template-columns: 1fr; }
  .hk-steps li:not(:last-child)::after { display: none; }
  .hk-paybill { grid-template-columns: 1fr; }
  .hk-cta-inner { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 640px) {
  .hk-why-grid { grid-template-columns: 1fr; }
  .hk-footer-grid { grid-template-columns: 1fr; }
  .hk-hero-actions .hk-btn { flex: 1 1 100%; }
  .hk-overlay { align-items: end; padding: 0; }
  .hk-dialog { max-width: none; border-radius: 26px 26px 0 0; max-height: 94vh; animation-name: hk-sheet-in; }
}
@keyframes hk-sheet-in { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: none; } }
@media (max-width: 380px) {
  .hk-quick-picks { grid-template-columns: 1fr; }
  .hk-logo-tag { display: none; }
}

/* =====================================================================
   BOUNCY BUNDLES
   ===================================================================== */
.hk-bundles-title { font-family: 'Fredoka', 'Sora', sans-serif; font-weight: 700; letter-spacing: .005em; }
.hk-bundles-title .hk-bub-ch:nth-child(3n+2) { color: var(--cyan); }
.hk-bundles-title .hk-bub-word:last-child .hk-bub-ch { color: var(--orange); }

/* Fredoka on the bouncy words */
.hk-sec-title, .hk-sec-count, .hk-board-count, .hk-board-cap, .hk-seg-btn,
.hk-tile-qty, .hk-tile-unit, .hk-tile-price, .hk-tile-valid,
.hk-detail-kicker, .hk-detail-title, .hk-detail-cta { font-family: 'Fredoka', 'Sora', sans-serif; }
.hk-tile-qty { font-weight: 700; letter-spacing: 0; }
.hk-tile-unit, .hk-tile-price, .hk-seg-btn { font-weight: 600; }
.hk-tile-valid { font-weight: 500; }

/* Pop-in when the section scrolls into view */
.hk-sec:not(.is-seen) .hk-tile { opacity: 0; }
.hk-sec.is-seen .hk-tile { animation: hk-tile-pop .75s cubic-bezier(.34,1.56,.64,1) backwards; }
.hk-sec.is-seen .hk-tile:nth-child(1) { animation-delay: 0ms; }
.hk-sec.is-seen .hk-tile:nth-child(2) { animation-delay: 70ms; }
.hk-sec.is-seen .hk-tile:nth-child(3) { animation-delay: 140ms; }
.hk-sec.is-seen .hk-tile:nth-child(4) { animation-delay: 210ms; }
.hk-sec.is-seen .hk-tile:nth-child(5) { animation-delay: 280ms; }
.hk-sec.is-seen .hk-tile:nth-child(6) { animation-delay: 350ms; }
.hk-sec.is-seen .hk-tile:nth-child(7) { animation-delay: 420ms; }
.hk-sec.is-seen .hk-tile:nth-child(8) { animation-delay: 490ms; }
.hk-sec.is-seen .hk-tile:nth-child(n+9) { animation-delay: 560ms; }
@keyframes hk-tile-pop {
  0%   { opacity: 0; transform: translateY(36px) scale(.5, .7) rotate(-6deg); }
  55%  { opacity: 1; transform: translateY(-8px) scale(1.08, .94) rotate(2deg); }
  78%  { transform: translateY(2px) scale(.98, 1.03); }
  100% { opacity: 1; transform: none; }
}

/* Springy hover, press and select */
.hk-tile { transition: transform .35s cubic-bezier(.34,1.56,.64,1), border-color .18s ease, box-shadow .25s ease; }
@media (hover: hover) {
  .hk-tile:hover { transform: translateY(-4px) rotate(-1.5deg) scale(1.04); }
}
.hk-tile:active { transform: scale(.92); }
.hk-tile.is-selected { transform: translateY(-3px) scale(1.04); }
.hk-tile.is-selected .hk-tile-qty { animation: hk-qty-boing .65s cubic-bezier(.34,1.56,.64,1); }
@keyframes hk-qty-boing {
  0% { transform: none; }
  30% { transform: scale(1.35, .78); }
  60% { transform: scale(.9, 1.18) translateY(-3px); }
  100% { transform: none; }
}
.hk-tile-night { animation: hk-moon 3.4s ease-in-out infinite; }
@keyframes hk-moon { 0%, 80%, 100% { rotate: 0deg; } 86% { rotate: -14deg; } 93% { rotate: 12deg; } }

/* Details panel springs open */
.hk-detail { transform-origin: top center; animation: hk-detail-pop .55s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes hk-detail-pop {
  from { opacity: 0; transform: translateY(-14px) scaleY(.82); }
  to   { opacity: 1; transform: none; }
}
.hk-detail-cta:not(:disabled) { animation: hk-cta-pulse 2.4s ease-out infinite; }

/* =====================================================================
   CHECKOUT: GEN Z
   ===================================================================== */
.hk-dialog { max-width: 440px; isolation: isolate; overflow-x: hidden; padding: clamp(22px, 5vw, 30px); background: linear-gradient(180deg, #FFFFFF 0%, #E9F5FE 100%); border: 3px solid #fff; border-radius: 34px; box-shadow: 0 10px 0 rgba(11,42,91,.16), 0 34px 70px rgba(11,42,91,.35); animation: hk-ck-in .65s cubic-bezier(.34,1.56,.64,1) both; }
.hk-dialog::before { content: ''; position: absolute; z-index: -1; top: -70px; right: -60px; width: 210px; height: 210px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, rgba(255,176,102,.6), rgba(255,142,46,0) 70%); pointer-events: none; animation: hk-ck-float 6s ease-in-out infinite; }
.hk-dialog::after { content: ''; position: absolute; z-index: -1; bottom: -80px; left: -70px; width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle at 60% 40%, rgba(18,181,229,.4), rgba(18,181,229,0) 70%); pointer-events: none; animation: hk-ck-float 7.5s ease-in-out -3s infinite; }
@keyframes hk-ck-in {
  from { opacity: 0; transform: translateY(44px) scale(.86) rotate(-2deg); }
  60%  { opacity: 1; transform: translateY(-8px) scale(1.03) rotate(.5deg); }
  to   { transform: none; }
}
@keyframes hk-ck-float { 0%, 100% { translate: 0 0; } 50% { translate: 10px 14px; } }

.hk-dialog-close { z-index: 2; width: 40px; height: 40px; border-radius: 50%; background: #fff; border: 2.5px solid #BBDBF4; box-shadow: 0 3px 0 #BBDBF4; transition: transform .3s cubic-bezier(.34,1.56,.64,1), background .18s ease; }
.hk-dialog-close:hover { transform: rotate(90deg) scale(1.1); background: #FFF0E0; }
.hk-dialog-close:active { transform: scale(.88); }

.hk-dialog-title { font-family: 'Fredoka', 'Sora', sans-serif; font-size: 1.75rem; font-weight: 700; letter-spacing: .005em; line-height: 1.1; color: var(--navy); margin-bottom: 18px; padding-right: 48px; }

/* Entrance stagger for every step of the dialog */
.hk-dialog form > *, .hk-state > * { animation: hk-ck-rise .55s cubic-bezier(.34,1.56,.64,1) backwards; }
.hk-dialog form > *:nth-child(1), .hk-state > *:nth-child(1) { animation-delay: .05s; }
.hk-dialog form > *:nth-child(2), .hk-state > *:nth-child(2) { animation-delay: .10s; }
.hk-dialog form > *:nth-child(3), .hk-state > *:nth-child(3) { animation-delay: .15s; }
.hk-dialog form > *:nth-child(4), .hk-state > *:nth-child(4) { animation-delay: .20s; }
.hk-dialog form > *:nth-child(5), .hk-state > *:nth-child(5) { animation-delay: .25s; }
.hk-dialog form > *:nth-child(n+6), .hk-state > *:nth-child(n+6) { animation-delay: .30s; }
@keyframes hk-ck-rise { from { opacity: 0; transform: translateY(22px) scale(.96); } to { opacity: 1; transform: none; } }

/* Order summary: sticker ticket with a price badge */
.hk-summary { rotate: -1.2deg; gap: 12px; padding: 16px; border: 3px solid #fff; border-radius: 26px; background: linear-gradient(150deg, #E4F3FE 0%, #BFE0FA 100%); box-shadow: 0 6px 0 rgba(11,42,91,.14), 0 14px 22px rgba(30,123,208,.18); }
.hk-summary-name { display: inline-block; padding: 1px 11px 2px; border-radius: 999px; background: #fff; color: var(--orange-deep); font-family: 'Fredoka', sans-serif; font-size: .78rem; font-weight: 600; box-shadow: 0 2px 0 rgba(11,42,91,.1); }
.hk-summary-amount { margin-top: 4px; font-family: 'Fredoka', sans-serif; font-size: 2.1rem; font-weight: 700; letter-spacing: 0; line-height: 1.05; color: var(--navy); text-shadow: 0 3px 0 rgba(255,255,255,.95); }
.hk-summary-validity { margin-top: 6px; padding: 3px 11px; border-radius: 999px; background: #fff; color: var(--navy); font-family: 'Fredoka', sans-serif; font-size: .85rem; font-weight: 500; }
.hk-summary-validity svg { color: var(--blue); }
.hk-summary-price { flex: none; display: grid; place-items: center; align-content: center; width: 78px; height: 78px; border-radius: 50%; border: 3px solid #fff; background: radial-gradient(circle at 30% 28%, #FFB066, #FF8E2E 55%, #E8700F); color: #fff; font-family: 'Fredoka', sans-serif; font-size: 1.7rem; font-weight: 700; line-height: 1; text-shadow: 0 2px 0 rgba(150,60,0,.35); box-shadow: 0 5px 0 #B94F00, 0 12px 18px rgba(223,101,9,.3); rotate: -8deg; animation: hk-ck-wob 2.8s ease-in-out infinite; }
.hk-summary-price span { margin: 0 0 2px; color: #fff; font-size: .62rem; font-weight: 700; letter-spacing: .16em; }
@keyframes hk-ck-wob { 0%, 100% { scale: 1; } 50% { scale: 1.08; } }

/* Fields */
.hk-dialog .hk-label { font-family: 'Fredoka', sans-serif; font-size: .98rem; font-weight: 600; color: var(--navy); }
.hk-dialog .hk-input-wrap svg { left: 16px; color: var(--blue); }
.hk-dialog .hk-input { padding: 15px 16px 15px 48px; border: 2.5px solid #BBDBF4; border-radius: 18px; background: #fff; font-family: 'Fredoka', sans-serif; font-size: 1.12rem; font-weight: 600; letter-spacing: .03em; box-shadow: 0 4px 0 #BBDBF4; transition: transform .3s cubic-bezier(.34,1.56,.64,1), border-color .18s ease, box-shadow .18s ease; }
.hk-dialog .hk-input:focus { transform: translateY(-2px); border-color: var(--blue); box-shadow: 0 6px 0 var(--blue); }
.hk-dialog .hk-check { padding: 11px 14px; border: 2.5px solid #D5E8F8; border-radius: 16px; background: #fff; font-family: 'Fredoka', sans-serif; font-size: .95rem; font-weight: 500; transition: border-color .2s ease, background .2s ease, transform .3s cubic-bezier(.34,1.56,.64,1); }
.hk-dialog .hk-check:active { transform: scale(.97); }
.hk-dialog .hk-check:has(input:checked) { border-color: var(--orange); background: #FFF6EC; }
.hk-dialog .hk-check input { width: 22px; height: 22px; accent-color: var(--orange); }
.hk-dialog .hk-field-error { padding: 9px 12px; border-radius: 14px; background: #FDECEA; font-family: 'Fredoka', sans-serif; font-weight: 500; animation: hk-ck-shake .5s ease; }
@keyframes hk-ck-shake { 0%, 100% { transform: none; } 20% { transform: translateX(-7px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }

/* Chunky press-down buttons */
.hk-dialog .hk-btn { font-family: 'Fredoka', sans-serif; font-size: 1.1rem; font-weight: 600; letter-spacing: .01em; }
.hk-dialog .hk-btn-primary { position: relative; overflow: hidden; padding: 16px 20px; border: 2px solid rgba(255,255,255,.55); border-radius: 20px; box-shadow: 0 6px 0 #B94F00, 0 16px 24px rgba(223,101,9,.32); transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease; }
.hk-dialog .hk-btn-primary::after { content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.45), transparent); transform: skewX(-18deg); animation: hk-ck-shine 3.2s ease-in-out 1s infinite; pointer-events: none; }
@keyframes hk-ck-shine { 0% { left: -60%; } 40%, 100% { left: 140%; } }
.hk-dialog .hk-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 0 #B94F00, 0 20px 28px rgba(223,101,9,.36); }
.hk-dialog .hk-btn-primary:active:not(:disabled) { transform: translateY(5px); box-shadow: 0 1px 0 #B94F00, 0 6px 10px rgba(223,101,9,.3); }
.hk-dialog .hk-btn-ghost { border: 2.5px solid #BBDBF4; border-radius: 18px; background: #fff; box-shadow: 0 4px 0 #BBDBF4; transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease; }
.hk-dialog .hk-btn-ghost:hover { transform: translateY(-2px); }
.hk-dialog .hk-btn-ghost:active { transform: translateY(3px); box-shadow: 0 1px 0 #BBDBF4; }
.hk-fineprint { font-family: 'Fredoka', sans-serif; font-size: .86rem; font-weight: 500; }

/* Manual pay */
.hk-manual-toggle { margin-top: 20px; padding: 12px 16px; border: 2.5px dashed #BBDBF4; border-radius: 18px; background: rgba(255,255,255,.7); font-family: 'Fredoka', sans-serif; font-size: .98rem; font-weight: 600; transition: background .2s ease, transform .3s cubic-bezier(.34,1.56,.64,1); }
.hk-manual-toggle:hover { background: #fff; }
.hk-manual-toggle:active { transform: scale(.97); }
.hk-manual-steps { margin-top: 10px; padding: 14px 16px 14px 36px; border: 2px solid #E0EEF9; border-radius: 18px; background: #fff; font-family: 'Fredoka', sans-serif; font-size: .94rem; font-weight: 500; }
.hk-copy { padding: 2px 11px; border: 2px solid #FFD2A8; border-radius: 999px; background: #FFF0E0; color: var(--orange-deep); font-family: 'Fredoka', sans-serif; font-weight: 700; transition: transform .3s cubic-bezier(.34,1.56,.64,1); }
.hk-copy:hover { transform: scale(1.08) rotate(-2deg); border-color: var(--orange); }

/* Processing: pulsing step badges and a candy-stripe bar */
.hk-state { position: relative; }
.hk-progress-steps li { font-family: 'Fredoka', sans-serif; font-size: 1.02rem; font-weight: 600; }
.hk-step-ico { width: 42px; height: 42px; border: 2.5px solid #D5E8F8; background: #fff; }
.hk-progress-steps li.is-active .hk-step-ico { border-color: var(--orange); background: #FFF0E0; color: var(--orange-deep); animation: hk-ck-ring 1.6s ease-out infinite; }
.hk-progress-steps li.is-done .hk-step-ico { animation: hk-ck-tickpop .5s cubic-bezier(.34,1.56,.64,1); }
@keyframes hk-ck-ring { 0% { box-shadow: 0 0 0 0 rgba(245,124,31,.5); } 100% { box-shadow: 0 0 0 14px rgba(245,124,31,0); } }
@keyframes hk-ck-tickpop { from { transform: scale(0) rotate(-90deg); } to { transform: none; } }
.hk-state-text { font-family: 'Fredoka', sans-serif; font-size: 1.02rem; font-weight: 500; }
.hk-wait-bar { height: 16px; border: 2.5px solid #BBDBF4; border-radius: 999px; background: #fff; }
.hk-wait-bar span { position: relative; overflow: hidden; background: linear-gradient(90deg, #12B5E5, #FF8E2E); }
.hk-wait-bar span::after { content: ''; position: absolute; inset: 0; background-image: repeating-linear-gradient(-45deg, rgba(255,255,255,.35) 0 8px, transparent 8px 16px); background-size: 22.6px 22.6px; animation: hk-ck-stripes .8s linear infinite; }
@keyframes hk-ck-stripes { to { background-position: 22.6px 0; } }

/* Success: bigger tick plus a confetti burst */
.hk-tick { width: 100px; height: 100px; animation: hk-ck-tickbig .8s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes hk-ck-tickbig { from { transform: scale(0) rotate(-120deg); } to { transform: none; } }
.hk-state-center .hk-dialog-title { font-size: 2rem; }
.hk-state-text strong { padding: 1px 10px; border-radius: 999px; background: #FFF0E0; color: var(--orange-deep); font-family: 'Fredoka', sans-serif; font-weight: 700; white-space: nowrap; }
.hk-state-center:has(.hk-tick)::before { content: ''; position: absolute; left: 50%; top: 50px; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #FF8E2E; pointer-events: none; box-shadow: 0 -64px 0 #12B5E5, 56px -34px 0 #FF8E2E, 56px 34px 0 #1E7BD0, 0 64px 0 #FFB066, -56px 34px 0 #12B5E5, -56px -34px 0 #FF8E2E, 34px -86px 0 -2px #1E7BD0, -34px -86px 0 -2px #FFB066; animation: hk-ck-confetti 1s .45s ease-out both; }
@keyframes hk-ck-confetti { from { transform: scale(.2); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }

/* Failed: shaky icon */
.hk-fail-ico { width: 80px; height: 80px; border: 3px solid #fff; box-shadow: 0 5px 0 #F3B9B3; animation: hk-ck-shake .7s .2s ease both; }

/* Phone: bottom sheet that bounces up */
@media (max-width: 640px) {
  .hk-dialog { max-width: none; border-bottom: 0; border-radius: 32px 32px 0 0; padding-bottom: max(26px, env(safe-area-inset-bottom)); box-shadow: 0 -10px 40px rgba(11,42,91,.3); animation-name: hk-ck-sheet; }
  .hk-summary-amount { font-size: 1.85rem; }
}
@keyframes hk-ck-sheet {
  from { transform: translateY(100%); }
  60%  { transform: translateY(-14px); }
  80%  { transform: translateY(4px); }
  to   { transform: none; }
}

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .hk-root *, .hk-root *::before, .hk-root *::after { animation-duration: .001ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}
`;