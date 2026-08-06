import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { queueEmail, EMAIL_KIND } from "@/lib/email";

/**
 * Intern util — INTE en server action. Kallas från andra server actions som
 * register, profile.requestEmailChange. Att inte vara `"use server"` förhindrar
 * att funktionen exponeras som anonym RPC-endpoint (klassisk e-postbomb-vektor).
 */

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function dispatchVerificationEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.emailVerified) return;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const verifyUrl = `${env.APP_URL}/verifiera-epost/${token}`;
  const body = [
    `Hej${user.name ? " " + user.name : ""},`,
    "",
    "Välkommen till Hadj Omra Resor! Bekräfta din e-postadress genom att besöka länken nedan och klicka på 'Bekräfta':",
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
