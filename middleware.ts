import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth;
  const path = nextUrl.pathname;

  // Skicka aktuell sökväg som header så server components (t.ex. LocaleSwitcher)
  // kan posta tillbaka användaren till samma sida efter språkbyte.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", path);

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
