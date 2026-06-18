import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Gäst-bokning utan konto.
 *
 * En besökare som bokar utan att logga in "äger" sina bokningar via en signerad,
 * httpOnly-cookie. Cookien innehåller:
 *   - ids:   listan av boknings-id som besökaren skapat (bevisar ägarskap)
 *   - email: senast angivna e-post (för förifyllning vid återbesök)
 *
 * Själva bokningen (med e-post) skapas server-side direkt när kontaktuppgifterna
 * fylls i — så även påbörjade men ej slutförda bokningar syns för kontoret i
 * admin (status "Utkast"). Cookien är bara nyckeln som låter rätt besökare
 * fortsätta på sin egen bokning; den används aldrig för att lita på innehåll.
 *
 * Signeringen (HMAC-SHA256 med AUTH_SECRET) gör att en besökare inte kan
 * manipulera cookien för att komma åt någon annans bokning.
 */

const COOKIE_NAME = "hg_guest";
const MAX_IDS = 25;
const MAX_AGE = 60 * 60 * 24 * 60; // 60 dagar

type GuestData = { ids: string[]; email?: string };

function secret(): string {
  // I produktion är AUTH_SECRET alltid satt (≥32 tecken, valideras i lib/env).
  return process.env.AUTH_SECRET ?? "insecure-dev-secret-please-set-AUTH_SECRET";
}

function sign(payloadB64: string): string {
  const mac = createHmac("sha256", secret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${mac}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const payloadB64 = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = createHmac("sha256", secret()).update(payloadB64).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? payloadB64 : null;
}

function decode(raw: string | undefined): GuestData {
  if (!raw) return { ids: [] };
  const payloadB64 = unsign(raw);
  if (!payloadB64) return { ids: [] };
  try {
    const data = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as GuestData;
    if (!data || !Array.isArray(data.ids)) return { ids: [] };
    return {
      ids: data.ids.filter((x) => typeof x === "string").slice(-MAX_IDS),
      email: typeof data.email === "string" ? data.email : undefined,
    };
  } catch {
    return { ids: [] };
  }
}

function encode(data: GuestData): string {
  const json = JSON.stringify({ ids: data.ids.slice(-MAX_IDS), email: data.email });
  return sign(Buffer.from(json, "utf8").toString("base64url"));
}

/** Läser gäst-cookien (tom om ingen finns/ogiltig signatur). */
export async function readGuest(): Promise<GuestData> {
  const store = await cookies();
  return decode(store.get(COOKIE_NAME)?.value);
}

/** Äger den här besökaren (gäst) den angivna bokningen? */
export async function guestOwnsBooking(bookingId: string): Promise<boolean> {
  const { ids } = await readGuest();
  return ids.includes(bookingId);
}

/** Senast angivna gäst-e-post (för förifyllning). */
export async function guestEmail(): Promise<string | undefined> {
  return (await readGuest()).email;
}

/** Lägg till en bokning i gästens cookie + spara e-post. Anropas från server actions. */
export async function rememberGuestBooking(bookingId: string, email?: string): Promise<void> {
  const store = await cookies();
  const current = decode(store.get(COOKIE_NAME)?.value);
  const ids = current.ids.includes(bookingId) ? current.ids : [...current.ids, bookingId];
  store.set(COOKIE_NAME, encode({ ids, email: email ?? current.email }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}
