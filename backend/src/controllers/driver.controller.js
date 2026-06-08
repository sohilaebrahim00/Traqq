const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { signAccess, signRefresh } = require('../utils/tokens');

const loginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your email or phone number.'),
  password:   z.string().min(1, 'Please enter your password.')
});

const statusSchema = z.object({
  status: z.enum([
    'ASSIGNED',
    'DRIVER_ON_THE_WAY',
    'DRIVER_ARRIVED',
    'PASSENGER_PICKED_UP',
    'IN_TRANSIT',
    'DROPPED_OFF',
    'COMPLETED',
    'CANCELLED'
  ])
});

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

const VALID_TRANSITIONS = {
  ASSIGNED: ['DRIVER_ON_THE_WAY', 'CANCELLED'],
  DRIVER_ON_THE_WAY: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['PASSENGER_PICKED_UP', 'CANCELLED'],
  PASSENGER_PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DROPPED_OFF', 'CANCELLED'],
  DROPPED_OFF: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

// Driver helper to find profile
async function getDriverProfileOrThrow(userId) {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId }
  });
  if (!profile) {
    const error = new Error('Driver profile not found.');
    error.status = 404;
    throw error;
  }
  return profile;
}

async function login(req, res, next) {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    // Look up user by email or phone number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier }
        ]
      },
      include: {
        driverProfile: true
      }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email/phone or password.' });
    }

    if (user.role !== 'DRIVER') {
      return res.status(403).json({ error: 'Access denied. You do not have a driver account.' });
    }

    if (!user.driverProfile) {
      return res.status(403).json({ error: 'Access denied. Driver profile not found.' });
    }

    const accessToken = signAccess({ id: user.id, role: user.role });
    const refreshToken = signRefresh({ id: user.id });

    res.json({
      user: {
        id:          user.id,
        fullName:    user.fullName,
        phoneNumber: user.phoneNumber,
        email:       user.email,
        role:        user.role,
        driverProfile: {
          id:           user.driverProfile.id,
          licenseNumber: user.driverProfile.licenseNumber,
          vehicleMake:  user.driverProfile.vehicleMake,
          vehicleModel: user.driverProfile.vehicleModel,
          vehicleColor: user.driverProfile.vehicleColor,
          vehiclePlate: user.driverProfile.vehiclePlate,
          profilePhoto: user.driverProfile.profilePhoto,
          isAvailable:  user.driverProfile.isAvailable
        }
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      const firstError = err.errors[0]?.message || 'Invalid input details.';
      return res.status(400).json({ error: firstError });
    }
    next(err);
  }
}

async function getBookings(req, res, next) {
  try {
    const profile = await getDriverProfileOrThrow(req.user.id);
    const bookings = await prisma.booking.findMany({
      where: { driverId: profile.id },
      orderBy: [
        { pickupDate: 'asc' },
        { pickupTime: 'asc' }
      ]
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

async function getBookingDetails(req, res, next) {
  try {
    const profile = await getDriverProfileOrThrow(req.user.id);
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.driverId !== profile.id) {
      return res.status(403).json({ error: 'Access denied. This booking is not assigned to you.' });
    }
    res.json(booking);
  } catch (err) {
    next(err);
  }
}

async function updateBookingStatus(req, res, next) {
  try {
    const profile = await getDriverProfileOrThrow(req.user.id);
    const { status: newStatus } = statusSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    if (booking.driverId !== profile.id) {
      return res.status(403).json({ error: 'Access denied. This booking is not assigned to you.' });
    }

    // Enforce payment status is PAID
    if (booking.paymentStatus !== 'PAID') {
      return res.status(400).json({ error: 'Status updates are blocked until the booking is fully PAID.' });
    }

    // Enforce booking status is CONFIRMED
    if (booking.bookingStatus !== 'CONFIRMED') {
      return res.status(400).json({ error: 'Status updates are blocked unless the booking status is CONFIRMED.' });
    }

    const currentStatus = booking.rideStatus;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid status transition from ${currentStatus} to ${newStatus}.`
      });
    }

    const updateData = { rideStatus: newStatus };

    // Record tracking timestamps based on the ride state
    if (newStatus === 'DRIVER_ON_THE_WAY') updateData.driverStartedAt = new Date();
    if (newStatus === 'DRIVER_ARRIVED') updateData.driverArrivedAt = new Date();
    if (newStatus === 'PASSENGER_PICKED_UP') updateData.passengerPickedUpAt = new Date();
    if (newStatus === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.bookingStatus = 'COMPLETED';
    }
    if (newStatus === 'CANCELLED') {
      updateData.bookingStatus = 'CANCELLED';
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: updateData
    });

    res.json(updated);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid ride status value.' });
    }
    next(err);
  }
}

async function updateLocation(req, res, next) {
  try {
    const profile = await getDriverProfileOrThrow(req.user.id);
    const { latitude, longitude } = locationSchema.parse(req.body);

    // Enforce: location update only allowed if the driver has an active assigned booking
    const activeBooking = await prisma.booking.findFirst({
      where: {
        driverId: profile.id,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        rideStatus: {
          in: [
            'ASSIGNED',
            'DRIVER_ON_THE_WAY',
            'DRIVER_ARRIVED',
            'PASSENGER_PICKED_UP',
            'IN_TRANSIT',
            'DROPPED_OFF'
          ]
        }
      }
    });

    if (!activeBooking) {
      return res.status(400).json({ error: 'Location updates are only allowed during active assigned transfers.' });
    }

    const updatedProfile = await prisma.driverProfile.update({
      where: { id: profile.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdatedAt: new Date()
      }
    });

    res.json({
      success: true,
      currentLatitude: updatedProfile.currentLatitude,
      currentLongitude: updatedProfile.currentLongitude,
      lastLocationUpdatedAt: updatedProfile.lastLocationUpdatedAt
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Latitude and longitude are required and must be valid coordinates.' });
    }
    next(err);
  }
}

module.exports = {
  login,
  getBookings,
  getBookingDetails,
  updateBookingStatus,
  updateLocation
};
