/**
 * TRAQQ — Test User Cleanup Script
 * ----------------------------------
 * Deletes all non-admin test users from the local development database.
 *
 * SAFE GUARDS:
 *   - admin@traqq.local is NEVER deleted
 *   - Schema and migrations are never touched
 *   - Guest bookings (userId = null) are preserved
 *   - CONFIRMED/PAID bookings are preserved unless --bookings flag is passed
 *
 * Usage (from backend/):
 *   npm run cleanup:test-users          — delete test users only
 *   npm run cleanup:test-users -- --bookings  — also delete PENDING/UNPAID/FAILED bookings
 *
 * ⚠  LOCAL DEVELOPMENT ONLY.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const PROTECTED_EMAIL = 'admin@traqq.local';
const DELETE_BOOKINGS  = process.argv.includes('--bookings');

const prisma = new PrismaClient();

async function main() {
  console.log('TRAQQ Test User Cleanup\n');
  console.log(`Protected admin: ${PROTECTED_EMAIL}`);
  console.log(`Delete bookings: ${DELETE_BOOKINGS ? 'YES (PENDING/UNPAID/FAILED only)' : 'NO (preserved)'}\n`);

  // --- 1. Show current state ---
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true }
  });
  console.log(`Current users (${allUsers.length} total):`);
  allUsers.forEach(u => console.log(`  [${u.role}] ${u.email || '(no email)'} — ${u.fullName}`));

  // --- 2. Find users to delete ---
  const toDelete = allUsers.filter(u => u.email !== PROTECTED_EMAIL);
  if (!toDelete.length) {
    console.log('\nNo users to delete — only admin@traqq.local exists.');
    // Don't return — still run booking cleanup if --bookings was passed
    if (!DELETE_BOOKINGS) return;
  }
  console.log(`\nUsers to delete (${toDelete.length}):`);
  toDelete.forEach(u => console.log(`  [${u.role}] ${u.email || '(no email)'} — ${u.fullName}`));

  const deleteIds = toDelete.map(u => u.id);

  // --- 3. Handle linked records ---
  // Bookings linked to users being deleted
  const linkedBookings = await prisma.booking.findMany({
    where: { userId: { in: deleteIds } },
    select: { id: true, bookingStatus: true, paymentStatus: true, phoneNumber: true }
  });

  let deletedBookings = 0;
  let deletedTransactions = 0;

  if (linkedBookings.length) {
    console.log(`\nBookings linked to deleted users (${linkedBookings.length}):`);
    linkedBookings.forEach(b =>
      console.log(`  [${b.bookingStatus}/${b.paymentStatus}] phone:${b.phoneNumber} id:${b.id.slice(-8)}`)
    );

    // Delete transactions for these bookings first (FK constraint)
    const txnResult = await prisma.transaction.deleteMany({
      where: { bookingId: { in: linkedBookings.map(b => b.id) } }
    });
    deletedTransactions += txnResult.count;

    // Delete the bookings
    const bkResult = await prisma.booking.deleteMany({
      where: { userId: { in: deleteIds } }
    });
    deletedBookings += bkResult.count;
  }

  // --- 4. Optionally clean up unlinked test bookings ---
  if (DELETE_BOOKINGS) {
    const testBookingStatuses = ['PENDING', 'FAILED'];
    const testPayStatuses = ['UNPAID', 'FAILED'];

    const guestTestBookings = await prisma.booking.findMany({
      where: {
        userId: null,
        bookingStatus: { in: testBookingStatuses },
        paymentStatus: { in: testPayStatuses }
      },
      select: { id: true, bookingStatus: true, paymentStatus: true, phoneNumber: true }
    });

    if (guestTestBookings.length) {
      console.log(`\nGuest test bookings to delete (${guestTestBookings.length}):`);
      guestTestBookings.forEach(b =>
        console.log(`  [${b.bookingStatus}/${b.paymentStatus}] phone:${b.phoneNumber} id:${b.id.slice(-8)}`)
      );

      const txnResult2 = await prisma.transaction.deleteMany({
        where: { bookingId: { in: guestTestBookings.map(b => b.id) } }
      });
      deletedTransactions += txnResult2.count;

      const bkResult2 = await prisma.booking.deleteMany({
        where: { id: { in: guestTestBookings.map(b => b.id) } }
      });
      deletedBookings += bkResult2.count;
    } else {
      console.log('\nNo guest test bookings to delete.');
    }

    // Log preserved bookings
    const preserved = await prisma.booking.findMany({
      where: { bookingStatus: 'CONFIRMED', paymentStatus: 'PAID', userId: null },
      select: { id: true, bookingStatus: true, paymentStatus: true, phoneNumber: true }
    });
    if (preserved.length) {
      console.log(`\nPreserved CONFIRMED/PAID bookings (${preserved.length}):`);
      preserved.forEach(b =>
        console.log(`  [${b.bookingStatus}/${b.paymentStatus}] phone:${b.phoneNumber} id:${b.id.slice(-8)}`)
      );
    }
  }

  // --- 5. Delete users ---
  const result = await prisma.user.deleteMany({
    where: { id: { in: deleteIds } }
  });

  // --- 6. Verify admin is preserved ---
  const admin = await prisma.user.findUnique({
    where: { email: PROTECTED_EMAIL },
    select: { id: true, email: true, fullName: true, role: true }
  });

  // --- 7. Summary ---
  console.log('\n=== CLEANUP SUMMARY ===');
  console.log(`  Users deleted:        ${result.count}`);
  console.log(`  Bookings deleted:     ${deletedBookings}`);
  console.log(`  Transactions deleted: ${deletedTransactions}`);
  if (admin) {
    console.log(`  Admin preserved:      ${admin.email} [${admin.role}] ✓`);
  } else {
    console.log('  ⚠ WARNING: admin@traqq.local was NOT found after cleanup!');
  }
  console.log('\nDone. Run "npm run seed:admin" to ensure admin credentials are correct.\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('Cleanup error:', e.message);
    prisma.$disconnect();
    process.exit(1);
  });
