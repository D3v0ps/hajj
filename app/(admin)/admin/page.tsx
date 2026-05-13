import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [packageCount, bookingCount, draftCount, leadCount, recentLeads, recentBookings] = await Promise.all([
    prisma.package.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "SUBMITTED" } }),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.booking.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { package: true, user: { select: { id: true, email: true, name: true } } },
    }),
  ]);

  return (
    <div>
      <span className="eyebrow gold">Översikt</span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 8 }}>Backoffice</h1>
      <p className="dim" style={{ marginBottom: 32 }}>Aktuella bokningar, leads och paketstatus.</p>

      <div className="kpi-grid">
        <div className="kpi"><div className="v">{packageCount}</div><div className="l">Paket totalt</div></div>
        <div className="kpi"><div className="v">{bookingCount}</div><div className="l">Bokningar totalt</div></div>
        <div className="kpi"><div className="v">{draftCount}</div><div className="l">Inkomna bokningar att granska</div></div>
        <div className="kpi"><div className="v">{leadCount}</div><div className="l">Nya leads</div></div>
      </div>

      <div className="adm-twocol">
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 20 }}>Senaste leads</h2>
            <Link href="/admin/leads" className="btn-link">Alla →</Link>
          </div>
          <ul className="al-list">
            {recentLeads.map((l) => (
              <li key={l.id}>
                <strong>{l.name}</strong>
                <span className="dim">{l.travelType ?? "—"} · {l.email}</span>
                <span className="dim" style={{ fontSize: 11 }}>{new Date(l.createdAt).toLocaleString("sv-SE")}</span>
              </li>
            ))}
            {recentLeads.length === 0 && <li className="dim">Inga leads ännu.</li>}
          </ul>
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 20 }}>Senaste bokningar</h2>
            <Link href="/admin/bokningar" className="btn-link">Alla →</Link>
          </div>
          <ul className="al-list">
            {recentBookings.map((b) => (
              <li key={b.id}>
                <strong>{b.package.title}</strong>
                <span className="dim">{b.user.email} · {b.status}</span>
                <span className="dim" style={{ fontSize: 11 }}>{new Date(b.updatedAt).toLocaleString("sv-SE")}</span>
              </li>
            ))}
            {recentBookings.length === 0 && <li className="dim">Inga bokningar ännu.</li>}
          </ul>
        </section>
      </div>

      <style>{`
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 40px; }
        .kpi { padding: 22px; background: #fff; border: 1px solid var(--c-line-soft); }
        .kpi .v { font-family: var(--f-serif); font-size: 36px; color: var(--c-ink); line-height: 1; }
        .kpi .l { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 700; margin-top: 8px; }
        .adm-twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .al-list { list-style: none; padding: 0; display: grid; gap: 8px; }
        .al-list li { padding: 12px 16px; background: #fff; border: 1px solid var(--c-line-soft); display: grid; gap: 4px; }
        .al-list strong { font-family: var(--f-serif); color: var(--c-ink); font-size: 16px; }
        @media (max-width: 900px) { .kpi-grid { grid-template-columns: 1fr 1fr; } .adm-twocol { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
