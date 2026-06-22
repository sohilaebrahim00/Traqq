'use strict';

const prisma = require('../config/prisma');

const VAN_CAPACITY = 3;

function parseDateUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function calendarDateError(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const currentYear = new Date().getUTCFullYear();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
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

async function getUsedVansForSlot(pickupDateObj, pickupTime, excludeBookingId = null) {
  const dayEnd = new Date(pickupDateObj.getTime());
  dayEnd.setUTCHours(23, 59, 59, 999);

  const where = {
    pickupDate: { gte: pickupDateObj, lte: dayEnd },
    pickupTime,
    bookingStatus: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
    paymentStatus: { notIn: ['REFUNDED', 'FAILED'] }
  };
  if (excludeBookingId) where.id = { not: excludeBookingId };

  const result = await prisma.booking.aggregate({ where, _sum: { vanCount: true } });
  return result._sum.vanCount || 0;
}

module.exports = { VAN_CAPACITY, parseDateUTC, calendarDateError, getUsedVansForSlot };
