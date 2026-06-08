const { z } = require('zod');
const prisma = require('../config/prisma');
const QRCode = require('qrcode');
const crypto = require('crypto');

const bookingSchema = z.object({
  tripDirection: z.enum(['TO_DFW', 'FROM_DFW']),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  pickupTime: z.string().regex(/^\d{1,2}:(00|30)$/, 'Time must be a half-hour slot e.g. 9:00 or 14:30'),
  pickupAddress: z.string().min(5),
  passengerCount: z.number().int().min(1).max(6),
  carryOnCount: z.number().int().min(0).default(0),
  checkedLuggageCount: z.number().int().min(0).default(0),
  dropoffTerminal: z.enum(['A', 'B', 'C', 'D', 'E']),
  airline: z.string().optional(),
  departureTime: z.string().optional(),
  phoneNumber: z.string().min(10),
  email: z.string().email().optional()
});

function generateAllSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h}:00`);
    slots.push(`${h}:30`);
  }
  return slots;
}

function parseDateUTC(dateStr) {
  // Parse YYYY-MM-DD as UTC midnight
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date;
}

function isValidCalendarDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 1000 || y > 9999) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // Use Date to catch invalid combos like Feb 30, Apr 31 etc.
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

async function findActiveBookingForSlot(pickupDateObj, pickupTime) {
  const dayEnd = new Date(pickupDateObj.getTime());
  dayEnd.setUTCHours(23, 59, 59, 999);
  return prisma.booking.findFirst({
    where: {
      pickupDate: { gte: pickupDateObj, lte: dayEnd },
      pickupTime,
      bookingStatus: { in: ['PENDING', 'CONFIRMED'] },
      paymentStatus: { notIn: ['REFUNDED', 'FAILED'] }
    }
  });
}

async function getAvailability(req, res, next) {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid date in YYYY-MM-DD format.' });
    }

    if (!isValidCalendarDate(date)) {
      return res.status(400).json({ success: false, error: 'Please select a valid pickup date.' });
    }

    const pickupDateObj = parseDateUTC(date);
    const dayEnd = new Date(pickupDateObj.getTime());
    dayEnd.setUTCHours(23, 59, 59, 999);

    const bookedBookings = await prisma.booking.findMany({
      where: {
        pickupDate: { gte: pickupDateObj, lte: dayEnd },
        bookingStatus: { in: ['PENDING', 'CONFIRMED'] },
        paymentStatus: { notIn: ['REFUNDED', 'FAILED'] }
      },
      select: { pickupTime: true }
    });

    const allSlots = generateAllSlots();
    const unavailableSlots = bookedBookings.map(b => b.pickupTime);
    const availableSlots = allSlots.filter(s => !unavailableSlots.includes(s));

    res.json({ success: true, date, availableSlots, unavailableSlots });
  } catch (err) {
    next(err);
  }
}

async function createBooking(req, res, next) {
  try {
    const data = bookingSchema.parse(req.body);

    // Validate calendar date
    if (!isValidCalendarDate(data.pickupDate)) {
      return res.status(400).json({ success: false, error: 'Please select a valid pickup date.' });
    }

    const pickupDateObj = parseDateUTC(data.pickupDate);

    // Reject past dates
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    if (pickupDateObj < todayUTC) {
      return res.status(400).json({ success: false, error: 'Please select a future pickup date.' });
    }

    // Check for duplicate active booking on same slot
    const existing = await findActiveBookingForSlot(pickupDateObj, data.pickupTime);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'This time slot is already booked. Please choose another time.'
      });
    }

    const booking = await prisma.booking.create({
      data: {
        ...data,
        pickupDate: pickupDateObj,
        userId: req.user?.id || null,
        bookingRef: `TRQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        qrHash: crypto.randomBytes(16).toString('hex')
      }
    });
    res.status(201).json(booking);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0]?.message || 'Invalid booking data.' });
    }
    next(err);
  }
}

