const { z } = require('zod');
const prisma = require('../config/prisma');

// ── Admin schemas ─────────────────────────────────────────────────────────────

const createPromoSchema = z.object({
  code:          z.string().min(2).max(30).transform(s => s.toUpperCase().trim().replace(/\s+/g, '')),
  discountPct:   z.number().int().min(1).max(100),
  description:   z.string().max(200).default(''),
  firstRideOnly: z.boolean().default(true),
  maxUses:       z.number().int().min(1).nullable().default(null),
  isActive:      z.boolean().default(true)
});

const updatePromoSchema = z.object({
  isActive:      z.boolean().optional(),
  discountPct:   z.number().int().min(1).max(100).optional(),
  description:   z.string().max(200).optional(),
  maxUses:       z.number().int().min(1).nullable().optional(),
  firstRideOnly: z.boolean().optional()
});

const applySchema = z.object({
  code:      z.string().min(1).transform(s => s.toUpperCase().trim()),
  bookingId: z.string().min(1)
});

async function hasHadPaidRide(booking) {
  const where = {};
  if (booking.userId) {
    where.userId = booking.userId;
    where.paymentStatus = 'PAID';
    where.id = { not: booking.id };
    const count = await prisma.booking.count({ where });
    if (count > 0) return true;
  }
  // Also check by phone number for guest bookings
  const phoneCount = await prisma.booking.count({
    where: {
      phoneNumber: booking.phoneNumber,
      paymentStatus: 'PAID',
      id: { not: booking.id }
    }
  });
  return phoneCount > 0;
}

async function applyPromo(req, res, next) {
  try {
    const { code, bookingId } = applySchema.parse(req.body);

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (booking.paymentStatus === 'PAID') {
      return res.status(400).json({ error: 'This booking has already been paid.' });
    }

    const promoCode = await prisma.promoCode.findUnique({ where: { code } });
    if (!promoCode || !promoCode.isActive) {
      return res.status(400).json({ error: 'Invalid or expired promo code.' });
    }

    // Check max uses
    if (promoCode.maxUses !== null) {
      const useCount = await prisma.promoCodeUse.count({
        where: { promoCodeId: promoCode.id }
      });
      if (useCount >= promoCode.maxUses) {
        return res.status(400).json({ error: 'This promo code has reached its usage limit.' });
      }
    }

    // Check if already applied to this booking
    const alreadyApplied = await prisma.promoCodeUse.findUnique({ where: { bookingId } });
    if (alreadyApplied) {
      // Already applied — just return current state
      const discountAmount = Number(booking.discountAmount);
      const finalPrice = Number(booking.price);
      return res.json({
        success: true,
        finalPrice,
        promo: {
          code: booking.promoCode,
          discountPct: promoCode.discountPct,
          discountAmount
        }
      });
    }

    // First-ride validation
    if (promoCode.firstRideOnly) {
      const hadPriorRide = await hasHadPaidRide(booking);
      if (hadPriorRide) {
        return res.status(400).json({
          error: 'This promo code is only valid on your first ride. You already have a completed ride on file.'
        });
      }
    }

    // Check if user already used this promo code (on a different booking)
    if (booking.userId) {
      const userPriorUse = await prisma.promoCodeUse.findFirst({
        where: {
          promoCodeId: promoCode.id,
          userId: booking.userId
        }
      });
      if (userPriorUse) {
        return res.status(400).json({ error: 'You have already used this promo code.' });
      }
    } else {
      // Guest check by phone number
      const phonePriorUse = await prisma.promoCodeUse.findFirst({
        where: {
          promoCodeId: promoCode.id,
          phoneNumber: booking.phoneNumber
        }
      });
      if (phonePriorUse) {
        return res.status(400).json({ error: 'This promo code has already been used for this phone number.' });
      }
    }

    // Calculate discount from the booking's current price (not hardcoded)
    const originalPrice = Number(booking.price);
    const discountAmount = Number((originalPrice * promoCode.discountPct / 100).toFixed(2));
    const finalPrice = Number((originalPrice - discountAmount).toFixed(2));

    // Apply discount to booking + record use atomically
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          price: finalPrice,
          promoCode: code,
          discountAmount
        }
      });

      await tx.promoCodeUse.create({
        data: {
          promoCodeId: promoCode.id,
          userId: booking.userId || null,
          phoneNumber: booking.phoneNumber,
          bookingId,
          discountAmount
        }
      });
    });

    res.json({
      success: true,
      finalPrice,
      promo: {
        code,
        discountPct: promoCode.discountPct,
        discountAmount
      }
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request. Provide code and bookingId.' });
    }
    next(err);
  }
}

async function getPromoUsage(req, res, next) {
  try {
    const uses = await prisma.promoCodeUse.findMany({
      include: {
        promoCode: { select: { code: true, discountPct: true } },
        booking: {
          select: {
            bookingRef: true,
            pickupDate: true,
            phoneNumber: true,
            email: true,
            paymentStatus: true
          }
        },
        user: { select: { fullName: true, email: true } }
      },
      orderBy: { usedAt: 'desc' }
    });

    const summary = await prisma.promoCode.findMany({
      include: {
        _count: { select: { uses: true } }
      }
    });

    res.json({ uses, summary });
  } catch (err) {
    next(err);
  }
}

// ── Admin: list all promo codes ───────────────────────────────────────────────

async function getAllPromoCodes(req, res, next) {
  try {
    const codes = await prisma.promoCode.findMany({
      include: { _count: { select: { uses: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ codes });
  } catch (err) {
    next(err);
  }
}

// ── Admin: create a promo code ────────────────────────────────────────────────

async function createPromoCode(req, res, next) {
  try {
    const data = createPromoSchema.parse(req.body);
    const existing = await prisma.promoCode.findUnique({ where: { code: data.code } });
    if (existing) {
      return res.status(409).json({ error: `Promo code "${data.code}" already exists.` });
    }
    const promo = await prisma.promoCode.create({
      data,
      include: { _count: { select: { uses: true } } }
    });
    res.status(201).json({ success: true, promo });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid promo code data.' });
    }
    next(err);
  }
}

// ── Admin: update a promo code ────────────────────────────────────────────────

async function updatePromoCode(req, res, next) {
  try {
    const { id } = req.params;
    const data = updatePromoSchema.parse(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    const existing = await prisma.promoCode.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Promo code not found.' });
    const promo = await prisma.promoCode.update({
      where: { id },
      data,
      include: { _count: { select: { uses: true } } }
    });
    res.json({ success: true, promo });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid update data.' });
    }
    next(err);
  }
}

module.exports = { applyPromo, getPromoUsage, getAllPromoCodes, createPromoCode, updatePromoCode };
