-- Migration: add vanCount to Booking, make licenseNumber optional on Driver, add BookingEditLog
-- Run on production PostgreSQL: psql $DATABASE_URL -f this_file.sql
-- OR: npx prisma migrate deploy (after pushing schema to VPS)

-- 1. Add vanCount to bookings (default 1 for all existing rows)
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "vanCount" INTEGER NOT NULL DEFAULT 1;

-- 2. Make licenseNumber nullable on driver_profiles
ALTER TABLE "driver_profiles" ALTER COLUMN "licenseNumber" DROP NOT NULL;

-- 3. Create booking_edit_logs table
CREATE TABLE IF NOT EXISTS "booking_edit_logs" (
  "id"        TEXT        NOT NULL,
  "bookingId" TEXT        NOT NULL,
  "changedBy" TEXT        NOT NULL,
  "adminId"   TEXT,
  "changes"   TEXT        NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "booking_edit_logs_pkey" PRIMARY KEY ("id")
);

-- 4. Foreign key from booking_edit_logs to bookings (cascade delete)
ALTER TABLE "booking_edit_logs"
  ADD CONSTRAINT "booking_edit_logs_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Index on bookingId for fast lookup
CREATE INDEX IF NOT EXISTS "booking_edit_logs_bookingId_idx" ON "booking_edit_logs"("bookingId");
