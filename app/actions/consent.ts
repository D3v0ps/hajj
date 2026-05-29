"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  type Consent,
} from "@/lib/consent";

function asBool(v: FormDataEntryValue | null): boolean {
  if (v === null) return false;
  const s = String(v).toLowerCase();
  return s === "true" || s === "on" || s === "1" || s === "yes";
}

function safeRedirectTarget(raw: string | null): string {
  // Tillåt endast interna relativa paths (skydd mot open-redirect).
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

/**
 * Server action som sätter cookien `cookieConsent` med användarens val.
 * Acceptas formfält: `analytics`, `marketing` (boolean-ish), `next` (redirect-mål).
 * `necessary` är alltid `true` (lagstadgat — appen fungerar inte utan dem).
 */
export async function setConsent(formData: FormData): Promise<never> {
  const consent: Consent = {
    v: CONSENT_VERSION,
    necessary: true,
    analytics: asBool(formData.get("analytics")),
    marketing: asBool(formData.get("marketing")),
    ts: new Date().toISOString(),
  };

  const store = await cookies();
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "";
  const isHttps = proto === "https" || process.env.NODE_ENV === "production";

  store.set({
    name: CONSENT_COOKIE,
    value: JSON.stringify(consent),
    maxAge: CONSENT_MAX_AGE,
    sameSite: "lax",
    secure: isHttps,
    httpOnly: false, // läsbart även för ev. framtida klient-skript (analytics-gate)
    path: "/",
  });

  const next = safeRedirectTarget(String(formData.get("next") ?? "/"));
  redirect(next);
}
