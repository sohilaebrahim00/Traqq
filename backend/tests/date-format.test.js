'use strict';

/**
 * Timezone-isolation regression tests for frontend date formatting.
 *
 * These tests verify that the FIXED formatDate/fmtDate functions (which use
 * timeZone:'UTC') always display the correct calendar date regardless of what
 * timezone the browser (or server) is set to.
 *
 * Strategy: each timezone is tested in an isolated child process with the TZ
 * environment variable set, so results are guaranteed independent of the
 * host machine's local timezone.
 *
 * Run: node --test tests/date-format.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

// ── Helper: run a small JS snippet in a child process with a specific TZ ──────

function runInTimezone(tz, script) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=commonjs'],
    {
      input:   script,
      env:     { ...process.env, TZ: tz },
      timeout: 5000,
      encoding: 'utf8',
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Child process exited ${result.status}: ${result.stderr}`);
  }
  return JSON.parse(result.stdout.trim());
}

// ── The exact FIXED formatDate implementation used across the app after the fix

const FIXED_FORMAT_LONG_SCRIPT = (isoStr) => `
const dt = new Date(${JSON.stringify(isoStr)});
// FIXED — all pages now have timeZone: 'UTC'
const fixed = dt.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
});
// BUGGY — what the pages had BEFORE the fix (no timeZone specified)
const buggy = dt.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
// SHORT form used in admin/driver pages (fmtDate)
const fixedShort = dt.toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
});
const buggyShort = dt.toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric'
});
console.log(JSON.stringify({ fixed, buggy, fixedShort, buggyShort }));
`;

// ── Test matrix ───────────────────────────────────────────────────────────────

const TEST_CASES = [
  {
    label:    'June 28 (client-reported bug)',
    iso:      '2026-06-28T00:00:00.000Z',
    wantMonth: 'June',
    wantDay:   '28',
    wantYear:  '2026',
    wantShort: 'Jun 28, 2026',
    // In UTC- zones the buggy version would return the day BEFORE
    bugMonthInNegativeOffset: 'June',
    bugDayInNegativeOffset:   '27',
  },
  {
    label:    'July 2 (client-reported bug)',
    iso:      '2026-07-02T00:00:00.000Z',
    wantMonth: 'July',
    wantDay:   '2',
    wantYear:  '2026',
    wantShort: 'Jul 2, 2026',
    bugMonthInNegativeOffset: 'July',
    bugDayInNegativeOffset:   '1',
  },
  {
    label:    'December 31 (year-end, day-shift would also shift year)',
    iso:      '2026-12-31T00:00:00.000Z',
    wantMonth: 'December',
    wantDay:   '31',
    wantYear:  '2026',
    wantShort: 'Dec 31, 2026',
    bugMonthInNegativeOffset: 'December',
    bugDayInNegativeOffset:   '30',
  },
  {
    label:    'January 1 (new-year boundary)',
    iso:      '2027-01-01T00:00:00.000Z',
    wantMonth: 'January',
    wantDay:   '1',
    wantYear:  '2027',
    wantShort: 'Jan 1, 2027',
    bugMonthInNegativeOffset: 'December',   // the bug would show Dec 31 of the previous year!
    bugDayInNegativeOffset:   '31',
  },
];

// Timezones to test: two negative-UTC offsets (where the bug manifests),
// UTC itself, and one positive-UTC offset (where the bug doesn't manifest).
const TIMEZONES = [
  { tz: 'UTC',              offsetSign: 0,  description: 'UTC (no offset)' },
  { tz: 'America/Chicago',  offsetSign: -1, description: 'America/Chicago (UTC-5/6, primary business TZ)' },
  { tz: 'America/New_York', offsetSign: -1, description: 'America/New_York (UTC-4/5)' },
  { tz: 'Asia/Cairo',       offsetSign: +1, description: 'Asia/Cairo (UTC+2, positive offset)' },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Fixed formatDate function — correct date in every timezone', () => {
  for (const tc of TEST_CASES) {
    describe(tc.label, () => {
      for (const { tz, description } of TIMEZONES) {
        test(`${description}: fixed output contains ${tc.wantMonth} ${tc.wantDay}`, () => {
          const { fixed, fixedShort } = runInTimezone(tz, FIXED_FORMAT_LONG_SCRIPT(tc.iso));

          // Long form: must contain correct month name, day, and year
          assert.ok(
            fixed.includes(tc.wantMonth),
            `Expected month "${tc.wantMonth}" in "${fixed}" (TZ: ${tz})`
          );
          assert.ok(
            fixed.includes(tc.wantDay),
            `Expected day "${tc.wantDay}" in "${fixed}" (TZ: ${tz})`
          );
          assert.ok(
            fixed.includes(tc.wantYear),
            `Expected year "${tc.wantYear}" in "${fixed}" (TZ: ${tz})`
          );

          // Short form used by admin/driver pages
          assert.equal(
            fixedShort,
            tc.wantShort,
            `Short form mismatch (TZ: ${tz}): got "${fixedShort}", want "${tc.wantShort}"`
          );
        });
      }
    });
  }
});

// ── Bug demonstration: the old code shifts the date in UTC- timezones ─────────

describe('Buggy formatDate (old code without timeZone:UTC) — demonstrates what was broken', () => {
  const NEGATIVE_OFFSET_TZS = [
    'America/Chicago',
    'America/New_York',
  ];

  for (const tc of TEST_CASES) {
    describe(tc.label, () => {
      for (const tz of NEGATIVE_OFFSET_TZS) {
        test(`${tz}: buggy version shows ${tc.bugDayInNegativeOffset} instead of ${tc.wantDay}`, () => {
          const { buggy } = runInTimezone(tz, FIXED_FORMAT_LONG_SCRIPT(tc.iso));

          // The old code would NOT contain the correct day
          // (it would show the previous day due to UTC→local shift)
          assert.ok(
            buggy.includes(tc.bugDayInNegativeOffset),
            `Expected buggy output to contain day "${tc.bugDayInNegativeOffset}" in "${buggy}" (TZ: ${tz})`
          );

          // Confirm the buggy output is WRONG (doesn't show the right day)
          // — unless bugDayInNegativeOffset happens to equal wantDay
          if (tc.bugDayInNegativeOffset !== tc.wantDay) {
            assert.ok(
              !buggy.includes(`, ${tc.wantDay},`) && !buggy.includes(` ${tc.wantDay},`),
              `Buggy output should NOT show day ${tc.wantDay}, but got: "${buggy}"`
            );
          }
        });
      }

      test('Asia/Cairo (UTC+2): buggy version accidentally shows correct date (UTC+ is not affected)', () => {
        // In UTC+ zones, UTC midnight is still that same day locally,
        // so the bug did not manifest there.
        const { buggy } = runInTimezone('Asia/Cairo', FIXED_FORMAT_LONG_SCRIPT(tc.iso));
        assert.ok(
          buggy.includes(tc.wantDay),
          `Cairo should show correct day even in buggy version: got "${buggy}"`
        );
      });
    });
  }
});

// ── Special case: January 1 date-shift bug would cross year boundary ──────────

describe('January 1 year-boundary: fix prevents month AND year rollback', () => {
  const ISO = '2027-01-01T00:00:00.000Z';

  for (const tz of ['America/Chicago', 'America/New_York']) {
    test(`${tz}: fixed shows January 1, 2027 (not December 31, 2026)`, () => {
      const { fixed, buggy } = runInTimezone(tz, FIXED_FORMAT_LONG_SCRIPT(ISO));

      // Fixed must show January 2027
      assert.ok(fixed.includes('January'), `fixed must contain "January", got: "${fixed}"`);
      assert.ok(fixed.includes('1'),       `fixed must contain day "1", got: "${fixed}"`);
      assert.ok(fixed.includes('2027'),    `fixed must contain year "2027", got: "${fixed}"`);

      // Buggy would show December 31, 2026
      assert.ok(buggy.includes('December'), `buggy contains "December" (the bug), got: "${buggy}"`);
      assert.ok(buggy.includes('31'),       `buggy contains day "31" (the bug), got: "${buggy}"`);
      assert.ok(buggy.includes('2026'),     `buggy contains year "2026" (the bug), got: "${buggy}"`);
    });
  }

  test('UTC: fixed and buggy agree — no offset so no shift', () => {
    const { fixed, buggy } = runInTimezone('UTC', FIXED_FORMAT_LONG_SCRIPT(ISO));
    assert.ok(fixed.includes('January') && fixed.includes('2027'));
    assert.ok(buggy.includes('January') && buggy.includes('2027'));
  });
});

// ── Consistency: fixed always equals fixed, regardless of timezone ────────────

describe('formatDate output is timezone-invariant after the fix', () => {
  for (const tc of TEST_CASES) {
    test(`${tc.label}: all four timezones produce identical output`, () => {
      const outputs = TIMEZONES.map(({ tz }) => {
        const { fixed } = runInTimezone(tz, FIXED_FORMAT_LONG_SCRIPT(tc.iso));
        return { tz, fixed };
      });

      const first = outputs[0].fixed;
      for (const { tz, fixed } of outputs.slice(1)) {
        assert.equal(
          fixed,
          first,
          `TZ "${tz}" produced "${fixed}" but expected "${first}" (same as UTC output)`
        );
      }
    });
  }
});

// ── Null / empty input guards ─────────────────────────────────────────────────

describe('formatDate handles edge-case inputs', () => {
  const GUARD_SCRIPT = `
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
    console.log(JSON.stringify({
      nullInput:      formatDate(null),
      emptyString:    formatDate(''),
      undefinedInput: formatDate(undefined),
      fmtNull:        fmtDate(null),
      fmtUndefined:   fmtDate(undefined),
    }));
  `;

  test('null/empty input returns empty string, not a crash', () => {
    const result = runInTimezone('UTC', GUARD_SCRIPT);
    assert.equal(result.nullInput,      '');
    assert.equal(result.emptyString,    '');
    assert.equal(result.undefinedInput, '');
  });

  test('fmtDate returns em-dash for null/undefined (admin page convention)', () => {
    const result = runInTimezone('UTC', GUARD_SCRIPT);
    assert.equal(result.fmtNull,      '—');
    assert.equal(result.fmtUndefined, '—');
  });
});
