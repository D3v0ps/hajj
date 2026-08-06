import { timingSafeEqual } from "node:crypto";

/**
 * Konstant-tid-jämförelse av två strängar. Längd-skillnad kortsluts (returnerar
 * false direkt) men det är OK för WORKER_TOKEN-jämförelse — angriparen vet inte
 * den hemliga längden ändå.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return timingSafeEqual(aBuf, bBuf);
}
