import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const PIPELINE_COLS = [
  { status: "SUBMITTED", label: "Mottagen", dot: "#B5894B" },
  { status: "REVIEW", label: "Granskas", dot: "#0C1E3E" },
  { status: "CONFIRMED", label: "Bekräftad", dot: "#2D4A3E" },
  { status: "PAID_DEPOSIT", label: "Reserv. betald", dot: "#3D6A4E" },
  { status: "PAID_FULL", label: "Slutbetald", dot: "#1a7a3a" },
  { status: "COMPLETED", label: "Genomförd", dot: "#166534" },
];

export default async function AdminDashboard() {
  const [
    totalBookings, newLeads, totalTravelers, revenue,
    bookings, recentLeads, upcomingTrips
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.traveler.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
    prisma.booking.findMany({
      include: {
        package: true,
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { travelers: true, payments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.lead.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.package.findMany({
      where: { status: "PUBLISHED", startDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      include: { _count: { select: { bookings: true } } },
      take: 5,
    }),
  ]);

  const pipelineData = PIPELINE_COLS.map((col) => ({
    ...col,
    bookings: bookings.filter((b) => b.status === col.status),
  }));

  const fmtKr = (n: number) => n.toLocaleString("sv-SE");

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / dashboard</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Översikt
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin/import" className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
            Importera Excel
          </Link>
          <Link href="/admin/paket/ny" className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 12 }}>
            + Nytt paket
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="adm-stats">
        <div className="adm-stat">
          <div className="l">Bokningar totalt</div>
          <div className="v">{totalBookings}</div>
        </div>
        <div className="adm-stat">
          <div className="l">Nya leads</div>
          <div className="v">{newLeads}</div>
          {newLeads > 0 && <div className="d warn">{newLeads} väntar</div>}
        </div>
        <div className="adm-stat">
          <div className="l">Resenärer totalt</div>
          <div className="v">{totalTravelers}</div>
        </div>
        <div className="adm-stat">
          <div className="l">Inkommet (betalningar)</div>
          <div className="v">{fmtKr(revenue._sum.amount ?? 0)} kr</div>
        </div>
      </div>

      {/* Two-column: pipeline + sidebar */}
      <div className="dash-two">
        {/* Pipeline / Kanban */}
        <div className="adm-card">
          <div className="h">
            Boknings-pipeline
            <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
              {bookings.length} aktiva
            </span>
          </div>
          <div className="b dense">
            <div className="pipeline">
              {pipelineData.map((col) => (
                <div key={col.status} className="pipe-col">
                  <div className="pipe-head">
                    <span className="pipe-dot" style={{ background: col.dot }} />
                    <span className="pipe-label">{col.label}</span>
                    <span className="pipe-count">{col.bookings.length}</span>
                  </div>
                  <div className="pipe-body">
                    {col.bookings.slice(0, 8).map((b) => (
                      <Link key={b.id} href={`/admin/bokningar/${b.id}`} className="pipe-card">
                        <div className="pipe-card-pkg">{b.package.title}</div>
                        <div className="pipe-card-name">{b.user.name ?? b.user.email}</div>
                        <div className="pipe-card-meta">
                          <span>{b._count.travelers} resenärer</span>
                          {b.totalAmount > 0 && (
                            <span className="tnum">{fmtKr(b.totalAmount)} kr</span>
                          )}
                        </div>
                      </Link>
                    ))}
                    {col.bookings.length === 0 && (
                      <div className="pipe-empty">Inga</div>
                    )}
                    {col.bookings.length > 8 && (
                      <div className="pipe-more">+{col.bookings.length - 8} till</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="dash-aside">
          {/* Upcoming trips */}
          <div className="adm-card">
            <div className="h">
              Kommande resor
              <Link href="/admin/resor" className="btn-link" style={{ fontSize: 11 }}>Alla →</Link>
            </div>
            <div className="b dense">
              {upcomingTrips.map((pkg) => (
                <Link key={pkg.id} href={`/admin/paket/${pkg.id}`} className="upcoming-row">
                  <div>
                    <strong>{pkg.title}</strong>
                    <span className="dim" style={{ fontSize: 12 }}>
                      {pkg.startDate ? new Date(pkg.startDate).toLocaleDateString("sv-SE") : "TBD"}
                      {" · "}{pkg._count.bookings} bokningar
                    </span>
                  </div>
                  <span className={`adm-pill ${pkg.status === "PUBLISHED" ? "ok" : "outline"}`}>
                    {pkg.status}
                  </span>
                </Link>
              ))}
              {upcomingTrips.length === 0 && (
                <div style={{ padding: 20, textAlign: "center" }} className="dim">
                  Inga kommande resor publicerade
                </div>
              )}
            </div>
          </div>

          {/* Recent leads */}
          <div className="adm-card">
            <div className="h">
              Senaste leads
              <Link href="/admin/leads" className="btn-link" style={{ fontSize: 11 }}>Alla →</Link>
            </div>
            <div className="b dense">
              {recentLeads.map((l) => (
                <div key={l.id} className="lead-row">
                  <div>
                    <strong>{l.name}</strong>
                    <span className="dim" style={{ fontSize: 12 }}>
                      {l.email} · {l.travelType ?? "Ej valt"}
                    </span>
                  </div>
                  <span className="dim" style={{ fontSize: 10, fontFamily: "var(--f-mono)" }}>
                    {new Date(l.createdAt).toLocaleDateString("sv-SE")}
                  </span>
                </div>
              ))}
              {recentLeads.length === 0 && (
                <div style={{ padding: 20, textAlign: "center" }} className="dim">
                  Inga nya leads
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .dash-two { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
        .dash-aside { display: flex; flex-direction: column; gap: 16px; }

        /* Pipeline */
        .pipeline {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0;
          min-height: 400px;
        }
        .pipe-col { border-right: 1px solid var(--c-line-soft); display: flex; flex-direction: column; }
        .pipe-col:last-child { border-right: 0; }
        .pipe-head {
          padding: 12px 14px;
          border-bottom: 1px solid var(--c-line-soft);
          display: flex; align-items: center; gap: 8px;
          background: var(--c-cream);
        }
        .pipe-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pipe-label { font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .pipe-count {
          margin-left: auto;
          font-family: var(--f-mono); font-size: 11px; color: var(--c-text-muted);
          background: var(--c-paper); padding: 2px 6px;
        }
        .pipe-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .pipe-card {
          padding: 10px 12px; background: var(--c-paper);
          border: 1px solid var(--c-line-soft); transition: all 120ms;
          display: flex; flex-direction: column; gap: 4px;
        }
        .pipe-card:hover { border-color: var(--c-ink); box-shadow: 0 2px 8px rgba(12,30,62,0.06); }
        .pipe-card-pkg {
          font-family: var(--f-mono); font-size: 10px; letter-spacing: 0.08em;
          color: var(--c-gold); text-transform: uppercase;
        }
        .pipe-card-name { font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); }
        .pipe-card-meta { display: flex; justify-content: space-between; font-size: 11px; color: var(--c-text-muted); }
        .pipe-empty { padding: 20px; text-align: center; color: var(--c-text-faint); font-size: 12px; }
        .pipe-more { padding: 8px; text-align: center; font-size: 11px; color: var(--c-gold); font-weight: 600; }

        /* Sidebar items */
        .upcoming-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid var(--c-line-soft);
          transition: background 120ms;
        }
        .upcoming-row:last-child { border-bottom: 0; }
        .upcoming-row:hover { background: var(--c-cream); }
        .upcoming-row strong { display: block; font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); margin-bottom: 2px; }

        .lead-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 20px;
          border-bottom: 1px solid var(--c-line-soft);
        }
        .lead-row:last-child { border-bottom: 0; }
        .lead-row strong { display: block; font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); margin-bottom: 2px; }

        @media (max-width: 1200px) {
          .pipeline { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 1024px) {
          .dash-two { grid-template-columns: 1fr; }
        }
        @media (max-width: 720px) {
          .pipeline { grid-template-columns: 1fr 1fr; }
          .pipe-head { padding: 10px 12px; }
        }
        @media (max-width: 480px) {
          .pipeline { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
