-- Betalnings-historik per resenär. Varje rad = en konkret betalning så vi kan
-- spåra delbetalningar (t.ex. 5000 kontant + 3000 swish + 2000 kontant) istället
-- för bara senaste värdet.
--
-- Traveler.amountPaid behålls som denormaliserad cache (= SUM av rader). Billigt
-- vid lista-/summa-vyer + matchar befintlig kod. Cachen uppdateras transaktionellt
-- vid add/delete i server-actions.

CREATE TABLE "TravelerPayment" (
  "id"           TEXT NOT NULL,
  "travelerId"   TEXT NOT NULL,
  "amount"       INTEGER NOT NULL,
  "method"       TEXT,
  "paidAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note"         TEXT,
  "recordedById" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TravelerPayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TravelerPayment_travelerId_idx" ON "TravelerPayment"("travelerId");
CREATE INDEX "TravelerPayment_paidAt_idx" ON "TravelerPayment"("paidAt");
ALTER TABLE "TravelerPayment" ADD CONSTRAINT "TravelerPayment_travelerId_fkey"
  FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelerPayment" ADD CONSTRAINT "TravelerPayment_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: för varje resenär med amountPaid > 0, skapa en initial historik-rad
-- som representerar det befintliga saldot. gen_random_uuid() är inbyggt i
-- Postgres 13+ (ingen extension krävs).
INSERT INTO "TravelerPayment" ("id", "travelerId", "amount", "method", "paidAt", "note", "createdAt")
SELECT
  REPLACE(gen_random_uuid()::text, '-', ''),
  "id",
  "amountPaid",
  "paymentMethod",
  COALESCE("paymentDate", "createdAt"),
  COALESCE("paymentNote", 'Ingående saldo (importerat)'),
  "createdAt"
FROM "Traveler"
WHERE "amountPaid" > 0;

-- Per-betalnings-fälten flyttar nu till TravelerPayment. Drop:as på Traveler så
-- formuläret inte längre redigerar dem direkt (admin lägger betalningar som rader).
ALTER TABLE "Traveler" DROP COLUMN IF EXISTS "paymentMethod";
ALTER TABLE "Traveler" DROP COLUMN IF EXISTS "paymentDate";
ALTER TABLE "Traveler" DROP COLUMN IF EXISTS "paymentNote";
