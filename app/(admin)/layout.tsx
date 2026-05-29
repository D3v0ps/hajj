import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const NAV = [
  {
    label: "Översikt",
    items: [
      { href: "/admin", label: "Dashboard", icon: "◉" },
      { href: "/admin/bokningar", label: "Bokningar", icon: "☰" },
      { href: "/admin/leads", label: "Hajj intresseanmälan", icon: "✦" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/paket", label: "Resor & paket", icon: "✈" },
      { href: "/admin/resegrupper", label: "Resegrupper", icon: "⊞" },
      { href: "/admin/resenarer", label: "Resenärer", icon: "◎" },
      { href: "/admin/betalningar", label: "Betalningar", icon: "₪" },
      { href: "/admin/recensioner", label: "Omdömen", icon: "★" },
      { href: "/admin/bokforing", label: "Bokföring", icon: "Σ" },
    ],
  },
  {
    label: "Kommunikation",
    items: [
      { href: "/admin/mejl", label: "Mejlmallar", icon: "✉" },
      { href: "/admin/mejl/skicka", label: "Nytt utskick", icon: "➤" },
    ],
  },
  {
    label: "Verktyg",
    items: [
      { href: "/admin/import", label: "Excel-import", icon: "↥" },
    ],
  },
  // System placeras längst ner och får dämpad stil — sällan använt, men måste
  // finnas tillgängligt för admin/staff (auditlogg för spårbarhet av åtgärder).
  {
    label: "System",
    muted: true,
    items: [
      { href: "/admin/audit", label: "Auditlogg", icon: "◌" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <Link href="/" className="adm-brand">
          <span className="adm-mark" lang="ar" aria-hidden="true">ح</span>
          <span className="adm-name">
            Hadj Omra
            <small>Backoffice</small>
          </span>
        </Link>

        <nav className="adm-nav-wrap">
          {NAV.map((group) => (
            <div
              key={group.label}
              className={`adm-section${"muted" in group && group.muted ? " adm-section-muted" : ""}`}
            >
              <span className="adm-section-label">{group.label}</span>
              <div className="adm-nav-group">
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className="adm-link">
                    <span className="adm-link-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="adm-user">
          <div className="adm-user-info">
            <span className="adm-user-name">{session.user.name ?? session.user.email}</span>
            <span className="adm-user-role">{session.user.role}</span>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button type="submit" className="adm-logout">Logga ut</button>
          </form>
        </div>
      </aside>

      <div className="adm-main-wrap">
        <main className="adm-main">{children}</main>
      </div>

      <style>{`
        .adm-shell { min-height: 100vh; display: grid; grid-template-columns: 220px 1fr; }

        /* Sidebar */
        .adm-side {
          background: #0A1830;
          color: #8B9AB8;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          padding: 0;
        }
        .adm-brand {
          display: flex; align-items: center; gap: 12px;
          padding: 22px 20px;
          border-bottom: 1px solid #152545;
          flex-shrink: 0;
        }
        .adm-mark {
          width: 32px; height: 32px;
          border: 1px solid var(--c-gold);
          display: grid; place-items: center;
          color: var(--c-gold);
          font-family: var(--f-serif); font-size: 18px;
        }
        .adm-name {
          font-family: var(--f-serif); font-size: 15px; color: #fff; line-height: 1;
        }
        .adm-name small {
          display: block; font-family: var(--f-sans); font-size: 9px;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--c-gold); margin-top: 4px; font-weight: 700;
        }

        /* Nav */
        .adm-nav-wrap {
          flex: 1; padding: 12px 0; overflow-y: auto;
          display: flex; flex-direction: column;
        }
        .adm-section { padding: 0 0 8px; }
        /* "System"-sektionen (auditlogg m.fl.) skjuts ner och dämpas — sällan
           använt men måste finnas tillgängligt för spårbarhet. */
        .adm-section-muted { margin-top: auto; opacity: 0.7; }
        .adm-section-muted .adm-link { font-size: 12px; }
        .adm-section-label {
          display: block; padding: 12px 20px 6px;
          font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
          font-weight: 700; color: #4A6080;
        }
        .adm-nav-group { display: flex; flex-direction: column; }
        .adm-link {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 20px;
          font-size: 13px; color: #8B9AB8;
          border-left: 2px solid transparent;
          transition: all 120ms;
          min-height: 36px;
        }
        .adm-link:hover {
          color: #fff;
          background: rgba(181,137,75,0.08);
          border-left-color: var(--c-gold);
        }
        .adm-link-icon {
          width: 18px; text-align: center;
          font-size: 14px; opacity: 0.6;
        }

        /* User */
        .adm-user {
          padding: 16px 20px;
          border-top: 1px solid #152545;
          flex-shrink: 0;
          display: flex; justify-content: space-between; align-items: center;
        }
        .adm-user-info { display: flex; flex-direction: column; gap: 2px; }
        .adm-user-name { font-size: 12px; color: #C3CCD8; font-weight: 600; }
        .adm-user-role {
          font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--c-gold); font-weight: 700;
        }
        .adm-logout {
          background: transparent; border: 1px solid #2A3F62; color: #8B9AB8;
          padding: 5px 10px; font-size: 11px; cursor: pointer;
          font-family: var(--f-sans);
        }
        .adm-logout:hover { border-color: var(--c-gold); color: #fff; }

        /* Main */
        .adm-main-wrap { background: var(--c-paper); min-height: 100vh; }
        .adm-main { padding: 28px 32px; max-width: 1440px; }

        /* Shared admin components */
        .adm-pageframe { }
        .adm-pagehead {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 16px; flex-wrap: wrap; margin-bottom: 24px;
        }
        .adm-crumb {
          font-family: var(--f-mono); font-size: 11px; color: var(--c-text-muted);
          letter-spacing: 0.08em; margin-bottom: 8px;
        }
        .adm-stats {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px; margin-bottom: 24px;
        }
        .adm-stat {
          padding: 18px 20px; background: #fff;
          border: 1px solid var(--c-line-soft);
        }
        .adm-stat .l {
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--c-text-muted); font-weight: 700; margin-bottom: 6px;
        }
        .adm-stat .v {
          font-family: var(--f-serif); font-size: 28px; color: var(--c-ink);
          font-weight: 460; line-height: 1;
        }
        .adm-stat .d { font-size: 11px; margin-top: 6px; }
        .adm-stat .d.up { color: var(--c-green-soft); }
        .adm-stat .d.warn { color: var(--c-warn); }

        .adm-card {
          background: #fff; border: 1px solid var(--c-line-soft);
          margin-bottom: 16px;
        }
        .adm-card .h {
          padding: 14px 20px;
          border-bottom: 1px solid var(--c-line-soft);
          display: flex; justify-content: space-between; align-items: center;
          font-family: var(--f-serif); font-size: 16px; color: var(--c-ink);
        }
        .adm-card .b { padding: 20px; }
        .adm-card .b.dense { padding: 0; }

        .adm-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; font-size: 10px; letter-spacing: 0.1em;
          text-transform: uppercase; font-weight: 700; border-radius: 2px;
        }
        .adm-pill.ok { background: #E6F1EA; color: var(--c-green); }
        .adm-pill.warn { background: #FBE9E2; color: var(--c-warn); }
        .adm-pill.info { background: var(--c-ink); color: #fff; }
        .adm-pill.gold { background: #FFF7E6; color: var(--c-gold); }
        .adm-pill.outline { background: transparent; border: 1px solid var(--c-line); color: var(--c-text-muted); }

        .adm-tabs {
          display: flex; gap: 0; border-bottom: 1px solid var(--c-line-soft);
          margin-bottom: 24px; overflow-x: auto;
        }
        .adm-tab {
          padding: 12px 18px; font-size: 11px; letter-spacing: 0.12em;
          text-transform: uppercase; font-weight: 700; color: var(--c-text-muted);
          border-bottom: 2px solid transparent; white-space: nowrap; cursor: pointer;
          background: transparent; border-top: 0; border-left: 0; border-right: 0;
          font-family: var(--f-sans);
        }
        .adm-tab:hover { color: var(--c-ink); }
        .adm-tab.active { color: var(--c-gold); border-bottom-color: var(--c-gold); }
        .adm-tab .count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; padding: 0 5px;
          background: var(--c-cream); font-size: 10px; margin-left: 6px;
          color: var(--c-text-muted); font-weight: 700; border-radius: 2px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .adm-shell { grid-template-columns: 1fr; }
          .adm-side {
            position: static; height: auto;
            flex-direction: row; align-items: center;
            padding: 12px 16px; gap: 16px; flex-wrap: wrap;
            overflow-y: visible;
          }
          .adm-brand { padding: 0; border-bottom: 0; }
          .adm-nav-wrap {
            display: flex; gap: 6px; flex-wrap: wrap;
            padding: 0; overflow-y: visible;
          }
          .adm-section { padding: 0; display: flex; gap: 4px; align-items: center; }
          .adm-section-label { display: none; }
          .adm-nav-group { flex-direction: row; gap: 2px; }
          .adm-link { padding: 6px 10px; font-size: 12px; border-left: 0; min-height: 32px; }
          .adm-link-icon { display: none; }
          .adm-user { border-top: 0; padding: 0; margin-left: auto; }
          .adm-main { padding: 20px 16px; }
        }
      `}</style>
    </div>
  );
}
