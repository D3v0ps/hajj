import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { authConfig } from "@/lib/auth.config";

function scryptAsync(password: string, salt: string, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "ADMIN" | "STAFF";
    } & DefaultSession["user"];
  }
}

// OWASP-rekommenderade scrypt-parametrar (2024+):
// N=2^17, r=8, p=1. maxmem behöver höjas eftersom default räcker ej för N=131072.
const SCRYPT_OPTS = { N: 1 << 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64, SCRYPT_OPTS);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scryptAsync(password, salt, 64, SCRYPT_OPTS);
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "E-post",
      credentials: {
        email: { label: "E-post", type: "email" },
        password: { label: "Lösenord", type: "password" },
      },
      async authorize(raw) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.passwordHash) return null;
        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
});
