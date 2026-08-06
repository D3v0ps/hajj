-- Återanvändbara resenärsprofiler: persistent identitet per kund som kan
-- användas för att snabbt fylla i Traveler-rader vid nya bokningar.
-- En profil är ägd av en User (kunden) och kan kopplas till valfri Traveler-rad.

CREATE TABLE "TravelerProfile" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "firstName"       TEXT NOT NULL,
  "lastName"        TEXT NOT NULL,
  "email"           TEXT,
  "phone"           TEXT,
  "address"         TEXT,
  "personnummer"    TEXT,
  "passportNo"      TEXT,
  "passportExp"     TIMESTAMP(3),
  "passIssueDate"   TIMESTAMP(3),
  "passIssuePlace"  TEXT,
  "birthDate"       TIMESTAMP(3),
  "gender"          TEXT,
  "nationality"     TEXT,
  "civilStatus"     TEXT,
  "occupation"      TEXT,
  "birthCountry"    TEXT,
  "birthCity"       TEXT,
  "ageCategory"     "AgeCategory" NOT NULL DEFAULT 'ADULT',
  "relationship"    TEXT,
  "isSelf"          BOOLEAN NOT NULL DEFAULT false,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TravelerProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TravelerProfile_userId_idx" ON "TravelerProfile"("userId");
CREATE INDEX "TravelerProfile_userId_isSelf_idx" ON "TravelerProfile"("userId", "isSelf");
ALTER TABLE "TravelerProfile" ADD CONSTRAINT "TravelerProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Koppla Traveler-instanser (per-bokning) till deras källprofil — gör det möjligt
-- att t.ex. visa "Vald från profil: Karim Khalil" + uppdatera profilen om bokningen ändras.
ALTER TABLE "Traveler" ADD COLUMN "profileId" TEXT;
ALTER TABLE "Traveler" ADD CONSTRAINT "Traveler_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "TravelerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Traveler_profileId_idx" ON "Traveler"("profileId");
