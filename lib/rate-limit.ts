/**
 * In-memory rate limiter (token-bucket per nyckel). Räcker för en-instans-deployen.
 * Vid skala → byt till Upstash/Redis-baserad.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10000; // skydd mot minneläckage vid många unika IPs

function prune(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}

export type RateLimitResult = { ok: boolean; remaining: number; resetMs: number };

/** Tillåt `limit` försök per `windowMs` per `key`. Tomma key:n nekas (säker default). */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  if (!key) return { ok: false, remaining: 0, resetMs: windowMs };
  const now = Date.now();
  prune(now);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetMs: b.resetAt - now };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, resetMs: b.resetAt - now };
}

/** Hjälpare för server actions: extraherar IP-baserad nyckel. */
export async function ipKey(prefix: string): Promise<string> {
  const { headers } = await import("next/headers");
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim()
      || h.get("x-real-ip") || "unknown";
    return `${prefix}:${ip}`;
  } catch {
    return `${prefix}:server`;
  }
}
