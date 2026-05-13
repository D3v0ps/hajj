import type { NextAuthConfig } from "next-auth";

/**
 * Edge-säker Auth.js-konfiguration som kan importeras av middleware.
 * Innehåller inga Node.js-only-moduler (ingen prisma, ingen node:crypto).
 * Hela providers-listan + adapter läggs på i lib/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/logga-in" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: "CUSTOMER" | "ADMIN" | "STAFF" }).role ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.role) session.user.role = token.role as "CUSTOMER" | "ADMIN" | "STAFF";
      return session;
    },
  },
};
