const { z } = require('zod');
const prisma = require('../config/prisma');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { VAN_CAPACITY, parseDateUTC, calendarDateError, getUsedVansForSlot } = require('./booking.controller.helpers');

const bookingSchema = z.object({
  tripDirection: z.enum(['TO_DFW', 'FROM_DFW', 'POINT_TO_POINT'], {
    errorMap: () => ({ message: 'Please select a valid trip direction (To DFW, From DFW, or Point-to-Point).' })
  }),
  bookingType: z.enum(['AIRPORT', 'CONCERT', 'HOTEL', 'RESTAURANT', 'WEDDING', 'PRIVATE_EVENT', 'POINT_TO_POINT'], {
    errorMap: () => ({ message: 'Please select a valid booking type.' })
  }).default('AIRPORT'),
  pickupDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a valid pickup date.')
    .refine(
      v => isValidCalendarDate(v),
      v => ({ message: calendarDateError(v) || 'Please choose a valid pickup date.' })
    ),
  pickupTime: z.string().regex(/^\d{1,2}:(00|30)$/, 'Please choose a valid pickup time (half-hour slots only, e.g. 9:00 or 14:30).'),
  pickupAddress: z.string().min(5, 'Please select a valid pickup address.'),
  pickupLatitude: z.number({ invalid_type_error: 'Pickup latitude must be a valid number.' }).optional(),
  pickupLongitude: z.number({ invalid_type_error: 'Pickup longitude must be a valid number.' }).optional(),
  pickupPlaceId: z.string().optional(),
  destinationAddress: z.string().optional(),
  destinationLatitude: z.number({ invalid_type_error: 'Destination latitude must be a valid number.' }).optional(),
  destinationLongitude: z.number({ invalid_type_error: 'Destination longitude must be a valid number.' }).optional(),
  destinationPlaceId: z.string().optional(),
  passengerCount: z.number({
    invalid_type_error: 'Please enter a valid passenger count.',
    required_error: 'Passenger count is required.'
  }).int('Passenger count must be a whole number.').min(1, 'At least 1 passenger is required.').max(6, 'Maximum 6 passengers per van.'),
  carryOnCount: z.number({
    invalid_type_error: 'Please enter a valid carry-on bag count.'
  }).int('Carry-on bag count must be a whole number.').min(0, 'Carry-on bag count cannot be negative.').default(0),
  checkedLuggageCount: z.number({
    invalid_type_error: 'Please enter a valid checked luggage count.'
  }).int('Checked luggage count must be a whole number.').min(0, 'Checked luggage count cannot be negative.').default(0),
  vanCount: z.number({
    invalid_type_error: 'Please enter a valid van count.'
  }).int('Van count must be a whole number.').min(1, 'At least 1 van is required.').max(3, 'Maximum 3 vans per booking.').default(1),
  dropoffTerminal: z.enum(['A', 'B', 'C', 'D', 'E'], {
    errorMap: () => ({ message: 'Please select a valid terminal (A, B, C, D, or E).' })
  }).optional().nullable(),
  airline: z.string().optional(),
  departureTime: z.string().optional(),
  notes: z.string().optional(),
  phoneNumber: z.string().min(10, 'Phone number must contain at least 10 digits.'),
  email: z.string().email('Please enter a valid email address.').optional()
}).superRefine((data, ctx) => {
  // Airport bookings require a terminal
  if (data.tripDirection !== 'POINT_TO_POINT' && !data.dropoffTerminal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dropoffTerminal'],
      message: 'Please select a DFW terminal for airport bookings.'
    });
  }
  // POINT_TO_POINT requires a destination address
  if (data.tripDirection === 'POINT_TO_POINT' && (!data.destinationAddress || data.destinationAddress.trim().length < 5)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['destinationAddress'],
      message: 'Please enter a valid destination address for point-to-point bookings.'
    });
  }
});

const editByRefSchema = z.object({
  phoneNumber:         z.string().min(10, 'Phone number must contain at least 10 digits.').optional(),
  email:               z.string().email('Please enter a valid email address.').optional().nullable(),
  pickupDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format.').optional(),
  pickupTime:          z.string().regex(/^\d{1,2}:(00|30)$/, 'Invalid time format.').optional(),
  passengerCount:      z.number().int().min(1).max(6).optional(),
  carryOnCount:        z.number().int().min(0).optional(),
  checkedLuggageCount: z.number().int().min(0).optional(),
  vanCount:            z.number().int().min(1).max(3).optional()
});

function generateAllSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h}:00`);
    slots.push(`${h}:30`);
  }
  return slots;
}

function isValidCalendarDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const currentYear = new Date().getUTCFullYear();
  if (y < currentYear || y > currentYear + 10) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

async function getAvailability(req, res, next) {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid date in YYYY-MM-DD format.' });
    }

    const dateErr = calendarDateError(date);
    if (dateErr) {
      return res.status(400).json({ success: false, error: dateErr });
    }

    const pickupDateObj = parseDateUTC(date);
    const dayEnd = new Date(pickupDateObj.getTime());
    dayEnd.setUTCHours(23, 59, 59, 999);

    const bookedBookings = await prisma.booking.findMany({
      where: {
        pickupDate: { gte: pickupDateObj, lte: dayEnd },
        bookingStatus: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
        paymentStatus: { notIn: ['REFUNDED', 'FAILED'] }
      },
      select: { pickupTime: true, vanCount: true }
    });

    // Build per-slot van usage map
    const vanUsage = {};
    for (const b of bookedBookings) {
      vanUsage[b.pickupTime] = (vanUsage[b.pickupTime] || 0) + (b.vanCount || 1);
    }

    const nowMs = Date.now();
    const cutoffMs = nowMs + 24 * 60 * 60 * 1000; // 24h from now

    const allSlots = generateAllSlots();
    const slotDetails = {};
    const unavailableSlots = [];

    for (const slot of allSlots) {
      const [h, m] = slot.split(':').map(Number);
      const [y, mo, d] = date.split('-').map(Number);
      const slotMs = Date.UTC(y, mo - 1, d, h, m);

      const within24h = slotMs < cutoffMs;
      const used = vanUsage[slot] || 0;
      const remaining = Math.max(0, VAN_CAPACITY - used);
      const available = !within24h && remaining > 0;

      slotDetails[slot] = { used, remaining, within24h, available };
      if (!available) unavailableSlots.push(slot);
    }

    const availableSlots = allSlots.filter(s => slotDetails[s].available);

    res.json({ success: true, date, availableSlots, unavailableSlots, slotDetails });
  } catch (err) {
    next(err);
  }
}

async function createBooking(req, res, next) {
  try {
    const data = bookingSchema.parse(req.body);

    const pickupDateObj = parseDateUTC(data.pickupDate);

    // Reject past dates
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    if (pickupDateObj < todayUTC) {
      return res.status(400).json({ success: false, error: 'Please select a future pickup date.' });
    }

    // 24-hour advance booking rule
    const [ph, pm] = data.pickupTime.split(':').map(Number);
    const pickupDtMs = pickupDateObj.getTime() + ph * 3600000 + pm * 60000;
    if (pickupDtMs - Date.now() < 24 * 3600 * 1000) {
      return res.status(400).json({
        success: false,
        error: 'Bookings must be made at least 24 hours in advance. Please choose a later date or time.'
      });
    }

    // Three-van capacity check
    const vanCount = data.vanCount || 1;
    const usedVans = await getUsedVansForSlot(pickupDateObj, data.pickupTime);
    if (usedVans + vanCount > VAN_CAPACITY) {
      const remaining = VAN_CAPACITY - usedVans;
      if (remaining <= 0) {
        return res.status(409).json({
          success: false,
          error: 'This time slot is fully booked (3 vans). Please choose another time.'
        });
      }
      return res.status(409).json({
        success: false,
        error: `Only ${remaining} van${remaining === 1 ? '' : 's'} available for this time slot. Please reduce your van count or choose a different time.`
      });
    }

    const booking = await prisma.booking.create({
      data: {
        ...data,
        pickupDate: pickupDateObj,
        vanCount,
        dropoffTerminal: data.dropoffTerminal || null,
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
        pickupAddress: true, pickupLatitude: true, pickupLongitude: true,
        destinationAddress: true, destinationLatitude: true, destinationLongitude: true,
        passengerCount: true, carryOnCount: true,
        checkedLuggageCount: true, vanCount: true,
        tripDirection: true, bookingType: true, dropoffTerminal: true,
        airline: true, departureTime: true, notes: true,
        phoneNumber: true, email: true,
        bookingStatus: true, rideStatus: true, paymentStatus: true,
        price: true, promoCode: true, discountAmount: true,
        qrCode: true, createdAt: true, updatedAt: true,
        user:   { select: { fullName: true, email: true } },
        driver: { select: {
          vehicleMake: true, vehicleModel: true, vehicleColor: true, vehiclePlate: true,
          profilePhoto: true,
          user: { select: { fullName: true, phoneNumber: true } }
        }},
        transaction: { select: { paymentStatus: true, amount: true, currency: true, stripePaymentIntent: true } }
      }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
}

// GET /bookings/by-ref/:ref — find booking by booking reference (public, used by customer edit flow)
async function getBookingByRef(req, res, next) {
  try {
    const { ref } = req.params;
    if (!ref || ref.length < 5) {
      return res.status(400).json({ error: 'Invalid booking reference.' });
    }

    // Normalize: stored as TRQ-XXXXXXXX; accept either form
    const normalizedRef = ref.toUpperCase().startsWith('TRQ-') ? ref.toUpperCase() : `TRQ-${ref.toUpperCase()}`;

    const booking = await prisma.booking.findUnique({
      where: { bookingRef: normalizedRef },
      select: {
        id: true, bookingRef: true, pickupDate: true, pickupTime: true,
        pickupAddress: true, destinationAddress: true,
        passengerCount: true, carryOnCount: true, checkedLuggageCount: true, vanCount: true,
        tripDirection: true, dropoffTerminal: true,
        airline: true, departureTime: true,
        phoneNumber: true, email: true,
        bookingStatus: true, paymentStatus: true,
        price: true, promoCode: true, discountAmount: true,
        createdAt: true, updatedAt: true
      }
    });

    if (!booking) return res.status(404).json({ error: 'No booking found with that reference.' });

    // Mask phone for display (show only last 4 digits)
    const masked = { ...booking, phoneMasked: '***-***-' + String(booking.phoneNumber).slice(-4) };
    delete masked.phoneNumber; // don't expose full number in GET
    res.json(masked);
  } catch (err) {
    next(err);
  }
}

// PATCH /bookings/by-ref/:ref — customer edits their own booking
async function updateBookingByRef(req, res, next) {
  try {
    const { ref } = req.params;
    const data = editByRefSchema.parse(req.body);

    // Must supply at least one field to edit
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    // Require phoneNumber in the request body for identity verification
    const verifyPhone = req.body._verifyPhone;
    if (!verifyPhone || String(verifyPhone).replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Phone number verification is required to edit a booking.' });
    }

    const normalizedRef2 = ref.toUpperCase().startsWith('TRQ-') ? ref.toUpperCase() : `TRQ-${ref.toUpperCase()}`;
    const booking = await prisma.booking.findUnique({ where: { bookingRef: normalizedRef2 } });
    if (!booking) return res.status(404).json({ error: 'No booking found with that reference.' });

    // Verify phone number matches
    const storedDigits = String(booking.phoneNumber).replace(/\D/g, '');
    const suppliedDigits = String(verifyPhone).replace(/\D/g, '');
    if (!storedDigits.endsWith(suppliedDigits.slice(-10)) && suppliedDigits !== storedDigits) {
      return res.status(403).json({ error: 'Phone number does not match the booking.' });
    }

    // Can only edit CONFIRMED or PENDING bookings
    if (!['CONFIRMED', 'PENDING'].includes(booking.bookingStatus)) {
      return res.status(400).json({ error: `Cannot edit a booking with status "${booking.bookingStatus}".` });
    }

    const updateData = {};

    // If date or time is changing, re-validate 24h rule and capacity
    const newDate = data.pickupDate || null;
    const newTime = data.pickupTime || null;

    if (newDate || newTime) {
      const dateStr = newDate || booking.pickupDate.toISOString().slice(0, 10);
      const timeStr = newTime || booking.pickupTime;

      const dateErr = calendarDateError(dateStr);
      if (dateErr) return res.status(400).json({ error: dateErr });

      const pickupDateObj = parseDateUTC(dateStr);
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      if (pickupDateObj < todayUTC) {
        return res.status(400).json({ error: 'Please select a future pickup date.' });
      }

      // 24h rule
      const [ph, pm] = timeStr.split(':').map(Number);
      const pickupDtMs = pickupDateObj.getTime() + ph * 3600000 + pm * 60000;
      if (pickupDtMs - Date.now() < 24 * 3600 * 1000) {
        return res.status(400).json({ error: 'Bookings must be made at least 24 hours in advance.' });
      }

      // Capacity check (exclude current booking from count)
      const newVanCount = data.vanCount ?? booking.vanCount ?? 1;
      const usedVans = await getUsedVansForSlot(pickupDateObj, timeStr, booking.id);
      if (usedVans + newVanCount > VAN_CAPACITY) {
        const remaining = VAN_CAPACITY - usedVans;
        if (remaining <= 0) {
          return res.status(409).json({ error: 'This time slot is fully booked. Please choose another time.' });
        }
        return res.status(409).json({
          error: `Only ${remaining} van${remaining === 1 ? '' : 's'} available for this slot.`
        });
      }

      if (newDate) updateData.pickupDate = pickupDateObj;
      if (newTime) updateData.pickupTime = timeStr;
    }

    // Copy over simple editable fields
    const allowedFields = ['phoneNumber', 'email', 'passengerCount', 'carryOnCount', 'checkedLuggageCount', 'vanCount'];
    for (const key of allowedFields) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    // If vanCount changed without date/time change, still check capacity
    if (data.vanCount !== undefined && !newDate && !newTime) {
      const pickupDateObj = new Date(booking.pickupDate);
      const usedVans = await getUsedVansForSlot(pickupDateObj, booking.pickupTime, booking.id);
      if (usedVans + data.vanCount > VAN_CAPACITY) {
        const remaining = VAN_CAPACITY - usedVans;
        return res.status(409).json({
          error: remaining <= 0
            ? 'This time slot is fully booked.'
            : `Only ${remaining} van${remaining === 1 ? '' : 's'} available for this slot.`
        });
      }
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: updateData
    });

    // Log the edit
    await prisma.bookingEditLog.create({
      data: {
        bookingId: booking.id,
        changedBy: 'CUSTOMER',
        changes: JSON.stringify(updateData),
        note: 'Customer self-edit via booking reference'
      }
    }).catch(() => {}); // fire-and-forget

    res.json({ success: true, booking: { ...updated, phoneNumber: undefined, phoneMasked: '***-***-' + String(updated.phoneNumber).slice(-4) } });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid update data.' });
    }
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
        id: true, bookingRef: true, pickupDate: true, pickupTime: true, pickupAddress: true,
        destinationAddress: true,
        passengerCount: true, carryOnCount: true, checkedLuggageCount: true, vanCount: true,
        tripDirection: true, bookingType: true, dropoffTerminal: true, airline: true,
        departureTime: true, notes: true, phoneNumber: true, email: true,
        bookingStatus: true, paymentStatus: true, price: true,
        promoCode: true, discountAmount: true,
        userId: true, createdAt: true, updatedAt: true,
        qrCode: true,
        transaction: {
          select: { id: true, stripePaymentIntent: true, amount: true, currency: true, paymentStatus: true }
        },
        user: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const bookings = raw.map(({ qrCode, ...b }) => ({ ...b, hasQrCode: !!qrCode }));
    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

async function generateQR(bookingId) {
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

    const normalizedRef = id.toUpperCase().startsWith('TRQ-') ? id.toUpperCase() : `TRQ-${id.toUpperCase()}`;
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { id },
          { bookingRef: id },
          { bookingRef: normalizedRef }
        ]
      }
    });

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
        vanCount: booking.vanCount || 1,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBooking,
  getBooking,
  getBookingByRef,
  updateBooking,
  updateBookingByRef,
  deleteBooking,
  getAllBookings,
  generateQR,
  getAvailability,
  verifyBooking
};
