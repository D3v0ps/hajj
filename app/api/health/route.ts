import { prisma } from "@/lib/db";
import { captureError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// Tas vid module-load → ger sedan en monoton uptime per process.
const PROCESS_STARTED_AT = Date.now();

// Versionssträngen plockas i denna prioritetsordning:
//   1. APP_VERSION   (sätts t.ex. av CI: `APP_VERSION=$GITHUB_SHA`)
//   2. GIT_SHA       (alias som flera CI-system använder)
//   3. "dev"         (fallback för lokala körningar)
// Vi gör detta lazyt eftersom envvars sätts efter module-resolution i vissa
// container-set-ups.
function appVersion(): string {
  return (
    process.env.APP_VERSION ||
    process.env.GIT_SHA ||
    process.env.npm_package_version ||
    "dev"
  );
}

type HealthPayload = {
  // Bakåtkompatibelt: `ok` + `db` fanns redan i tidigare version, behåll dessa
  // så existerande health-konsumenter (Docker HEALTHCHECK, Caddy, deploy.yml
  // som curlar JSON, externa uptime-tjänster) inte ska brytas.
  ok: boolean;
  db: "ok" | "down";
  status: "ok" | "degraded";
  time: string;
  uptime: number; // sekunder sedan processstart
  version: string;
  latencyMs: number;
  error?: string;
};

export async function GET() {
  const startedAt = Date.now();
  const uptime = Math.round((Date.now() - PROCESS_STARTED_AT) / 1000);
  const version = appVersion();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const payload: HealthPayload = {
      ok: true,
      db: "ok",
      status: "ok",
      time: new Date().toISOString(),
      uptime,
      version,
      latencyMs: Date.now() - startedAt,
    };
    return Response.json(payload);
  } catch (err) {
    captureError(err, { route: "/api/health", check: "db-ping" });
    const payload: HealthPayload = {
      ok: false,
      db: "down",
      status: "degraded",
      time: new Date().toISOString(),
      uptime,
      version,
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : "unknown",
    };
    return Response.json(payload, { status: 503 });
  }
}
