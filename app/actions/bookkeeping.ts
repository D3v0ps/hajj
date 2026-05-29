// Bokföringsexport för revisorn.
// Server-only modul (importeras av admin-sidor + API-routes). Använder
// Prisma direkt → kan inte importeras från klientkomponenter.
//
// Det här är en OFFLINE-export: vi laddar inte upp något till Fortnox eller
// någon annan tjänst, utan genererar en CSV och en SIE4-fil som revisorn
// importerar manuellt i sitt bokföringsprogram (Fortnox / Visma eAccounting /
// Bokio / SpeedLedger). När/om vi senare integrerar Fortnox-OAuth byggs det
// ovanpå samma datamodell.
//
// VINSTMARGINALBESKATTNING (VMB):
// Resebyråer i Sverige redovisar enligt särskilda regler för
// resetjänster — vinstmarginalbeskattning (mervärdesskattelagen kap. 19a).
// Försäljning bokförs typiskt på konto 3308 ("Försäljning resebyrå VMB")
// och momsen redovisas på marginalen, INTE på hela försäljningsbeloppet.
// Detta påverkar inte själva exporten — vi lämnar över bruttobeloppet och
// noterar VMB i kommentaren — men revisorn måste själv periodvis beräkna
// marginalen och bokföra moms-justeringen. Förslaget på konto nedan ska
// alltid godkännas av revisorn innan import.
//
// Server actions kan inte returnera filer på ett bra sätt (de returnerar
// alltid JSON-data till klienten). Därför gör vi nedladdningen via GET-routes
// i app/api/bookkeeping/{csv,sie}/route.ts. Den här filen exporterar hjälpare
// som båda routerna delar.

import { prisma } from "@/lib/db";
import { SITE } from "@/lib/config";

/** Föreslaget BAS-konto för resebyråförsäljning (VMB). Anpassas av revisor. */
export const SUGGESTED_ACCOUNT_VMB = "3308";

const METHOD_LABELS: Record<string, string> = {
  SWISH: "Swish",
  KLARNA: "Klarna",
  CARD: "Kort",
  BANKGIRO: "Bankgiro",
  INVOICE: "Faktura",
};

/** Föreslagna motkonton per betalmetod (BAS-kontoplanen). Justeras av revisor. */
const COUNTER_ACCOUNT: Record<string, string> = {
  SWISH: "1930", // Företagskonto / bankkonto
  KLARNA: "1580", // Fordringar hos betalningsförmedlare
  CARD: "1580", // Fordringar hos kortinlösare (Stripe/m.fl.)
  BANKGIRO: "1920", // Plusgiro/bankgiro
  INVOICE: "1510", // Kundfordringar
};

export type PeriodInput = {
  /** Startdatum (inkl). Format: YYYY-MM-DD. */
  from: string;
  /** Slutdatum (inkl). Format: YYYY-MM-DD. */
  to: string;
};

export type PaymentRow = {
  id: string;
  verNo: string; // Verifikationsnr (kort id-prefix)
  paidAt: Date;
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  packageTitle: string;
  method: string;
  methodLabel: string;
  amount: number; // SEK, heltal
  counterAccount: string;
};

export type ExportSummary = {
  count: number;
  total: number;
  from: Date;
  to: Date;
};

/**
 * Tolkar from/to-strängar och normaliserar till en period (00:00:00 till
 * 23:59:59.999). Om något saknas/är ogiltigt → faller tillbaka till
 * innevarande månad.
 */
export async function parsePeriod(raw: PeriodInput): Promise<{ from: Date; to: Date }> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const fromParsed = raw.from ? parseDateOnly(raw.from) : null;
  const toParsed = raw.to ? parseDateOnly(raw.to, true) : null;

  return {
    from: fromParsed ?? monthStart,
    to: toParsed ?? monthEnd,
  };
}

function parseDateOnly(s: string, endOfDay = false): Date | null {
  // Förväntat format: YYYY-MM-DD. Returnera null om ogiltigt.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const date = endOfDay
    ? new Date(y, mo, d, 23, 59, 59, 999)
    : new Date(y, mo, d, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Hämtar alla COMPLETED-betalningar inom perioden. `paidAt` MÅSTE vara satt
 * (om en betalning är markerad COMPLETED utan paidAt är det en datafel — vi
 * tar i så fall createdAt som fallback för att inte tappa raden).
 */
export async function fetchPaymentsForPeriod(from: Date, to: Date): Promise<PaymentRow[]> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { paidAt: { gte: from, lte: to } },
        { AND: [{ paidAt: null }, { createdAt: { gte: from, lte: to } }] },
      ],
    },
    orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    include: {
      booking: {
        select: {
          reference: true,
          user: { select: { name: true, email: true } },
          package: { select: { title: true } },
        },
      },
    },
  });

  return payments.map((p) => {
    const when = p.paidAt ?? p.createdAt;
    return {
      id: p.id,
      // Verifikationsnummer: vi använder en kort, läsbar prefix av cuid.
      // Revisorn får ett unikt ID som går att korsreferera mot Payment.id i
      // databasen, utan att exponera hela det opaka cuid:et.
      verNo: p.id.slice(-8).toUpperCase(),
      paidAt: when,
      bookingRef: p.booking.reference,
      customerName: p.booking.user.name ?? "",
      customerEmail: p.booking.user.email ?? "",
      packageTitle: p.booking.package.title,
      method: p.method,
      methodLabel: METHOD_LABELS[p.method] ?? p.method,
      amount: p.amount,
      counterAccount: COUNTER_ACCOUNT[p.method] ?? "1930",
    };
  });
}

