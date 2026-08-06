import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Paketbilder är publikt marknadsföringsmaterial (visas på resans sida och i
// listor) — till skillnad från resedokument är de därför INTE auth-skyddade.
// Vi serverar dem via denna route så att lagringen kan bytas (disk → moln) utan
// att URL:erna ändras.

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = await prisma.package.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!pkg?.imageUrl) return new Response("Hittades ej", { status: 404 });

  // Stödjer även en inklistrad extern bild-URL → redirecta dit.
  if (/^https?:\/\//i.test(pkg.imageUrl)) {
    return Response.redirect(pkg.imageUrl, 307);
  }

  let data: Buffer;
  try {
    data = await readStoredFile(pkg.imageUrl);
  } catch {
    return new Response("Filen saknas på lagring", { status: 410 });
  }

  const ext = pkg.imageUrl.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
