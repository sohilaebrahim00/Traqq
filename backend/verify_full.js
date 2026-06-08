require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const API  = 'http://localhost:4000/api';
const SITE = 'http://localhost:3000';

async function json(res) {
  const t = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(t) }; }
  catch { return { ok: res.ok, status: res.status, data: t.slice(0, 200) }; }
}

async function run() {
  const results = [];
  function check(name, pass, detail) {
    const sym = pass ? '✅' : '❌';
    results.push({ name, pass, detail });
    console.log(`${sym} ${name}: ${detail}`);
  }

  // ─── 1. Backend health ─────────────────────────────────────────────────────
  try {
    const r = await json(await fetch(API.replace('/api','') + '/health'));
    check('Backend health', r.ok && r.data.status === 'ok', JSON.stringify(r.data));
  } catch(e) { check('Backend health', false, e.message); }

  // ─── 2. /packages frontend route returns 200 ──────────────────────────────
  try {
    const r = await fetch(SITE + '/packages');
    check('/packages route (frontend)', r.ok, `HTTP ${r.status}`);
  } catch(e) { check('/packages route (frontend)', false, e.message); }

  // ─── 3. /package-success with session_id ──────────────────────────────────
  try {
    const r = await fetch(SITE + '/package-success?session_id=cs_test_123');
    check('/package-success?session_id route', r.ok, `HTTP ${r.status}`);
  } catch(e) { check('/package-success?session_id route', false, e.message); }

  // ─── 4. POST /api/packages/checkout requires auth ─────────────────────────
  try {
    const r = await json(await fetch(API + '/packages/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: 'PACKAGE_4' })
    }));
    check('/api/packages/checkout requires auth (401 without token)', r.status === 401, `HTTP ${r.status}`);
  } catch(e) { check('/api/packages/checkout auth guard', false, e.message); }

  // ─── 5. Register → login → checkout session created ───────────────────────
  let token = '', userId = '';
  try {
    const email = 'verify-' + Date.now() + '@traqq.test';
    const phone = '214' + String(Math.floor(Math.random() * 9000000) + 1000000);
    const r = await json(await fetch(API + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Verify Test', email, phoneNumber: phone, password: 'password123' })
    }));
    token  = r.data.accessToken;
    userId = r.data.user?.id;
    check('Register test user', r.ok && !!token, userId || r.data.message || r.status);
  } catch(e) { check('Register test user', false, e.message); }

  // ─── 6. Create real Stripe Checkout Session ────────────────────────────────
  let stripeUrl = '';
  try {
    const r = await json(await fetch(API + '/packages/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ packageId: 'PACKAGE_4' })
    }));
    stripeUrl = r.data.url || '';
    const isRealStripe = stripeUrl.startsWith('https://checkout.stripe.com');
    check('Stripe Checkout Session created', isRealStripe, stripeUrl.slice(0, 80) + '…');
  } catch(e) { check('Stripe Checkout Session created', false, e.message); }

  // ─── 7. Webhook: checkout.session.completed creates PackagePurchase ────────
  let sessionId = '';
  try {
    sessionId = 'cs_verify_' + Date.now();
    const payload = JSON.stringify({
      id: 'evt_verify', object: 'event', type: 'checkout.session.completed',
      data: { object: { id: sessionId, metadata: { packageId: 'PACKAGE_4', userId } } }
    });
    const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const r = await json(await fetch(API + '/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
      body: payload
    }));
    check('Webhook checkout.session.completed', r.ok && r.data.received === true, JSON.stringify(r.data));
  } catch(e) { check('Webhook checkout.session.completed', false, e.message); }

  // ─── 8. PackagePurchase record created in DB ──────────────────────────────
  try {
    const r = await json(await fetch(API + '/packages/active', {
      headers: { Authorization: 'Bearer ' + token }
    }));
    const found = Array.isArray(r.data) && r.data.some(p => p.stripeSessionId === sessionId);
    const pkg = r.data[0];
    check('PackagePurchase record in DB', found,
      found ? `id=${pkg.id} rides=${pkg.remainingRides}/${pkg.totalRides} exp=${pkg.expirationDate.slice(0,10)}` : 'Not found');
  } catch(e) { check('PackagePurchase in DB', false, e.message); }

  // ─── 9. GET /api/packages/active requires auth ────────────────────────────
  try {
    const r = await json(await fetch(API + '/packages/active'));
    check('/api/packages/active requires auth', r.status === 401, `HTTP ${r.status}`);
  } catch(e) { check('/api/packages/active auth guard', false, e.message); }

  // ─── 10. Admin login → JWT has role:ADMIN ────────────────────────────────
  try {
    const r = await json(await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@traqq.local', password: 'Admin@123456' })
    }));
    const isAdmin = r.data.user?.role === 'ADMIN';
    check('Admin login returns role:ADMIN', isAdmin, `role=${r.data.user?.role}`);
  } catch(e) { check('Admin login', false, e.message); }

  // ─── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.pass).length;
  console.log(`\n=== ${passed}/${results.length} checks passed ===`);
  if (passed < results.length) process.exit(1);
}

run();
