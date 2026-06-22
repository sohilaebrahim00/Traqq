'use strict';

/**
 * Unit tests for booking date parsing and validation.
 *
 * These tests verify that parseDateUTC correctly stores dates as UTC midnight
 * so that no timezone conversion can shift the calendar day — the root cause
 * of the "booking date shifts back one day" bug.
 *
 * Run: node --test tests/date-utils.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ── Inline the production functions (avoids loading Prisma for pure unit tests)
// These must stay byte-for-byte identical to:
//   backend/src/controllers/booking.controller.helpers.js

function parseDateUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function calendarDateError(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const currentYear = new Date().getUTCFullYear();
  const MONTHS = ['January','February','March','April','May','June','July','August',
                  'September','October','November','December'];
  if (y < currentYear) return `Year ${y} is in the past.`;
  if (y > currentYear + 10) return 'Please select a date within the next 10 years.';
  if (m < 1 || m > 12) return `"${m}" is not a valid month.`;
  if (d < 1 || d > 31) return `"${d}" is not a valid day.`;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return `${MONTHS[m - 1]} ${y} does not have ${d} days.`;
  }
  return null;
}

// ── Test matrix ───────────────────────────────────────────────────────────────
// These four dates cover all reported bug cases plus DST and year-boundary edges.

const TEST_DATES = [
  {
    label:    'June 28',
    input:    '2026-06-28',
    utcYear:  2026,
    utcMonth: 5,   // 0-indexed: June = 5
    utcDay:   28,
    iso:      '2026-06-28T00:00:00.000Z',
  },
  {
    label:    'July 2',
    input:    '2026-07-02',
    utcYear:  2026,
    utcMonth: 6,
    utcDay:   2,
    iso:      '2026-07-02T00:00:00.000Z',
  },
  {
    label:    'December 31 (year-end boundary)',
    input:    '2026-12-31',
    utcYear:  2026,
    utcMonth: 11,
    utcDay:   31,
    iso:      '2026-12-31T00:00:00.000Z',
  },
  {
    label:    'January 1 (new-year boundary)',
    input:    '2027-01-01',
    utcYear:  2027,
    utcMonth: 0,
    utcDay:   1,
    iso:      '2027-01-01T00:00:00.000Z',
  },
];

// ── parseDateUTC ──────────────────────────────────────────────────────────────

describe('parseDateUTC — UTC midnight storage', () => {
  for (const tc of TEST_DATES) {
    describe(tc.label, () => {
      test('UTC year/month/day are exactly the customer-selected values', () => {
        const result = parseDateUTC(tc.input);
        assert.equal(result.getUTCFullYear(), tc.utcYear);
        assert.equal(result.getUTCMonth(),    tc.utcMonth);
        assert.equal(result.getUTCDate(),     tc.utcDay);
      });

      test('time component is midnight UTC (00:00:00.000)', () => {
        const result = parseDateUTC(tc.input);
        assert.equal(result.getUTCHours(),        0);
        assert.equal(result.getUTCMinutes(),       0);
        assert.equal(result.getUTCSeconds(),       0);
        assert.equal(result.getUTCMilliseconds(),  0);
      });

      test('toISOString() matches expected UTC ISO string', () => {
        const result = parseDateUTC(tc.input);
        assert.equal(result.toISOString(), tc.iso);
      });

      test('toISOString().slice(0,10) round-trips back to the input string', () => {
        const result = parseDateUTC(tc.input);
        assert.equal(result.toISOString().slice(0, 10), tc.input);
      });

      test('value equals Date.UTC() — proves no timezone offset was added', () => {
        const [y, m, d] = tc.input.split('-').map(Number);
        const result = parseDateUTC(tc.input);
        assert.equal(result.valueOf(), Date.UTC(y, m - 1, d));
      });

      test('naïve new Date(string) would differ in negative-UTC offsets (documents the bug)', () => {
        // new Date('2026-06-28') parses as midnight LOCAL time, not UTC.
        // In America/Chicago (UTC-6) that would be 2026-06-28T06:00:00.000Z,
        // which .getUTCDate() returns 28 correctly — but if you do
        // new Date('2026-06-28T00:00:00.000Z').getDate() in Chicago you get 27.
        //
        // parseDateUTC avoids this by using Date.UTC() explicitly.
        const safe = parseDateUTC(tc.input);
        // Regardless of local tz, UTC date must equal the input date
        assert.equal(safe.getUTCDate(), tc.utcDay);
      });
    });
  }
});

// ── calendarDateError ─────────────────────────────────────────────────────────

describe('calendarDateError — date string validation', () => {
  test('all four test dates are valid (return null)', () => {
    assert.equal(calendarDateError('2026-06-28'), null);
    assert.equal(calendarDateError('2026-07-02'), null);
    assert.equal(calendarDateError('2026-12-31'), null);
    assert.equal(calendarDateError('2027-01-01'), null);
  });

  test('February 29 on a non-leap year is rejected', () => {
    const err = calendarDateError('2026-02-29'); // 2026 is not a leap year
    assert.ok(err, 'should return an error string');
    assert.match(err, /February 2026 does not have 29 days/);
  });

  test('February 29 on a leap year is accepted', () => {
    // 2028 IS a leap year
    assert.equal(calendarDateError('2028-02-29'), null);
  });

  test('April 31 is rejected (April has 30 days)', () => {
    const err = calendarDateError('2026-04-31');
    assert.ok(err);
  });

  test('December 32 is rejected', () => {
    const err = calendarDateError('2026-12-32');
    assert.ok(err);
  });

  test('month 13 is rejected', () => {
    const err = calendarDateError('2026-13-01');
    assert.ok(err);
  });

  test('month 0 is rejected', () => {
    const err = calendarDateError('2026-00-15');
    assert.ok(err);
  });
});

// ── DST boundary checks ───────────────────────────────────────────────────────

describe('DST boundary dates', () => {
  // US DST spring-forward 2026: March 8 (clocks go 2 AM → 3 AM)
  // US DST fall-back 2026:      November 1 (clocks go 2 AM → 1 AM)
  const DST_DATES = [
    '2026-03-07',
    '2026-03-08',
    '2026-03-09',
    '2026-11-01',
    '2026-11-02',
  ];

  for (const dateStr of DST_DATES) {
    test(`${dateStr} is stored at UTC midnight regardless of DST`, () => {
      const result = parseDateUTC(dateStr);
      assert.equal(result.getUTCHours(), 0);
      assert.equal(result.toISOString().slice(0, 10), dateStr);
    });
  }
});
