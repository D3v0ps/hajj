import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

type ImportedSheet = { sheet: string; travelers: number; packageId: string };

const HEADER_MAP: Record<string, string> = {
  "FÖRNAMN": "firstName",
  "F NAMN": "firstName",
  "NAMN": "firstName",
  "EFTERNAMN": "lastName",
  "E NAMN": "lastName",
  "EMAIL": "email",
  "MOBIL": "phone",
  "MOBILNUMMER": "phone",
  "MOB": "phone",
  "FÖDELSE": "birthDate",
  "FÖDELSEDATUM": "birthDate",
  "PER NR": "personnummer",
  "PERSONNUMMER": "personnummer",
  "KÖN": "gender",
  "TYP": "gender",
  "PASS NR": "passportNo",
  "PASS NO": "passportNo",
  "PASS": "nationality",
  "NATIONAL": "nationality",
  "LAND": "nationality",
  "CIVIL": "civilStatus",
  "URSPRUNG": "countryOfOrigin",
  "URS": "countryOfOrigin",
  "F. STAD": "birthCity",
  "STAD": "residenceCity",
  "BOR": "residenceCity",
  "RUM": "roomAssignment",
  "BETALAT": "paymentNote",
  "BETALNING": "paymentNote",
  "TURRESA": "flightOut",
  "HEMRESA": "flightReturn",
  "NR": "_nr",
  "NR.": "_nr",
  "NO": "_nr",
  "ÖVRIGT INFO": "notes",
};

function inferTripType(name: string): "HAJJ" | "OMRA" | "HADJ_BADAL" | "VISUM" {
  const n = name.toUpperCase();
  if (n.includes("HAJJ")) return "HAJJ";
  if (n.includes("BADAL")) return "HADJ_BADAL";
  return "OMRA";
}

function inferYear(name: string): number {
  const m4 = name.match(/(20\d{2})/);
  if (m4) return parseInt(m4[1]);
  const m2 = name.match(/\b(\d{2})\b/);
  if (m2) return 2000 + parseInt(m2[1]);
  return new Date().getFullYear();
}

function inferSeason(name: string): string {
  const n = name.toUpperCase();
  if (n.includes("SOMMAR")) return "Sommarlov";
  if (n.includes("PÅSK")) return "Påsklov";
  if (n.includes("RAMADAN")) return "Ramadan";
  if (n.includes("HÖST")) return "Höst";
  if (n.includes("JUL")) return "Jullov";
  if (n.includes("SPORT")) return "Sportlov";
  if (n.includes("HAJJ")) return "Hajj";
  if (n.includes("BADAL")) return "Hadj Badal";
  if (n.includes("10 SISTA")) return "Sista 10 dagarna";
  if (n.includes("CONFIRM")) return "Hajj Confirmed";
  return name;
}

function normalizeGender(val: string): string | null {
  const v = val.toUpperCase().trim();
  if (v === "MR" || v === "M" || v === "MAN" || v === "MALE" || v === "POJKE") return "M";
  if (v === "MRS" || v === "F" || v === "KVINNA" || v === "MS" || v === "FEMALE" || v === "FLICKA") return "F";
  return null; // okänt värde sparas inte (undvik skräp)
}

