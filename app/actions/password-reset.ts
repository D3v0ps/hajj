"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth";
import { queueEmail, EMAIL_KIND } from "@/lib/email";
import { ipKey, rateLimit } from "@/lib/rate-limit";

const requestSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
});

const resetSchema = z
  .object({
    password: z.string().min(8, "Minst 8 tecken"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Lösenorden matchar inte",
    path: ["confirm"],
  });

// 1 timme: standardlivslängd för återställningslänk.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Begär lösenordsåterställning. Skickar mejl med engångslänk om kontot
 * finns. För att förhindra e-postenumerering svarar vi alltid med samma
 * "skickat"-tillstånd oavsett om kontot fanns — `?sent=1`-flagga.
 */
export async function requestReset(formData: FormData): Promise<never> {
  // Rate-limit: 3 begäranden/min/IP — skyddar mot enumeration-fishing och spam.
  const key = await ipKey("pwreset");
  const rl = rateLimit(key, 3, 60_000);
  if (!rl.ok) {
    redirect("/glomt-losen?error=" + encodeURIComponent("För många försök. Försök igen om en stund."));
  }

  const raw = {
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
  };

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? "Ogiltig e-postadress");
    redirect(`/glomt-losen?error=${msg}`);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Om användaren finns: skapa token + köa mejl. Annars: gör inget men låtsas.
  // ALDRIG läcka existens via olika flöden/timing/redirect.
  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const resetUrl = `${env.APP_URL}/aterstall-losen/${token}`;
    const body = [
      `Hej${user.name ? " " + user.name : ""},`,
      "",
      "Du (eller någon annan) har begärt att återställa lösenordet för ditt konto hos Hadj Omra Resor. Klicka på länken nedan för att välja ett nytt lösenord:",
      "",
      resetUrl,
      "",
      "Länken är giltig i 1 timme och kan endast användas en gång. Om det inte var du som begärde detta kan du bortse från mejlet — ditt lösenord ändras inte.",
      "",
      "Vänliga hälsningar,",
      "Hadj Omra Resor",
    ].join("\n");

    await queueEmail({
      to: user.email,
      recipientName: user.name,
      subject: "Återställ ditt lösenord — Hadj Omra Resor",
      body,
      kind: EMAIL_KIND.PASSWORD_RESET,
    });
  }

  redirect("/glomt-losen?sent=1");
}

/**
 * Sätter ett nytt lösenord givet en giltig token. Token konsumeras (usedAt
 * sätts) så samma länk inte kan användas två gånger. Vid fel → redirect
 * tillbaka till samma sida med felmeddelande.
 */
export async function resetPassword(token: string, formData: FormData): Promise<never> {
  const raw = {
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  };

  const parsed = resetSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? "Ogiltigt lösenord");
    redirect(`/aterstall-losen/${encodeURIComponent(token)}?error=${msg}`);
  }

  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    redirect("/glomt-losen?error=" + encodeURIComponent("Länken är ogiltig eller har gått ut. Begär en ny."));
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // Transaction: uppdatera lösenord OCH markera token som använd atomiskt.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/logga-in?reset=1");
}
