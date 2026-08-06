import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

const SKIP_SHEETS = new Set([
  "Blad41", "Blad27", "Blad26", "Blad22",
  "Flyg o hotell bok. 2023-2024",
]);

function inferTripType(name: string): string {
  const n = name.toUpperCase();
  if (n.includes("HAJJ")) return "HAJJ";
  if (n.includes("BADAL")) return "HADJ_BADAL";
  if (n.includes("INTE KÖPT") || n.includes("ATT RINGA")) return "LEAD";
  return "OMRA";
}

function inferYear(name: string): string {
  const m4 = name.match(/(20\d{2})/);
  if (m4) return m4[1];
  const m2 = name.match(/\b(\d{2})\b/);
  if (m2) return `20${m2[1]}`;
  return "";
}

function normalizeHeaders(raw: unknown[]): string[] {
  return raw.map((h) => {
    if (!h) return "";
    return String(h).trim().toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/^F NAMN$/, "FÖRNAMN")
      .replace(/^E NAMN$/, "EFTERNAMN")
      .replace(/^MOB$/, "MOBIL")
      .replace(/^PER NR$/, "PERSONNUMMER")
      .replace(/^PASS NO$/, "PASS NR")
      .replace(/^NO$/, "NR")
      .replace(/^URS$/, "URSPRUNG");
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "Filen är för stor (max 15 MB)." }, { status: 413 });
  if (!/\.(xlsx|xls)$/i.test(file.name)) return Response.json({ error: "Endast .xlsx/.xls stöds." }, { status: 415 });

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const sheets = wb.SheetNames
    .filter((name) => !SKIP_SHEETS.has(name))
    .map((name) => {
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
      if (json.length < 2) return null;

      const rawHeaders = json[0] as unknown as unknown[];
      const headers = normalizeHeaders(rawHeaders);
      const dataRows = json.slice(1).filter((row) => {
        const vals = row as unknown as unknown[];
        return vals.some((v) => v !== null && v !== undefined && v !== "");
      });

      const sampleRows = dataRows.slice(0, 3).map((row) => {
        const vals = row as unknown as unknown[];
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          if (h) obj[h] = vals[i] != null ? String(vals[i]) : "";
        });
        return obj;
      });

      return {
        name,
        tripType: inferTripType(name),
        year: inferYear(name),
        rowCount: dataRows.length,
        headers: headers.filter(Boolean),
        sampleRows,
      };
    })
    .filter(Boolean);

  return Response.json({ sheets });
}
