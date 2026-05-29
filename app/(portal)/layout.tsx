import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  return (
    <div className="portal-shell">
      <header className="portal-top">
        <div className="container">
          <Link href="/" className="brand">
            <span className="brand-mark">ح</span>
            <span className="brand-name">
              Hadj Omra Resor
              <small>Min sida</small>
            </span>
          </Link>

          <nav className="portal-nav">
            <Link href="/min-sida">Översikt</Link>
            <Link href="/min-sida/bokningar">Mina bokningar</Link>
            <Link href="/min-sida/dokument">Dokument</Link>
            <Link href="/min-sida/meddelanden">Meddelanden</Link>
            <Link href="/min-sida/profil">Profil</Link>
            {(session.user.role === "ADMIN" || session.user.role === "STAFF") && (
              <Link href="/admin" style={{ color: "var(--c-gold)" }}>Admin</Link>
            )}
          </nav>

          <div className="portal-right">
            <span className="dim" style={{ fontSize: 13 }}>{session.user.email}</span>
            <form action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}>
              <button type="submit" className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>Logga ut</button>
            </form>
          </div>
        </div>
      </header>

      <main className="portal-main">{children}</main>

      <style>{`
        .portal-shell { min-height: 100vh; background: var(--c-paper); }
        .portal-top { background: #fff; border-bottom: 1px solid var(--c-line-soft); padding: 18px 0; position: sticky; top: 0; z-index: 50; }
        .portal-top .container { display: flex; align-items: center; gap: 40px; flex-wrap: wrap; }
        .brand { display: inline-flex; align-items: center; gap: 12px; }
        .brand-mark { width: 36px; height: 36px; border: 1px solid var(--c-gold); display: grid; place-items: center; color: var(--c-gold); font-family: var(--f-serif); font-size: 20px; }
        .brand-name { font-family: var(--f-serif); font-size: 17px; color: var(--c-ink); line-height: 1; }
        .brand-name small { display: block; font-family: var(--f-sans); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--c-text-muted); margin-top: 4px; font-weight: 600; }
        .portal-nav { display: flex; gap: 24px; flex: 1; flex-wrap: wrap; }
        .portal-nav a { font-size: 13px; color: var(--c-ink); padding: 8px 0; min-height: 36px; display: inline-flex; align-items: center; }
        .portal-nav a:hover { color: var(--c-gold); }
        .portal-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .portal-main { padding: 56px 0 96px; }
        @media (max-width: 980px) {
          .portal-top { padding: 14px 0; }
          .portal-top .container { gap: 16px; }
          .portal-nav { gap: 16px 18px; order: 3; flex-basis: 100%; padding-top: 8px; border-top: 1px solid var(--c-line-soft); }
          .portal-nav a { font-size: 12px; padding: 6px 0; }
          .portal-right { margin-left: auto; }
        }
        @media (max-width: 640px) {
          .portal-main { padding: 32px 0 64px; }
          .portal-right > .dim { display: none; }
        }
      `}</style>
    </div>
  );
}
