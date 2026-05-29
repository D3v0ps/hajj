import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; from?: string; to?: string }>;

// Validera ett ?from=/?to= datum (YYYY-MM-DD). Returnerar Date eller null.
function parseDateParam(raw: string | undefined, endOfDay = false): Date | null {
  if (!raw) return null;
  // Acceptera bara åååå-mm-dd-format för att undvika konstiga tidszonsutfall.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = endOfDay
    ? new Date(y, mo, d, 23, 59, 59, 999)
    : new Date(y, mo, d, 0, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

// Visningsetiketter för vanliga åtgärder — kompletteras allt eftersom nya
// audit-events tillkommer. Fallback = visa rå action-sträng.
const ACTION_LABEL: Record<string, string> = {
  "booking.statusChanged": "Bokning — status ändrad",
  "booking.created": "Bokning — skapad",
  "booking.advanced": "Bokning — steg framflyttat",
  "payment.verified": "Betalning — verifierad",
  "payment.recorded": "Betalning — registrerad",
  "document.approved": "Dokument — godkänt",
  "document.rejected": "Dokument — avvisat",
  "document.uploaded": "Dokument — uppladdat",
  "email.sent": "Mejl — skickat",
  "email.queued": "Mejl — köat",
  "export.visa": "Export — visumlista",
  "export.rooming": "Export — rooming",
  "package.created": "Resa — skapad",
  "package.updated": "Resa — uppdaterad",
  "template.created": "Mall — skapad",
  "template.deleted": "Mall — borttagen",
  "user.created": "Användare — skapad",
};

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, from, to } = await searchParams;

  const fromDate = parseDateParam(from, false);
  const toDate = parseDateParam(to, true);

  // Filtertyper är öppet typade i Prisma; använd AuditLogWhereInput för tydlighet.
  const where: Prisma.AuditLogWhereInput = {};
  // Sökfält filtrerar på action-prefix (t.ex. "booking" matchar "booking.*").
  const search = q?.trim();
  if (search) {
    where.action = { startsWith: search, mode: "insensitive" };
  }
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }

  const events = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { name: true, email: true } },
    },
  });

  const fmtDateTime = (d: Date) =>
    new Date(d).toLocaleString("sv-SE", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  // Avgör pill-färg baserat på första segmentet av action.
  const actionPillClass = (action: string): string => {
    const prefix = action.split(".")[0];
    if (prefix === "payment") return "ok";
    if (prefix === "booking") return "info";
    if (prefix === "document") return "gold";
    if (prefix === "export") return "outline";
    if (prefix === "email") return "outline";
    return "outline";
  };

  const hasFilters = Boolean(search || fromDate || toDate);

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / auditlogg</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Auditlogg
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            Senaste {events.length} händelser{hasFilters ? " — filtrerat" : ""}. Visar max 200 i taget.
          </p>
        </div>
      </div>

      {/* Sök + datumfilter — vanligt GET-formulär (server-renderad sida) */}
      <form className="au-filters" method="get">
        <div className="au-search">
          <input
            name="q"
            placeholder="Filtrera på åtgärd (t.ex. booking, payment, export)..."
            defaultValue={search ?? ""}
          />
        </div>
        <div className="au-dates">
          <label className="au-date-field">
            <span>Från</span>
            <input type="date" name="from" defaultValue={from ?? ""} />
          </label>
          <label className="au-date-field">
            <span>T.o.m.</span>
            <input type="date" name="to" defaultValue={to ?? ""} />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" style={{ padding: "10px 18px", fontSize: 13 }}>
          Filtrera
        </button>
        {hasFilters && (
          <Link href="/admin/audit" className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 12 }}>
            Rensa
          </Link>
        )}
      </form>

      <div className="adm-card">
        <div className="h">
          Händelser
          <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
            {events.length} st
          </span>
        </div>
        <div className="b dense">
          {events.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }} className="dim">
              {hasFilters
                ? "Inga händelser matchar filtret."
                : "Inga audit-händelser loggade ännu."}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table au-table">
                <thead>
                  <tr>
                    <th scope="col">Tidpunkt</th>
                    <th scope="col">Aktör</th>
                    <th scope="col">Åtgärd</th>
                    <th scope="col">Mål</th>
                    <th scope="col">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const actorName = e.actor?.name ?? null;
                    const actorEmail = e.actor?.email ?? e.actorEmail ?? null;
                    return (
                      <tr key={e.id}>
                        <td className="tnum mono" style={{ fontSize: 11.5 }}>
                          {fmtDateTime(e.createdAt)}
                        </td>
                        <td>
                          {actorName || actorEmail ? (
                            <>
                              {actorName && (
                                <strong style={{ fontFamily: "var(--f-serif)", fontSize: 13 }}>
                                  {actorName}
                                </strong>
                              )}
                              {actorEmail && (
                                <div className="dim" style={{ fontSize: 11 }}>{actorEmail}</div>
                              )}
                            </>
                          ) : (
                            <span className="dim">System</span>
                          )}
                        </td>
                        <td>
                          <span className={`adm-pill ${actionPillClass(e.action)}`} style={{ fontSize: 10 }}>
                            {ACTION_LABEL[e.action] ?? e.action}
                          </span>
                          <div className="mono dim" style={{ fontSize: 10, marginTop: 4 }}>{e.action}</div>
                        </td>
                        <td className="mono" style={{ fontSize: 11 }}>
                          {e.targetType ? (
                            <>
                              <span style={{ color: "var(--c-text-muted)" }}>{e.targetType}</span>
                              {e.targetId && (
                                <>
                                  <span className="dim">/</span>
                                  <span>{e.targetId.slice(0, 12)}</span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="dim">—</span>
                          )}
                        </td>
                        <td className="mono" style={{ fontSize: 11 }}>
                          {e.ipAddress ?? <span className="dim">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {events.length >= 200 && (
        <p className="dim" style={{ textAlign: "center", marginTop: 12, fontSize: 13 }}>
          Visar max 200 resultat. Snäva in med datumfilter eller åtgärdsfilter för äldre händelser.
        </p>
      )}

      <style>{`
        .au-filters {
          display: flex; gap: 10px; margin-bottom: 20px;
          flex-wrap: wrap; align-items: flex-end;
        }
        .au-search { flex: 1; min-width: 280px; }
        .au-search input {
          width: 100%; padding: 12px 16px;
          border: 1px solid var(--c-line); background: #fff;
          font-family: var(--f-sans); font-size: 14px;
        }
        .au-search input:focus { border-color: var(--c-ink); outline: none; box-shadow: 0 0 0 3px rgba(12,30,62,0.06); }
        .au-dates { display: flex; gap: 8px; }
        .au-date-field { display: flex; flex-direction: column; gap: 4px; }
        .au-date-field span {
          font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--c-text-muted); font-weight: 700;
        }
        .au-date-field input {
          padding: 10px 12px; border: 1px solid var(--c-line); background: #fff;
          font-family: var(--f-sans); font-size: 13px;
        }
        .au-date-field input:focus { border-color: var(--c-ink); outline: none; }

        .au-table { min-width: 900px; font-size: 12.5px; }
        .au-table th, .au-table td { padding: 10px 12px; vertical-align: top; }
        .au-table .mono { font-family: var(--f-mono); letter-spacing: 0.02em; white-space: nowrap; }
        .au-table .tnum { font-variant-numeric: tabular-nums; white-space: nowrap; }

        @media (max-width: 640px) {
          .au-filters { flex-direction: column; align-items: stretch; }
          .au-search { min-width: 0; }
          .au-dates { flex-direction: row; }
          .au-date-field { flex: 1; }
        }
      `}</style>
    </div>
  );
}
