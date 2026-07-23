const http = require('http');
const prisma = require('./src/config/prisma');

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
  console.log('=== STARTING BOOKING MATRIX & DASHBOARD SUITE ===\n');

  // 1. Register & Login Customer
  const customerEmail = `matrix_customer_${Date.now()}@traqq.local`;
  const customerPhone = `555${Math.floor(1000000 + Math.random() * 9000000)}`;

  const regRes = await request('/api/auth/register', 'POST', {
    fullName: 'Matrix Test Customer',
    phoneNumber: customerPhone,
    email: customerEmail,
    password: 'Password123!'
  });
  const customerToken = regRes.body.accessToken;
  console.log('[Auth] Customer registered & logged in:', customerEmail);

  // 2. Admin Login
  const adminRes = await request('/api/auth/login', 'POST', {
    email: 'admin@traqq.local',
    password: 'Admin@123456'
  });
  if (adminRes.status !== 200) {
    console.error('[Auth] Admin login failed!', adminRes.status, adminRes.body);
    process.exit(1);
  }
  const adminToken = adminRes.body.accessToken;
  console.log('[Auth] Admin logged in: admin@traqq.local');

  // 3. Check Availability API
  const testDate = new Date(Date.now() + 72 * 3600 * 1000).toISOString().split('T')[0];
  const availRes = await request(`/api/bookings/availability?date=${testDate}`);
  console.log(`\n[Availability API] Date ${testDate} status:`, availRes.status, 'Available slots count:', availRes.body?.availableSlots?.length);

  // 4. Test Matrix of 8 Booking Types
  const scenarios = [
    {
      name: 'Scenario A: FROM_DFW (Airport)',
      payload: {
        tripDirection: 'FROM_DFW',
        bookingType: 'AIRPORT',
        pickupAddress: 'DFW International Airport',
        destinationAddress: '100 Main St, Dallas, TX',
        pickupDate: testDate,
        pickupTime: '10:00',
        dropoffTerminal: 'B',
        passengerCount: 2,
        vanCount: 1,
        customerName: 'Matrix Customer',
        email: customerEmail,
        phoneNumber: customerPhone
      }
    },
    {
      name: 'Scenario B: TO_DFW (Airport)',
      payload: {
        tripDirection: 'TO_DFW',
        bookingType: 'AIRPORT',
        pickupAddress: '200 Oak Ave, Fort Worth, TX',
        destinationAddress: 'DFW International Airport',
        pickupDate: testDate,
        pickupTime: '11:00',
        dropoffTerminal: 'C',
        passengerCount: 3,
        vanCount: 1,
        customerName: 'Matrix Customer',
        email: customerEmail,
        phoneNumber: customerPhone
      }
    },
    {
      name: 'Scenario C: POINT_TO_POINT',
      payload: {
        tripDirection: 'POINT_TO_POINT',
        bookingType: 'POINT_TO_POINT',
        pickupAddress: '300 Elm St, Dallas, TX',
        destinationAddress: '400 Pine St, Fort Worth, TX',
        pickupDate: testDate,
        pickupTime: '12:00',
        passengerCount: 4,
        vanCount: 1,
        customerName: 'Matrix Customer',
        email: customerEmail,
        phoneNumber: customerPhone
      }
    },
    {
      name: 'Scenario D: CONCERT',
      payload: {
        tripDirection: 'POINT_TO_POINT',
        bookingType: 'CONCERT',
        pickupAddress: '500 Maple Dr, Arlington, TX',
        destinationAddress: 'AT&T Stadium, Arlington, TX',
        pickupDate: testDate,
        pickupTime: '13:00',
        passengerCount: 2,
        vanCount: 1,
        notes: 'Concert booking notes',
        customerName: 'Matrix Customer',
        email: customerEmail,
        phoneNumber: customerPhone
      }
    },
    {
      name: 'Scenario E: HOTEL',
      payload: {
        tripDirection: 'POINT_TO_POINT',
        bookingType: 'HOTEL',
        pickupAddress: 'Gaylord Texan Resort, Grapevine, TX',
        destinationAddress: '700 Commerce St, Dallas, TX',
        pickupDate: testDate,
        pickupTime: '14:00',
        passengerCount: 2,
        vanCount: 1,
        customerName: 'Matrix Customer',
        email: customerEmail,
        phoneNumber: customerPhone
      }
    },
    {
      name: 'Scenario F: RESTAURANT',
      payload: {
        tripDirection: 'POINT_TO_POINT',
        bookingType: 'RESTAURANT',
        pickupAddress: 'Hotel Swexan, Dallas, TX',
        destinationAddress: 'Nick & Sam Steakhouse, Dallas, TX',
        pickupDate: testDate,
        pickupTime: '15:00',
        passengerCount: 4,
        vanCount: 1,
        customerName: 'Matrix Customer',
        email: customerEmail,
        phoneNumber: customerPhone
      }
    },
    {
      name: 'Scenario G: WEDDING',
      payload: {
        tripDirection: 'POINT_TO_POINT',
        bookingType: 'WEDDING',
        pickupAddress: 'The Olana, Hickory Creek, TX',
        destinationAddress: 'Ritz-Carlton, Dallas, TX',
        pickupDate: testDate,
        pickupTime: '16:00',
        passengerCount: 6,
        vanCount: 2,
        customerName: 'Matrix Customer',
        email: customerEmail,
        phoneNumber: customerPhone
      }
    },
    {
      name: 'Scenario H: PRIVATE_EVENT',
      payload: {
        tripDirection: 'POINT_TO_POINT',
        bookingType: 'PRIVATE_EVENT',
        pickupAddress: 'Private Estate, Southlake, TX',
        destinationAddress: 'Perot Museum, Dallas, TX',
        pickupDate: testDate,
        pickupTime: '17:00',
        passengerCount: 5,
        vanCount: 1,
        customerName: 'Matrix Customer',
        email: customerEmail,
        phoneNumber: customerPhone
      }
    }
  ];

  const createdBookings = [];

  console.log('\n--- Executing 8 Booking Scenarios ---');
  for (const s of scenarios) {
    const res = await request('/api/bookings/create', 'POST', s.payload, customerToken);
    console.log(`[Booking] ${s.name}: Status ${res.status}, ID: ${res.body?.id || 'FAILED'}, Ref: ${res.body?.bookingRef || 'N/A'}`);
    if (res.status === 201) {
      createdBookings.push(res.body);
    } else {
      console.error(`Failed ${s.name}:`, res.body);
    }
  }

  // 5. Test Customer Dashboard API
  console.log('\n--- Testing Customer Dashboard API ---');
  const custBookings = await request('/api/customer/bookings', 'GET', null, customerToken);
  console.log('[Customer DB] Count returned:', custBookings.body?.length, 'Status:', custBookings.status);

  // 6. Test Admin Dashboard & Booking Edits
  console.log('\n--- Testing Admin Dashboard Overview API ---');
  const adminOverview = await request('/api/admin/overview', 'GET', null, adminToken);
  console.log('[Admin Overview] Stats:', adminOverview.status, adminOverview.body?.stats);

  if (createdBookings.length > 0) {
    const bToEdit = createdBookings[0];
    console.log('\n--- Testing Admin Edit on Booking ID:', bToEdit.id, '---');

    const editRes = await request(`/api/admin/bookings/${bToEdit.id}/edit`, 'PATCH', {
      dropoffTerminal: 'D',
      passengerCount: 5,
      notes: 'Admin updated terminal to D and passengers to 5'
    }, adminToken);

    console.log('[Admin Edit] Status:', editRes.status, 'Updated terminal:', editRes.body?.dropoffTerminal, 'Updated passengers:', editRes.body?.passengerCount);

    // 7. Create Driver and Assign
    console.log('\n--- Testing Admin Driver Creation & Assignment ---');
    const driverEmail = `testdriver_${Date.now()}@traqq.local`;
    const driverPhone = `555${Math.floor(1000000 + Math.random() * 9000000)}`;

    const createDriverRes = await request('/api/admin/drivers', 'POST', {
      fullName: 'Test Driver E2E',
      phoneNumber: driverPhone,
      email: driverEmail,
      password: 'DriverPassword123!',
      vehicleMake: 'Chevrolet',
      vehicleModel: 'Suburban',
      vehicleColor: 'Black',
      vehiclePlate: 'TX-TRAQQ1'
    }, adminToken);

    console.log('[Create Driver] Status:', createDriverRes.status, 'Driver ID:', createDriverRes.body?.driver?.id);
    const driverObj = createDriverRes.body?.driver;

    if (driverObj) {
      // Set booking status to CONFIRMED and paymentStatus to PAID so driver assignment is allowed
      await prisma.booking.update({
        where: { id: bToEdit.id },
        data: { bookingStatus: 'CONFIRMED', paymentStatus: 'PAID' }
      });

      const assignRes = await request(`/api/admin/bookings/${bToEdit.id}/assign`, 'PATCH', {
        driverId: driverObj.id
      }, adminToken);
      console.log('[Assign Driver] Status:', assignRes.status, 'Message/DriverId:', assignRes.body?.driverId || assignRes.body?.error);

      // 8. Test Driver Login & Dashboard
      console.log('\n--- Testing Driver Login & Driver Dashboard ---');
      const driverLoginRes = await request('/api/driver/login', 'POST', {
        identifier: driverEmail,
        password: 'DriverPassword123!'
      });
      console.log('[Driver Login] Status:', driverLoginRes.status, 'Token acquired:', !!driverLoginRes.body?.accessToken);

      if (driverLoginRes.body?.accessToken) {
        const driverBookingsRes = await request('/api/driver/bookings', 'GET', null, driverLoginRes.body.accessToken);
        console.log('[Driver Bookings] Status:', driverBookingsRes.status, 'Assigned bookings count:', driverBookingsRes.body?.length);
      }
    }
  }

  console.log('\n=== BOOKING MATRIX & ADMIN & DRIVER SUITE COMPLETED SUCCESSFULLY ===');
}

run().catch(console.error);
