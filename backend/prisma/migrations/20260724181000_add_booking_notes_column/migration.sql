-- Migration: add missing notes column to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "notes" TEXT;
