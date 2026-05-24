import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  SWISH: "Swish", KLARNA: "Klarna", CARD: "Kort",
  BANKGIRO: "Bankgiro", INVOICE: "Faktura",
};

export default async function BetalningarPage() {
  const [totals, overdue, payments, methodBreakdown] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    prisma.payment.findMany({
      where: { status: "PENDING" },
      include: { booking: { include: { user: { select: { name: true, email: true } }, package: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.findMany({
      include: {
        booking: {
          include: {
            user: { select: { name: true, email: true } },
            package: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.payment.groupBy({
      by: ["method"],
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const pendingTotal = overdue.reduce((s, p) => s + p.amount, 0);
  const totalCompleted = totals._sum.amount ?? 0;
  const totalAll = payments.reduce((s, p) => s + p.amount, 0);
  const fmtKr = (n: number) => n.toLocaleString("sv-SE");

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / betalningar</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Betalningar
          </h1>
        </div>
      </div>

      {/* Hero stats */}
      <div className="pay-hero">
        <div className="pay-hero-big">
          <div className="l">Inkommet totalt</div>
          <div className="v serif tnum">{fmtKr(totalCompleted)} kr</div>
        </div>
        <div className="pay-hero-stat">
          <div className="l">Väntande</div>
          <div className="v serif tnum">{overdue.length} st</div>
          <div className="d warn">{fmtKr(pendingTotal)} kr</div>
        </div>
        <div className="pay-hero-stat">
          <div className="l">Transaktioner</div>
          <div className="v serif tnum">{payments.length}</div>
        </div>
        <div className="pay-hero-stat">
          <div className="l">Metoder</div>
          <div className="v serif tnum">{methodBreakdown.length}</div>
        </div>
      </div>

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div className="overdue-banner">
          <strong>⚠ {overdue.length} betalningar väntar på verifiering</strong>
          <p className="dim" style={{ fontSize: 13, margin: "6px 0 0" }}>
            Kontrollera banken och markera som mottagen nedan.
          </p>
        </div>
      )}

      {/* Method breakdown */}
      {methodBreakdown.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 20 }}>
          <div className="h">Fördelning per metod</div>
          <div className="b">
            <div className="method-grid">
              {methodBreakdown.map((m) => {
                const pct = totalAll > 0 ? Math.round(((m._sum.amount ?? 0) / totalAll) * 100) : 0;
                return (
                  <div key={m.method} className="method-item">
                    <div className="method-label">{METHOD_LABELS[m.method] ?? m.method}</div>
                    <div className="method-bar">
                      <div className="method-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="method-pct">{pct}%</div>
                    <div className="method-amount tnum">{fmtKr(m._sum.amount ?? 0)} kr</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Transaction table */}
      <div className="adm-card">
        <div className="h">
          Transaktioner
          <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
            Senaste {payments.length}
          </span>
        </div>
        <div className="b dense">
          <div className="table-wrap">
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th scope="col" style={{ width: 8 }}></th>
                <th scope="col">Datum</th>
                <th scope="col">Kund / bokning</th>
                <th scope="col">Metod</th>
                <th scope="col">Referens</th>
                <th scope="col">Belopp</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span
                      className="tx-dot"
                      style={{
                        background: p.status === "COMPLETED" ? "var(--c-green-soft)"
                          : p.status === "PENDING" ? "var(--c-gold)"
                          : p.status === "FAILED" ? "var(--c-warn)"
                          : "var(--c-text-muted)",
                      }}
                    />
                  </td>
                  <td className="tnum" style={{ fontFamily: "var(--f-mono)", fontSize: 12 }}>
                    {new Date(p.createdAt).toLocaleDateString("sv-SE")}
                  </td>
                  <td>
                    <Link href={`/admin/bokningar/${p.bookingId}`} className="tx-customer">
                      <strong>{p.booking.user.name ?? p.booking.user.email}</strong>
                      <span className="dim" style={{ fontSize: 11 }}>{p.booking.package.title}</span>
                    </Link>
                  </td>
                  <td>{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>{p.reference ?? "—"}</td>
                  <td className="tnum" style={{ fontWeight: 600 }}>
                    {fmtKr(p.amount)} kr
                  </td>
                  <td>
                    <span className={`adm-pill ${
                      p.status === "COMPLETED" ? "ok"
                        : p.status === "PENDING" ? "gold"
                        : p.status === "FAILED" ? "warn"
                        : "outline"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={7} className="dim" style={{ padding: 32, textAlign: "center" }}>Inga transaktioner</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <style>{`
        .pay-hero {
          display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr;
          gap: 12px; margin-bottom: 20px;
        }
        .pay-hero-big, .pay-hero-stat {
          padding: 22px 24px; background: #fff; border: 1px solid var(--c-line-soft);
        }
        .pay-hero-big {
          background: var(--c-ink); color: #fff; border-color: var(--c-ink);
        }
        .pay-hero-big .l { color: var(--c-gold); }
        .pay-hero-big .v { font-size: 36px; color: #fff; margin-top: 8px; }
        .pay-hero-stat .l { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 700; }
        .pay-hero-stat .v { font-family: var(--f-serif); font-size: 28px; color: var(--c-ink); margin-top: 6px; }
        .pay-hero-stat .d { font-size: 11px; margin-top: 4px; }
        .pay-hero-stat .d.warn { color: var(--c-warn); }

        .overdue-banner {
          padding: 16px 20px; background: #FBE9E2;
          border: 1px solid var(--c-warn); border-left: 3px solid var(--c-warn);
          margin-bottom: 20px;
        }
        .overdue-banner strong { color: var(--c-warn); font-size: 14px; }

        .method-grid { display: grid; gap: 10px; }
        .method-item {
          display: grid; grid-template-columns: 100px 1fr 50px 120px;
          gap: 12px; align-items: center;
        }
        .method-label { font-size: 13px; font-weight: 600; color: var(--c-ink); }
        .method-bar { height: 8px; background: var(--c-cream); border-radius: 4px; overflow: hidden; }
        .method-fill { height: 100%; background: var(--c-gold); border-radius: 4px; min-width: 2px; }
        .method-pct { font-family: var(--f-mono); font-size: 12px; color: var(--c-text-muted); text-align: right; }
        .method-amount { font-size: 13px; text-align: right; color: var(--c-ink); }

        .tx-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
        .tx-customer { display: flex; flex-direction: column; gap: 2px; }
        .tx-customer strong { font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); }

        @media (max-width: 900px) {
          .pay-hero { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .pay-hero { grid-template-columns: 1fr; }
          .method-item { grid-template-columns: 80px 1fr 40px; }
          .method-amount { display: none; }
        }
      `}</style>
    </div>
  );
}
