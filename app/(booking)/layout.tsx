import Link from "next/link";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="boka-shell">
      <header className="boka-top">
        <div className="container">
          <Link href="/" className="brand">
            <span className="brand-mark">ح</span>
            <span className="brand-name">
              Hadj Omra Resor
              <small>Bokning</small>
            </span>
          </Link>
          <div className="secure">
            <span className="lock">🔒</span>
            <div>
              <strong>Säker bokning</strong>
              <span>TLS 1.3 · GDPR · Resegaranti</span>
            </div>
          </div>
        </div>
      </header>
      <main className="boka-main">{children}</main>
      <style>{`
        .boka-shell { min-height: 100vh; background: var(--c-paper); display: flex; flex-direction: column; }
        .boka-top { padding: 18px 0; border-bottom: 1px solid var(--c-line-soft); background: #fff; }
        .boka-top .container { display: flex; align-items: center; justify-content: space-between; }
        .brand { display: inline-flex; align-items: center; gap: 14px; }
        .brand-mark { width: 38px; height: 38px; border: 1px solid var(--c-gold); display: grid; place-items: center; color: var(--c-gold); font-family: var(--f-serif); font-size: 22px; line-height: 1; }
        .brand-name { font-family: var(--f-serif); font-size: 19px; color: var(--c-ink); font-weight: 460; line-height: 1; }
        .brand-name small { display: block; font-family: var(--f-sans); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--c-text-muted); margin-top: 4px; font-weight: 600; }
        .secure { display: flex; align-items: center; gap: 12px; padding: 8px 14px; background: var(--c-cream); border: 1px solid var(--c-line-soft); }
        .secure .lock { font-size: 18px; }
        .secure strong { display: block; font-size: 12px; letter-spacing: 0.06em; color: var(--c-ink); }
        .secure span { font-size: 11px; letter-spacing: 0.08em; color: var(--c-text-muted); text-transform: uppercase; font-weight: 600; }
        .boka-main { flex: 1; padding: 56px 0 80px; }
      `}</style>
    </div>
  );
}
