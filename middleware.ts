import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// Stödda locales — synkat med lib/i18n.ts (kan ej importeras pga Edge-runtime begränsningar).
const LOCALES = ["sv", "en", "ar"] as const;

// Vilka path-prefix som hoppar över locale-routing (auth, inloggat, API, statiska resurser).
const NON_PUBLIC_PREFIXES = [
  "/admin", "/min-sida", "/boka", "/logga-in", "/skapa-konto",
  "/glomt-losen", "/aterstall-losen", "/verifiera-epost", "/setup",
  "/api", "/_next",
];

function isNonPublic(path: string): boolean {
  return NON_PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function extractLocale(path: string): { locale: typeof LOCALES[number] | null; rest: string } {
  for (const l of LOCALES) {
    if (path === `/${l}`) return { locale: l, rest: "/" };
    if (path.startsWith(`/${l}/`)) return { locale: l, rest: path.slice(l.length + 1) };
  }
  return { locale: null, rest: path };
}

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth;
  const path = nextUrl.pathname;

  // Skicka aktuell sökväg som header så server components (t.ex. LocaleSwitcher)
  // kan posta tillbaka användaren till samma sida efter språkbyte.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", path);

  // ============ LOCALE-ROUTING (endast publika sidor) ============
  if (!isNonPublic(path)) {
    const { locale: urlLocale, rest } = extractLocale(path);
    if (urlLocale) {
      // /en/omra eller /ar/omra → rewrite till /omra internt + sätt cookie.
      const url = nextUrl.clone();
      url.pathname = rest;
      const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      res.cookies.set("locale", urlLocale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
      return res;
    }
    // Ingen locale i URL — låt sidan rendera default (sv) eller respektera ev. cookie.
  }

  if (path.startsWith("/min-sida") && !isAuthed) {
    const url = nextUrl.clone();
    url.pathname = "/logga-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin")) {
    if (!isAuthed) {
      const url = nextUrl.clone();
      url.pathname = "/logga-in";
      return NextResponse.redirect(url);
    }
    const role = req.auth?.user?.role;
    if (role !== "ADMIN" && role !== "STAFF") {
      const url = nextUrl.clone();
      url.pathname = "/min-sida";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  // Matchar både skyddade sökvägar (auth-flödet) och publika sökvägar (för x-pathname-headern
  // som behövs av LocaleSwitcher). Exkluderar statiska assets och API-anrop som inte berörs.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/health).*)"],
};
