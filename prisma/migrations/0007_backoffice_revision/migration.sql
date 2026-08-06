-- Package: multiple departure cities + nights split
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "departCities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "nightsMakkah" INTEGER;
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "nightsMadinah" INTEGER;

-- Backfill departCities from single departCity where present
UPDATE "Package" SET "departCities" = ARRAY["departCity"] WHERE "departCity" IS NOT NULL AND ("departCities" IS NULL OR cardinality("departCities") = 0);

-- Booking: split traveler counts by age category
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "adultCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "childCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "infantCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "tierQuantities" JSONB;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "departureCity" TEXT;

-- Traveler: extra identity & passport fields per backoffice spec
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "passIssueDate" TIMESTAMP(3);
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "passIssuePlace" TEXT;
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "occupation" TEXT;
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "birthCountry" TEXT;
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "ageCategory" "AgeCategory" NOT NULL DEFAULT 'ADULT';
