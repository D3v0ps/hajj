import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { fortnoxEnabled } from "@/lib/fortnox";
import { startFortnoxAuth, disconnectFortnox, pushPaymentToFortnox } from "@/app/actions/fortnox";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string; num?: string }>;

const OK: Record<string, string> = {
  connected: "✓ Fortnox anslutet.",
  disconnected: "Fortnox-koppling borttagen.",
  pushed: "✓ Verifikat skapat i Fortnox.",
};

const ERR: Record<string, string> = {
  disabled: "Fortnox är inte konfigurerat — FORTNOX_CLIENT_ID/SECRET saknas i miljön.",
  no_code: "Inget code mottaget från Fortnox.",
  payment_not_found: "Betalningen hittades inte.",
  not_completed: "Bara COMPLETED-betalningar kan bokföras.",
  already_pushed: "Betalningen är redan pushad till Fortnox.",
};

export default async function FortnoxPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");

  const { ok, error, num } = await searchParams;
  const enabled = fortnoxEnabled();
  const conn = enabled ? await prisma.fortnoxConnection.findFirst({ orderBy: { connectedAt: "desc" } }) : null;

  // Nästa 20 ej pushade COMPLETED-betalningar (de äldsta först).
  const pending = conn
    ? await prisma.payment.findMany({
        where: { status: "COMPLETED", fortnoxPushedAt: null },
        orderBy: { paidAt: "asc" },
        take: 20,
        include: { booking: { include: { user: { select: { name: true, email: true } }, package: { select: { title: true } } } } },
      })
    : [];

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / bokföring / fortnox</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Fortnox-integration
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            Push:a betalningar som verifikat direkt till bokföringen. Resterande
            bokföring sker som vanligt i Fortnox.
          </p>
        </div>
      </div>

      {ok && OK[ok] && (
        <div role="status" style={{ padding: "10px 14px", background: "#E6F1EA", border: "1px solid var(--c-green-soft)", marginBottom: 16, fontSize: 14 }}>
          {OK[ok]}{num && <strong> Nr {num}</strong>}
        </div>
      )}
      {error && (
        <div role="alert" style={{ padding: "10px 14px", background: "#FBE9E2", border: "1px solid var(--c-warn)", marginBottom: 16, fontSize: 14 }}>
          {ERR[error] ?? error}
        </div>
      )}

      {!enabled && (
        <div className="adm-card">
          <div className="h">Fortnox är inte konfigurerat</div>
          <div className="b">
            <p style={{ marginBottom: 14 }}>För att aktivera Fortnox-koppling:</p>
            <ol style={{ paddingLeft: 22, fontSize: 14, lineHeight: 1.8 }}>
              <li>Skapa en app på <a href="https://developer.fortnox.se/" target="_blank" rel="noopener noreferrer">developer.fortnox.se</a>.</li>
              <li>Sätt redirect URI till: <code style={{ background: "var(--c-cream)", padding: "2px 8px" }}>{env.APP_URL}/api/fortnox/callback</code></li>
              <li>Kopiera <strong>Client ID</strong> + <strong>Client Secret</strong> och lägg in som GitHub Actions secrets <code>FORTNOX_CLIENT_ID</code> + <code>FORTNOX_CLIENT_SECRET</code>.</li>
              <li>Deploya igen — knappen &quot;Anslut Fortnox&quot; aktiveras då här.</li>
            </ol>
          </div>
        </div>
      )}

      {enabled && !conn && (
        <div className="adm-card">
          <div className="h">Inte ansluten</div>
          <div className="b">
            <p className="dim" style={{ marginBottom: 14 }}>
              Klicka för att autentisera mot Fortnox. Du måste logga in med ett
              Fortnox-konto som har rättighet att skapa verifikat.
            </p>
            <form action={startFortnoxAuth}>
              <button type="submit" className="btn btn-primary">Anslut Fortnox →</button>
            </form>
          </div>
        </div>
      )}

      {enabled && conn && (
        <>
          <div className="adm-card">
            <div className="h">Ansluten</div>
            <div className="b">
              <dl className="conn-list">
                <dt>Ansluten</dt><dd>{new Date(conn.connectedAt).toLocaleString("sv-SE")}</dd>
                {conn.orgName && <><dt>Organisation</dt><dd>{conn.orgName}</dd></>}
                {conn.orgNumber && <><dt>Org.nr</dt><dd>{conn.orgNumber}</dd></>}
                <dt>Token utgår</dt><dd>{new Date(conn.tokenExpiresAt).toLocaleString("sv-SE")}</dd>
                <dt>Scope</dt><dd className="dim" style={{ fontSize: 12 }}>{conn.scope ?? "—"}</dd>
              </dl>
              <form action={disconnectFortnox} style={{ marginTop: 16 }}>
                <button type="submit" className="btn btn-ghost" style={{ fontSize: 12 }}>Koppla från Fortnox</button>
              </form>
            </div>
          </div>

          <div className="adm-card" style={{ marginTop: 16 }}>
            <div className="h">Betalningar att bokföra ({pending.length})</div>
            <div className="b dense">
              {pending.length === 0 ? (
                <div className="dim" style={{ padding: 20, textAlign: "center" }}>
                  Inga obokförda betalningar.
                </div>
              ) : (
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Kund</th>
                      <th>Paket</th>
                      <th>Metod</th>
                      <th style={{ textAlign: "right" }}>Belopp</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((p) => (
                      <tr key={p.id}>
                        <td>{(p.paidAt ?? p.createdAt).toLocaleDateString("sv-SE")}</td>
                        <td>{p.booking.user.name ?? p.booking.user.email}</td>
                        <td>{p.booking.package.title}</td>
                        <td><span className="adm-pill outline">{p.method}</span></td>
                        <td className="tnum" style={{ textAlign: "right" }}>{p.amount.toLocaleString("sv-SE")} kr</td>
                        <td>
                          <form action={pushPaymentToFortnox}>
                            <input type="hidden" name="paymentId" value={p.id} />
                            <button type="submit" className="btn btn-gold" style={{ padding: "5px 12px", fontSize: 12 }}>
                              Push:a →
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .conn-list { display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; font-size: 13px; margin: 0; }
        .conn-list dt { color: var(--c-text-muted); font-weight: 600; }
        .conn-list dd { margin: 0; color: var(--c-ink); }
      `}</style>
    </div>
  );
}
