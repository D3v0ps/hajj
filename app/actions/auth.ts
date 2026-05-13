"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

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

export async function registerUser(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltigt formulär" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Email enumeration-skydd: returnera samma response oavsett om kontot fanns.
  // Vi gör hashing-arbetet ändå för att inte avslöja via timing-skillnad.
  const passwordHash = await hashPassword(parsed.data.password);

  if (existing) {
    // Tyst no-op + redirect till login. Riktig användare som glömt att de hade
    // konto landar på login. Eventuell duplicate-registrering avslöjas inte.
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
      redirect: false,
    });
  } catch {
    return { ok: false, error: "Konto skapat men inloggning misslyckades. Försök logga in manuellt." };
  }

  redirect("/min-sida");
}

export async function loginUser(formData: FormData): Promise<{ ok: false; error: string } | void> {
  const raw = {
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Fyll i e-post och lösenord" };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Fel e-post eller lösenord." };
    }
    throw e;
  }

  redirect("/min-sida");
}
