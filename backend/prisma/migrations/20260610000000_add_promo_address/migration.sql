-- AlterTable: add address + promo fields to bookings
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "pickupLatitude"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pickupLongitude"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pickupPlaceId"     TEXT,
  ADD COLUMN IF NOT EXISTS "destinationAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationLatitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "destinationLongitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "destinationPlaceId" TEXT,
  ADD COLUMN IF NOT EXISTS "promoCode"         TEXT,
  ADD COLUMN IF NOT EXISTS "discountAmount"    DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateTable: promo_codes
CREATE TABLE IF NOT EXISTS "promo_codes" (
    "id"            TEXT NOT NULL,
    "code"          TEXT NOT NULL,
    "discountPct"   INTEGER NOT NULL,
    "description"   TEXT NOT NULL,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "firstRideOnly" BOOLEAN NOT NULL DEFAULT true,
    "maxUses"       INTEGER,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique code
CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_key" ON "promo_codes"("code");

-- CreateTable: promo_code_uses
CREATE TABLE IF NOT EXISTS "promo_code_uses" (
    "id"             TEXT NOT NULL,
    "promoCodeId"    TEXT NOT NULL,
    "userId"         TEXT,
    "phoneNumber"    TEXT,
    "bookingId"      TEXT NOT NULL,
    "discountAmount" DECIMAL(65,30) NOT NULL,
    "usedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_code_uses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: one use per booking
CREATE UNIQUE INDEX IF NOT EXISTS "promo_code_uses_bookingId_key" ON "promo_code_uses"("bookingId");

-- AddForeignKey: promo_code_uses → promo_codes
ALTER TABLE "promo_code_uses"
  ADD CONSTRAINT "promo_code_uses_promoCodeId_fkey"
  FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: promo_code_uses → users (nullable)
ALTER TABLE "promo_code_uses"
  ADD CONSTRAINT "promo_code_uses_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: promo_code_uses → bookings
ALTER TABLE "promo_code_uses"
  ADD CONSTRAINT "promo_code_uses_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
