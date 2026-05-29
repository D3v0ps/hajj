"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { queueEmail, EMAIL_KIND } from "@/lib/email";
import { env } from "@/lib/env";

const PROFILE_PATH = "/min-sida/profil";

function flash(kind: "ok" | "error", code: string): never {
  redirect(`${PROFILE_PATH}?${kind}=${encodeURIComponent(code)}`);
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "name_too_short").max(120, "name_too_long"),
  phone: z
    .string()
    .trim()
    .max(40, "phone_too_long")
    .optional()
    .or(z.literal("")),
});

/**
 * Uppdaterar namn + telefon på inloggad användare.
 * `?ok=profile_updated` vid framgång, annars `?error=...`.
 */
export async function updateProfile(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const raw = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    flash("error", parsed.error.issues[0]?.message ?? "invalid_form");
  }

  const phone = parsed.data.phone?.trim() || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, phone },
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "profile.updated",
    targetType: "User",
    targetId: session.user.id,
    metadata: { hasPhone: !!phone },
  });

  revalidatePath(PROFILE_PATH);
  flash("ok", "profile_updated");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "current_required"),
    next: z.string().min(8, "password_too_short").max(200, "password_too_long"),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "password_mismatch", path: ["confirm"] });

/**
 * Byter lösenord. Kräver nuvarande, nytt + bekräfta (8+ tecken).
 * Rate-limit 5/min/user för att hindra brute-force mot nuvarande lösen.
 */
export async function changePassword(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const limit = rateLimit(`profile.password:${session.user.id}`, 5, 60_000);
  if (!limit.ok) flash("error", "rate_limited");

  const raw = {
    current: String(formData.get("current") ?? ""),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  };
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    flash("error", parsed.error.issues[0]?.message ?? "invalid_form");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user || !user.passwordHash) flash("error", "no_password_set");

  const ok = await verifyPassword(parsed.data.current, user.passwordHash);
  if (!ok) flash("error", "current_password_wrong");

  const newHash = await hashPassword(parsed.data.next);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "password.changed",
    targetType: "User",
    targetId: user.id,
  });

  revalidatePath(PROFILE_PATH);
  flash("ok", "password_changed");
}

const emailChangeSchema = z.object({
  newEmail: z.string().email("invalid_email").max(320, "email_too_long"),
});

const VERIFY_EXPIRY_HOURS = 24;

function appBaseUrl(): string {
  return (env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function base64UrlEncode(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(s: string): string {
  const padLen = (4 - (s.length % 4)) % 4;
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  return Buffer.from(padded, "base64").toString("utf8");
}

/**
 * Begär byte av e-post. Skapar EmailVerificationToken kopplad till nuvarande
 * användare och mejlar en bekräftelselänk till den NYA adressen. Den nya
 * e-postadressen kodas i länken (base64url) — bytet utförs först när
 * mottagaren klickar på länken (se `verifiera-epost-byte/[token]`).
 */
export async function requestEmailChange(formData: FormData): Promise<never> {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const raw = { newEmail: String(formData.get("newEmail") ?? "").trim().toLowerCase() };
  const parsed = emailChangeSchema.safeParse(raw);
  if (!parsed.success) flash("error", parsed.error.issues[0]?.message ?? "invalid_email");

  const newEmail = parsed.data.newEmail;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true },
  });
  if (!me) redirect("/logga-in");

  if (newEmail === me.email.toLowerCase()) flash("error", "same_email");

  // Förhindra kollision: avbryt om någon redan har den nya adressen.
  const collision = await prisma.user.findUnique({ where: { email: newEmail } });
  if (collision) flash("error", "email_taken");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);

  // Invalidera ev. tidigare oanvända tokens för denna user — bara senaste gäller.
  await prisma.emailVerificationToken.updateMany({
    where: { userId: me.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.emailVerificationToken.create({
    data: { userId: me.id, token, expiresAt },
  });

  const link = `${appBaseUrl()}/min-sida/profil/verifiera-epost-byte/${token}?email=${base64UrlEncode(newEmail)}`;

  const subject = "Bekräfta din nya e-postadress";
  const body = [
    `Hej${me.name ? " " + me.name.split(" ")[0] : ""},`,
    "",
    `Du har begärt att byta inloggnings-e-post på ditt konto hos Hadj Omra Resor till ${newEmail}.`,
    "Klicka på länken nedan för att bekräfta bytet. Länken är giltig i 24 timmar.",
    "",
    link,
    "",
    "Om du inte begärde detta kan du ignorera mejlet — ingen ändring sker förrän länken besöks.",
    "",
    "Hadj Omra Resor",
  ].join("\n");

  await queueEmail({
    to: newEmail,
    recipientName: me.name,
    subject,
    body,
    kind: EMAIL_KIND.EMAIL_VERIFICATION,
    sentById: me.id,
  });

  await logAudit({
    actorId: me.id,
    actorEmail: me.email,
    action: "email.change_requested",
    targetType: "User",
    targetId: me.id,
    metadata: { newEmail },
  });

  revalidatePath(PROFILE_PATH);
  flash("ok", "email_change_sent");
}

type ConfirmResult =
  | { ok: true; newEmail: string }
  | { ok: false; reason: "invalid_token" | "expired" | "used" | "email_taken" | "bad_email" };

/**
 * Verifierar token + ny e-post, utför bytet och konsumerar tokenen.
 * Anropas från `verifiera-epost-byte/[token]?email=<base64>`-routen.
 */
export async function confirmEmailChange(token: string, emailParam: string): Promise<ConfirmResult> {
  if (!token || !emailParam) return { ok: false, reason: "invalid_token" };

  let newEmail: string;
  try {
    newEmail = base64UrlDecode(emailParam).trim().toLowerCase();
  } catch {
    return { ok: false, reason: "bad_email" };
  }
  const valid = z.string().email().max(320).safeParse(newEmail);
  if (!valid.success) return { ok: false, reason: "bad_email" };

  const row = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!row) return { ok: false, reason: "invalid_token" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  // Kontrollera kollision igen vid själva bytet (race condition-skydd).
  if (newEmail !== row.user.email.toLowerCase()) {
    const collision = await prisma.user.findUnique({ where: { email: newEmail } });
    if (collision && collision.id !== row.user.id) {
      return { ok: false, reason: "email_taken" };
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { email: newEmail, emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await logAudit({
    actorId: row.userId,
    actorEmail: newEmail,
    action: "email.changed",
    targetType: "User",
    targetId: row.userId,
    metadata: { oldEmail: row.user.email, newEmail },
  });

  return { ok: true, newEmail };
}