/** Snabb sammanfattning för preview-UI:n. */
export async function summarizePeriod(from: Date, to: Date): Promise<ExportSummary> {
  const agg = await prisma.payment.aggregate({
    _sum: { amount: true },
    _count: true,
    where: {
      status: "COMPLETED",
      OR: [
        { paidAt: { gte: from, lte: to } },
        { AND: [{ paidAt: null }, { createdAt: { gte: from, lte: to } }] },
      ],
    },
  });
  return {
    count: agg._count ?? 0,
    total: agg._sum.amount ?? 0,
    from,
    to,
  };
}

// ---------- CSV ----------

function csvEscape(value: string | number): string {
  const s = String(value ?? "");
  // RFC 4180: dubbla citationstecken, kvota om innehåller ; , " eller radbrytning.
  // Vi använder semikolon som avgränsare (svensk Excel-konvention).
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDateSv(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Genererar CSV-innehåll (UTF-8 med BOM så att svenska tecken visas korrekt
 * i Excel). Avgränsare = semikolon. En kommentarsrad i toppen förklarar
 * VMB och att kontoraden är ett FÖRSLAG som revisorn måste verifiera.
 */
export async function buildCsv(rows: PaymentRow[], summary: ExportSummary): Promise<string> {
  const lines: string[] = [];
  // Kommentarsblock — börjar med #, ignoreras av Excel/Calc men ger
  // revisorn snabb kontext. Vi använder \r\n eftersom Excel föredrar det.
  lines.push(
    `# Bokföringsexport ${formatDateSv(summary.from)} – ${formatDateSv(summary.to)}`,
  );
  lines.push(
    `# ${SITE.legalName} · Org.nr ${SITE.orgNr} · Genererad ${formatDateSv(new Date())}`,
  );
  lines.push(
    `# Endast COMPLETED-betalningar inom perioden ovan. Antal: ${summary.count}. Total: ${summary.total} SEK.`,
  );
  lines.push(
    `# Försäljning bokförs typiskt på konto ${SUGGESTED_ACCOUNT_VMB} (Försäljning resebyrå VMB).`,
  );
  lines.push(
    `# OBS: Resebyrå tillämpar vinstmarginalbeskattning (VMB) — moms beräknas på marginalen, inte bruttobeloppet. Kontot är ett FÖRSLAG och ska bekräftas av revisor.`,
  );

  // Rubrikrad
  const header = [
    "Datum",
    "Verifikationsnr",
    "Bokning",
    "Kund",
    "E-post",
    "Paket",
    "Metod",
    "Belopp (SEK)",
    "Konto",
    "Motkonto",
    "Notering",
  ];
  lines.push(header.map(csvEscape).join(";"));

  for (const r of rows) {
    lines.push(
      [
        formatDateSv(r.paidAt),
        r.verNo,
        r.bookingRef,
        r.customerName,
        r.customerEmail,
        r.packageTitle,
        r.methodLabel,
        r.amount,
        SUGGESTED_ACCOUNT_VMB,
        r.counterAccount,
        "VMB",
      ]
        .map(csvEscape)
        .join(";"),
    );
  }

  // Summarad
  lines.push(
    [
      "",
      "",
      "",
      "",
      "",
      "",
      `Summa (${rows.length} st)`,
      summary.total,
      "",
      "",
      "",
    ]
      .map(csvEscape)
      .join(";"),
  );

  // UTF-8 BOM (﻿) först — gör så att svenska tecken visas rätt i
  // Excel på Windows. Radbrytning \r\n för CSV.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// ---------- SIE4 ----------

/**
 * SIE4 är den svenska standarden för bokföringsexport (SIE-gruppen).
 * En riktig SIE4-fil följer specifikationen från sie.se exakt — vi
 * genererar ett MINIMALT format som de flesta program (Fortnox, Visma,
 * Bokio) accepterar för enklare import. Filen valideras inte mot officiell
 * BNF här, men följer standardens layout:
 *   #FLAGGA / #PROGRAM / #FORMAT / #GEN / #FNAMN / #ORGNR / #RAR / #KONTO / #VER + #TRANS
 *
 * Teckenkodning är historiskt PC8 (CP437), men moderna importörer accepterar
 * UTF-8 — vi använder UTF-8 utan BOM då SIE-spec inte tillåter BOM.
 */
export async function buildSie4(rows: PaymentRow[], summary: ExportSummary): Promise<string> {
  const today = new Date();
  const yyyymmdd = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  };

  /** SIE-strängar måste citeras med " om de innehåller mellanslag eller specialtecken. */
  const sieStr = (s: string): string => {
    // Tomma strängar blir "" — annars omsluts med "" och escapas.
    const cleaned = (s ?? "").replace(/[\r\n]+/g, " ").trim();
    if (!cleaned) return '""';
    if (/[\s"{}]/.test(cleaned)) {
      return `"${cleaned.replace(/"/g, '\\"')}"`;
    }
    return cleaned;
  };

  const lines: string[] = [];
  // ---- Header ----
  // #FLAGGA 0 = filen inte hämtad in i något bokföringsprogram än
  lines.push("#FLAGGA 0");
  // #PROGRAM "namn" "version"
  lines.push(`#PROGRAM ${sieStr("Hadj Omra Resor Backoffice")} ${sieStr("1.0")}`);
  // #FORMAT PC8 är default — vi väljer ändå PC8 för max kompatibilitet
  // (de flesta moderna importörer accepterar UTF-8 ändå).
  lines.push("#FORMAT PC8");
  lines.push(`#GEN ${yyyymmdd(today)}`);
  // #SIETYP 4 = SIE4 (transaktioner)
  lines.push("#SIETYP 4");
  lines.push(`#FNAMN ${sieStr(SITE.legalName)}`);
  // Org.nr — SIE vill ha NNNNNN-NNNN. Om vi inte har det, lämna som-är.
  lines.push(`#ORGNR ${sieStr(SITE.orgNr)}`);
  // #RAR 0 = aktuellt räkenskapsår (från–till inom perioden). Räkenskapsår
  // hanteras strikt taget per bolagets räkenskapsår, men för ad hoc-export
  // av en period räcker det att markera 0 = aktuellt och ange perioden.
  lines.push(`#RAR 0 ${yyyymmdd(summary.from)} ${yyyymmdd(summary.to)}`);

  // ---- Konton (kontoplan-deklarationer) ----
  // Vi deklarerar de konton vi använder så att importören vet vad de heter.
  // Konto 3308 är BAS-kontoplanens "Försäljning resebyrå VMB".
  const accounts = new Map<string, string>();
  accounts.set(SUGGESTED_ACCOUNT_VMB, "Försäljning resebyrå VMB");
  accounts.set("1930", "Företagskonto/bankkonto");
  accounts.set("1920", "PlusGiro/Bankgiro");
  accounts.set("1580", "Fordringar betalningsförmedlare");
  accounts.set("1510", "Kundfordringar");
  // Lägg till alla motkonton som faktiskt används
  for (const r of rows) {
    if (!accounts.has(r.counterAccount)) {
      accounts.set(r.counterAccount, "Likvida medel");
    }
  }
  for (const [num, name] of accounts) {
    lines.push(`#KONTO ${num} ${sieStr(name)}`);
  }

  // Notera VMB i en kommentar
  lines.push(
    `#KOMMENTAR ${sieStr("VMB tillämpas (vinstmarginalbeskattning för resebyrå). Konton är förslag — verifiera med revisor.")}`,
  );

  // ---- Verifikationer ----
  // En #VER per betalning, två #TRANS-rader per #VER:
  //   Debet motkonto (banken/Stripe får pengar)
  //   Kredit försäljningskonto (intäkten)
  for (const r of rows) {
    const date = yyyymmdd(r.paidAt);
    const verText = `Betalning ${r.bookingRef} ${r.methodLabel}`;
    // #VER serie verNr datum "text"
    // Serie "A" är konvention för allmän serie.
    lines.push(`#VER A ${sieStr(r.verNo)} ${date} ${sieStr(verText)}`);
    lines.push("{");
    // Debet: motkonto, positiv summa
    lines.push(
      `\t#TRANS ${r.counterAccount} {} ${r.amount} ${date} ${sieStr(r.bookingRef)}`,
    );
    // Kredit: försäljningskonto, negativ summa
    lines.push(
      `\t#TRANS ${SUGGESTED_ACCOUNT_VMB} {} -${r.amount} ${date} ${sieStr(`${r.bookingRef} ${r.customerName}`)}`,
    );
    lines.push("}");
  }

  // SIE4 använder CRLF som radbrytning per spec.
  return lines.join("\r\n") + "\r\n";
}

/** Föreslagna filnamn (revisorn kan döpa om vid behov). */
export async function exportFilename(kind: "csv" | "sie", from: Date, to: Date): Promise<string> {
  const fmt = (d: Date): string =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const ext = kind === "csv" ? "csv" : "se";
  return `bokforing_${fmt(from)}-${fmt(to)}.${ext}`;
}
