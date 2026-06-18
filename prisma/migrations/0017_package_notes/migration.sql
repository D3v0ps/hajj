-- Övrigt-fält (fritext) för en resa. Visas på paketsidan när det är ifyllt,
-- döljs helt när det är tomt.
ALTER TABLE "Package" ADD COLUMN "notes" TEXT;
