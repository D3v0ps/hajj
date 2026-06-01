import { NextRequest } from "next/server";
import { drainQueue } from "@/lib/email";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/timing";

export const dynamic = "force-dynamic";

/**
 * Cron-endpoint som tömmer e-postkön. Skydd: WORKER_TOKEN måste matcha
 * `Authorization: Bearer <token>` eller `?token=<token>`. Saknas WORKER_TOKEN
 * vägras alla anrop (säker default). Jämförelsen är konstant-tid (timingSafeEqual)
 * så svarstiden inte läcker info om token-prefix.
 */
async function handle(req: NextRequest) {
  const token = env.WORKER_TOKEN;
  if (!token) return new Response("WORKER_TOKEN ej konfigurerad", { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : req.nextUrl.searchParams.get("token") ?? "";
  if (!safeEqual(provided, token)) return new Response("Ej behörig", { status: 401 });

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam ?? "25") || 25, 1), 200);

  const result = await drainQueue(limit);
  return Response.json({ ok: true, ...result, at: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;
