require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const API  = 'http://localhost:4000/api';

async function json(res) {
  const t = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(t) }; }
  catch { return { ok: res.ok, status: res.status, data: t.slice(0, 300) }; }
}

async function run() {
  const results = [];
  function check(name, pass, detail) {
    const sym = pass ? '✅' : '❌';
    results.push({ name, pass, detail });
    console.log(`${sym} ${name}: ${detail}`);
  }

  // ── 0. Health ──────────────────────────────────────────────────────────────
  const health = await json(await fetch(API.replace('/api', '') + '/health'));
  check('Backend health', health.ok, JSON.stringify(health.data));

  // ── 1. Register + get token ────────────────────────────────────────────────
  const email = 'task12-' + Date.now() + '@traqq.test';
  const phone = '817' + String(Math.floor(Math.random() * 9000000) + 1000000);
  const reg = await json(await fetch(API + '/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Task12 Tester', email, phoneNumber: phone, password: 'password123' })
  }));
  check('Register user', reg.ok && !!reg.data.accessToken, reg.data.user?.id || reg.data);
  const token  = reg.data.accessToken;
  const userId = reg.data.user?.id;

  // ── 2. Create a booking ────────────────────────────────────────────────────
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 2);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  const booking = await json(await fetch(API + '/bookings/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({
      tripDirection: 'TO_DFW', pickupDate: dateStr, pickupTime: '8:00',
      pickupAddress: '123 Main St, Dallas TX', passengerCount: 2,
      dropoffTerminal: 'A', phoneNumber: phone
    })
  }));
  check('Create booking', booking.ok, booking.data?.id || JSON.stringify(booking.data));
  const bookingId = booking.data?.id;

  // ── 3. Inject an active PackagePurchase directly via a mock webhook ────────
  const sessionId = 'cs_task12_' + Date.now();
  const payload = JSON.stringify({
    id: 'evt_task12', object: 'event', type: 'checkout.session.completed',
    data: { object: { id: sessionId, metadata: { packageId: 'PACKAGE_4', userId } } }
  });
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const wh = await json(await fetch(API + '/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
    body: payload
  }));
  check('Webhook creates PackagePurchase', wh.ok && wh.data.received === true, JSON.stringify(wh.data));

  // ── 4. Fetch active packages to get the packagePurchaseId ─────────────────
  const active = await json(await fetch(API + '/packages/active', {
    headers: { Authorization: 'Bearer ' + token }
  }));
  check('Active packages returned', active.ok && active.data.length > 0, JSON.stringify(active.data[0]?.id));
  const packagePurchaseId = active.data[0]?.id;
  const remainingBefore = active.data[0]?.remainingRides;

  // ── 5. POST /redeem without auth → 401 ────────────────────────────────────
  const noAuth = await json(await fetch(API + '/packages/redeem', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, packagePurchaseId })
  }));
  check('/packages/redeem requires auth (401)', noAuth.status === 401, `HTTP ${noAuth.status}`);

  // ── 6. POST /redeem missing body fields → 400 ─────────────────────────────
  const badBody = await json(await fetch(API + '/packages/redeem', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ bookingId })   // missing packagePurchaseId
  }));
  check('/packages/redeem missing packagePurchaseId → 400', badBody.status === 400, `HTTP ${badBody.status} ${JSON.stringify(badBody.data)}`);

  // ── 7. Successful redemption ───────────────────────────────────────────────
  const redeem = await json(await fetch(API + '/packages/redeem', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ bookingId, packagePurchaseId })
  }));
  check('Redeem success', redeem.ok && redeem.data.success === true, JSON.stringify({ remaining: redeem.data.remainingRides, status: redeem.data.booking?.bookingStatus }));
  const remainingAfter = redeem.data.remainingRides;
  check('remainingRides decremented', remainingAfter === remainingBefore - 1, `${remainingBefore} → ${remainingAfter}`);

  // ── 8. Booking is now CONFIRMED + PAID ────────────────────────────────────
  const bCheck = await json(await fetch(API + '/bookings/' + bookingId));
  check('Booking CONFIRMED+PAID after redeem',
    bCheck.data?.bookingStatus === 'CONFIRMED' && bCheck.data?.paymentStatus === 'PAID',
    `status=${bCheck.data?.bookingStatus} payment=${bCheck.data?.paymentStatus}`);

  // ── 9. Double redeem on same booking → 400 ────────────────────────────────
  const double = await json(await fetch(API + '/packages/redeem', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ bookingId, packagePurchaseId })
  }));
  check('Double redeem prevented (400)', double.status === 400, `HTTP ${double.status} ${JSON.stringify(double.data)}`);

  // ── 10. Standard booking create-intent still works ────────────────────────
  const tomorrow2 = new Date(); tomorrow2.setDate(tomorrow2.getDate() + 3);
  const dateStr2 = tomorrow2.toISOString().slice(0, 10);
  const b2 = await json(await fetch(API + '/bookings/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({
      tripDirection: 'FROM_DFW', pickupDate: dateStr2, pickupTime: '10:00',
      pickupAddress: '456 Elm St, Fort Worth TX', passengerCount: 1,
      dropoffTerminal: 'B', phoneNumber: phone
    })
  }));
  check('Second booking created', b2.ok, b2.data?.id || JSON.stringify(b2.data));
  const b2id = b2.data?.id;
  const intent = await json(await fetch(API + '/payments/create-intent', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: b2id })
  }));
  check('Standard Stripe payment intent works', intent.ok && !!intent.data.clientSecret, `clientSecret present: ${!!intent.data.clientSecret}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.pass).length;
  console.log(`\n=== ${passed}/${results.length} checks passed ===`);
  if (passed < results.length) {
    results.filter(r => !r.pass).forEach(r => console.log(`   FAIL: ${r.name} — ${r.detail}`));
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
