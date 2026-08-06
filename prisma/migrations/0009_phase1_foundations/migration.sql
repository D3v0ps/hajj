-- Fas 1-foundations: lösenordsreset, e-postverifiering, omdömen, audit-logg,
-- villkorsacceptans, avbokning. Allt i en migration så schema-additionerna
-- är atomära (för att stötta de parallella feature-spåren ovanpå).

-- ============ PASSWORD RESET ============
CREATE TABLE "PasswordResetToken" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ EMAIL VERIFICATION ============
CREATE TABLE "EmailVerificationToken" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "token"     TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ REVIEW (omdöme efter resa) ============
CREATE TABLE "Review" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "rating"    INTEGER NOT NULL,
  "body"      TEXT,
  "isPublic"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);
CREATE UNIQUE INDEX "Review_bookingId_userId_key" ON "Review"("bookingId", "userId");
CREATE INDEX "Review_userId_idx" ON "Review"("userId");
CREATE INDEX "Review_isPublic_idx" ON "Review"("isPublic");
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ AUDIT LOG ============
CREATE TABLE "AuditLog" (
  "id"         TEXT NOT NULL,
  "actorId"    TEXT,
  "actorEmail" TEXT,
  "action"     TEXT NOT NULL,
  "targetType" TEXT,
  "targetId"   TEXT,
  "metadata"   JSONB,
  "ipAddress"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============ BOOKING: villkor + avbokning ============
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED');

ALTER TABLE "Booking" ADD COLUMN "termsAcceptedAt"   TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "termsVersion"      TEXT;
ALTER TABLE "Booking" ADD COLUMN "refundRequestedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "refundReason"      TEXT;
ALTER TABLE "Booking" ADD COLUMN "refundStatus"      "RefundStatus" NOT NULL DEFAULT 'NONE';

CREATE INDEX "Booking_refundStatus_idx" ON "Booking"("refundStatus");

-- ============ EMAIL SEND: SENDING-status + providerRef + kind ============
ALTER TYPE "EmailSendStatus" ADD VALUE IF NOT EXISTS 'SENDING' BEFORE 'SENT';
ALTER TABLE "EmailSend" ADD COLUMN "providerRef" TEXT;
ALTER TABLE "EmailSend" ADD COLUMN "kind" TEXT;
CREATE INDEX "EmailSend_kind_idx" ON "EmailSend"("kind");

-- ============ MESSAGE: ip för audit + readAt-index ============
CREATE INDEX "Message_readAt_idx" ON "Message"("readAt");
