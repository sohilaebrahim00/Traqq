'use strict';

/**
 * Integration tests: selected date = stored date = returned date = displayed date.
 *
 * Uses the real Prisma client and the dev SQLite database to verify that no
 * date shifting occurs across the full stack: input → parseDateUTC → Prisma
 * write → Prisma read → ISO string → formatDate display.
 *
 * All test records use bookingRef "TRQ-TEST-*" and are deleted after each test.
 *
 * Run: node --test tests/booking-date.integration.test.js
 * (requires DATABASE_URL in backend/.env or environment)
 */

'use strict';

const { test, describe, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('node:path');
const crypto = require('node:crypto');

// Load backend env before requiring Prisma
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = require('../src/config/prisma');

// ── The production parseDateUTC (imported from helpers) ───────────────────────
// We require it after dotenv so Prisma initialises with the correct DATABASE_URL
const { parseDateUTC } = require('../src/controllers/booking.controller.helpers');

// ── The fixed frontend formatDate (the function all pages now use) ─────────────
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  });
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  }) : '—';
}

// ── Unique test booking factory ───────────────────────────────────────────────
function makeTestBooking(dateStr) {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return {
    bookingRef:     `TRQ-TEST-${suffix}`,
    qrHash:         crypto.randomBytes(16).toString('hex'),
    pickupDate:     parseDateUTC(dateStr),
    pickupTime:     '9:00',
    pickupAddress:  '123 Test St, Dallas, TX 75201',
    passengerCount: 2,
    tripDirection:  'TO_DFW',
    dropoffTerminal: 'A',
    phoneNumber:    '5550001234',
  };
}

// ── Cleanup helper ────────────────────────────────────────────────────────────
async function deleteTestBookings() {
  await prisma.booking.deleteMany({
    where: { bookingRef: { startsWith: 'TRQ-TEST-' } }
  });
}

// ── Test matrix ───────────────────────────────────────────────────────────────
const DATES = [
  { label: 'June 28',     input: '2026-06-28', wantMonth: 'June',     wantDay: '28', wantShort: 'Jun 28, 2026' },
  { label: 'July 2',      input: '2026-07-02', wantMonth: 'July',     wantDay: '2',  wantShort: 'Jul 2, 2026'  },
  { label: 'December 31', input: '2026-12-31', wantMonth: 'December', wantDay: '31', wantShort: 'Dec 31, 2026' },
  { label: 'January 1',   input: '2027-01-01', wantMonth: 'January',  wantDay: '1',  wantShort: 'Jan 1, 2027'  },
];

// ── Suite setup ───────────────────────────────────────────────────────────────

before(async () => {
  // Remove any leftover test records from a previous failed run
  await deleteTestBookings();
});

after(async () => {
  await deleteTestBookings();
  await prisma.$disconnect();
});

// ── Main integration suite ────────────────────────────────────────────────────

