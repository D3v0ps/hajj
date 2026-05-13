import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SITE_ORG_NR: z.string().optional(),
  SITE_PHONE: z.string().optional(),
  SITE_PHONE_DISPLAY: z.string().optional(),
  SITE_EMAIL: z.string().email().optional(),
  SITE_DOMAIN: z.string().optional(),
});

type Env = z.infer<typeof schema>;

// Under `next build` collect-data-fasen är NEXT_PHASE === 'phase-production-build'
// och DATABASE_URL/AUTH_SECRET behöver inte vara satta — appen körs inte än.
// Vid runtime körs parse direkt vid första env-läsning så vi kraschar snabbt
// vid felaktig konfig istället för att appen kör med tomma/ogiltiga värden.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

let cached: Env | undefined;

function load(): Env {
  if (cached) return cached;
  cached = schema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    SITE_ORG_NR: process.env.SITE_ORG_NR,
    SITE_PHONE: process.env.SITE_PHONE,
    SITE_PHONE_DISPLAY: process.env.SITE_PHONE_DISPLAY,
    SITE_EMAIL: process.env.SITE_EMAIL,
    SITE_DOMAIN: process.env.SITE_DOMAIN,
  });
  return cached;
}

// Proxy så vi får lazy-validering: schema.parse körs först när någon läser env.NÅGOT,
// inte vid module import. Räddar Next.js collect-data under `next build`.
export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (isBuild) return process.env[prop];
    return load()[prop as keyof Env];
  },
});
