import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  SWISH: "Swish",
  KLARNA: "Klarna",
  CARD: "Kort",
  BANKGIRO: "Bankgiro",
  INVOICE: "Faktura",
};

const TYPE_LABELS: Record<string, string> = {
  HAJJ: "Hajj",
  OMRA: "Omra",
  HADJ_BADAL: "Hadj Badal",
  VISUM: "Visum",
};

const MONTHS_SV = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];
const MONTHS_SV_LONG = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;

export default async function BetalningarPage() {
  const now = new Date();

  // Fönster: senaste 12 månaderna (inkl. innevarande). Startar på första
  // dagen i månaden 11 månader bakåt så att vi får 12 hela kolumner.
  const monthsBack = 11;
  const windowStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

  const [
    completedAgg,
    pendingAgg,
    txCount,
    bookingsWithPaymentsCount,
    methodBreakdown,
    monthlyPayments,
    packages,
  ] = await Promise.all([
    // 1. Statistik — inkommet (COMPLETED) totalt
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "COMPLETED" },
    }),
    // Väntande (PENDING) totalt
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "PENDING" },
    }),
    // Antal transaktioner (alla)
    prisma.payment.count(),
    // Antal distinkta bokningar med minst en COMPLETED-betalning (för snitt)
    prisma.payment.groupBy({
      by: ["bookingId"],
      where: { status: "COMPLETED" },
    }),
    // 2. Grafer — fördelning per metod (endast COMPLETED räknas som intäkt)
    prisma.payment.groupBy({
      by: ["method"],
      _sum: { amount: true },
      _count: true,
      where: { status: "COMPLETED" },
    }),
    // Grafer — betalningar per månad (senaste 12 mån, COMPLETED).
    // Använder paidAt om satt, annars createdAt.
    prisma.payment.findMany({
      where: {
        status: "COMPLETED",
        OR: [
          { paidAt: { gte: windowStart } },
          { AND: [{ paidAt: null }, { createdAt: { gte: windowStart } }] },
        ],
      },
      select: { amount: true, paidAt: true, createdAt: true },
    }),
    // 3 + 4. Jämförelser per resa & år — paket med bokningar, resenärsantal och betalningar
    prisma.package.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        type: true,
        startDate: true,
        createdAt: true,
        bookings: {
          // Exkludera utkast och avbokade — de ska inte räknas som fakturerat.
          where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
          select: {
            id: true,
            totalAmount: true,
            _count: { select: { travelers: true } },
            payments: {
              where: { status: "COMPLETED" },
              select: { amount: true },
            },
          },
        },
      },
    }),
  ]);

  // ---- 1. STATISTIK ----
  const totalCompleted = completedAgg._sum.amount ?? 0;
  const completedCount = completedAgg._count ?? 0;
  const pendingTotal = pendingAgg._sum.amount ?? 0;
  const pendingCount = pendingAgg._count ?? 0;
  const paidBookingsCount = bookingsWithPaymentsCount.length;
  const avgPerBooking = paidBookingsCount > 0 ? totalCompleted / paidBookingsCount : 0;

  // ---- 2a. GRAF: per månad ----
  const monthBuckets: { key: string; label: string; year: number; total: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1);
    monthBuckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTHS_SV[d.getMonth()],
      year: d.getFullYear(),
      total: 0,
    });
  }
  const monthIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));
  for (const p of monthlyPayments) {
    const d = p.paidAt ?? p.createdAt;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) monthBuckets[idx].total += p.amount;
  }
  const maxMonth = Math.max(1, ...monthBuckets.map((b) => b.total));
  const monthlySum = monthBuckets.reduce((s, b) => s + b.total, 0);

  // ---- 2b. GRAF: metodfördelning ----
  const methodTotal = methodBreakdown.reduce((s, m) => s + (m._sum.amount ?? 0), 0);
  const methodRows = [...methodBreakdown]
    .map((m) => ({
      method: m.method,
      label: METHOD_LABELS[m.method] ?? m.method,
      amount: m._sum.amount ?? 0,
      count: typeof m._count === "number" ? m._count : 0,
      pct: methodTotal > 0 ? ((m._sum.amount ?? 0) / methodTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ---- 3. JÄMFÖRELSE PER RESA ----
  type TripRow = {
    id: string;
    slug: string;
    title: string;
    type: string;
    startDate: Date | null;
    invoiced: number;
    received: number;
    outstanding: number;
    bookings: number;
    travelers: number;
  };
  const tripRows: TripRow[] = packages
    .map((pkg) => {
      let invoiced = 0;
      let received = 0;
      let travelers = 0;
      for (const b of pkg.bookings) {
        invoiced += b.totalAmount;
        travelers += b._count.travelers;
        for (const pay of b.payments) received += pay.amount;
      }
      return {
        id: pkg.id,
        slug: pkg.slug,
        title: pkg.title,
        type: pkg.type,
        startDate: pkg.startDate,
        invoiced,
        received,
        outstanding: Math.max(0, invoiced - received),
        bookings: pkg.bookings.length,
        travelers,
      };
    })
    // Visa endast resor med någon ekonomisk aktivitet
    .filter((r) => r.bookings > 0 || r.invoiced > 0 || r.received > 0)
    .sort((a, b) => b.invoiced - a.invoiced);

  const maxInvoiced = Math.max(1, ...tripRows.map((r) => r.invoiced));
  const tripTotals = tripRows.reduce(
    (acc, r) => {
      acc.invoiced += r.invoiced;
      acc.received += r.received;
      acc.outstanding += r.outstanding;
      acc.bookings += r.bookings;
      acc.travelers += r.travelers;
      return acc;
    },
    { invoiced: 0, received: 0, outstanding: 0, bookings: 0, travelers: 0 },
  );

  // ---- 4. ÅR-MOT-ÅR (samma månad, olika år) ----
  // Gruppera resor på startmånad. Inom varje månad jämförs intäkt per år så att
  // t.ex. "Mars 2026" kan ställas mot "Mars 2025".
  type YearCell = { year: number; received: number; invoiced: number; trips: number };
  const monthGroups = new Map<number, { month: number; years: Map<number, YearCell> }>();
  for (const r of tripRows) {
    const d = r.startDate;
    if (!d) continue;
    const m = d.getMonth();
    const y = d.getFullYear();
    if (!monthGroups.has(m)) monthGroups.set(m, { month: m, years: new Map() });
    const grp = monthGroups.get(m)!;
    if (!grp.years.has(y)) grp.years.set(y, { year: y, received: 0, invoiced: 0, trips: 0 });
    const cell = grp.years.get(y)!;
    cell.received += r.received;
    cell.invoiced += r.invoiced;
    cell.trips += 1;
  }
  // Behåll endast månader som förekommer i fler än ett år (= faktisk jämförelse)
  const yoyGroups = [...monthGroups.values()]
    .map((g) => ({
      month: g.month,
      label: MONTHS_SV_LONG[g.month],
      years: [...g.years.values()].sort((a, b) => b.year - a.year),
    }))
    .filter((g) => g.years.length > 1)
    .sort((a, b) => a.month - b.month);
  const yoyMax = Math.max(
    1,
    ...yoyGroups.flatMap((g) => g.years.map((y) => y.received)),
  );

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / betalningar</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Betalningar &amp; analys
          </h1>
          <p className="dim" style={{ fontSize: 13, margin: "6px 0 0", color: "var(--c-text-muted)" }}>
            Översikt över betalningar per resa, trender och jämförelser mot tidigare år.
          </p>
        </div>
      </div>

      {/* ---------- 1. STATISTIK ---------- */}
      <div className="pay-stats">
        <div className="pay-stat big">
          <div className="l">Inkommet totalt</div>
          <div className="v tnum">{fmtKr(totalCompleted)}</div>
          <div className="d">{completedCount} genomförda betalningar</div>
        </div>
        <div className="adm-stat">
          <div className="l">Väntande</div>
          <div className="v tnum">{fmtKr(pendingTotal)}</div>
          <div className={`d ${pendingCount > 0 ? "warn" : ""}`}>{pendingCount} st att verifiera</div>
        </div>
        <div className="adm-stat">
          <div className="l">Transaktioner</div>
          <div className="v tnum">{txCount.toLocaleString("sv-SE")}</div>
          <div className="d">totalt registrerade</div>
        </div>
        <div className="adm-stat">
          <div className="l">Snitt per bokning</div>
          <div className="v tnum">{fmtKr(avgPerBooking)}</div>
          <div className="d">{paidBookingsCount} betalda bokningar</div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="pay-banner">
          <strong>{pendingCount} betalningar väntar på verifiering</strong>
          <span>
            Summa {fmtKr(pendingTotal)}. Kontrollera banken och markera som mottagen under bokningen.
          </span>
        </div>
      )}

      {/* ---------- 2. GRAFER ---------- */}
      <div className="pay-charts">
        {/* 2a. Per månad — vertikala staplar */}
        <div className="adm-card">
          <div className="h">
            Inkommet per månad
            <span className="hsub">Senaste 12 mån · {fmtKr(monthlySum)}</span>
          </div>
          <div className="b">
            {monthlySum > 0 ? (
              <div className="bars-v" role="img" aria-label="Stapeldiagram över inkomna betalningar per månad">
                {monthBuckets.map((b, i) => {
                  const h = b.total > 0 ? Math.max(2, (b.total / maxMonth) * 100) : 0;
                  const newYear = i === 0 || b.year !== monthBuckets[i - 1].year;
                  return (
                    <div key={b.key} className="bar-col" title={`${b.label} ${b.year}: ${fmtKr(b.total)}`}>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ height: `${h}%` }}>
                          {b.total > 0 && (
                            <span className="bar-val tnum">
                              {b.total >= 1000 ? `${Math.round(b.total / 1000)}k` : b.total}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bar-x">
                        {b.label}
                        {newYear && <em>{`’${String(b.year).slice(2)}`}</em>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty">Inga genomförda betalningar de senaste 12 månaderna.</p>
            )}
          </div>
        </div>

        {/* 2b. Metodfördelning — horisontella staplar */}
        <div className="adm-card">
          <div className="h">
            Fördelning per metod
            <span className="hsub">{methodRows.length} metoder</span>
          </div>
          <div className="b">
            {methodRows.length > 0 ? (
              <div className="bars-h">
                {methodRows.map((m) => (
                  <div key={m.method} className="hbar-row">
                    <div className="hbar-label">{m.label}</div>
                    <div className="hbar-track">
                      <div className="hbar-fill" style={{ width: `${Math.max(1.5, m.pct)}%` }} />
                    </div>
                    <div className="hbar-pct tnum">{Math.round(m.pct)}%</div>
                    <div className="hbar-amt tnum">{fmtKr(m.amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">Ingen metoddata ännu.</p>
            )}
          </div>
        </div>
      </div>

      {/* ---------- 3. JÄMFÖRELSE PER RESA ---------- */}
      <div className="adm-card">
        <div className="h">
          Jämförelse mellan resor
          <span className="hsub">{tripRows.length} resor med aktivitet</span>
        </div>
        <div className="b dense">
          <div className="table-wrap">
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th scope="col">Resa</th>
                  <th scope="col" style={{ width: "26%" }}>Inkommet av fakturerat</th>
                  <th scope="col" style={{ textAlign: "right" }}>Fakturerat</th>
                  <th scope="col" style={{ textAlign: "right" }}>Inkommet</th>
                  <th scope="col" style={{ textAlign: "right" }}>Utestående</th>
                  <th scope="col" style={{ textAlign: "right" }}>Bok.</th>
                  <th scope="col" style={{ textAlign: "right" }}>Resenärer</th>
                </tr>
              </thead>
              <tbody>
                {tripRows.map((r) => {
                  const collectPct = r.invoiced > 0 ? (r.received / r.invoiced) * 100 : 0;
                  const relWidth = (r.invoiced / maxInvoiced) * 100;
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/paket/${r.id}`} className="trip-name">
                          <strong>{r.title}</strong>
                          <span className="trip-meta">
                            <span className="adm-pill outline">{TYPE_LABELS[r.type] ?? r.type}</span>
                            {r.startDate && (
                              <span className="dim tnum">
                                {new Date(r.startDate).toLocaleDateString("sv-SE")}
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <div className="prog" title={`${Math.round(collectPct)}% inkommet`}>
                          <div className="prog-track" style={{ width: `${Math.max(2, relWidth)}%` }}>
                            <div
                              className="prog-fill"
                              style={{ width: `${Math.min(100, collectPct)}%` }}
                            />
                          </div>
                          <span className="prog-pct tnum">{Math.round(collectPct)}%</span>
                        </div>
                      </td>
                      <td className="tnum" style={{ textAlign: "right" }}>{fmtKr(r.invoiced)}</td>
                      <td className="tnum" style={{ textAlign: "right", color: "var(--c-green-soft)" }}>
                        {fmtKr(r.received)}
                      </td>
                      <td
                        className="tnum"
                        style={{ textAlign: "right", color: r.outstanding > 0 ? "var(--c-warn)" : "var(--c-text-muted)" }}
                      >
                        {fmtKr(r.outstanding)}
                      </td>
                      <td className="tnum" style={{ textAlign: "right" }}>{r.bookings}</td>
                      <td className="tnum" style={{ textAlign: "right" }}>{r.travelers}</td>
                    </tr>
                  );
                })}
                {tripRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty" style={{ textAlign: "center", padding: 32 }}>
                      Inga resor med betalningsaktivitet ännu.
                    </td>
                  </tr>
                )}
              </tbody>
              {tripRows.length > 0 && (
                <tfoot>
                  <tr>
                    <td style={{ fontWeight: 700, color: "var(--c-ink)" }}>Totalt</td>
                    <td></td>
                    <td className="tnum" style={{ textAlign: "right", fontWeight: 700 }}>{fmtKr(tripTotals.invoiced)}</td>
                    <td className="tnum" style={{ textAlign: "right", fontWeight: 700, color: "var(--c-green-soft)" }}>{fmtKr(tripTotals.received)}</td>
                    <td className="tnum" style={{ textAlign: "right", fontWeight: 700, color: tripTotals.outstanding > 0 ? "var(--c-warn)" : "var(--c-text-muted)" }}>{fmtKr(tripTotals.outstanding)}</td>
                    <td className="tnum" style={{ textAlign: "right", fontWeight: 700 }}>{tripTotals.bookings}</td>
                    <td className="tnum" style={{ textAlign: "right", fontWeight: 700 }}>{tripTotals.travelers}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* ---------- 4. ÅR MOT ÅR ---------- */}
      <div className="adm-card">
        <div className="h">
          Jämförelse mot tidigare års resor
          <span className="hsub">Samma månad, olika år</span>
        </div>
        <div className="b">
          {yoyGroups.length > 0 ? (
            <div className="yoy-grid">
              {yoyGroups.map((g) => {
                const newest = g.years[0];
                const prev = g.years[1];
                const delta =
                  prev && prev.received > 0
                    ? ((newest.received - prev.received) / prev.received) * 100
                    : null;
                return (
                  <div key={g.month} className="yoy-card">
                    <div className="yoy-head">
                      <span className="yoy-month">{g.label}</span>
                      {delta !== null && (
                        <span className={`adm-pill ${delta >= 0 ? "ok" : "warn"}`}>
                          {delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(delta))}%
                        </span>
                      )}
                    </div>
                    <div className="yoy-bars">
                      {g.years.map((y) => {
                        const w = y.received > 0 ? Math.max(2, (y.received / yoyMax) * 100) : 0;
                        const isNewest = y.year === newest.year;
                        return (
                          <div key={y.year} className="yoy-row">
                            <span className="yoy-year">{y.year}</span>
                            <div className="yoy-track">
                              <div
                                className={`yoy-fill ${isNewest ? "now" : ""}`}
                                style={{ width: `${w}%` }}
                              />
                            </div>
                            <span className="yoy-amt tnum">{fmtKr(y.received)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="yoy-foot dim">
                      {newest.trips} {newest.trips === 1 ? "resa" : "resor"} {newest.year}
                      {prev ? ` · ${prev.trips} ${prev.trips === 1 ? "resa" : "resor"} ${prev.year}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty">
              Det finns ännu inga resor i samma månad över flera år att jämföra. Jämförelser visas
              när minst två årgångar finns för samma månad.
            </p>
          )}
        </div>
      </div>

      <style>{`
        .dim { color: var(--c-text-muted); }
        .tnum { font-variant-numeric: tabular-nums; }
        .empty { color: var(--c-text-muted); font-size: 13px; margin: 0; padding: 12px 0; }

        .adm-card .h .hsub {
          font-family: var(--f-sans); font-size: 12px; font-weight: 600;
          color: var(--c-text-muted); letter-spacing: 0.02em;
        }

        /* ---- 1. Statistik ---- */
        .pay-stats {
          display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 12px; margin-bottom: 16px;
        }
        .pay-stat.big {
          padding: 22px 24px; background: var(--c-ink); color: #fff;
          border: 1px solid var(--c-ink); display: flex; flex-direction: column;
        }
        .pay-stat.big .l {
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--c-gold); font-weight: 700;
        }
        .pay-stat.big .v {
          font-family: var(--f-serif); font-size: 34px; color: #fff;
          margin-top: 8px; line-height: 1;
        }
        .pay-stat.big .d { font-size: 12px; color: #B9C4D6; margin-top: auto; padding-top: 10px; }
        .pay-stats .adm-stat .v { font-size: 24px; }

        /* ---- Banner ---- */
        .pay-banner {
          padding: 14px 18px; background: #FBE9E2;
          border: 1px solid var(--c-warn); border-left: 3px solid var(--c-warn);
          margin-bottom: 16px; display: flex; flex-direction: column; gap: 4px;
        }
        .pay-banner strong { color: var(--c-warn); font-size: 14px; }
        .pay-banner span { font-size: 12px; color: var(--c-ink); }

        /* ---- 2. Grafer ---- */
        .pay-charts {
          display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px;
          margin-bottom: 16px;
        }
        .pay-charts .adm-card { margin-bottom: 0; }

        /* 2a. Vertikala staplar */
        .bars-v {
          display: flex; align-items: flex-end; gap: 6px;
          height: 180px; padding-top: 18px;
        }
        .bar-col {
          flex: 1; min-width: 0; display: flex; flex-direction: column;
          align-items: center; height: 100%;
        }
        .bar-track {
          flex: 1; width: 100%; display: flex; align-items: flex-end;
          justify-content: center;
        }
        .bar-fill {
          width: 70%; max-width: 26px;
          background: linear-gradient(180deg, var(--c-gold-soft), var(--c-gold));
          border-radius: 3px 3px 0 0; position: relative; min-height: 2px;
          transition: height 200ms ease;
        }
        .bar-val {
          position: absolute; top: -16px; left: 50%; transform: translateX(-50%);
          font-size: 9px; color: var(--c-text-muted); white-space: nowrap;
          font-family: var(--f-mono);
        }
        .bar-x {
          font-size: 10px; color: var(--c-text-muted); margin-top: 6px;
          text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
          display: flex; flex-direction: column; align-items: center; line-height: 1.3;
        }
        .bar-x em { font-style: normal; font-weight: 700; color: var(--c-ink); font-size: 9px; }

        /* 2b. Horisontella staplar */
        .bars-h { display: flex; flex-direction: column; gap: 12px; }
        .hbar-row {
          display: grid; grid-template-columns: 64px 1fr 38px auto;
          gap: 10px; align-items: center;
        }
        .hbar-label { font-size: 13px; font-weight: 600; color: var(--c-ink); }
        .hbar-track { height: 10px; background: var(--c-cream); border-radius: 5px; overflow: hidden; }
        .hbar-fill {
          height: 100%; border-radius: 5px; min-width: 3px;
          background: linear-gradient(90deg, var(--c-gold-soft), var(--c-gold));
        }
        .hbar-pct { font-family: var(--f-mono); font-size: 12px; color: var(--c-text-muted); text-align: right; }
        .hbar-amt { font-size: 12px; color: var(--c-ink); text-align: right; white-space: nowrap; }

        /* ---- 3. Per-resa progressbar ---- */
        .trip-name { display: flex; flex-direction: column; gap: 4px; }
        .trip-name strong { font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); }
        .trip-meta { display: flex; align-items: center; gap: 8px; font-size: 11px; }
        .trip-meta .adm-pill { font-size: 9px; padding: 2px 6px; }

        .prog { display: flex; align-items: center; gap: 8px; }
        .prog-track {
          height: 16px; background: var(--c-cream); border-radius: 3px;
          overflow: hidden; min-width: 24px; flex-shrink: 1;
        }
        .prog-fill {
          height: 100%; background: var(--c-green-soft);
          border-radius: 3px; min-width: 2px; transition: width 200ms ease;
        }
        .prog-pct { font-family: var(--f-mono); font-size: 11px; color: var(--c-text-muted); flex-shrink: 0; }

        .table tfoot td {
          border-top: 2px solid var(--c-line); background: var(--c-paper);
        }

        /* ---- 4. År mot år ---- */
        .yoy-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .yoy-card {
          border: 1px solid var(--c-line-soft); padding: 14px 16px;
          background: var(--c-paper);
        }
        .yoy-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .yoy-month { font-family: var(--f-serif); font-size: 16px; color: var(--c-ink); }
        .yoy-bars { display: flex; flex-direction: column; gap: 8px; }
        .yoy-row { display: grid; grid-template-columns: 40px 1fr auto; gap: 8px; align-items: center; }
        .yoy-year { font-family: var(--f-mono); font-size: 11px; color: var(--c-text-muted); }
        .yoy-track { height: 12px; background: var(--c-cream); border-radius: 4px; overflow: hidden; }
        .yoy-fill {
          height: 100%; border-radius: 4px; min-width: 2px;
          background: var(--c-line); transition: width 200ms ease;
        }
        .yoy-fill.now { background: linear-gradient(90deg, var(--c-gold-soft), var(--c-gold)); }
        .yoy-amt { font-size: 11px; color: var(--c-ink); white-space: nowrap; }
        .yoy-foot { font-size: 11px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--c-line-soft); }

        /* ---- Responsivt ---- */
        @media (max-width: 1024px) {
          .pay-charts { grid-template-columns: 1fr; }
        }
        @media (max-width: 900px) {
          .pay-stats { grid-template-columns: 1fr 1fr; }
          .pay-stat.big { grid-column: 1 / -1; }
        }
        @media (max-width: 640px) {
          .pay-stats { grid-template-columns: 1fr; }
          .bars-v { gap: 3px; }
          .bar-val { display: none; }
          .hbar-row { grid-template-columns: 56px 1fr 34px; }
          .hbar-amt { display: none; }
          .yoy-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
