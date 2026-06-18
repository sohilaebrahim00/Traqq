const prisma = require('../config/prisma');
const { generateQR } = require('./booking.controller');
const emailService = require('../services/email.service');

let _stripeInstance = null;
function getStripe() {
  if (!process.env.STRIPE_RESTRICTED_KEY) return null;
  if (!_stripeInstance) {
    _stripeInstance = require('stripe')(process.env.STRIPE_RESTRICTED_KEY);
  }
  return _stripeInstance;
}

function handleStripeError(err, res) {
  const type = err.type || '';
  console.error('[stripe]', type, err.message);
  if (type === 'StripeAuthenticationError') {
    return res.status(503).json({ error: 'Stripe authentication failed. The API key may be invalid.' });
  }
  if (type === 'StripePermissionError') {
    return res.status(503).json({ error: 'Stripe key lacks required permissions (Payment Intents: write). Please update the restricted key in the Stripe Dashboard.' });
  }
  if (type === 'StripeConnectionError') {
    return res.status(503).json({ error: 'Cannot connect to Stripe. Check your internet connection.' });
  }
  if (type === 'StripeCardError') {
    return res.status(402).json({ error: err.message || 'Your card was declined.' });
  }
  if (type === 'StripeRateLimitError') {
    return res.status(429).json({ error: 'Too many requests to Stripe. Please try again in a moment.' });
  }
  if (type === 'StripeInvalidRequestError') {
    return res.status(400).json({ error: err.message || 'Invalid payment request.' });
  }
  // Generic Stripe error — return 402 (payment required) with message instead of 500
  if (type && type.startsWith('Stripe')) {
    return res.status(402).json({ error: err.message || 'Payment processing failed. Please try again.' });
  }
  return null; // not a Stripe error — let caller use next(err)
}

async function createPaymentIntent(req, res, next) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Payment system not configured. Add STRIPE_RESTRICTED_KEY to backend/.env' });
    }

    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // If an authenticated user is making this request, verify they own the booking.
    // Guests (no req.user) may pay for any booking they know the ID of (guest flow).
    if (req.user && booking.userId && booking.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to pay for this booking.' });
    }

    // Use the stored booking price (may include promo discount)
    const amountCents = Math.round(Number(booking.price) * 100);
    if (amountCents < 50) return res.status(400).json({ error: 'Invalid booking price' });

    // Idempotency: reuse existing PaymentIntent if one exists for this booking
    const existing = await prisma.transaction.findUnique({ where: { bookingId } });
    if (existing) {
      if (existing.paymentStatus === 'PAID') {
        return res.status(400).json({ error: 'This booking has already been paid.' });
      }
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(existing.stripePaymentIntent);
        if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
          return res.json({
            clientSecret: existingIntent.client_secret,
            amount: amountCents,
            bookingRef: booking.bookingRef
          });
        }
      } catch (stripeErr) {
        const handled = handleStripeError(stripeErr, res);
        if (handled) return;
        return next(stripeErr);
      }
      // Existing intent is stale — create a fresh one
      try {
        const freshIntent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          metadata: { bookingId, bookingRef: booking.bookingRef || '' }
        });
        await prisma.transaction.update({
          where: { bookingId },
          data: { stripePaymentIntent: freshIntent.id, amount: amountCents, paymentStatus: 'UNPAID' }
        });
        return res.json({
          clientSecret: freshIntent.client_secret,
          amount: amountCents,
          bookingRef: booking.bookingRef
        });
      } catch (stripeErr) {
        const handled = handleStripeError(stripeErr, res);
        if (handled) return;
        return next(stripeErr);
      }
    }

    let intent;
    try {
      intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        metadata: { bookingId, bookingRef: booking.bookingRef || '' }
      });
    } catch (stripeErr) {
      const handled = handleStripeError(stripeErr, res);
      if (handled) return;
      return next(stripeErr);
    }

    await prisma.transaction.create({
      data: {
        bookingId,
        stripePaymentIntent: intent.id,
        amount: amountCents,
        currency: 'usd',
        paymentStatus: 'UNPAID'
      }
    });

    res.json({
      clientSecret: intent.client_secret,
      amount: amountCents,
      bookingRef: booking.bookingRef
    });
  } catch (err) {
    next(err);
  }
}

async function handleWebhook(req, res, next) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Payment system not configured' });

  // STRIPE_WEBHOOK_SECRET must be set; without it we cannot verify authenticity
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set — rejecting event');
    return res.status(503).json({ error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature invalid' });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const bookingId = intent.metadata?.bookingId;
      if (!bookingId) return res.json({ received: true });

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return res.json({ received: true });

      // Idempotency — skip re-processing if already fully confirmed with a QR
      if (booking.bookingStatus === 'CONFIRMED' && booking.paymentStatus === 'PAID' && booking.qrCode) {
        return res.json({ received: true });
      }

      const qrCode = booking.qrCode || await generateQR(bookingId);

      await prisma.booking.update({
        where: { id: bookingId },
        data: { bookingStatus: 'CONFIRMED', paymentStatus: 'PAID', qrCode }
      });

      await prisma.transaction.updateMany({
        where: { stripePaymentIntent: intent.id },
        data: { paymentStatus: 'PAID' }
      });

      // Fire-and-forget: email failure must not fail the webhook response
      emailService.sendBookingConfirmation({ ...booking, bookingStatus: 'CONFIRMED', paymentStatus: 'PAID', qrCode })
        .catch(err => console.error('[notify] booking-confirmation failed:', err.message));
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const bookingId = intent.metadata?.bookingId;
      if (!bookingId) return res.json({ received: true });

      await prisma.transaction.updateMany({
        where: { stripePaymentIntent: intent.id },
        data: { paymentStatus: 'FAILED' }
      });
      // Best-effort — booking may not exist in edge cases
      await prisma.booking.updateMany({
        where: { id: bookingId, paymentStatus: { not: 'PAID' } },
        data: { paymentStatus: 'FAILED' }
      });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { packageId, userId } = session.metadata || {};

      if (packageId && userId) {
        // Idempotency — stripeSessionId is unique in DB
        const existing = await prisma.packagePurchase.findUnique({
          where: { stripeSessionId: session.id }
        });

        if (!existing) {
          const ridesMap = {
            PACKAGE_2: { rides: 2, name: '2 Rides / Month' },
            PACKAGE_4: { rides: 4, name: '4 Rides / Month' },
            PACKAGE_6: { rides: 6, name: '6 Rides / Month' },
            PACKAGE_8: { rides: 8, name: '8 Rides / Month' }
          };
          const pkg = ridesMap[packageId];

          if (pkg) {
            const expiration = new Date();
            expiration.setDate(expiration.getDate() + 30);

            await prisma.packagePurchase.create({
              data: {
                userId,
                packageId,
                packageName: pkg.name,
                totalRides: pkg.rides,
                remainingRides: pkg.rides,
                expirationDate: expiration,
                paymentStatus: 'PAID',
                stripeSessionId: session.id
              }
            });
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    // Return 500 so Stripe retries the webhook
    console.error('[webhook] Handler error:', err.message);
    next(err);
  }
}

module.exports = { createPaymentIntent, handleWebhook };
