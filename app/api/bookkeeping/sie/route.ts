import { auth } from "@/lib/auth";
import {
  buildSie4,
  exportFilename,
  fetchPaymentsForPeriod,
  parsePeriod,
  summarizePeriod,
} from "@/app/actions/bookkeeping";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookkeeping/sie?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Endast ADMIN/STAFF. Returnerar en SIE4-fil (svensk standard för
 * bokföringsexport). Filen följer SIE4-formatet med #FLAGGA, #PROGRAM,
 * #FORMAT, #GEN, #VER + #TRANS-rader per betalning. Vi validerar inte
 * mot officiell SIE-BNF — men de flesta moderna importörer (Fortnox,
 * Visma, Bokio) accepterar formatet som genereras.
 */
export async function GET(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "STAFF")) {
    return new Response("Ej behörig", { status: 401 });
  }

  const url = new URL(req.url);
  const period = await parsePeriod({
    from: url.searchParams.get("from") ?? "",
    to: url.searchParams.get("to") ?? "",
  });

  const [rows, summary] = await Promise.all([
    fetchPaymentsForPeriod(period.from, period.to),
    summarizePeriod(period.from, period.to),
  ]);

  const sie = await buildSie4(rows, summary);
  const filename = await exportFilename("sie", period.from, period.to);

  return new Response(sie, {
    status: 200,
    headers: {
      // SIE4 levereras typiskt som text/plain eller application/x-sie.
      // application/x-sie är inte standardregistrerat, så vi använder
      // text/plain men anger filändelse .se så importprogram tolkar rätt.
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
