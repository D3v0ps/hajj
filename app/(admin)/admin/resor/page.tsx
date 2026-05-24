import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ type?: string; year?: string; status?: string }>;

export default async function ResorPage({ searchParams }: { searchParams: SearchParams }) {
  const { type, year, status } = await searchParams;

  const where: Record<string, unknown> = {};
  if (type && type !== "ALL") where.type = type;
  if (status && status !== "ALL") where.status = status;
  if (year && year !== "ALL") {
    const y = parseInt(year);
    where.startDate = { gte: new Date(`${y}-01-01`), lt: new Date(`${y + 1}-01-01`) };
  }

  const packages = await prisma.package.findMany({
    where,
    include: {
      _count: { select: { bookings: true } },
      bookings: {
        include: { _count: { select: { travelers: true } } },
      },
    },
    orderBy: { startDate: "desc" },
  });

  const allYears = await prisma.package.findMany({
    select: { startDate: true, createdAt: true },
    distinct: ["startDate"],
  });

  const yearSet = new Set<number>();
  allYears.forEach((p) => {
    const d = p.startDate ?? p.createdAt;
    if (d) yearSet.add(d.getFullYear());
  });
  const years = [...yearSet].sort((a, b) => b - a);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow gold">Resor</span>
          <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 0 }}>Alla resor</h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            {packages.length} resor · filtrera på typ, år eller status
          </p>
        </div>
        <Link href="/admin/import" className="btn btn-primary">Importera Excel →</Link>
      </div>

      <form className="filters" method="get">
        <div className="field" style={{ minWidth: 140 }}>
          <label htmlFor="f-type">Typ</label>
          <select id="f-type" name="type" defaultValue={type ?? "ALL"}>
            <option value="ALL">Alla typer</option>
            <option value="HAJJ">Hajj</option>
            <option value="OMRA">Omra</option>
            <option value="HADJ_BADAL">Hadj Badal</option>
            <option value="VISUM">Visum</option>
          </select>
        </div>

        <div className="field" style={{ minWidth: 120 }}>
          <label htmlFor="f-year">År</label>
          <select id="f-year" name="year" defaultValue={year ?? "ALL"}>
            <option value="ALL">Alla år</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="field" style={{ minWidth: 140 }}>
          <label htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={status ?? "ALL"}>
            <option value="ALL">Alla</option>
            <option value="DRAFT">Utkast</option>
            <option value="PUBLISHED">Publicerad</option>
            <option value="SOLD_OUT">Slutsåld</option>
            <option value="ARCHIVED">Arkiverad</option>
          </select>
        </div>

        <button type="submit" className="btn btn-ghost" style={{ alignSelf: "flex-end" }}>
          Filtrera
        </button>
      </form>

      <div className="resor-list">
        {packages.map((pkg) => {
          const totalTravelers = pkg.bookings.reduce((sum, b) => sum + b._count.travelers, 0);
          return (
            <Link key={pkg.id} href={`/admin/paket/${pkg.id}`} className="resa-card">
              <div className={`resa-type resa-type-${pkg.type.toLowerCase()}`}>{pkg.type}</div>
              <div className="resa-body">
                <h3>{pkg.title}</h3>
                {pkg.subtitle && <p className="dim" style={{ fontSize: 13 }}>{pkg.subtitle}</p>}
                <div className="resa-meta">
                  {pkg.startDate && (
                    <span>{new Date(pkg.startDate).toLocaleDateString("sv-SE")}</span>
                  )}
                  {pkg.durationDays && <span>{pkg.durationDays} dagar</span>}
                  <span>{totalTravelers} resenärer</span>
                  <span>{pkg._count.bookings} bokningar</span>
                </div>
              </div>
              <div className="resa-status">
                <span className={`badge badge-${pkg.status.toLowerCase()}`}>{pkg.status}</span>
              </div>
            </Link>
          );
        })}

        {packages.length === 0 && (
          <div className="empty">
            <p>Inga resor matchar filtret.</p>
            <p className="dim" style={{ fontSize: 13, marginTop: 8 }}>
              <Link href="/admin/import" className="btn-link">Importera från Excel</Link> eller{" "}
              <Link href="/admin/paket/ny" className="btn-link">skapa en ny resa</Link>.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .filters {
          display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;
          padding: 18px 20px; background: #fff; border: 1px solid var(--c-line-soft);
          margin-bottom: 20px;
        }
        .resor-list { display: grid; gap: 8px; }
        .resa-card {
          display: grid; grid-template-columns: 100px 1fr 120px;
          gap: 18px; align-items: center;
          padding: 18px 22px;
          background: #fff; border: 1px solid var(--c-line-soft);
          transition: all 160ms;
        }
        .resa-card:hover { border-color: var(--c-ink); }
        .resa-type {
          font-family: var(--f-mono); font-size: 11px;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 8px 12px; text-align: center; font-weight: 700;
        }
        .resa-type-hajj { background: var(--c-ink); color: #fff; }
        .resa-type-omra { background: var(--c-cream); color: var(--c-gold); border: 1px solid var(--c-gold); }
        .resa-type-hadj_badal { background: var(--c-cream); color: var(--c-green); border: 1px solid var(--c-green); }
        .resa-type-visum { background: var(--c-cream); color: var(--c-text-muted); border: 1px solid var(--c-line); }
        .resa-body h3 { font-size: 18px; margin: 0 0 6px; }
        .resa-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--c-text-muted); margin-top: 8px; }
        .resa-meta span:not(:last-child)::after { content: "·"; margin-left: 14px; color: var(--c-line); }
        .resa-status { text-align: right; }
        .badge-draft { background: var(--c-cream); color: var(--c-text-muted); }
        .badge-published { background: #E6F1EA; color: var(--c-green); }
        .badge-sold_out { background: #FFF7E6; color: var(--c-gold); }
        .badge-archived { background: #F0F0F0; color: #999; }
        .empty { padding: 48px; background: #fff; border: 1px dashed var(--c-line); text-align: center; }
        @media (max-width: 900px) {
          .resa-card { grid-template-columns: 80px 1fr auto; gap: 12px; padding: 14px 16px; }
          .resa-type { font-size: 10px; padding: 6px 8px; }
        }
        @media (max-width: 640px) {
          .resa-card { grid-template-columns: 1fr; gap: 8px; }
          .resa-type { width: fit-content; }
          .resa-status { text-align: left; }
          .filters { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
