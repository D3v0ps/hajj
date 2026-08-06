-- Per-resenär betalningsspårning: amount + method + datum. Kontoret kan
-- registrera kontantbetalningar, swish, faktura osv. direkt på resenären
-- istället för att gå genom Stripe-flödet. Summan över alla resenärer på
-- en bokning = totalt betalt för bokningen.

ALTER TABLE "Traveler" ADD COLUMN "amountPaid" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Traveler" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "Traveler" ADD COLUMN "paymentDate" TIMESTAMP(3);

-- Backfill: gamla paymentNote-värden som ser ut som siffror (Excel-import
-- mappade BETALT-kolumnen som fritext) kopieras till strukturerat fält.
-- Trim:ar mellanslag, accepterar valfritt tusentalsavgränsare (' '/',') och
-- decimaler (',' eller '.'); kastar resten oförändrat så fritext bevaras.
UPDATE "Traveler"
SET "amountPaid" = CAST(
  REGEXP_REPLACE(
    REGEXP_REPLACE("paymentNote", '[\s,]', '', 'g'),
    '\.[0-9]+$', ''
  ) AS INTEGER
)
WHERE "paymentNote" IS NOT NULL
  AND TRIM("paymentNote") ~ '^[0-9][0-9\s,]*(\.[0-9]+)?$';

-- Rensa paymentNote när den blivit konverterad — annars dubbel-info i UI.
UPDATE "Traveler"
SET "paymentNote" = NULL
WHERE "amountPaid" > 0
  AND "paymentNote" IS NOT NULL
  AND TRIM("paymentNote") ~ '^[0-9][0-9\s,]*(\.[0-9]+)?$';

CREATE INDEX "Traveler_amountPaid_idx" ON "Traveler"("amountPaid");
