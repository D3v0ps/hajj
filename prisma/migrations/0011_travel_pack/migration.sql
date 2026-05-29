-- Digital resväska / travel pack: strukturerad info som kunden ser i portalen
-- (flyg, hotell, transfer, dagsprogram, kontakter, samlingstid).
-- Fälten ligger på Package så samma data delas av hela gruppen, plus möjlighet
-- att ange bokningsspecifik info på Booking (flygnummer per resenär etc).

-- Strukturerade Json-fält så kontoret kan fylla i fritt utan migration per ändring.
ALTER TABLE "Package" ADD COLUMN "flightOutbound"  JSONB;
ALTER TABLE "Package" ADD COLUMN "flightReturn"    JSONB;
ALTER TABLE "Package" ADD COLUMN "hotels"          JSONB;
ALTER TABLE "Package" ADD COLUMN "transfers"       JSONB;
ALTER TABLE "Package" ADD COLUMN "itinerary"       JSONB;
ALTER TABLE "Package" ADD COLUMN "leaderName"      TEXT;
ALTER TABLE "Package" ADD COLUMN "leaderPhone"     TEXT;
ALTER TABLE "Package" ADD COLUMN "emergencyContact" TEXT;
ALTER TABLE "Package" ADD COLUMN "gatheringPoint"  TEXT;
ALTER TABLE "Package" ADD COLUMN "gatheringTime"   TEXT;
ALTER TABLE "Package" ADD COLUMN "whatsappLink"    TEXT;
