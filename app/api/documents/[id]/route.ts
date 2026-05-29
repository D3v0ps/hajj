import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Resedokument innehåller känslig PII (pass). Filen serveras aldrig från en
// publik/gissningsbar URL utan endast via denna autentiserade, rollskyddade route.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "STAFF")) {
    return new Response("Ej behörig", { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
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
