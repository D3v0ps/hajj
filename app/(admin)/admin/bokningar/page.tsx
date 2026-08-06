import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; type?: string; q?: string }>;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Utkast", SUBMITTED: "Mottagen", REVIEW: "Granskas",
  CONFIRMED: "Bekräftad", PAID_DEPOSIT: "Reserv. betald",
  PAID_FULL: "Slutbetald", COMPLETED: "Genomförd", CANCELLED: "Avbokad",
};

const STATUS_PILL: Record<string, string> = {
  DRAFT: "outline", SUBMITTED: "gold", REVIEW: "info",
  CONFIRMED: "ok", PAID_DEPOSIT: "ok", PAID_FULL: "ok",
  COMPLETED: "ok", CANCELLED: "warn",
};

export default async function BokningarListPage({ searchParams }: { searchParams: SearchParams }) {
  const { status, type, q } = await searchParams;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (type && type !== "ALL") where.package = { type };
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [bookings, statusCounts] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        package: { select: { title: true, type: true, startDate: true } },
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { travelers: true, payments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.booking.groupBy({ by: ["status"], _count: true }),
  ]);

  const countMap: Record<string, number> = {};
  statusCounts.forEach((s) => { countMap[s.status] = s._count; });

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / bokningar</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Bokningar
          </h1>
        </div>
      </div>

      {/* Status-chips */}
      <div className="bk-status-chips">
        <Link href="/admin/bokningar" className={`bk-chip ${!status || status === "ALL" ? "active" : ""}`}>
          Alla <span className="chip-count">{bookings.length}</span>
        </Link>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          countMap[k] ? (
            <Link key={k} href={`/admin/bokningar?status=${k}`} className={`bk-chip ${status === k ? "active" : ""}`}>
              {v} <span className="chip-count">{countMap[k]}</span>
            </Link>
          ) : null
        ))}
      </div>

      {/* Sök + filter */}
      <form className="bk-filters" method="get">
        <input
          name="q"
          placeholder="Sök ref, e-post eller namn..."
          defaultValue={q ?? ""}
          style={{ flex: 1, maxWidth: 360, padding: "10px 14px", border: "1px solid var(--c-line)", fontFamily: "var(--f-sans)", fontSize: 13 }}
        />
        <select name="type" defaultValue={type ?? "ALL"} style={{ padding: "10px 14px", border: "1px solid var(--c-line)", fontSize: 13 }}>
          <option value="ALL">Alla typer</option>
          <option value="HAJJ">Hajj</option>
          <option value="OMRA">Omra</option>
          <option value="HADJ_BADAL">Hadj Badal</option>
        </select>
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 12 }}>Sök</button>
      </form>

      {/* Boknings-lista */}
      <div className="bk-list">
        {bookings.map((b) => (
          <Link key={b.id} href={`/admin/bokningar/${b.id}`} className="bk-row">
            <div className="bk-ref">{b.reference.slice(0, 12).toUpperCase()}</div>
            <div className="bk-customer">
              <strong>{b.user.name ?? b.user.email}</strong>
              <span className="dim">{b.user.name ? b.user.email : ""}</span>
            </div>
            <div className="bk-pkg">
              <strong>{b.package.title}</strong>
              <span className="dim">{b.package.startDate ? new Date(b.package.startDate).toLocaleDateString("sv-SE") : ""}</span>
            </div>
            <div className="bk-travelers">{b._count.travelers} res.</div>
            <div className="bk-amount tnum">{b.totalAmount.toLocaleString("sv-SE")} kr</div>
            <div className="bk-st">
              <span className={`adm-pill ${STATUS_PILL[b.status] ?? "outline"}`}>
                {STATUS_LABELS[b.status] ?? b.status}
              </span>
            </div>
            <div className="bk-date dim" style={{ fontSize: 11 }}>
              {new Date(b.updatedAt).toLocaleDateString("sv-SE")}
            </div>
          </Link>
        ))}
        {bookings.length === 0 && (
          <div style={{ padding: 48, textAlign: "center" }} className="dim">
            Inga bokningar matchar filtret.
          </div>
        )}
      </div>

      <style>{`
        .bk-status-chips { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
        .bk-chip {
          padding: 7px 14px; font-size: 12px; font-weight: 600;
          border: 1px solid var(--c-line); background: #fff;
          color: var(--c-text-muted); transition: all 120ms;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .bk-chip:hover { border-color: var(--c-ink); color: var(--c-ink); }
        .bk-chip.active { background: var(--c-ink); color: #fff; border-color: var(--c-ink); }
        .bk-chip.active .chip-count { background: rgba(255,255,255,0.2); }
        .chip-count {
          background: var(--c-cream); padding: 1px 6px; font-size: 10px;
          font-family: var(--f-mono); border-radius: 2px;
        }
        .bk-filters {
          display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .bk-list { display: grid; gap: 4px; }
        .bk-row {
          display: grid;
          grid-template-columns: 100px 1.2fr 1.2fr 70px 110px 110px 80px;
          gap: 14px; align-items: center;
          padding: 14px 18px; background: #fff;
          border: 1px solid var(--c-line-soft);
          transition: all 120ms; font-size: 13px;
        }
        .bk-row:hover { border-color: var(--c-ink); background: var(--c-paper); }
        .bk-ref { font-family: var(--f-mono); font-size: 12px; color: var(--c-gold); letter-spacing: 0.06em; }
        .bk-customer strong, .bk-pkg strong { display: block; font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); }
        .bk-customer .dim, .bk-pkg .dim { font-size: 11px; }
        .bk-amount { font-weight: 600; text-align: right; }
        .bk-travelers { text-align: center; color: var(--c-text-muted); }
        @media (max-width: 1024px) {
          .bk-row { grid-template-columns: 80px 1fr 1fr auto auto; }
          .bk-travelers, .bk-date { display: none; }
        }
        @media (max-width: 640px) {
          .bk-row { grid-template-columns: 1fr; gap: 6px; }
          .bk-ref { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
