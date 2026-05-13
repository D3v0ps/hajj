import Link from "next/link";

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
        <Link href="/" className="brand">
          <span className="brand-mark">ح</span>
          <span className="brand-name">
            Hadj Omra Resor
            <small>Vallfärd sedan 1985</small>
          </span>
        </Link>

        <nav className="nav">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-right">
          <div className="lang">
            <a className="active" href="#">SV</a>
            <a href="#">EN</a>
            <a href="#">AR</a>
          </div>
          <a className="phone" href="tel:+46812345678">
            08-12 34 56 78
          </a>
          <Link href="/min-sida" className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 13 }}>
            Min sida
          </Link>
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
        }
        .nav a:hover { color: var(--c-gold); }
        .header-right { display: flex; align-items: center; gap: 18px; flex-shrink: 0; }
        .lang { display: flex; gap: 0; font-size: 12px; letter-spacing: 0.16em; font-weight: 600; color: var(--c-text-muted); }
        .lang a { padding: 0 6px; border-right: 1px solid var(--c-line); }
        .lang a:last-child { border-right: 0; padding-right: 0; }
        .lang a.active { color: var(--c-ink); }
        .phone { font-size: 13px; font-weight: 600; letter-spacing: 0.02em; color: var(--c-ink); display: inline-flex; align-items: center; gap: 8px; }
        @media (max-width: 980px) {
          .nav { display: none; }
        }
      `}</style>
    </header>
  );
}
