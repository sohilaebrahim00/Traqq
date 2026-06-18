const prisma = require('../config/prisma');

async function getTracking(req, res, next) {
  try {
    const { ref } = req.params;

    // Validate bookingRef format: TRQ-XXXXXXXX
    if (!ref || !/^TRQ-[0-9A-F]{8}$/i.test(ref)) {
      return res.status(400).json({ error: 'Invalid booking reference format.' });
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingRef: ref.toUpperCase() },
      include: {
        driver: {
          include: {
            user: {
              select: {
                fullName: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Customer-safe booking fields (no internal DB IDs)
    const response = {
      bookingRef:      booking.bookingRef,
      pickupDate:      booking.pickupDate,
      pickupTime:      booking.pickupTime,
      pickupAddress:   booking.pickupAddress,
      tripDirection:   booking.tripDirection,
      dropoffTerminal: booking.dropoffTerminal,
      bookingStatus:   booking.bookingStatus,
      rideStatus:      booking.rideStatus,
      paymentStatus:   booking.paymentStatus,
      
      // Timeline details
      timeline: {
        createdAt:           booking.createdAt,
        assignedAt:          booking.assignedAt,
        driverStartedAt:     booking.driverStartedAt,
        driverArrivedAt:     booking.driverArrivedAt,
        passengerPickedUpAt: booking.passengerPickedUpAt,
        completedAt:         booking.completedAt
      },
      
      // ETA placeholder
      eta: '10-15 mins'
    };

    // Return driver details only if booking is PAID and CONFIRMED and has an assigned driver
    const isPaidAndConfirmed =
      booking.paymentStatus === 'PAID' &&
      (booking.bookingStatus === 'CONFIRMED' || booking.bookingStatus === 'COMPLETED');
    
    if (isPaidAndConfirmed && booking.driver) {
      const activeStates = [
        'ASSIGNED',
        'DRIVER_ON_THE_WAY',
        'DRIVER_ARRIVED',
        'PASSENGER_PICKED_UP',
        'IN_TRANSIT',
        'DROPPED_OFF'
      ];
      const isRideActive = activeStates.includes(booking.rideStatus);

      response.driver = {
        fullName:     booking.driver.user.fullName,
        phoneNumber:  booking.driver.user.phoneNumber,
        profilePhoto: booking.driver.profilePhoto,
        vehicle: {
          make:  booking.driver.vehicleMake,
          model: booking.driver.vehicleModel,
          color: booking.driver.vehicleColor,
          plate: booking.driver.vehiclePlate
        },
        // Return location only if the ride is actively underway
        location: isRideActive ? {
          latitude:  booking.driver.currentLatitude,
          longitude: booking.driver.currentLongitude,
          updatedAt: booking.driver.lastLocationUpdatedAt
        } : null
      };
    } else {
      response.driver = null;
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      select: {
        id: true, bookingRef: true, pickupDate: true, pickupTime: true,
        pickupAddress: true, passengerCount: true, tripDirection: true,
        dropoffTerminal: true, airline: true, bookingStatus: true,
        rideStatus: true, paymentStatus: true, price: true,
        qrCode: true, createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

module.exports = { getTracking, getMyBookings };
