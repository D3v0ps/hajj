import { prisma } from "@/lib/db";
import { headers } from "next/headers";

type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;            // t.ex. "booking.statusChanged", "payment.verified", "document.approved"
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Loggar en åtgärd. Aldrig blockerande — fel sväljs så audit-fel ej spräcker
 *  business-flödet. IP hämtas från x-forwarded-for (Caddy sätter denna). */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    let ip: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim()
        || h.get("x-real-ip") || null;
    } catch {
      // headers() funkar bara i request-kontext; ignorera utanför.
    }
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: input.metadata ? (input.metadata as object) : undefined,
        ipAddress: ip,
      },
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}
