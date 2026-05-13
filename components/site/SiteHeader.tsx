import Link from "next/link";
import { SITE } from "@/lib/config";
import { MobileMenu } from "./MobileMenu";

const NAV = [
  { href: "/omra", label: "Omra" },
  { href: "/hajj-2027", label: "Hajj" },
  { href: "/visum", label: "Visum" },
  { href: "/hadj-badal", label: "Hadj Badal" },
  { href: "/forbered", label: "Förbered dig" },
  { href: "/om-oss", label: "Om oss" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label="Hadj Omra Resor — startsidan">
          <span className="brand-mark" lang="ar" aria-hidden="true">ح</span>
          <span className="brand-name">
            Hadj Omra Resor
            <small>Vallfärd sedan 1985</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Huvudmeny">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-right">
          <a className="phone" href={`tel:${SITE.phone.replace(/\s/g, "")}`}>
            {SITE.phoneDisplay}
          </a>
          <Link href="/min-sida" className="btn btn-ghost desktop-only" style={{ padding: "10px 16px", fontSize: 13 }}>
            Min sida
          </Link>
          <MobileMenu items={NAV} />
        </div>
      </div>

      <style>{`
        .site-header {
          background: var(--c-paper);
          border-bottom: 1px solid var(--c-line-soft);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .site-header .container {
          display: flex;
          align-items: center;
          gap: 40px;
          padding-top: 18px;
          padding-bottom: 18px;
        }
        @media (max-width: 980px) {
          .site-header .container { gap: 16px; }
        }
        @media (max-width: 480px) {
          .site-header .container { padding-top: 12px; padding-bottom: 12px; gap: 10px; }
          .brand-mark { width: 32px; height: 32px; font-size: 18px; }
          .brand-name { font-size: 15px; }
          .brand-name small { font-size: 9px; }
          .phone { font-size: 12px; padding: 0; }
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }
        .brand-mark {
          width: 38px;
          height: 38px;
          border: 1px solid var(--c-gold);
          display: grid;
          place-items: center;
          color: var(--c-gold);
          font-family: var(--f-serif);
          font-size: 22px;
          line-height: 1;
          font-weight: 500;
        }
        .brand-name {
          font-family: var(--f-serif);
          font-size: 19px;
          letter-spacing: 0.005em;
          font-weight: 460;
          color: var(--c-ink);
          line-height: 1;
        }
        .brand-name small {
          display: block;
          font-family: var(--f-sans);
          font-size: 10.5px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--c-text-muted);
          margin-top: 4px;
          font-weight: 600;
        }
        .nav { display: flex; gap: 30px; flex: 1; }
        .nav a {
          font-size: 14px;
          color: var(--c-ink);
          font-weight: 500;
          letter-spacing: 0.005em;
          padding: 6px 0;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
        }
        .nav a:hover { color: var(--c-gold); }
        .header-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
        .phone {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--c-ink);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          padding: 0 4px;
        }
        @media (max-width: 980px) {
          .nav { display: none; }
          .desktop-only { display: none; }
        }
        @media (min-width: 981px) {
          .mobile-only { display: none; }
        }
      `}</style>
    </header>
  );
}
