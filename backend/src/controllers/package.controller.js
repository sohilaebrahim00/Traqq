const prisma = require('../config/prisma');
const { generateQR } = require('./booking.controller');

const PACKAGES = {
  PACKAGE_2: { rides: 2, price: 179, name: '2 Rides / Month' },
  PACKAGE_4: { rides: 4, price: 349, name: '4 Rides / Month' },
  PACKAGE_6: { rides: 6, price: 529, name: '6 Rides / Month' },
  PACKAGE_8: { rides: 8, price: 699, name: '8 Rides / Month' }
};

function getStripe() {
  if (!process.env.STRIPE_RESTRICTED_KEY) return null;
  return require('stripe')(process.env.STRIPE_RESTRICTED_KEY);
}

async function createCheckoutSession(req, res, next) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Payment system not configured.' });
    }

    const { packageId } = req.body;
    if (!packageId || !PACKAGES[packageId]) {
      return res.status(400).json({ error: 'Invalid package selected.' });
    }

    const pkg = PACKAGES[packageId];
    const userId = req.user.id;
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pkg.name,
              description: `TRAQQ Premium Shuttle Service - ${pkg.rides} Private Rides`
            },
            unit_amount: pkg.price * 100
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${base}/package-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/packages`,
      metadata: {
        packageId,
        userId
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

async function getActivePackages(req, res, next) {
  try {
    const packages = await prisma.packagePurchase.findMany({
      where: {
        userId: req.user.id,
        paymentStatus: 'PAID',
        expirationDate: { gt: new Date() },
        remainingRides: { gt: 0 }
      },
      orderBy: { expirationDate: 'asc' }
    });
    res.json(packages);
  } catch (err) {
    next(err);
  }
}

async function redeemPackageRide(req, res, next) {
  try {
    const { bookingId, packagePurchaseId } = req.body;
    if (!bookingId || !packagePurchaseId) {
      return res.status(400).json({ error: 'bookingId and packagePurchaseId are required.' });
    }

    const userId = req.user.id;

    // Load booking
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    // Ensure the booking belongs to the authenticated user
    if (booking.userId && booking.userId !== userId) {
      return res.status(403).json({ error: 'This booking does not belong to your account.' });
    }
    if (booking.paymentStatus === 'PAID') {
      return res.status(400).json({ error: 'This booking has already been paid.' });
    }
    if (booking.bookingStatus === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot redeem a cancelled booking.' });
    }

    // Load package
    const pkg = await prisma.packagePurchase.findUnique({ where: { id: packagePurchaseId } });
    if (!pkg) return res.status(404).json({ error: 'Package not found.' });
    if (pkg.userId !== userId) return res.status(403).json({ error: 'Package does not belong to this account.' });
    if (pkg.paymentStatus !== 'PAID') return res.status(400).json({ error: 'Package is not active.' });
    if (pkg.remainingRides <= 0) return res.status(400).json({ error: 'No rides remaining in this package.' });
    if (new Date(pkg.expirationDate) <= new Date()) return res.status(400).json({ error: 'This package has expired.' });

    // Generate QR code
    const qrCode = await generateQR(bookingId);

    // Atomic transaction: confirm booking + decrement rides
    const [updatedBooking, updatedPkg] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { bookingStatus: 'CONFIRMED', paymentStatus: 'PAID', qrCode }
      }),
      prisma.packagePurchase.update({
        where: { id: packagePurchaseId },
        data: { remainingRides: { decrement: 1 } }
      })
    ]);

    res.json({
      success: true,
      booking: updatedBooking,
      remainingRides: updatedPkg.remainingRides
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCheckoutSession, getActivePackages, redeemPackageRide };
