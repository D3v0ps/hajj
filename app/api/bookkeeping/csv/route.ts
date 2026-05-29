import { auth } from "@/lib/auth";
import {
  buildCsv,
  exportFilename,
  fetchPaymentsForPeriod,
  parsePeriod,
  summarizePeriod,
} from "@/app/actions/bookkeeping";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookkeeping/csv?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Endast ADMIN/STAFF. Returnerar en CSV-fil (UTF-8 med BOM, semikolon-
 * separerad) med alla COMPLETED-betalningar i perioden. Avsedd för att
 * revisorn ska kunna importera manuellt i sitt bokföringsprogram.
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

  const csv = await buildCsv(rows, summary);
  const filename = await exportFilename("csv", period.from, period.to);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
