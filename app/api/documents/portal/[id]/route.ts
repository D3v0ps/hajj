import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Portal-serve-route för kundens egna dokument.
 *
 * Skyddet är striktare än admin-routen i `/api/documents/[id]`: här krävs att
 * `doc.userId === session.user.id` — alltså kunden själv. Vi returnerar 404
 * (inte 403) om dokumentet inte ägs av användaren, så att existens inte läcker.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Ej behörig", { status: 401 });
  }

  const { id } = await params;
  // findFirst med både id och userId — om kombinationen inte finns vet vi inte
  // om dokumentet alls existerar eller om det ägs av någon annan. 404 i båda fallen.
  const doc = await prisma.document.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!doc) return new Response("Hittades ej", { status: 404 });

  let data: Buffer;
  try {
    data = await readStoredFile(doc.filepath);
  } catch {
    return new Response("Filen saknas på lagring", { status: 410 });
  }

  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": doc.mimetype || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Content-Length": String(data.length),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
