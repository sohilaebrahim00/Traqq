const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { getUsedVansForSlot, parseDateUTC, calendarDateError } = require('./booking.controller.helpers');

const VAN_CAPACITY = 3;

const createDriverSchema = z.object({
  fullName:      z.string().min(2, 'Full name must be at least 2 characters.'),
  phoneNumber:   z.string().min(10, 'Phone number must be at least 10 digits.'),
  email:          z.string().email('Please enter a valid email address.'),
  password:       z.string().min(8, 'Password must be at least 8 characters.'),
  licenseNumber:  z.string().min(3, 'License number must be at least 3 characters.').optional(),
  vehicleMake:    z.string().min(1, 'Vehicle make is required.'),
  vehicleModel:   z.string().min(1, 'Vehicle model is required.'),
  vehicleColor:   z.string().min(1, 'Vehicle color is required.'),
  vehiclePlate:   z.string().min(1, 'Vehicle plate number is required.'),
  profilePhoto:   z.string().url('Invalid URL format for profile photo.').optional()
});

const assignDriverSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required.')
});

const editBookingSchema = z.object({
  pickupDate:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pickupTime:          z.string().regex(/^\d{1,2}:(00|30)$/).optional(),
  // Use z.preprocess to guard against NaN values sent from parseInt() on empty inputs
  passengerCount:      z.preprocess(v => (typeof v === 'number' && !isNaN(v)) ? v : undefined, z.number().int().min(1).max(6).optional()),
  carryOnCount:        z.preprocess(v => (typeof v === 'number' && !isNaN(v)) ? v : undefined, z.number().int().min(0).optional()),
  checkedLuggageCount: z.preprocess(v => (typeof v === 'number' && !isNaN(v)) ? v : undefined, z.number().int().min(0).optional()),
  vanCount:            z.preprocess(v => (typeof v === 'number' && !isNaN(v)) ? v : undefined, z.number().int().min(1).max(3).optional()),
  phoneNumber:         z.string().min(10).optional(),
  email:               z.string().email().optional().nullable(),
  airline:             z.string().optional().nullable(),
  departureTime:       z.string().optional().nullable(),
  dropoffTerminal:     z.enum(['A', 'B', 'C', 'D', 'E']).optional().nullable(),
  pickupAddress:       z.string().min(5).optional(),
  destinationAddress:  z.string().min(5).optional().nullable(),
  notes:               z.string().optional().nullable(),
  note:                z.string().optional()
});

async function getOverview(req, res, next) {
  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd   = new Date(todayStart.getTime() + 86400000);
    const weekStart  = new Date(todayStart.getTime() - 6 * 86400000);
    const monthStart = new Date(todayStart.getTime() - 29 * 86400000);

    const [
      total, confirmed, pending, cancelled, completed,
      paid, unpaid, failed, withQR,
      todayRides, weeklyRides, monthlyRides,
      revenueAgg
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { bookingStatus: 'CONFIRMED' } }),
      prisma.booking.count({ where: { bookingStatus: 'PENDING' } }),
      prisma.booking.count({ where: { bookingStatus: 'CANCELLED' } }),
      prisma.booking.count({ where: { bookingStatus: 'COMPLETED' } }),
      prisma.booking.count({ where: { paymentStatus: 'PAID' } }),
      prisma.booking.count({ where: { paymentStatus: 'UNPAID' } }),
      prisma.booking.count({ where: { paymentStatus: 'FAILED' } }),
      prisma.booking.count({ where: { qrCode: { not: null } } }),
      prisma.booking.count({ where: { pickupDate: { gte: todayStart, lt: todayEnd } } }),
      prisma.booking.count({ where: { pickupDate: { gte: weekStart } } }),
      prisma.booking.count({ where: { pickupDate: { gte: monthStart } } }),
      prisma.booking.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { price: true } }),
    ]);

    res.json({
      success: true,
      stats: {
        total, confirmed, pending, cancelled, completed,
        paid, unpaid, failed,
        revenue: Number(revenueAgg._sum.price || 0),
        withQR,
        todayRides, weeklyRides, monthlyRides
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'PENDING'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { bookingStatus: status },
      include: { transaction: true, user: { select: { fullName: true, email: true } } }
    });

    res.json({ success: true, booking });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Booking not found' });
    }
    next(err);
  }
}

