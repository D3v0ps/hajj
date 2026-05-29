"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function setLocale(formData: FormData): Promise<void> {
  const raw = String(formData.get("locale") ?? "");
  const next = String(formData.get("next") ?? "/");
  // Validera locale så vi inte sätter godtyckliga värden.
  if (!(LOCALES as readonly string[]).includes(raw)) redirect(next);
  const c = await cookies();
  c.set("locale", raw as Locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  // Säker intern redirect (måste börja med /, inte protokoll-relativ).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  redirect(safeNext);
}
