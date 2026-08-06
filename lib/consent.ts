import { cookies } from "next/headers";

export const CONSENT_COOKIE = "cookieConsent";
export const CONSENT_VERSION = 1;
// 12 månader i sekunder (365 dagar). Standardpraxis i svensk GDPR-vägledning.
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export type Consent = {
  v: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: string;
};

export const DEFAULT_CONSENT: Consent = {
  v: CONSENT_VERSION,
  necessary: true,
  analytics: false,
  marketing: false,
  ts: "",
};

function parseConsent(raw: string | undefined): Consent | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Consent> & { v?: unknown };
    if (typeof data !== "object" || data === null) return null;
    if (data.v !== CONSENT_VERSION) return null;
    return {
      v: CONSENT_VERSION,
      necessary: true,
      analytics: Boolean(data.analytics),
      marketing: Boolean(data.marketing),
      ts: typeof data.ts === "string" ? data.ts : "",
    };
  } catch {
    return null;
  }
}

/**
 * Läser cookien `cookieConsent`. Returnerar default (analytics=false,
 * marketing=false) om saknas eller ogiltig. `necessary` är alltid `true`.
 */
export async function getConsent(): Promise<Consent> {
  const store = await cookies();
  const raw = store.get(CONSENT_COOKIE)?.value;
  return parseConsent(raw) ?? DEFAULT_CONSENT;
}

/** Returnerar `true` om användaren redan har gjort ett aktivt val. */
export async function hasConsent(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(CONSENT_COOKIE)?.value;
  return parseConsent(raw) !== null;
}
