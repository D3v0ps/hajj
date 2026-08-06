-- Anmälnings-/administrationsavgift per paket (kr/person). NULL = standard:
-- 2500 kr för HAJJ, 5000 kr för övriga (avgörs i appkoden vid bokningsskapande).
ALTER TABLE "Package" ADD COLUMN "depositPerPerson" INTEGER;
