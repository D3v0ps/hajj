"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dispatchVerificationEmail } from "@/lib/email-verification";

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Skickar verifieringsmejl. Kräver inloggad användare — anonyma anrop avvisas
 * (annars skulle exposed RPC-endpoint kunna brukas för e-postbombning).
 * Intern register-/profil-flöde använder `dispatchVerificationEmail` direkt
 * från `lib/email-verification` (icke-action, ingen auth-grind krävs där).
 */
export async function sendVerificationEmail(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  await dispatchVerificationEmail(session.user.id);
}

/**
 * Verifierar e-postadressen — kallas via POST från `/verifiera-epost/[token]`-
 * sidans bekräftelseknapp. Krav på explicit POST förhindrar att Outlook Safe
 * Links / Gmail unfurl / antivirus-prefetch konsumerar engångstoken före
 * användarens egen klickning.
 */
export async function verifyEmailWithToken(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/verifiera-epost/invalid?reason=invalid");

  const row = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!row) redirect(`/verifiera-epost/${token}?status=invalid`);
  if (row.usedAt) redirect(`/verifiera-epost/${token}?status=used`);
  if (row.expiresAt < new Date()) redirect(`/verifiera-epost/${token}?status=expired`);

  // Compare-and-swap: bara om token fortfarande är oanvänd och inte utgången.
  const claimed = await prisma.emailVerificationToken.updateMany({
    where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) redirect(`/verifiera-epost/${token}?status=used`);

  await prisma.user.update({
    where: { id: row.userId },
    data: { emailVerified: new Date() },
  });

  redirect(`/verifiera-epost/${token}?status=ok`);
}
