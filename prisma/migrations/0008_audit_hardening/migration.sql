-- Skydda finansiell historik: Booking.user FK Cascade -> Restrict
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_userId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index för vanliga filtreringar (prestanda vid växande data)
CREATE INDEX IF NOT EXISTS "Traveler_ageCategory_idx" ON "Traveler"("ageCategory");
CREATE INDEX IF NOT EXISTS "Package_status_type_startDate_idx" ON "Package"("status", "type", "startDate");
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");

-- Stripe-idempotens: providerRef unik (Postgres tillåter flera NULL, så manuella
-- betalningar utan providerRef påverkas inte; Stripe-sessioner blir unika).
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerRef_key" ON "Payment"("providerRef");
