'use strict';

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const prisma = require('../src/config/prisma');
const authRoutes = require('../src/routes/auth.routes');
const bookingRoutes = require('../src/routes/booking.routes');
const paymentRoutes = require('../src/routes/payment.routes');
const adminRoutes = require('../src/routes/admin.routes');
const driverRoutes = require('../src/routes/driver.routes');
const customerRoutes = require('../src/routes/customer.routes');
const packageRoutes = require('../src/routes/package.routes');
const promoRoutes = require('../src/routes/promo.routes');
const contactRoutes = require('../src/routes/contact.routes');

const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'traqq-backend' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'traqq-backend' }));
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/contact', contactRoutes);

let server;
let port;

function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      console.log(`Test Express server running on port ${port}`);
      resolve();
    });
    server.on('error', reject);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

function request(urlPath, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: urlPath,
      method: method,
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

async function runAudit() {
  await startServer();

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  function assertTest(name, condition, extra = '') {
    if (condition) {
      results.passed++;
      results.details.push({ name, status: 'PASS', extra });
      console.log(`  ✓ PASS: ${name}`);
    } else {
      results.failed++;
      results.details.push({ name, status: 'FAIL', extra });
      console.error(`  ✗ FAIL: ${name} ${extra}`);
    }
  }

  console.log('\n=== PHASE 2: HEALTH & AUTHENTICATION ENDPOINT AUDIT ===');
  
  // Health
  const h1 = await request('/health');
  assertTest('GET /health returns 200', h1.status === 200);

  const h2 = await request('/api/health');
  assertTest('GET /api/health returns 200', h2.status === 200);

  // Customer Auth
  const custEmail = `audit_customer_${Date.now()}@traqq.local`;
  const custPass = 'TestPass123!';
  const regRes = await request('/api/auth/register', 'POST', {
    fullName: 'Audit Customer',
    phoneNumber: '5559876543',
    email: custEmail,
    password: custPass
  });
  assertTest('POST /api/auth/register creates user & returns token', regRes.status === 201 || regRes.status === 200);
  const custToken = regRes.body?.accessToken;

  const custLoginRes = await request('/api/auth/login', 'POST', { email: custEmail, password: custPass });
  assertTest('POST /api/auth/login succeeds for customer', custLoginRes.status === 200 && custLoginRes.body?.accessToken);

  // Admin Auth
  // Ensure an admin account exists for testing
  const adminEmail = `audit_admin_${Date.now()}@traqq.local`;
  const adminPass = 'AdminSecret123!';
  const bcrypt = require('bcryptjs');
  const hashedAdminPass = await bcrypt.hash(adminPass, 10);
  const adminUser = await prisma.user.create({
    data: {
      fullName: 'Audit Admin',
      email: adminEmail,
      phoneNumber: '5550009999',
      password: hashedAdminPass,
      role: 'ADMIN'
    }
  });

  const adminLoginRes = await request('/api/auth/login', 'POST', { email: adminEmail, password: adminPass });
  assertTest('POST /api/auth/login succeeds for admin', adminLoginRes.status === 200 && adminLoginRes.body?.user?.role === 'ADMIN');
  const adminToken = adminLoginRes.body?.accessToken;

  // Driver Auth
  const driverEmail = `audit_driver_${Date.now()}@traqq.local`;
  const driverPass = 'DriverPass123!';
  const hashedDriverPass = await bcrypt.hash(driverPass, 10);
  const driverUser = await prisma.user.create({
    data: {
      fullName: 'Audit Driver',
      email: driverEmail,
      phoneNumber: '5551112222',
      password: hashedDriverPass,
      role: 'DRIVER'
    }
  });
  const driverProfile = await prisma.driverProfile.create({
    data: {
      userId: driverUser.id,
      vehicleMake: 'Ford',
      vehicleModel: 'Transit',
      vehicleColor: 'Black',
      vehiclePlate: 'TRQ-999',
      isAvailable: true
    }
  });

  const driverLoginRes = await request('/api/auth/login', 'POST', { email: driverEmail, password: driverPass });
  assertTest('POST /api/auth/login succeeds for driver', driverLoginRes.status === 200 && driverLoginRes.body?.user?.role === 'DRIVER');
  const driverToken = driverLoginRes.body?.accessToken;

  // Token & Authorization Checks
  const unauthRes = await request('/api/admin/overview');
  assertTest('GET /api/admin/overview unauthenticated returns 401', unauthRes.status === 401);

  const forbiddenRes = await request('/api/admin/overview', 'GET', null, custToken);
  assertTest('GET /api/admin/overview as customer returns 403', forbiddenRes.status === 403);

  const invalidTokenRes = await request('/api/admin/overview', 'GET', null, 'invalid.jwt.token');
  assertTest('GET /api/admin/overview with invalid token returns 401', invalidTokenRes.status === 401);

  console.log('\n=== PHASE 3: 7 BOOKING TYPES & MATRIX AUDIT ===');
  const testDate = '2026-08-15';
  const bookingTypes = [
    { type: 'AIRPORT', dir: 'TO_DFW', term: 'A', dest: 'DFW Airport' },
    { type: 'POINT_TO_POINT', dir: 'POINT_TO_POINT', term: null, dest: '789 Main St, Dallas, TX' },
    { type: 'CONCERT', dir: 'POINT_TO_POINT', term: null, dest: 'AT&T Stadium, Arlington, TX' },
    { type: 'HOTEL', dir: 'POINT_TO_POINT', term: null, dest: 'Gaylord Texan Resort, Grapevine, TX' },
    { type: 'RESTAURANT', dir: 'POINT_TO_POINT', term: null, dest: 'Pecan Lodge, Dallas, TX' },
    { type: 'WEDDING', dir: 'POINT_TO_POINT', term: null, dest: 'The Milestone Mansion, Aubrey, TX' },
    { type: 'PRIVATE_EVENT', dir: 'POINT_TO_POINT', term: null, dest: 'Fort Worth Stockyards, Fort Worth, TX' }
  ];

  const createdBookings = [];

  for (const bScenario of bookingTypes) {
    const payload = {
      tripDirection: bScenario.dir,
      bookingType: bScenario.type,
      pickupDate: testDate,
      pickupTime: '14:00',
      pickupAddress: '100 Audit Way, Dallas, TX',
      destinationAddress: bScenario.dest,
      dropoffTerminal: bScenario.term,
      passengerCount: 2,
      vanCount: 1,
      phoneNumber: '5559876543',
      email: custEmail,
      notes: `Test booking for type ${bScenario.type}`
    };

    const createRes = await request('/api/bookings', 'POST', payload, custToken);
    const ok = createRes.status === 201 && createRes.body?.id && createRes.body?.bookingType === bScenario.type;
    assertTest(`Booking Creation [${bScenario.type}] (Status ${createRes.status})`, ok, `Ref: ${createRes.body?.bookingRef}`);
    
    if (ok) {
      createdBookings.push(createRes.body);
    }
  }

  // Validate specific saved fields for a created booking
  if (createdBookings.length > 0) {
    const target = createdBookings[0];
    assertTest('Booking saved notes correctly', target.notes !== undefined);
    assertTest('Booking saved bookingType correctly', !!target.bookingType);
    assertTest('Booking saved vanCount correctly', target.vanCount === 1);
  }

  // Customer History & Booking Details
  const myBookingsRes = await request('/api/customer/my-bookings', 'GET', null, custToken);
  assertTest('GET /api/customer/my-bookings returns customer bookings', myBookingsRes.status === 200 && Array.isArray(myBookingsRes.body));

  if (createdBookings.length > 0) {
    const bId = createdBookings[0].id;
    const bDetailRes = await request(`/api/bookings/${bId}`);
    assertTest(`GET /api/bookings/${bId} details returns 200`, bDetailRes.status === 200 && bDetailRes.body?.id === bId);
  }

  console.log('\n=== PHASE 4: ADMIN DASHBOARD & MANAGEMENT API AUDIT ===');
  const overviewRes = await request('/api/admin/overview', 'GET', null, adminToken);
  assertTest('GET /api/admin/overview returns 200 and stats object', overviewRes.status === 200 && overviewRes.body?.stats?.total !== undefined);

  const adminBookingsRes = await request('/api/bookings', 'GET', null, adminToken);
  assertTest('GET /api/bookings returns 200 and booking list', adminBookingsRes.status === 200 && Array.isArray(adminBookingsRes.body));

  const customersRes = await request('/api/admin/customers', 'GET', null, adminToken);
  assertTest('GET /api/admin/customers returns 200', customersRes.status === 200 && Array.isArray(customersRes.body));

  const driversRes = await request('/api/admin/drivers', 'GET', null, adminToken);
  assertTest('GET /api/admin/drivers returns 200', driversRes.status === 200 && Array.isArray(driversRes.body));

  const paymentsRes = await request('/api/admin/payments', 'GET', null, adminToken);
  assertTest('GET /api/admin/payments returns 200', paymentsRes.status === 200);

  const promosRes = await request('/api/admin/promos', 'GET', null, adminToken);
  assertTest('GET /api/admin/promos returns 200', promosRes.status === 200);

  const calendarRes = await request('/api/admin/calendar', 'GET', null, adminToken);
  assertTest('GET /api/admin/calendar returns 200', calendarRes.status === 200);

  const analyticsRes = await request('/api/admin/analytics', 'GET', null, adminToken);
  assertTest('GET /api/admin/analytics returns 200', analyticsRes.status === 200);

  const settingsRes = await request('/api/admin/settings', 'GET', null, adminToken);
  assertTest('GET /api/admin/settings returns 200', settingsRes.status === 200);

  // Driver Dashboard
  const driverAssignmentsRes = await request('/api/driver/my-assignments', 'GET', null, driverToken);
  assertTest('GET /api/driver/my-assignments returns 200', driverAssignmentsRes.status === 200);

  // Clean up created test entities
  console.log('\n=== CLEANING UP AUDIT TEST RECORDS ===');
  for (const b of createdBookings) {
    await prisma.booking.delete({ where: { id: b.id } }).catch(() => {});
  }
  await prisma.driverProfile.delete({ where: { id: driverProfile.id } }).catch(() => {});
  await prisma.user.deleteMany({
    where: { id: { in: [adminUser.id, driverUser.id] } }
  }).catch(() => {});
  await prisma.user.deleteMany({
    where: { email: custEmail }
  }).catch(() => {});

  await stopServer();

  console.log('\n=== AUDIT SUMMARY ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped: ${results.skipped}`);

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAudit()
  .then(() => {
    prisma.$disconnect();
  })
  .catch(err => {
    console.error('Audit script encountered error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
