/**
 * TRAQQ Admin Seed Script
 * -----------------------
 * Upserts the local development admin user.
 * Safe to re-run: always ensures correct role and password hash.
 *
 * Usage (from backend/):
 *   npm run seed:admin
 *
 * ⚠  LOCAL DEVELOPMENT ONLY. Change credentials before production.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@traqq.local';
const ADMIN_PHONE    = process.env.ADMIN_PHONE    || '0000000000';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'TRAQQ Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

const prisma = new PrismaClient();

async function seed() {
  console.log('TRAQQ Admin Seed\n');

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    // Always reset password hash and role — never rely on a stale hash
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        fullName:    ADMIN_NAME,
        phoneNumber: ADMIN_PHONE,
        password:    hash,
        role:        'ADMIN'
      }
    });
    console.log('Admin user updated:');
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Role:     ADMIN`);
    console.log(`  Password: [fresh bcrypt hash — plain text never stored]`);
  } else {
    const admin = await prisma.user.create({
      data: {
        fullName:    ADMIN_NAME,
        email:       ADMIN_EMAIL,
        phoneNumber: ADMIN_PHONE,
        password:    hash,
        role:        'ADMIN'
      },
      select: { id: true, fullName: true, email: true, phoneNumber: true, role: true }
    });
    console.log('Admin user created:');
    console.log(`  ID:       ${admin.id}`);
    console.log(`  Name:     ${admin.fullName}`);
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Phone:    ${admin.phoneNumber}`);
    console.log(`  Role:     ${admin.role}`);
    console.log(`  Password: [bcrypt hash — plain text never stored]`);
  }

  console.log('\nLocal dev credentials:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('\n⚠  Change these credentials before production deployment.\n');
}

async function seedPromos() {
  const promoCodes = [
    {
      code: 'INFLUENCER15',
      discountPct: 15,
      description: '15% off your first ride — influencer partner code',
      isActive: true,
      firstRideOnly: true,
      maxUses: null
    }
  ];

  for (const promo of promoCodes) {
    const existing = await prisma.promoCode.findUnique({ where: { code: promo.code } });
    if (!existing) {
      await prisma.promoCode.create({ data: promo });
      console.log(`Promo code created: ${promo.code} (${promo.discountPct}% off first ride)`);
    } else {
      await prisma.promoCode.update({
        where: { code: promo.code },
        data: { discountPct: promo.discountPct, description: promo.description, isActive: promo.isActive }
      });
      console.log(`Promo code updated: ${promo.code}`);
    }
  }
}

seed()
  .then(() => seedPromos())
  .then(() => {
    console.log('\nSeed complete.');
    return prisma.$disconnect();
  })
  .catch(e => {
    console.error('Seed error:', e.message);
    prisma.$disconnect();
    process.exit(1);
  });
