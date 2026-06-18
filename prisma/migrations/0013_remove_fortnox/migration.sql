-- Ta bort Fortnox-integrationen helt — kunden valt bort koppling till bokföringssystem.
-- Säkert att dropa (CASCADE) eftersom inga aktiva referenser/queries finns längre
-- i koden, och Payment.fortnox*-kolumnerna är nullables utan FK.

ALTER TABLE "Payment" DROP COLUMN IF EXISTS "fortnoxVoucherSeries";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "fortnoxVoucherNumber";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "fortnoxPushedAt";
DROP INDEX IF EXISTS "Payment_fortnoxPushedAt_idx";

DROP TABLE IF EXISTS "FortnoxConnection";
