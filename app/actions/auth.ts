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

export async function registerUser(formData: FormData): Promise<never> {
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
  await hashPassword(parsed.data.password);

  if (existing) {
    redirect("/logga-in?registered=1");
  }

  const passwordHash = await hashPassword(parsed.data.password);

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
  const raw = {
    email: String(formData.get("email") ?? "").toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    redirect("/logga-in?error=credentials");
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/min-sida",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      redirect("/logga-in?error=credentials");
    }
    throw e;
  }
  redirect("/min-sida");
}