describe('Booking date integrity: input → store → retrieve → display', () => {
  for (const tc of DATES) {
    describe(tc.label, () => {
      let createdId;

      // Create the test booking and store its id for the subsequent assertions
      before(async () => {
        const booking = await prisma.booking.create({ data: makeTestBooking(tc.input) });
        createdId = booking.id;
      });

      after(async () => {
        if (createdId) {
          await prisma.booking.delete({ where: { id: createdId } }).catch(() => {});
        }
      });

      // 1. Verify the parseDateUTC helper converts the date string correctly
      test('parseDateUTC produces UTC midnight for the selected date', () => {
        const dt = parseDateUTC(tc.input);
        assert.equal(dt.toISOString().slice(0, 10), tc.input,
          `parseDateUTC("${tc.input}") ISO date portion must equal input`);
        assert.equal(dt.getUTCHours(),   0, 'must be midnight UTC');
        assert.equal(dt.getUTCMinutes(), 0);
        assert.equal(dt.getUTCSeconds(), 0);
      });

      // 2. Verify Prisma/SQLite stored the correct date
      test('Prisma stores the date correctly in SQLite', async () => {
        const row = await prisma.booking.findUnique({ where: { id: createdId } });
        assert.ok(row, 'booking must exist in database');

        // Prisma returns a JS Date for DateTime columns
        const stored = row.pickupDate;
        assert.ok(stored instanceof Date, 'pickupDate should be a Date object');
        assert.equal(
          stored.toISOString().slice(0, 10),
          tc.input,
          `Stored pickupDate ISO portion must equal selected date "${tc.input}"`
        );
      });

      // 3. Verify the API response format (simulated: toISOString on stored date)
      test('API response date string preserves the selected calendar date', async () => {
        const row = await prisma.booking.findUnique({ where: { id: createdId } });
        // Express/Prisma serialises DateTime as ISO string in JSON responses
        const apiDateStr = JSON.parse(JSON.stringify(row.pickupDate));
        // toISOString() always returns UTC, so the date portion is correct
        const datePortion = new Date(apiDateStr).toISOString().slice(0, 10);
        assert.equal(datePortion, tc.input,
          `API response date portion "${datePortion}" must equal selected date "${tc.input}"`);
      });

      // 4. Verify the checkout / success / booking-details formatDate output
      test('formatDate (checkout, success, bookingDetails) shows correct date', async () => {
        const row = await prisma.booking.findUnique({ where: { id: createdId } });
        const displayed = formatDate(row.pickupDate.toISOString());

        assert.ok(displayed.includes(tc.wantMonth),
          `Expected "${tc.wantMonth}" in formatDate output, got: "${displayed}"`);
        assert.ok(displayed.includes(tc.wantDay),
          `Expected day "${tc.wantDay}" in formatDate output, got: "${displayed}"`);
      });

      // 5. Verify the short fmtDate used in admin / driver / history pages
      test('fmtDate (admin, driver, history) shows correct date', async () => {
        const row = await prisma.booking.findUnique({ where: { id: createdId } });
        const displayed = fmtDate(row.pickupDate.toISOString());

        assert.equal(displayed, tc.wantShort,
          `fmtDate must return "${tc.wantShort}", got: "${displayed}"`);
      });

      // 6. Verify that Selected Date = Stored Date = Displayed Date
      test('INVARIANT: selected date === stored date === displayed date', async () => {
        const selectedDate = tc.input; // what the customer picked
        const row          = await prisma.booking.findUnique({ where: { id: createdId } });
        const storedDate   = row.pickupDate.toISOString().slice(0, 10);
        const displayedRaw = fmtDate(row.pickupDate.toISOString()); // "Jun 28, 2026"

        // Selected = Stored
        assert.equal(storedDate, selectedDate,
          `Stored date "${storedDate}" must equal selected date "${selectedDate}"`);

        // Stored → Displayed: short form contains correct month + day
        assert.ok(displayedRaw.includes(tc.wantDay),
          `Displayed "${displayedRaw}" must contain day "${tc.wantDay}"`);
        assert.ok(displayedRaw.includes(tc.wantShort.slice(0, 6)), // e.g. "Jun 28"
          `Displayed "${displayedRaw}" must match "${tc.wantShort}"`);
      });
    });
  }
});

// ── Availability query: date range filter uses UTC ─────────────────────────────

describe('Availability lookup: pickupDate range query', () => {
  let testId;
  const DATE = '2026-06-28';

  before(async () => {
    const booking = await prisma.booking.create({ data: makeTestBooking(DATE) });
    testId = booking.id;
  });

  after(async () => {
    if (testId) await prisma.booking.delete({ where: { id: testId } }).catch(() => {});
  });

  test('range query gte/lte UTC midnight finds the booking on the correct date', async () => {
    const dayStart = parseDateUTC(DATE);
    const dayEnd   = new Date(dayStart.getTime());
    dayEnd.setUTCHours(23, 59, 59, 999);

    const results = await prisma.booking.findMany({
      where: { pickupDate: { gte: dayStart, lte: dayEnd }, bookingRef: { startsWith: 'TRQ-TEST-' } }
    });

    assert.ok(results.length >= 1, 'should find at least one booking for June 28');
    const found = results.find(r => r.id === testId);
    assert.ok(found, 'the specific test booking must be in the results');
    assert.equal(found.pickupDate.toISOString().slice(0, 10), DATE);
  });

  test('range query for the PREVIOUS day does NOT include the June 28 booking', async () => {
    const prevDay      = parseDateUTC('2026-06-27');
    const prevDayEnd   = new Date(prevDay.getTime());
    prevDayEnd.setUTCHours(23, 59, 59, 999);

    const results = await prisma.booking.findMany({
      where: { pickupDate: { gte: prevDay, lte: prevDayEnd }, bookingRef: { startsWith: 'TRQ-TEST-' } }
    });

    const found = results.find(r => r.id === testId);
    assert.equal(found, undefined, 'June 28 booking must NOT appear in the June 27 range query');
  });
});

// ── Edge case: admin edit with pickupDate change ───────────────────────────────

describe('Admin edit: changing pickupDate preserves the new date', () => {
  let editId;
  const ORIGINAL = '2026-06-28';
  const UPDATED  = '2026-07-02';

  before(async () => {
    const b = await prisma.booking.create({ data: makeTestBooking(ORIGINAL) });
    editId = b.id;
  });

  after(async () => {
    if (editId) await prisma.booking.delete({ where: { id: editId } }).catch(() => {});
  });

  test('updating pickupDate stores the new date correctly', async () => {
    await prisma.booking.update({
      where: { id: editId },
      data:  { pickupDate: parseDateUTC(UPDATED) }
    });

    const row = await prisma.booking.findUnique({ where: { id: editId } });
    assert.equal(row.pickupDate.toISOString().slice(0, 10), UPDATED,
      `After edit, stored date must be "${UPDATED}"`);
    assert.equal(fmtDate(row.pickupDate.toISOString()), 'Jul 2, 2026');
  });
});
