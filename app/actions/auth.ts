"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { rateLimit, ipKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const registerSchema = z
  .object({
    name: z.string().min(2, "Ange ditt namn").max(120),
    email: z.string().email("Ogiltig e-postadress"),
    password: z.string().min(6, "Minst 6 tecken"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Lösenorden matchar inte", path: ["confirm"] });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerUser(formData: FormData): Promise<never> {
  // Rate-limit: 5 nya konton per IP per 10 min — bromsar massregistrering.
  const rl = rateLimit(await ipKey("register"), 5, 10 * 60_000);
  if (!rl.ok) {
    redirect(`/skapa-konto?error=${encodeURIComponent("För många försök — vänta en stund och försök igen.")}`);
  }

  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message ?? "Ogiltigt formulär");
    redirect(`/skapa-konto?error=${msg}`);
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Email enumeration-skydd: hasha alltid (jämn timing), men avslöja inte om
  // kontot fanns — visa samma "registrerad"-flöde oavsett.
  const passwordHash = await hashPassword(parsed.data.password);

  if (existing) {
    redirect("/logga-in?registered=1");
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/min-sida",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      redirect("/logga-in?registered=1");
    }
    throw e;
  }
  redirect("/min-sida");
}

export async function loginUser(formData: FormData): Promise<never> {
  // Rate-limit: 10 inloggningsförsök per IP per 5 min (skydd mot credential stuffing
  // + scrypt-CPU-DoS). Kombineras med per-email-räknare nedan.
  const ipLimit = rateLimit(await ipKey("login"), 10, 5 * 60_000);
  if (!ipLimit.ok) {
    redirect(`/logga-in?error=${encodeURIComponent("För många inloggningsförsök — vänta en stund.")}`);
  }

  const raw = {
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    redirect("/logga-in?error=credentials");
  }

  // Per-email-räknare: 5 misslyckade försök per 15 min per emailaddress.
  const emailLimit = rateLimit(`login:email:${parsed.data.email}`, 5, 15 * 60_000);
  if (!emailLimit.ok) {
    await logAudit({ actorEmail: parsed.data.email, action: "auth.loginThrottled" });
    redirect(`/logga-in?error=${encodeURIComponent("Kontot är tillfälligt låst pga för många försök.")}`);
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/min-sida",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      await logAudit({ actorEmail: parsed.data.email, action: "auth.loginFailed" });
      redirect("/logga-in?error=credentials");
    }
    throw e;
  }
  redirect("/min-sida");
}
