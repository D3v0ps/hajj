import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Skydd mot CSV-formula-injection: prefixa fält som börjar med =, +, -, @, tab eller CR
// med apostrof så Excel/LibreOffice inte tolkar dem som formler.
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[;"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ageLabel(c: string | null | undefined): string {
  if (c === "CHILD") return "Barn";
  if (c === "INFANT") return "Spädbarn";
  return "Vuxen";
}

// CSV "rooming" — namn + rumstilldelning + ålderskategori.
// Sorterad på rum (otilldelade sist) så hotellpersonalen kan läsa per rum.
export async function GET(_req: Request, { params }: { params: Promise<{ packageId: string }> }) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "STAFF")) {
    return new Response("Ej behörig", { status: 401 });
  }

  const { packageId } = await params;

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: { id: true, slug: true, title: true },
  });
  if (!pkg) return new Response("Resan hittades ej", { status: 404 });

  const travelers = await prisma.traveler.findMany({
    where: {
      booking: {
        packageId,
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Sortera: tilldelade rum först (alfabetiskt på rumsbeteckning), otilldelade sist.
  const sorted = [...travelers].sort((a, b) => {
    const ra = a.roomAssignment?.trim() ?? "";
    const rb = b.roomAssignment?.trim() ?? "";
    if (ra && !rb) return -1;
    if (!ra && rb) return 1;
    if (ra && rb) {
      const cmp = ra.localeCompare(rb, "sv");
      if (cmp !== 0) return cmp;
    }
    const ln = a.lastName.localeCompare(b.lastName, "sv");
    if (ln !== 0) return ln;
    return a.firstName.localeCompare(b.firstName, "sv");
  });

  const headers = [
    "Rum",
    "Förnamn",
    "Efternamn",
    "Ålderskategori",
    "Kön",
  ];

  const rows = sorted.map((t) => [
    t.roomAssignment?.trim() ? t.roomAssignment.trim() : "Ej tilldelat",
    t.firstName,
    t.lastName,
    ageLabel(t.ageCategory),
    t.gender === "M" ? "Man" : t.gender === "F" ? "Kvinna" : (t.gender ?? ""),
  ]);

  const BOM = "﻿";
  const sep = ";";
  const body = BOM
    + headers.map(csvField).join(sep) + "\r\n"
    + rows.map((r) => r.map(csvField).join(sep)).join("\r\n")
    + (rows.length > 0 ? "\r\n" : "");

  const today = new Date().toISOString().slice(0, 10);
  const safeSlug = (pkg.slug || pkg.id).replace(/[^a-z0-9-]/gi, "-");
  const filename = `rooming-${safeSlug}-${today}.csv`;

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "export.rooming",
    targetType: "Package",
    targetId: packageId,
    metadata: { rowCount: rows.length, packageTitle: pkg.title },
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
