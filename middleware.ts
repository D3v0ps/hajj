import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthed = !!req.auth;
  const path = nextUrl.pathname;

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

  return NextResponse.next();
});

export const config = {
  matcher: ["/min-sida/:path*", "/admin/:path*"],
};
