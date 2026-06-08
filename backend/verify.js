const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'dummy');
require('dotenv').config();

const API_URL = 'http://localhost:4000/api';

async function run() {
  try {
    console.log('1. Checking server health...');
    let healthRes;
    try {
      healthRes = await fetch('http://localhost:4000/health');
      console.log('Health:', await healthRes.json());
    } catch (e) {
      console.log('Server not running on port 4000');
      return;
    }

    console.log('\\n2. Registering test user...');
    const email = 'test-' + Date.now() + '@example.com';
    const phone = '555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    let token = '';
    let userId = '';
    const regRes = await fetch(API_URL + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        email,
        phoneNumber: phone,
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    if (!regRes.ok) {
      console.error('Registration failed:', regData);
      return;
    }
    token = regData.accessToken;
    userId = regData.user.id;
    console.log('Registered user:', userId);

    console.log('\\n3. Creating Checkout Session...');
    let sessionUrl = '';
    let sessionId = '';
    const checkoutRes = await fetch(API_URL + '/packages/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token 
      },
      body: JSON.stringify({ packageId: 'PACKAGE_4' })
    });
    const textData = await checkoutRes.text();
    let checkoutData;
    try {
      checkoutData = JSON.parse(textData);
    } catch {
      console.error('Checkout failed, returned text:\\n', textData);
      return;
    }
    if (!checkoutRes.ok) {
      console.error('Checkout failed:', checkoutData);
      return;
    }
    sessionUrl = checkoutData.url;
    console.log('Checkout URL:', sessionUrl);
    
    sessionId = 'cs_test_' + Date.now();
    console.log('Using mock Session ID for webhook:', sessionId);

    console.log('\\n4. Simulating checkout.session.completed webhook...');
    const payload = {
      id: 'evt_test_' + Date.now(),
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          metadata: {
            packageId: 'PACKAGE_4',
            userId: userId
          }
        }
      }
    };

    const payloadString = JSON.stringify(payload);
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: secret,
    });

    const webhookRes = await fetch(API_URL + '/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: payloadString
    });
    const webhookDataText = await webhookRes.text();
    let webhookData;
    try { webhookData = JSON.parse(webhookDataText); } catch { console.error('Webhook failed text:\\n', webhookDataText); return; }
    if (!webhookRes.ok) {
      console.error('Webhook failed:', webhookData);
      return;
    }
    console.log('Webhook response:', webhookData);

    console.log('\\n5. Fetching active packages...');
    const activeRes = await fetch(API_URL + '/packages/active', {
      headers: { Authorization: 'Bearer ' + token }
    });
    const activeDataText = await activeRes.text();
    let activeData;
    try { activeData = JSON.parse(activeDataText); } catch { console.error('Active packages failed text:\\n', activeDataText); return; }
    console.log('Active packages:', JSON.stringify(activeData, null, 2));

  } catch (err) {
    console.error('Test script error:', err.message);
  }
}

run();
