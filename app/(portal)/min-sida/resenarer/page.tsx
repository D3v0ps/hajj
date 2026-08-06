import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string }>;

const OK_LABELS: Record<string, string> = {
  created: "Profil sparad.",
  updated: "Ändringarna sparade.",
  deleted: "Profilen togs bort.",
};

export default async function TravelerProfilesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  const { ok, error } = await searchParams;

  const profiles = await prisma.travelerProfile.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isSelf: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="container narrow" style={{ padding: "32px 0 80px" }}>
      <span className="eyebrow gold">Min sida</span>
      <h1 style={{ fontSize: 32, marginTop: 10, marginBottom: 8 }}>Resenärsprofiler</h1>
      <p className="dim" style={{ fontSize: 15, marginBottom: 24, maxWidth: 640 }}>
        Spara dig själv och dina familjemedlemmar som profiler. Vid nästa bokning
        plockar du dem från en lista — slipp fylla i samma uppgifter igen.
      </p>

      {ok && OK_LABELS[ok] && <div className="ok-banner" role="status">{OK_LABELS[ok]}</div>}
      {error && <div className="err-banner" role="alert">{error}</div>}

      <div className="tp-actions">
        <Link href="/min-sida/resenarer/ny" className="btn btn-primary">+ Ny profil</Link>
      </div>

      {profiles.length === 0 ? (
        <div className="tp-empty">
          <p style={{ marginBottom: 6 }}>Du har inga sparade profiler ännu.</p>
          <p className="dim" style={{ fontSize: 13 }}>
            Skapa en profil för dig själv (bocka i &quot;det här är jag&quot;) och en per familjemedlem.
          </p>
        </div>
      ) : (
        <div className="tp-grid">
          {profiles.map((p) => (
            <Link key={p.id} href={`/min-sida/resenarer/${p.id}`} className="tp-card">
              <div className="tp-head">
                <strong className="serif">{p.firstName} {p.lastName}</strong>
                {p.isSelf && <span className="tp-pill">Du</span>}
              </div>
              <div className="tp-meta">
                {p.relationship && <span>{p.relationship}</span>}
                <span>{p.ageCategory === "ADULT" ? "Vuxen" : p.ageCategory === "CHILD" ? "Barn" : "Spädbarn"}</span>
                {p.nationality && <span>{p.nationality}</span>}
              </div>
              <div className="tp-status">
                {p.passportNo ? (
                  <span className="ok">✓ Pass registrerat</span>
                ) : (
                  <span className="warn">✗ Pass saknas</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .ok-banner { padding: 10px 14px; background: #E6F1EA; border: 1px solid var(--c-green-soft); margin-bottom: 16px; font-size: 14px; }
        .err-banner { padding: 10px 14px; background: #FBE9E2; border: 1px solid var(--c-warn); margin-bottom: 16px; font-size: 14px; }
        .tp-actions { margin-bottom: 20px; }
        .tp-empty { padding: 32px 24px; background: var(--c-cream); border: 1px dashed var(--c-line); text-align: center; }
        .tp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
        .tp-card {
          padding: 18px 20px; background: #fff; border: 1px solid var(--c-line-soft);
          display: flex; flex-direction: column; gap: 8px; transition: all 120ms;
        }
        .tp-card:hover { border-color: var(--c-ink); }
        .tp-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .tp-head strong { font-size: 17px; color: var(--c-ink); }
        .tp-pill { font-size: 10px; padding: 2px 8px; background: var(--c-gold); color: #fff; letter-spacing: 0.1em; text-transform: uppercase; }
        .tp-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--c-text-muted); }
        .tp-status { font-size: 12px; }
        .tp-status .ok { color: var(--c-green); }
        .tp-status .warn { color: var(--c-warn); }
      `}</style>
    </div>
  );
}
