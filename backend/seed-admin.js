/**
 * TRAQQ Admin Seed Script
 * -----------------------
 * Creates a local development admin user.
 *
 * Usage:
 *   node seed-admin.js
 *
 * Run from: backend/
 *
 * ⚠  THESE CREDENTIALS ARE FOR LOCAL DEVELOPMENT ONLY.
 *    Change them before any production deployment.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'admin@traqq.local';
const ADMIN_PHONE    = process.env.ADMIN_PHONE || '0000000001';
const ADMIN_NAME     = process.env.ADMIN_NAME  || 'TRAQQ Admin';
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(12).toString('hex');

const prisma = new PrismaClient();

async function seed() {
  console.log('TRAQQ Admin Seed\n');

  // Check if admin@traqq.local already exists
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin already exists:\n  Email: ${ADMIN_EMAIL}\n  Role:  ${existing.role}`);
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { email: ADMIN_EMAIL }, data: { role: 'ADMIN' } });
      console.log('  Role updated to ADMIN.');
    }
    return;
  }

  // Hash password with bcrypt (cost factor 10)
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Create admin user
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
  console.log('\nLocal dev credentials:');
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('\n⚠  Change these credentials before production deployment.\n');
}

seed()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('Seed error:', e.message);
    prisma.$disconnect();
    process.exit(1);
  });
