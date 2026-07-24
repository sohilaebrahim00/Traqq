-- AlterTable: add bookingType and make dropoffTerminal nullable on bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "bookingType" TEXT NOT NULL DEFAULT 'AIRPORT';
ALTER TABLE "bookings" ALTER COLUMN "dropoffTerminal" DROP NOT NULL;
