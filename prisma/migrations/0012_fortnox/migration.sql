-- Fortnox-integration: en singleton-rad per Fortnox-koppling. Vi lagrar
-- access + refresh-token + utgångstid + Fortnox-organisation, så token kan
-- förnyas automatiskt. Bara en koppling i taget (den senaste vinner).

CREATE TABLE "FortnoxConnection" (
  "id"            TEXT NOT NULL,
  "accessToken"   TEXT NOT NULL,
  "refreshToken"  TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "orgName"       TEXT,
  "orgNumber"     TEXT,
  "scope"         TEXT,
  "connectedById" TEXT,
  "connectedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FortnoxConnection_pkey" PRIMARY KEY ("id")
);

-- Per-betalning: spårar vilken Payment som pushats som verifikat till Fortnox
-- (och vilket verifikatnummer Fortnox tilldelade) så vi aldrig dubbel-bokar.
ALTER TABLE "Payment" ADD COLUMN "fortnoxVoucherSeries" TEXT;
ALTER TABLE "Payment" ADD COLUMN "fortnoxVoucherNumber" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "fortnoxPushedAt"     TIMESTAMP(3);

CREATE INDEX "Payment_fortnoxPushedAt_idx" ON "Payment"("fortnoxPushedAt");
