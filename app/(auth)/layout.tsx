import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <header className="auth-top">
        <div className="container">
          <Link href="/" className="brand">
            <span className="brand-mark">ح</span>
            <span className="brand-name">Hadj Omra Resor</span>
          </Link>
        </div>
      </header>
      <main className="auth-main">{children}</main>
      <style>{`
        .auth-shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--c-paper); }
        .auth-top { padding: 22px 0; border-bottom: 1px solid var(--c-line-soft); }
        .auth-top .brand { display: inline-flex; align-items: center; gap: 14px; }
        .brand-mark { width: 38px; height: 38px; border: 1px solid var(--c-gold); display: grid; place-items: center; color: var(--c-gold); font-family: var(--f-serif); font-size: 22px; line-height: 1; }
        .brand-name { font-family: var(--f-serif); font-size: 19px; color: var(--c-ink); font-weight: 460; }
        .auth-main { flex: 1; display: grid; place-items: center; padding: 56px 0; }
        @media (max-width: 640px) {
          .auth-top { padding: 14px 0; }
          .brand-mark { width: 32px; height: 32px; font-size: 18px; }
          .brand-name { font-size: 16px; }
          .auth-main { padding: 32px 0; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
