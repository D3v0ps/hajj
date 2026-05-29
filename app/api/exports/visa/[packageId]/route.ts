import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Escapa ett enskilt CSV-fält enligt RFC 4180 (semikolonseparator för svenska Excel).
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Citera om innehållet har semikolon, citattecken, ny rad eller bindestreck i början.
  if (/[;"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  // ISO-likt (åååå-mm-dd) — entydigt för konsulat-import.
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function genderLabel(g: string | null | undefined): string {
  if (!g) return "";
  if (g === "M") return "Man";
  if (g === "F") return "Kvinna";
  return g;
}

// CSV med alla resenärer på resan som ska skickas in för visum.
// Kolumner enligt kravspec — överensstämmer med svenska konsulatkrav.
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

  // Hämta alla resenärer som är kopplade till en bokning på paketet.
  // Exkludera DRAFT/CANCELLED — endast aktiva, betalningsavsedda bokningar
  // skickas in för visum (samma princip som /admin/betalningar).
  const travelers = await prisma.traveler.findMany({
    where: {
      booking: {
        packageId,
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
    },
    include: {
      user: { select: { email: true, phone: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const headers = [
    "Förnamn",
    "Efternamn",
    "Födelsedatum",
    "Födelseort",
    "Födelseland",
    "Nationalitet",
    "Passnummer",
    "Pass utfärdat",
    "Pass giltigt t.o.m.",
    "Utfärdandeort",
    "Kön",
    "Civilstånd",
    "Yrke",
    "Adress",
    "Telefon",
    "E-post",
  ];

  const rows = travelers.map((t) => [
    t.firstName,
    t.lastName,
    fmtDate(t.birthDate),
    t.birthCity ?? "",
    t.birthCountry ?? "",
    t.nationality ?? "",
    t.passportNo ?? "",
    fmtDate(t.passIssueDate),
    fmtDate(t.passportExp),
    t.passIssuePlace ?? "",
    genderLabel(t.gender),
    t.civilStatus ?? "",
    t.occupation ?? "",
    t.address ?? "",
    t.phone ?? t.user.phone ?? "",
    t.email ?? t.user.email ?? "",
  ]);

  // UTF-8 BOM så Excel öppnar med rätt encoding (svenska tecken). Semikolon
  // som separator är default i svenska Excel-installationer.
  const BOM = "﻿";
  const sep = ";";
  const body = BOM
    + headers.map(csvField).join(sep) + "\r\n"
    + rows.map((r) => r.map(csvField).join(sep)).join("\r\n")
    + (rows.length > 0 ? "\r\n" : "");

  // Filnamn — paketslug + datum för spårbarhet.
  const today = new Date().toISOString().slice(0, 10);
  const safeSlug = (pkg.slug || pkg.id).replace(/[^a-z0-9-]/gi, "-");
  const filename = `visumlista-${safeSlug}-${today}.csv`;

  // Audit — vem laddade ner när (lagrar inte PII-rader, bara metadata).
  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: "export.visa",
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
