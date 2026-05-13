import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/" className="brand">
          <span className="brand-mark">ح</span>
          <span className="brand-name">
            Hadj Omra
            <small>Admin</small>
          </span>
        </Link>

        <nav>
          <Link href="/admin">Översikt</Link>
          <Link href="/admin/paket">Paket</Link>
          <Link href="/admin/bokningar">Bokningar</Link>
          <Link href="/admin/leads">Leads</Link>
          <Link href="/admin/resenarer">Resenärer</Link>
        </nav>

        <div className="admin-user">
          <span className="dim" style={{ fontSize: 12 }}>{session.user.email}</span>
          <span className="tag dark" style={{ marginTop: 8 }}>{session.user.role}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }} style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 11 }}>Logga ut</button>
          </form>
        </div>
      </aside>

      <main className="admin-main">{children}</main>

      <style>{`
        .admin-shell { min-height: 100vh; display: grid; grid-template-columns: 240px 1fr; }
        .admin-side {
          background: var(--c-ink); color: #C3CCD8; padding: 28px 22px; display: flex; flex-direction: column; gap: 32px;
          position: sticky; top: 0; height: 100vh;
        }
        .admin-side .brand { display: flex; align-items: center; gap: 12px; color: #fff; }
        .brand-mark { width: 36px; height: 36px; border: 1px solid var(--c-gold); display: grid; place-items: center; color: var(--c-gold); font-family: var(--f-serif); font-size: 20px; }
        .brand-name { font-family: var(--f-serif); font-size: 16px; line-height: 1; }
        .brand-name small { display: block; font-family: var(--f-sans); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--c-gold); margin-top: 4px; font-weight: 700; }
        .admin-side nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .admin-side nav a { padding: 10px 14px; font-size: 13px; color: #C3CCD8; border-left: 2px solid transparent; }
        .admin-side nav a:hover { color: #fff; border-left-color: var(--c-gold); background: rgba(255,255,255,0.04); }
        .admin-user { padding: 18px 14px; background: #08152e; border: 1px solid #1F324F; }
        .admin-main { background: var(--c-paper); padding: 40px 48px; }
        @media (max-width: 900px) { .admin-shell { grid-template-columns: 1fr; } .admin-side { position: static; height: auto; } }
      `}</style>
    </div>
  );
}