function parseBirthDate(val: string): Date | null {
  if (!val) return null;
  const clean = val.replace(/\D/g, "");
  // 8 siffror: ÅÅÅÅMMDD
  if (clean.length === 8) {
    const d = new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`);
    if (!isNaN(d.getTime())) return d;
  }
  // 12 siffror: ÅÅÅÅMMDDXXXX (svenskt personnummer) — ta de 8 första
  if (clean.length === 12) {
    const d = new Date(`${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`);
    if (!isNaN(d.getTime())) return d;
  }
  // 10 siffror: ÅÅMMDDXXXX — pivot 1900/2000
  if (clean.length === 10) {
    const yy = parseInt(clean.slice(0, 2), 10);
    const year = yy > new Date().getFullYear() % 100 ? 1900 + yy : 2000 + yy;
    const d = new Date(`${year}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function inferAgeCategory(birthDate: Date | null): "ADULT" | "CHILD" | "INFANT" {
  if (!birthDate) return "ADULT";
  const ageMs = Date.now() - birthDate.getTime();
  const years = ageMs / (365.25 * 24 * 3600 * 1000);
  if (years < 2) return "INFANT";
  if (years < 12) return "CHILD";
  return "ADULT";
}

function normalizeHeaders(raw: unknown[]): string[] {
  return raw.map((h) => {
    if (!h) return "";
    return String(h).trim().toUpperCase().replace(/\s+/g, " ");
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const selectedRaw = formData.get("selectedSheets") as string | null;
  if (!file || !selectedRaw) return Response.json({ error: "Missing file or selection" }, { status: 400 });
  // Skydd mot OOM/DoS: max 15 MB, endast Excel.
  if (file.size > 15 * 1024 * 1024) return Response.json({ error: "Filen är för stor (max 15 MB)." }, { status: 413 });
  if (!/\.(xlsx|xls)$/i.test(file.name)) return Response.json({ error: "Endast .xlsx/.xls stöds." }, { status: 415 });

  const selectedSheets: string[] = JSON.parse(selectedRaw);
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  const imported: ImportedSheet[] = [];
  const errors: string[] = [];

  // Get or create a system user for imported travelers
  let systemUser = await prisma.user.findFirst({ where: { email: "import@system.local" } });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: "import@system.local",
        name: "Excel Import",
        role: "STAFF",
        passwordHash: "NOLOGIN",
      },
    });
  }

  for (const sheetName of selectedSheets) {
    const ws = wb.Sheets[sheetName];
    if (!ws) { errors.push(`Sheet "${sheetName}" not found`); continue; }

    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
    if (json.length < 2) { errors.push(`Sheet "${sheetName}" has no data rows`); continue; }

    const rawHeaders = normalizeHeaders(json[0] as unknown as unknown[]);
    const dataRows = json.slice(1).filter((row) => {
      const vals = row as unknown as unknown[];
      return vals.some((v) => v !== null && v !== undefined && v !== "");
    });

    // Create or find package
    const tripType = inferTripType(sheetName);
    const year = inferYear(sheetName);
    const season = inferSeason(sheetName);
    const slug = `import-${sheetName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`;
    const title = `${season} ${year}`;

    let pkg = await prisma.package.findUnique({ where: { slug } });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: {
          slug,
          type: tripType,
          title,
          subtitle: `Importerad från Excel-flik "${sheetName}"`,
          status: year < new Date().getFullYear() ? "ARCHIVED" : "DRAFT",
        },
      });
    }

    // Create booking for this import batch
    const booking = await prisma.booking.create({
      data: {
        userId: systemUser.id,
        packageId: pkg.id,
        status: "COMPLETED",
        step: 6,
        travelerCount: dataRows.length,
        totalAmount: 0,
        depositAmount: 0,
        contactEmail: "import@system.local",
        notes: `Importerad från Excel: ${sheetName}`,
      },
    });

    // Map headers to field names
    const colMap: (string | null)[] = rawHeaders.map((h) => HEADER_MAP[h] ?? null);

    let travelersCreated = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown as unknown[];
      const data: Record<string, string> = {};
      colMap.forEach((field, ci) => {
        if (field && row[ci] != null && String(row[ci]).trim()) {
          data[field] = String(row[ci]).trim();
        }
      });

      // Skip rows without a name
      const firstName = data.firstName || "";
      const lastName = data.lastName || "";
      if (!firstName && !lastName) {
        errors.push(`${sheetName} rad ${i + 2}: saknar namn, hoppas`);
        continue;
      }

      const birthDate = parseBirthDate(data.birthDate || data.personnummer || "");
      try {
        await prisma.traveler.create({
          data: {
            userId: systemUser.id,
            bookingId: booking.id,
            firstName,
            lastName,
            ageCategory: inferAgeCategory(birthDate),
            email: data.email || null,
            phone: data.phone || null,
            personnummer: data.personnummer || null,
            passportNo: data.passportNo || null,
            birthDate,
            gender: data.gender ? normalizeGender(data.gender) : null,
            nationality: data.nationality || null,
            civilStatus: data.civilStatus || null,
            countryOfOrigin: data.countryOfOrigin || null,
            birthCity: data.birthCity || null,
            residenceCity: data.residenceCity || null,
            roomAssignment: data.roomAssignment || null,
            flightOut: data.flightOut || null,
            flightReturn: data.flightReturn || null,
            paymentNote: data.paymentNote || null,
            notes: data.notes || null,
          },
        });
        travelersCreated++;
      } catch (err) {
        errors.push(`${sheetName} rad ${i + 2} (${firstName} ${lastName}): ${err instanceof Error ? err.message : "error"}`);
      }
    }

    // Update booking traveler count
    await prisma.booking.update({
      where: { id: booking.id },
      data: { travelerCount: travelersCreated },
    });

    imported.push({ sheet: sheetName, travelers: travelersCreated, packageId: pkg.id });
  }

  return Response.json({ ok: errors.length === 0 || imported.length > 0, imported, errors });
}
