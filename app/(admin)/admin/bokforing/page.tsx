import {
  fetchPaymentsForPeriod,
  parsePeriod,
  summarizePeriod,
  SUGGESTED_ACCOUNT_VMB,
} from "@/app/actions/bookkeeping";

export const dynamic = "force-dynamic";

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;
const fmtDate = (d: Date) => d.toLocaleDateString("sv-SE");
const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const METHOD_LABELS: Record<string, string> = {
  SWISH: "Swish",
  KLARNA: "Klarna",
  CARD: "Kort",
  BANKGIRO: "Bankgiro",
  INVOICE: "Faktura",
};

type Search = { [key: string]: string | string[] | undefined };

/**
 * Admin/Staff väljer en period (default = innevarande månad), ser en preview
 * (antal verifikat + totalsumma + lista) och kan ladda ner CSV eller SIE4
 * för manuell import i Fortnox/Visma/Bokio.
 *
 * Filerna serveras via /api/bookkeeping/{csv,sie}?from=YYYY-MM-DD&to=YYYY-MM-DD
 * eftersom server actions inte kan returnera filer på ett bra sätt.
 */
export default async function BokforingPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const fromRaw = typeof sp.from === "string" ? sp.from : "";
  const toRaw = typeof sp.to === "string" ? sp.to : "";

  const period = await parsePeriod({ from: fromRaw, to: toRaw });
  const [rows, summary] = await Promise.all([
    fetchPaymentsForPeriod(period.from, period.to),
    summarizePeriod(period.from, period.to),
  ]);

  const fromIso = isoDate(period.from);
  const toIso = isoDate(period.to);
  const downloadQuery = `?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;

  // Bryt ner per metod för en mer informativ preview
  const byMethod = new Map<string, { count: number; total: number }>();
  for (const r of rows) {
    const m = byMethod.get(r.method) ?? { count: 0, total: 0 };
    m.count += 1;
    m.total += r.amount;
    byMethod.set(r.method, m);
  }
  const methodRows = [...byMethod.entries()]
    .map(([method, v]) => ({
      method,
      label: METHOD_LABELS[method] ?? method,
      count: v.count,
      total: v.total,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / bokföring</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Bokföringsexport
          </h1>
          <p className="dim" style={{ fontSize: 13, margin: "6px 0 0", color: "var(--c-text-muted)" }}>
            Ladda ner alla genomförda betalningar i en period som CSV eller SIE4 för
            manuell import hos revisorn. Ingen automatisk koppling till Fortnox ännu.
          </p>
        </div>
      </div>

      {/* Periodval — GET-formulär så att perioden hamnar i URL:en och
          nedladdningslänkarna kan referera samma värden. */}
      <div className="adm-card">
        <div className="h">
          Välj period
          <span className="hsub">Default: innevarande månad</span>
        </div>
        <div className="b">
          <form method="get" className="period-form">
            <div className="period-field">
              <label htmlFor="from">Från</label>
              <input
                type="date"
                id="from"
                name="from"
                defaultValue={fromIso}
                max={toIso}
              />
            </div>
            <div className="period-field">
              <label htmlFor="to">Till</label>
              <input
                type="date"
                id="to"
                name="to"
                defaultValue={toIso}
                min={fromIso}
              />
            </div>
            <div className="period-actions">
              <button type="submit" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
                Uppdatera period
              </button>
            </div>
          </form>
          <p className="dim" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            Visad period: <strong>{fmtDate(period.from)}</strong> – <strong>{fmtDate(period.to)}</strong>
          </p>
        </div>
      </div>

      {/* Preview-statistik */}
      <div className="bk-stats">
        <div className="adm-stat">
          <div className="l">Verifikat</div>
          <div className="v tnum">{summary.count.toLocaleString("sv-SE")}</div>
          <div className="d">COMPLETED-betalningar i perioden</div>
        </div>
        <div className="adm-stat">
          <div className="l">Totalsumma</div>
          <div className="v tnum">{fmtKr(summary.total)}</div>
          <div className="d">brutto, exkl. VMB-marginalberäkning</div>
        </div>
        <div className="adm-stat">
          <div className="l">Föreslaget konto</div>
          <div className="v tnum">{SUGGESTED_ACCOUNT_VMB}</div>
          <div className="d">Försäljning resebyrå VMB (BAS)</div>
        </div>
      </div>

      {/* Nedladdningar */}
      <div className="adm-card">
        <div className="h">
          Ladda ner
          <span className="hsub">Filer öppnas direkt — ingen e-post skickas</span>
        </div>
        <div className="b">
          <div className="dl-grid">
            <div className="dl-card">
              <div className="dl-format">CSV</div>
              <p className="dim" style={{ fontSize: 13, margin: "4px 0 12px" }}>
                Kommaseparerad fil (semikolon, UTF-8 med BOM). Öppnas direkt i Excel
                med korrekta svenska tecken. Enklast att granska för hand.
              </p>
              <a
                href={`/api/bookkeeping/csv${downloadQuery}`}
                className={`btn btn-primary ${summary.count === 0 ? "btn-disabled" : ""}`}
                style={{ padding: "10px 16px", fontSize: 13 }}
                aria-disabled={summary.count === 0}
              >
                Hämta CSV ↓
              </a>
            </div>
            <div className="dl-card">
              <div className="dl-format">SIE4</div>
              <p className="dim" style={{ fontSize: 13, margin: "4px 0 12px" }}>
                Svensk standard (.se-fil). Importeras direkt i Fortnox, Visma
                eAccounting, Bokio och SpeedLedger. Genererar en verifikation
                per betalning med debet/kredit-rader.
              </p>
              <a
                href={`/api/bookkeeping/sie${downloadQuery}`}
                className={`btn btn-gold ${summary.count === 0 ? "btn-disabled" : ""}`}
                style={{ padding: "10px 16px", fontSize: 13 }}
                aria-disabled={summary.count === 0}
              >
                Hämta SIE4 ↓
              </a>
            </div>
          </div>

          {summary.count === 0 && (
            <p className="empty" style={{ marginTop: 16 }}>
              Inga genomförda betalningar i den valda perioden. Justera datumen
              eller markera fler betalningar som mottagna under bokningen.
            </p>
          )}
        </div>
      </div>

      {/* VMB-notering */}
      <div className="vmb-note">
        <strong>Vinstmarginalbeskattning (VMB)</strong>
        <p>
          Som resebyrå tillämpar Hadj Omra Resor vinstmarginalbeskattning enligt
          mervärdesskattelagen kapitel 19a. Det innebär att moms beräknas på
          marginalen (försäljning minus inköp av resetjänster), inte på hela
          bruttobeloppet. Försäljning bokförs på konto <strong>{SUGGESTED_ACCOUNT_VMB}</strong>{" "}
          (Försäljning resebyrå VMB) — men kontonumret är ett <em>förslag</em> och ska
          alltid bekräftas av revisor innan importen körs skarpt.
        </p>
      </div>

      {/* Preview-tabell */}
      {rows.length > 0 && (
        <div className="adm-card">
          <div className="h">
            Preview
            <span className="hsub">
              {rows.length} {rows.length === 1 ? "verifikat" : "verifikat"} · visar max 50 första
            </span>
          </div>
          <div className="b dense">
            <div className="table-wrap">
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th scope="col">Datum</th>
                    <th scope="col">Ver.nr</th>
                    <th scope="col">Bokning</th>
                    <th scope="col">Kund</th>
                    <th scope="col">Paket</th>
                    <th scope="col">Metod</th>
                    <th scope="col" style={{ textAlign: "right" }}>Belopp</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r) => (
                    <tr key={r.id}>
                      <td className="tnum">{isoDate(r.paidAt)}</td>
                      <td className="tnum" style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>
                        {r.verNo}
                      </td>
                      <td className="tnum" style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>
                        {r.bookingRef.slice(-10).toUpperCase()}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                          <span>{r.customerName || "—"}</span>
                          <span className="dim" style={{ fontSize: 10 }}>{r.customerEmail}</span>
                        </div>
                      </td>
                      <td>{r.packageTitle}</td>
                      <td>
                        <span className="adm-pill outline">{r.methodLabel}</span>
                      </td>
                      <td className="tnum" style={{ textAlign: "right" }}>{fmtKr(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ fontWeight: 700, color: "var(--c-ink)", textAlign: "right" }}>
                      Totalsumma
                    </td>
                    <td className="tnum" style={{ textAlign: "right", fontWeight: 700 }}>
                      {fmtKr(summary.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {rows.length > 50 && (
              <p className="dim" style={{ fontSize: 12, padding: "12px 20px 16px", margin: 0 }}>
                … plus {rows.length - 50} fler rader i exporten.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Metodfördelning */}
      {methodRows.length > 0 && (
        <div className="adm-card">
          <div className="h">
            Fördelning per metod
            <span className="hsub">i perioden</span>
          </div>
          <div className="b dense">
            <div className="table-wrap">
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th scope="col">Metod</th>
                    <th scope="col" style={{ textAlign: "right" }}>Antal</th>
                    <th scope="col" style={{ textAlign: "right" }}>Belopp</th>
                  </tr>
                </thead>
                <tbody>
                  {methodRows.map((m) => (
                    <tr key={m.method}>
                      <td>{m.label}</td>
                      <td className="tnum" style={{ textAlign: "right" }}>{m.count}</td>
                      <td className="tnum" style={{ textAlign: "right" }}>{fmtKr(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dim { color: var(--c-text-muted); }
        .tnum { font-variant-numeric: tabular-nums; }
        .empty { color: var(--c-text-muted); font-size: 13px; margin: 0; padding: 12px 0; }

        .adm-card .h .hsub {
          font-family: var(--f-sans); font-size: 12px; font-weight: 600;
          color: var(--c-text-muted); letter-spacing: 0.02em;
        }

        /* Periodform */
        .period-form {
          display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end;
        }
        .period-field { display: flex; flex-direction: column; gap: 6px; min-width: 160px; }
        .period-field label {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          font-weight: 700; color: var(--c-text-muted);
        }
        .period-field input[type="date"] {
          padding: 9px 11px; font-size: 13px; border: 1px solid var(--c-line);
          background: #fff; font-family: var(--f-sans); color: var(--c-ink);
        }
        .period-field input[type="date"]:focus {
          outline: none; border-color: var(--c-ink);
        }
        .period-actions { display: flex; align-items: flex-end; }

        /* Statistik */
        .bk-stats {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin-bottom: 16px;
        }
        .bk-stats .adm-stat .v { font-size: 26px; }

        /* Nedladdningskort */
        .dl-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        .dl-card {
          padding: 18px 20px; background: var(--c-paper);
          border: 1px solid var(--c-line-soft);
        }
        .dl-format {
          font-family: var(--f-mono); font-size: 11px; font-weight: 700;
          letter-spacing: 0.14em; color: var(--c-gold); text-transform: uppercase;
          margin-bottom: 4px;
        }
        .btn-disabled {
          opacity: 0.4; pointer-events: none; cursor: not-allowed;
        }

        /* VMB-not */
        .vmb-note {
          padding: 16px 18px; background: #FFF7E6;
          border: 1px solid #E8C778; border-left: 3px solid var(--c-gold);
          margin-bottom: 16px;
        }
        .vmb-note strong {
          display: block; font-family: var(--f-serif); font-size: 14px;
          color: var(--c-ink); margin-bottom: 6px;
        }
        .vmb-note p {
          font-size: 13px; line-height: 1.5; color: var(--c-ink); margin: 0;
        }

        /* Responsivt */
        @media (max-width: 1024px) {
          .dl-grid { grid-template-columns: 1fr; }
          .bk-stats { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .period-form { flex-direction: column; align-items: stretch; }
          .period-field { min-width: 0; }
        }
      `}</style>
    </div>
  );
}
