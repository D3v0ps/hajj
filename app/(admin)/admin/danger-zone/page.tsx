import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wipeBusinessData } from "@/app/actions/wipe-data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ wiped?: string; error?: string }>;

export default async function DangerZonePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  // STAFF får inte se ens sidan — totalrensning är bara för ADMIN.
  if (session.user.role !== "ADMIN") redirect("/admin");

  const { wiped, error } = await searchParams;

  // Räkna nuvarande tillstånd så admin ser exakt vad som försvinner.
  const [
    nBookings, nPackages, nTravelers, nProfiles, nPayments, nDocs,
    nMessages, nEmailSends, nTemplates, nLeads, nCustomers,
    nAudit,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.package.count(),
    prisma.traveler.count(),
    prisma.travelerProfile.count(),
    prisma.payment.count(),
    prisma.document.count(),
    prisma.message.count(),
    prisma.emailSend.count(),
    prisma.emailTemplate.count(),
    prisma.lead.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.auditLog.count(),
  ]);

  const nStaff = await prisma.user.count({ where: { role: { in: ["ADMIN", "STAFF"] } } });

  const items: { label: string; count: number; fate: "wipe" | "keep" }[] = [
    { label: "Bokningar", count: nBookings, fate: "wipe" },
    { label: "Paket + prisklasser", count: nPackages, fate: "wipe" },
    { label: "Resenärer (i bokningar)", count: nTravelers, fate: "wipe" },
    { label: "Sparade resenärsprofiler", count: nProfiles, fate: "wipe" },
    { label: "Betalningar", count: nPayments, fate: "wipe" },
    { label: "Dokument-rader", count: nDocs, fate: "wipe" },
    { label: "Meddelanden", count: nMessages, fate: "wipe" },
    { label: "Köade/skickade mejl", count: nEmailSends, fate: "wipe" },
    { label: "E-postmallar", count: nTemplates, fate: "wipe" },
    { label: "Leads", count: nLeads, fate: "wipe" },
    { label: "Kundkonton (CUSTOMER)", count: nCustomers, fate: "wipe" },
    { label: "Auditlogg-rader", count: nAudit, fate: "wipe" },
    { label: "Admin-/STAFF-konton", count: nStaff, fate: "keep" },
  ];

  const totalToWipe = items.filter((i) => i.fate === "wipe").reduce((s, i) => s + i.count, 0);

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / danger zone</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-warn)", margin: 0 }}>
            Rensa all affärsdata
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            Permanent radering. Bara ADMIN ser denna sida.
          </p>
        </div>
        <Link href="/admin" className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
          ← Tillbaka
        </Link>
      </div>

      {wiped && (
        <div role="status" className="dz-banner ok">
          ✓ All affärsdata är raderad. Du kan nu starta om från noll genom att importera Excel-fil under <Link href="/admin/import" className="btn-link">Importera</Link>.
        </div>
      )}
      {error && (
        <div role="alert" className="dz-banner err">{error}</div>
      )}

      {!wiped && (
        <>
          <div className="dz-warn">
            <strong>⚠ Detta går inte att ångra utan databas-restore.</strong>
            <p style={{ marginTop: 8 }}>
              Nattlig backup finns i Docker-volymen <code>db-backups</code> på servern
              (max ~24h gammal). Om du vill ha en färsk dump innan rensning, säg till
              först så bygger jag in en knapp för det.
            </p>
          </div>

          <div className="adm-card" style={{ marginTop: 20 }}>
            <div className="h">Vad försvinner / vad behålls</div>
            <div className="b">
              <table className="dz-table">
                <thead>
                  <tr>
                    <th>Modell</th>
                    <th style={{ textAlign: "right" }}>Antal rader nu</th>
                    <th>Öde</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.label} className={i.fate === "keep" ? "keep" : ""}>
                      <td>{i.label}</td>
                      <td className="tnum" style={{ textAlign: "right" }}>{i.count.toLocaleString("sv-SE")}</td>
                      <td>
                        {i.fate === "wipe" ? (
                          <span className="adm-pill warn">RADERAS</span>
                        ) : (
                          <span className="adm-pill ok">BEHÅLLS</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid var(--c-warn)" }}>
                    <td><strong>Totalt att radera</strong></td>
                    <td className="tnum" style={{ textAlign: "right" }}><strong>{totalToWipe.toLocaleString("sv-SE")} rader</strong></td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="adm-card" style={{ marginTop: 20, borderColor: "var(--c-warn)" }}>
            <div className="h" style={{ color: "var(--c-warn)" }}>Bekräfta</div>
            <div className="b">
              <p style={{ marginBottom: 16, fontSize: 14 }}>
                Skriv exakt <code className="dz-code">RADERA ALLT</code> i fältet nedan och klicka på knappen.
              </p>
              <form action={wipeBusinessData} className="dz-form">
                <input
                  type="text"
                  name="confirmation"
                  placeholder="RADERA ALLT"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  aria-label="Bekräftelseord"
                />
                <button type="submit" className="btn dz-submit">
                  Rensa all affärsdata permanent
                </button>
              </form>
              <p className="dim" style={{ fontSize: 12, marginTop: 14 }}>
                Tips: efter rensning, gå till <Link href="/admin/import" className="btn-link">Importera</Link>
                {" "}och ladda upp din Excel-fil för att fylla på med ny data.
              </p>
            </div>
          </div>
        </>
      )}

      <style>{`
        .dz-banner { padding: 14px 18px; margin-bottom: 16px; font-size: 14px; border: 1px solid; }
        .dz-banner.ok { background: #E6F1EA; border-color: var(--c-green-soft); color: var(--c-green); }
        .dz-banner.err { background: #FBE9E2; border-color: var(--c-warn); color: var(--c-warn); }
        .dz-warn {
          padding: 18px 22px; background: #FBE9E2; border: 2px solid var(--c-warn);
          color: var(--c-warn); font-size: 14px;
        }
        .dz-warn strong { font-size: 16px; }
        .dz-warn code { background: #fff; padding: 2px 8px; border: 1px solid var(--c-warn); color: var(--c-warn); }
        .dz-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .dz-table th { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--c-line); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 700; }
        .dz-table td { padding: 10px 12px; border-bottom: 1px solid var(--c-line-soft); }
        .dz-table tr.keep td { background: #F4FAF6; }
        .dz-form { display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap; }
        .dz-form input {
          flex: 1; min-width: 200px;
          padding: 12px 16px; border: 2px solid var(--c-warn); background: #fff;
          font-family: var(--f-mono); font-size: 14px; letter-spacing: 0.05em;
        }
        .dz-form input:focus { outline: 2px solid var(--c-warn); outline-offset: -1px; }
        .dz-submit {
          background: var(--c-warn); color: #fff; border: 2px solid var(--c-warn);
          padding: 12px 22px; font-weight: 700; cursor: pointer;
        }
        .dz-submit:hover { background: #7a3520; }
        .dz-code { background: var(--c-cream); padding: 2px 8px; font-family: var(--f-mono); font-weight: 700; }
        @media (max-width: 640px) {
          .dz-form { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
