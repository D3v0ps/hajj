"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { queueEmail, EMAIL_KIND } from "@/lib/email";

// 24 timmar: gott om tid för användaren att hitta mejlet utan att lämna länken
// öppen för evigt.
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Genererar verifieringstoken och köar bekräftelsemejl. Tysta vid okänd userId
 * eller redan verifierad e-post — kallas typiskt efter user.create och får inte
 * krascha registreringsflödet om något går snett med mejlet.
 */
export async function sendVerificationEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.emailVerified) return;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  const verifyUrl = `${env.APP_URL}/verifiera-epost/${token}`;
  const body = [
    `Hej${user.name ? " " + user.name : ""},`,
    "",
    "Välkommen till Hadj Omra Resor! Bekräfta din e-postadress genom att klicka på länken nedan:",
    "",
    verifyUrl,
    "",
    "Länken är giltig i 24 timmar. Om du inte skapade ett konto hos oss kan du bortse från mejlet.",
    "",
    "Vänliga hälsningar,",
    "Hadj Omra Resor",
  ].join("\n");

  await queueEmail({
    to: user.email,
    recipientName: user.name,
    subject: "Bekräfta din e-postadress — Hadj Omra Resor",
    body,
    kind: EMAIL_KIND.EMAIL_VERIFICATION,
  });
}

/**
 * Verifierar e-postadress via engångstoken. Markerar User.emailVerified och
 * konsumerar token (usedAt). Returnerar resultatobjekt så anroparen kan visa
 * rätt UI — kastar inga undantag för vanliga felfall.
 */
export async function verifyEmail(token: string): Promise<VerifyResult> {
  const row = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