async function editBooking(req, res, next) {
  try {
    const { id } = req.params;
    const data = editBookingSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Booking not found.' });

    const updateData = {};
    const note = data.note || null;
    const { note: _note, ...fields } = data;

    // Handle date/time changes with re-validation
    const newDate = fields.pickupDate || null;
    const newTime = fields.pickupTime || null;

    if (newDate || newTime) {
      const dateStr = newDate || existing.pickupDate.toISOString().slice(0, 10);
      const timeStr = newTime || existing.pickupTime;

      const dateErr = calendarDateError(dateStr);
      if (dateErr) return res.status(400).json({ error: dateErr });

      const pickupDateObj = parseDateUTC(dateStr);
      const todayUTC = new Date();
      todayUTC.setUTCHours(0, 0, 0, 0);
      if (pickupDateObj < todayUTC) {
        return res.status(400).json({ error: 'Please select a future pickup date.' });
      }

      // Capacity check (exclude current booking)
      const newVanCount = fields.vanCount ?? existing.vanCount ?? 1;
      const usedVans = await getUsedVansForSlot(pickupDateObj, timeStr, existing.id);
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

    // Copy over other editable fields
    const simpleFields = ['passengerCount', 'carryOnCount', 'checkedLuggageCount', 'vanCount',
                          'phoneNumber', 'email', 'airline', 'departureTime', 'dropoffTerminal',
                          'pickupAddress', 'destinationAddress', 'notes'];
    for (const key of simpleFields) {
      if (fields[key] !== undefined) updateData[key] = fields[key];
    }

    // If only vanCount changed (no date/time change), still check capacity
    if (fields.vanCount !== undefined && !newDate && !newTime) {
      const pickupDateObj = new Date(existing.pickupDate);
      const usedVans = await getUsedVansForSlot(pickupDateObj, existing.pickupTime, existing.id);
      if (usedVans + fields.vanCount > VAN_CAPACITY) {
        const remaining = VAN_CAPACITY - usedVans;
        return res.status(409).json({
          error: remaining <= 0
            ? 'This time slot is fully booked.'
            : `Only ${remaining} van${remaining === 1 ? '' : 's'} available for this slot.`
        });
      }
    }

    const updated = await prisma.booking.update({ where: { id }, data: updateData });

    // Log the edit
    await prisma.bookingEditLog.create({
      data: {
        bookingId: id,
        changedBy: 'ADMIN',
        adminId: req.user?.id || null,
        changes: JSON.stringify(updateData),
        note
      }
    }).catch(() => {});

    res.json({ success: true, booking: updated });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid update data.' });
    }
    if (err.code === 'P2025') return res.status(404).json({ error: 'Booking not found.' });
    next(err);
  }
}

async function getBookingEditLogs(req, res, next) {
  try {
    const { id } = req.params;
    const logs = await prisma.bookingEditLog.findMany({
      where: { bookingId: id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
}

async function createDriver(req, res, next) {
  try {
    const data = createDriverSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          password: hashedPassword,
          role: 'DRIVER'
        }
      });

      const profile = await tx.driverProfile.create({
        data: {
          userId: user.id,
          licenseNumber: data.licenseNumber || null,
          vehicleMake: data.vehicleMake,
          vehicleModel: data.vehicleModel,
          vehicleColor: data.vehicleColor,
          vehiclePlate: data.vehiclePlate,
          profilePhoto: data.profilePhoto
        }
      });

      return { user, profile };
    });

    res.status(201).json({
      success: true,
      driver: {
        id: result.profile.id,
        userId: result.user.id,
        fullName: result.user.fullName,
        phoneNumber: result.user.phoneNumber,
        email: result.user.email,
        licenseNumber: result.profile.licenseNumber || null,
        vehicleMake: result.profile.vehicleMake,
        vehicleModel: result.profile.vehicleModel,
        vehicleColor: result.profile.vehicleColor,
        vehiclePlate: result.profile.vehiclePlate,
        profilePhoto: result.profile.profilePhoto,
        isAvailable: result.profile.isAvailable
      }
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const firstError = err.errors[0]?.message || 'Invalid input details.';
      return res.status(400).json({ error: firstError });
    }

    if (err.code === 'P2002') {
      const target = err.meta?.target || '';
      if (String(target).includes('email')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      if (String(target).includes('phoneNumber')) {
        return res.status(409).json({ error: 'An account with this phone number already exists.' });
      }
      if (String(target).includes('licenseNumber')) {
        return res.status(409).json({ error: 'A driver with this license number already exists.' });
      }
      return res.status(409).json({ error: 'Unique constraint failed on a driver attribute.' });
    }
    next(err);
  }
}

async function getDrivers(req, res, next) {
  try {
    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        driverProfile: {
          select: {
            id: true,
            licenseNumber: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleColor: true,
            vehiclePlate: true,
            profilePhoto: true,
            isAvailable: true
          }
        }
      }
    });

    const formattedDrivers = drivers.map(d => ({
      id: d.driverProfile?.id || '',
      userId: d.id,
      fullName: d.fullName,
      phoneNumber: d.phoneNumber,
      email: d.email,
      licenseNumber: d.driverProfile?.licenseNumber || null,
      vehicleMake: d.driverProfile?.vehicleMake || '',
      vehicleModel: d.driverProfile?.vehicleModel || '',
      vehicleColor: d.driverProfile?.vehicleColor || '',
      vehiclePlate: d.driverProfile?.vehiclePlate || '',
      profilePhoto: d.driverProfile?.profilePhoto || null,
      isAvailable: d.driverProfile?.isAvailable ?? false
    }));

    res.json(formattedDrivers);
  } catch (err) {
    next(err);
  }
}

async function assignDriver(req, res, next) {
  try {
    const { id } = req.params;
    const { driverId } = assignDriverSchema.parse(req.body);

    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: { user: true }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }
    if (!driver.isAvailable) {
      return res.status(400).json({ error: 'This driver is currently marked as unavailable.' });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    if (booking.bookingStatus === 'CANCELLED' || booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({
        error: 'Cannot assign a driver to a COMPLETED or CANCELLED booking.'
      });
    }

    if (booking.bookingStatus !== 'CONFIRMED' || booking.paymentStatus !== 'PAID') {
      return res.status(400).json({
        error: 'Only PAID and CONFIRMED bookings can be assigned to a driver.'
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        driverId: driver.id,
        assignedAt: new Date(),
        rideStatus: 'ASSIGNED'
      }
    });

    res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Driver ID is required.' });
    }
    next(err);
  }
}

module.exports = {
  getOverview,
  updateBookingStatus,
  editBooking,
  getBookingEditLogs,
  createDriver,
  getDrivers,
  assignDriver
};
