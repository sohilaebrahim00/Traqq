const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');

const createDriverSchema = z.object({
  fullName:      z.string().min(2, 'Full name must be at least 2 characters.'),
  phoneNumber:   z.string().min(10, 'Phone number must be at least 10 digits.'),
  email:          z.string().email('Please enter a valid email address.'),
  password:       z.string().min(8, 'Password must be at least 8 characters.'),
  licenseNumber:  z.string().min(3, 'License number must be at least 3 characters.'),
  vehicleMake:    z.string().min(1, 'Vehicle make is required.'),
  vehicleModel:   z.string().min(1, 'Vehicle model is required.'),
  vehicleColor:   z.string().min(1, 'Vehicle color is required.'),
  vehiclePlate:   z.string().min(1, 'Vehicle plate number is required.'),
  profilePhoto:   z.string().url('Invalid URL format for profile photo.').optional()
});

const assignDriverSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required.')
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
      todayRides, weeklyRides, monthlyRides
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
    ]);

    res.json({
      success: true,
      stats: {
        total, confirmed, pending, cancelled, completed,
        paid, unpaid, failed,
        revenue: paid * 99,
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
          licenseNumber: data.licenseNumber,
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
        licenseNumber: result.profile.licenseNumber,
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

    // Flatten representation for frontend clarity
    const formattedDrivers = drivers.map(d => ({
      id: d.driverProfile?.id || '',
      userId: d.id,
      fullName: d.fullName,
      phoneNumber: d.phoneNumber,
      email: d.email,
      licenseNumber: d.driverProfile?.licenseNumber || '',
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
    const { id } = req.params; // Booking ID
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

    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Constraints: Cannot assign cancelled or completed bookings
    if (booking.bookingStatus === 'CANCELLED' || booking.bookingStatus === 'COMPLETED') {
      return res.status(400).json({
        error: 'Cannot assign a driver to a COMPLETED or CANCELLED booking.'
      });
    }

    // Constraints: Admin can assign only PAID and CONFIRMED bookings
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

    res.json({
      success: true,
      booking: updatedBooking
    });
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
  createDriver,
  getDrivers,
  assignDriver
};
