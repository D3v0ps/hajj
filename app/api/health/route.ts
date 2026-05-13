import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      ok: true,
      time: new Date().toISOString(),
      db: "ok",
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        time: new Date().toISOString(),
        db: "down",
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 503 },
    );
  }
}
