import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ type?: string; year?: string; status?: string; q?: string }>;

const TYPE_LABELS: Record<string, string> = {
  HAJJ: "Hajj", OMRA: "Omra", HADJ_BADAL: "Hadj Badal", VISUM: "Visum",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Utkast", PUBLISHED: "Publicerad", SOLD_OUT: "Slutsåld", ARCHIVED: "Arkiverad",
};
const STATUS_PILL: Record<string, string> = {
  DRAFT: "outline", PUBLISHED: "ok", SOLD_OUT: "gold", ARCHIVED: "info",
};

export default async function AdminPackagesPage({ searchParams }: { searchParams: SearchParams }) {
  const { type, year, status, q } = await searchParams;

  const where: Record<string, unknown> = {};
  if (type && type !== "ALL") where.type = type;
  if (status && status !== "ALL") where.status = status;
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (year && year !== "ALL") {
    const y = parseInt(year);
    where.startDate = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
  }

  const [packages, allForYears] = await Promise.all([
    prisma.package.findMany({
      where,
      include: {
        tiers: true,
        _count: { select: { bookings: true } },
        bookings: { include: { _count: { select: { travelers: true } } } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.package.findMany({ select: { startDate: true, createdAt: true } }),
  ]);

  const yearSet = new Set<number>();
  allForYears.forEach((p) => {
    const d = p.startDate ?? p.createdAt;
    if (d) yearSet.add(d.getFullYear());
  });
  const years = [...yearSet].sort((a, b) => b - a);

  const fmtKr = (n: number) => n.toLocaleString("sv-SE");

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / resor &amp; paket</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Resor &amp; paket
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            {packages.length} resor · skapa, redigera priser, rum, hotell och innehåll
          </p>
        </div>
        <Link href="/admin/paket/ny" className="btn btn-primary" style={{ padding: "10px 16px", fontSize: 13 }}>+ Ny resa</Link>
      </div>

      {/* Filter */}
      <form className="pk-filters" method="get">
        <input
          name="q"
          placeholder="Sök titel..."
          defaultValue={q ?? ""}
          style={{ flex: 1, minWidth: 200, padding: "10px 14px", border: "1px solid var(--c-line)", fontFamily: "var(--f-sans)", fontSize: 13 }}
        />
        <select name="type" defaultValue={type ?? "ALL"} style={{ padding: "10px 14px", border: "1px solid var(--c-line)", fontSize: 13 }}>
          <option value="ALL">Alla typer</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="year" defaultValue={year ?? "ALL"} style={{ padding: "10px 14px", border: "1px solid var(--c-line)", fontSize: 13 }}>
          <option value="ALL">Alla år</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select name="status" defaultValue={status ?? "ALL"} style={{ padding: "10px 14px", border: "1px solid var(--c-line)", fontSize: 13 }}>
          <option value="ALL">Alla statusar</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit" className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: 12 }}>Filtrera</button>
        {(type || year || status || q) && (
          <Link href="/admin/paket" className="btn-link" style={{ fontSize: 12 }}>Rensa</Link>
        )}
      </form>

      {/* Resor som kort */}
      <div className="pk-list">
        {packages.map((p) => {
          const totalTravelers = p.bookings.reduce((s, b) => s + b._count.travelers, 0);
          const fromQuad = p.tiers
            .filter((t) => t.ageCategory === "ADULT" && t.roomType === "QUAD")
            .sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0]
            ?? p.tiers.filter((t) => t.ageCategory === "ADULT").sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0];
          return (
            <Link key={p.id} href={`/admin/paket/${p.id}`} className="pk-card">
              <div className={`pk-type pk-type-${p.type.toLowerCase()}`}>{TYPE_LABELS[p.type] ?? p.type}</div>
              <div className="pk-body">
                <h3>{p.title}</h3>
                <div className="pk-meta">
                  {p.startDate && <span>{new Date(p.startDate).toLocaleDateString("sv-SE")}</span>}
                  {p.durationDays && <span>{p.durationDays} dagar</span>}
                  <span>{totalTravelers} resenärer</span>
                  <span>{p._count.bookings} bokningar</span>
                  <span>{p.tiers.length} priser</span>
                </div>
              </div>
              <div className="pk-price">
                {fromQuad ? (
                  <>
                    <span className="pk-price-label">Fyrbädd fr.</span>
                    <span className="pk-price-val tnum">{fmtKr(fromQuad.pricePerPerson)} kr</span>
                  </>
                ) : <span className="dim" style={{ fontSize: 12 }}>Inga priser</span>}
              </div>
              <div className="pk-status">
                <span className={`adm-pill ${STATUS_PILL[p.status] ?? "outline"}`}>{STATUS_LABELS[p.status] ?? p.status}</span>
              </div>
            </Link>
          );
        })}
        {packages.length === 0 && (
          <div className="pk-empty">
            <p>Inga resor matchar filtret.</p>
            <Link href="/admin/paket/ny" className="btn btn-primary" style={{ marginTop: 12 }}>+ Skapa den första</Link>
          </div>
        )}
      </div>

      <style>{`
        .pk-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 20px; }
        .pk-list { display: grid; gap: 8px; }
        .pk-card {
          display: grid; grid-template-columns: 110px 1fr 150px 120px;
          gap: 16px; align-items: center;
          padding: 16px 20px; background: #fff; border: 1px solid var(--c-line-soft);
          transition: all 120ms;
        }
        .pk-card:hover { border-color: var(--c-ink); }
        .pk-type {
          font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 7px 10px; text-align: center; font-weight: 700;
        }
        .pk-type-hajj { background: var(--c-ink); color: #fff; }
        .pk-type-omra { background: var(--c-cream); color: var(--c-gold); border: 1px solid var(--c-gold); }
        .pk-type-hadj_badal { background: var(--c-cream); color: var(--c-green); border: 1px solid var(--c-green); }
        .pk-type-visum { background: var(--c-cream); color: var(--c-text-muted); border: 1px solid var(--c-line); }
        .pk-body h3 { font-size: 17px; margin: 0 0 6px; font-family: var(--f-serif); }
        .pk-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--c-text-muted); }
        .pk-meta span:not(:last-child)::after { content: "·"; margin-left: 14px; color: var(--c-line); }
        .pk-price { text-align: right; }
        .pk-price-label { display: block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 600; }
        .pk-price-val { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); }
        .pk-status { text-align: right; }
        .pk-empty { padding: 48px; text-align: center; background: #fff; border: 1px dashed var(--c-line); }
        @media (max-width: 900px) {
          .pk-card { grid-template-columns: 90px 1fr auto; gap: 12px; }
          .pk-price { display: none; }
        }
        @media (max-width: 560px) {
          .pk-card { grid-template-columns: 1fr; gap: 8px; }
          .pk-type { width: fit-content; }
          .pk-status { text-align: left; }
          .pk-filters { flex-direction: column; align-items: stretch; }
        }
      `}</style>
    </div>
  );
}
