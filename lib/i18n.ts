import { cookies, headers } from "next/headers";

export const LOCALES = ["sv", "en", "ar"] as const;
export type Locale = typeof LOCALES[number];
export const DEFAULT_LOCALE: Locale = "sv";
export const RTL_LOCALES: Locale[] = ["ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  sv: "Svenska",
  en: "English",
  ar: "العربية",
};

const COOKIE_NAME = "locale";

function isLocale(s: string | undefined | null): s is Locale {
  return !!s && (LOCALES as readonly string[]).includes(s);
}

/** Hämtar locale från cookie först, sedan Accept-Language. Default = sv. */
export async function getLocale(): Promise<Locale> {
  try {
    const c = await cookies();
    const fromCookie = c.get(COOKIE_NAME)?.value;
    if (isLocale(fromCookie)) return fromCookie;
  } catch {
    // utanför request-kontext
  }
  try {
    const h = await headers();
    const accept = h.get("accept-language") ?? "";
    const first = accept.split(",")[0]?.trim().toLowerCase().slice(0, 2);
    if (isLocale(first)) return first;
  } catch { /* ignore */ }
  return DEFAULT_LOCALE;
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

import type { Messages } from "./i18n.messages";
import svMessages from "@/messages/sv.json";
import enMessages from "@/messages/en.json";
import arMessages from "@/messages/ar.json";

const allMessages: Record<Locale, Messages> = {
  sv: svMessages as Messages,
  en: enMessages as Messages,
  ar: arMessages as Messages,
};

/**
 * Hämtar översatt sträng. Använder dot-notation: t("home.hero.title").
 * Fallback-strategi: aktivt locale → sv (alltid komplett) → nyckeln själv.
 */
export async function getT(locale?: Locale): Promise<(key: string) => string> {
  const loc = locale ?? (await getLocale());
  const msgs = allMessages[loc];
  const sv = allMessages.sv;
  return (key: string) => {
    return resolve(msgs, key) ?? resolve(sv, key) ?? key;
  };
}

function resolve(obj: Messages, key: string): string | null {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (typeof cur !== "object" || cur === null) return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : null;
}
