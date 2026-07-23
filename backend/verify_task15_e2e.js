const http = require('http');

async function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== STARTING E2E API SUITE ===');

  // 1. Health check
  const health = await request('/api/health');
  console.log('[API Test] Health status:', health.status, health.body);

  const testEmail = `e2e_user_${Date.now()}@traqq.local`;
  const testPhone = `555${Math.floor(1000000 + Math.random() * 9000000)}`;

  // 2. Validation tests
  console.log('\n--- Testing Registration Validation ---');
  
  // Weak password (< 8 chars)
  const weakPassRes = await request('/api/auth/register', 'POST', {
    fullName: 'Test User',
    phoneNumber: testPhone,
    email: testEmail,
    password: '123'
  });
  console.log('[API Test] Weak password status:', weakPassRes.status, weakPassRes.body);

  // Invalid email format
  const badEmailRes = await request('/api/auth/register', 'POST', {
    fullName: 'Test User',
    phoneNumber: testPhone,
    email: 'not-an-email',
    password: 'Password123!'
  });
  console.log('[API Test] Bad email status:', badEmailRes.status, badEmailRes.body);

  // 3. Valid Registration
  console.log('\n--- Testing Valid Registration ---');
  const regRes = await request('/api/auth/register', 'POST', {
    fullName: 'E2E Test Customer',
    phoneNumber: testPhone,
    email: testEmail,
    password: 'Password123!'
  });
  console.log('[API Test] Registration status:', regRes.status, regRes.body?.user);

  if (regRes.status !== 201) {
    console.error('Registration failed!');
    process.exit(1);
  }

  // 4. Duplicate Registration
  console.log('\n--- Testing Duplicate Registration ---');
  const dupRes = await request('/api/auth/register', 'POST', {
    fullName: 'E2E Test Customer Dup',
    phoneNumber: testPhone,
    email: testEmail,
    password: 'Password123!'
  });
  console.log('[API Test] Duplicate status:', dupRes.status, dupRes.body);

  // 5. Login Verification
  console.log('\n--- Testing Customer Login ---');
  const loginPassRes = await request('/api/auth/login', 'POST', {
    email: testEmail,
    password: 'Password123!'
  });
  console.log('[API Test] Login status:', loginPassRes.status, 'Token acquired:', !!loginPassRes.body?.accessToken);

  const loginFailRes = await request('/api/auth/login', 'POST', {
    email: testEmail,
    password: 'WrongPassword!'
  });
  console.log('[API Test] Invalid login status:', loginFailRes.status, loginFailRes.body);

  // 6. Refresh Token
  console.log('\n--- Testing Refresh Token ---');
  const refreshRes = await request('/api/auth/refresh', 'POST', {
    refreshToken: loginPassRes.body.refreshToken
  });
  console.log('[API Test] Refresh status:', refreshRes.status, 'New token acquired:', !!refreshRes.body?.accessToken);

  // 7. 24-Hour Lead Time Direct API Validation Test
  console.log('\n--- Testing 24-Hour Lead Time Rule on POST /api/bookings ---');
  
  // Trip scheduled 2 hours from now
  const now = new Date();
  const nearPickupDate = new Date(now.getTime() + 2 * 3600 * 1000).toISOString().split('T')[0];
  const nearPickupTime = '14:00';

  const invalidBookingRes = await request('/api/bookings/create', 'POST', {
    tripDirection: 'TO_DFW',
    pickupAddress: '123 Main St, Dallas, TX',
    destinationAddress: 'DFW International Airport',
    pickupDate: nearPickupDate,
    pickupTime: nearPickupTime,
    dropoffTerminal: 'A',
    passengerCount: 2,
    carryOnCount: 1,
    checkedLuggageCount: 1,
    vanCount: 1,
    customerName: 'E2E Test Customer',
    email: testEmail,
    phoneNumber: testPhone
  }, loginPassRes.body.accessToken);

  console.log('[API Test] <24h Booking status:', invalidBookingRes.status, invalidBookingRes.body);

  // Trip scheduled 48 hours from now
  const farDate = new Date(now.getTime() + 48 * 3600 * 1000).toISOString().split('T')[0];
  const validBookingRes = await request('/api/bookings/create', 'POST', {
    tripDirection: 'TO_DFW',
    pickupAddress: '123 Main St, Dallas, TX',
    destinationAddress: 'DFW International Airport',
    pickupDate: farDate,
    pickupTime: '10:00',
    dropoffTerminal: 'A',
    passengerCount: 2,
    carryOnCount: 1,
    checkedLuggageCount: 1,
    vanCount: 1,
    customerName: 'E2E Test Customer',
    email: testEmail,
    phoneNumber: testPhone
  }, loginPassRes.body.accessToken);

  console.log('[API Test] >24h Booking status:', validBookingRes.status, validBookingRes.body?.id ? 'Booking Created' : validBookingRes.body);

  console.log('\n=== E2E API SUITE COMPLETED SUCCESSFULLY ===');
}

run().catch(console.error);
