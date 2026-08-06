-- AlterTable: add contact fields to Traveler
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Traveler" ADD COLUMN IF NOT EXISTS "phone" TEXT;