async function getBooking(req, res, next) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, bookingRef: true, pickupDate: true, pickupTime: true,
        pickupAddress: true, passengerCount: true, carryOnCount: true,
        checkedLuggageCount: true, tripDirection: true, dropoffTerminal: true,
        airline: true, departureTime: true, phoneNumber: true, email: true,
        bookingStatus: true, rideStatus: true, paymentStatus: true,
        price: true, qrCode: true, createdAt: true, updatedAt: true,
        // Never return password hash or internal userId — safe subset only
        user:   { select: { fullName: true, email: true } },
        driver: { select: {
          vehicleMake: true, vehicleModel: true, vehicleColor: true, vehiclePlate: true,
          user: { select: { fullName: true } }
        }},
        // Omit stripePaymentIntent from public response
        transaction: { select: { paymentStatus: true, amount: true, currency: true } }
      }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
}

// Only allow owner or admin to update. Restrict updatable fields to prevent payment bypass.
const CUSTOMER_UPDATABLE_FIELDS = new Set([
  'airline', 'departureTime', 'phoneNumber', 'email'
]);

async function updateBooking(req, res, next) {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isAdmin = req.user?.role === 'ADMIN';
    const isOwner = booking.userId && booking.userId === req.user?.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not own this booking.' });
    }

    // Non-admins can only update safe fields — never payment/booking status
    let updateData = req.body;
    if (!isAdmin) {
      updateData = {};
      for (const key of Object.keys(req.body)) {
        if (CUSTOMER_UPDATABLE_FIELDS.has(key)) updateData[key] = req.body[key];
      }
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteBooking(req, res, next) {
  try {
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    next(err);
  }
}

async function getAllBookings(req, res, next) {
  try {
    const raw = await prisma.booking.findMany({
      select: {
        id: true, pickupDate: true, pickupTime: true, pickupAddress: true,
        passengerCount: true, carryOnCount: true, checkedLuggageCount: true,
        tripDirection: true, dropoffTerminal: true, airline: true,
        departureTime: true, phoneNumber: true, email: true,
        bookingStatus: true, paymentStatus: true, price: true,
        userId: true, createdAt: true, updatedAt: true,
        // Return boolean instead of full base64 data URL — qrCode can be 20-50 KB per booking
        qrCode: true,
        transaction: {
          select: { id: true, stripePaymentIntent: true, amount: true, currency: true, paymentStatus: true }
        },
        user: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Strip qrCode data from list response to prevent huge payloads.
    // The full qrCode is available on the individual booking endpoint.
    const bookings = raw.map(({ qrCode, ...b }) => ({ ...b, hasQrCode: !!qrCode }));
    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

async function generateQR(bookingId) {
  // Use FRONTEND_URL so the QR opens the correct domain in production.
  // Change FRONTEND_URL in .env when deploying (e.g. https://traqq.com).
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const verifyUrl = `${base}/verify-booking?id=${bookingId}`;
  return QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: { dark: '#000000', light: '#ffffff' }
  });
}

async function verifyBooking(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || id.length < 8) {
      return res.status(400).json({ success: false, valid: false, message: 'Invalid booking reference.' });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ success: false, valid: false, message: 'Booking not found or not confirmed.' });
    }

    const isValid = booking.bookingStatus === 'CONFIRMED' && booking.paymentStatus === 'PAID';

    if (!isValid) {
      return res.json({
        success: true,
        valid: false,
        message: 'This booking is not confirmed or payment is pending.'
      });
    }

    res.json({
      success: true,
      valid: true,
      booking: {
        ref: booking.bookingRef,
        tripDirection: booking.tripDirection,
        pickupDate: booking.pickupDate,
        pickupTime: booking.pickupTime,
        terminal: booking.dropoffTerminal,
        passengerCount: booking.passengerCount,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBooking, getBooking, updateBooking, deleteBooking, getAllBookings, generateQR, getAvailability, verifyBooking };
