const cron = require('node-cron');
const prisma = require('../config/prisma');
const { sendTripReminder } = require('./email.service');

// In-memory dedup: prevents duplicate reminders within the same server session.
// Cleared only on restart, which is acceptable — the 30-min window makes cross-restart
// duplicates extremely unlikely (only if the server restarts mid-window).
const _sentThisSession = new Set();

function start() {
  // Every 15 minutes — each booking's 30-min window (23h45m–24h15m before pickup)
  // is hit exactly once per run cycle.
  cron.schedule('*/15 * * * *', async () => {
    try {
      await checkUpcomingTrips();
    } catch (err) {
      console.error('[reminder] Check failed:', err.message);
    }
  });
  console.log('[reminder] Trip reminder service started (runs every 15 min)');
}

async function checkUpcomingTrips() {
  const now = new Date();

  // Window center is 24h from now; ±15 min gives a 30-min window.
  const windowStart = new Date(now.getTime() + (24 * 60 - 15) * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + (24 * 60 + 15) * 60 * 1000);

  // Query the calendar day(s) that contain the window edges to minimise DB rows returned.
  // pickupDate is stored as UTC midnight (e.g. 2026-06-20T00:00:00.000Z).
  const dayStart = new Date(windowStart);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(windowEnd);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const candidates = await prisma.booking.findMany({
    where: {
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      email: { not: null },
      pickupDate: { gte: dayStart, lte: dayEnd }
    }
  });

  if (!candidates.length) return;

  for (const booking of candidates) {
    if (_sentThisSession.has(booking.id)) continue;

    // Reconstruct full pickup DateTime from pickupDate (UTC midnight) + pickupTime (H:MM)
    const [h, m] = booking.pickupTime.split(':').map(Number);
    const pickupDt = new Date(booking.pickupDate);
    pickupDt.setUTCHours(h, m, 0, 0);

    if (pickupDt >= windowStart && pickupDt < windowEnd) {
      _sentThisSession.add(booking.id);
      sendTripReminder(booking).catch(err =>
        console.error(`[reminder] Failed for ${booking.bookingRef}:`, err.message)
      );
    }
  }
}

module.exports = { start };
