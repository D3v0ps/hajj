import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; trip?: string; flag?: string }>;

export default async function ResenarerPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, trip, flag } = await searchParams;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { passportNo: { contains: q, mode: "insensitive" } },
      { personnummer: { contains: q, mode: "insensitive" } },
    ];
  }
  if (trip && trip !== "ALL") {
    where.booking = { packageId: trip };
  }
  if (flag === "nopass") where.passportNo = null;
  if (flag === "adult") where.ageCategory = "ADULT";
  if (flag === "child") where.ageCategory = "CHILD";
  if (flag === "infant") where.ageCategory = "INFANT";

  const [travelers, packages, totalCount] = await Promise.all([
    prisma.traveler.findMany({
      where,
      include: {
        user: { select: { email: true } },
        booking: {
          select: {
            id: true,
            reference: true,
            status: true,
            package: { select: { id: true, title: true, type: true, startDate: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.package.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, title: true },
    }),
    prisma.traveler.count({ where }),
  ]);

  const fmtDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("sv-SE") : "—";

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / resenärer</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Alla resenärer
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            {totalCount} resenärer{q ? ` matchar "${q}"` : ""}
          </p>
        </div>
      </div>

      {/* Sök + filter */}
      <form className="rs-filters" method="get">
        <div className="rs-search">
          <input
            name="q"
            placeholder="Sök namn, e-post, personnummer, passnummer..."
            defaultValue={q ?? ""}
            autoFocus
          />
        </div>
        <select name="trip" defaultValue={trip ?? "ALL"}>
          <option value="ALL">Alla resor</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <select name="flag" defaultValue={flag ?? ""}>
          <option value="">Alla kategorier</option>
          <option value="adult">Vuxna</option>
          <option value="child">Barn</option>
          <option value="infant">Spädbarn</option>
          <option value="nopass">Pass saknas</option>
        </select>
        <button type="submit" className="btn btn-primary" style={{ padding: "10px 18px", fontSize: 13 }}>
          Sök
        </button>
        {(q || trip || flag) && (
          <Link href="/admin/resenarer" className="btn btn-ghost" style={{ padding: "10px 14px", fontSize: 12 }}>
            Rensa filter
          </Link>
        )}
      </form>

      {/* Resultat */}
      <div className="rs-list">
        {travelers.map((t) => (
          <Link
            key={t.id}
            href={`/admin/resenarer/${t.id}/redigera?from=${encodeURIComponent("/admin/resenarer")}`}
            className="rs-card"
          >
            <div className="rs-card-avatar">
              {t.gender === "M" ? "♂" : t.gender === "F" ? "♀" : "·"}
            </div>

            <div className="rs-card-main">
              <div className="rs-card-name">
                <h3>{t.firstName} {t.lastName}</h3>
                <div className="rs-card-badges">
                  <span className="adm-pill outline">{t.ageCategory === "ADULT" ? "Vuxen" : t.ageCategory === "CHILD" ? "Barn" : "Spädbarn"}</span>
                  {!t.passportNo && <span className="adm-pill outline">Pass saknas</span>}
                </div>
              </div>

              <div className="rs-card-details">
                <div className="rs-detail">
                  <span className="rs-label">Kontakt</span>
                  <span className="rs-value">
                    {t.email ?? t.user.email ?? "—"}
                    {t.phone && <> · {t.phone}</>}
                  </span>
                </div>
                <div className="rs-detail">
                  <span className="rs-label">Personnr</span>
                  <span className="rs-value mono">{t.personnummer ?? "—"}</span>
                </div>
                <div className="rs-detail">
                  <span className="rs-label">Pass</span>
                  <span className="rs-value mono">{t.passportNo ?? "—"}</span>
                </div>
                <div className="rs-detail">
                  <span className="rs-label">Födelse</span>
                  <span className="rs-value">{t.birthDate ? fmtDate(t.birthDate) : "—"}</span>
                </div>
                <div className="rs-detail">
                  <span className="rs-label">Nation.</span>
                  <span className="rs-value">{t.nationality ?? "—"}</span>
                </div>
                <div className="rs-detail">
                  <span className="rs-label">Rum</span>
                  <span className="rs-value">{t.roomAssignment ?? "—"}</span>
                </div>
                <div className="rs-detail">
                  <span className="rs-label">Betalt</span>
                  <span className="rs-value tnum" style={{ color: t.amountPaid > 0 ? "var(--c-green)" : "var(--c-text-muted)" }}>
                    {t.amountPaid > 0 ? `${t.amountPaid.toLocaleString("sv-SE")} kr` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rs-card-trip">
              {t.booking ? (
                <>
                  <span className="rs-trip-name">{t.booking.package.title}</span>
                  <span className="rs-trip-ref">
                    {t.booking.reference.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`adm-pill ${
                    t.booking.status === "COMPLETED" || t.booking.status === "PAID_FULL" ? "ok"
                    : t.booking.status === "CANCELLED" ? "warn"
                    : "outline"
                  }`} style={{ fontSize: 9 }}>
                    {t.booking.status}
                  </span>
                </>
              ) : (
                <span className="dim">Ingen bokning</span>
              )}
            </div>

            <div className="rs-card-arrow">→</div>
          </Link>
        ))}

        {travelers.length === 0 && (
          <div className="rs-empty">
            <p>Inga resenärer matchar sökningen.</p>
            <p className="dim" style={{ fontSize: 13, marginTop: 8 }}>
              Försök med annat sökord eller{" "}
              <Link href="/admin/import" className="btn-link">importera från Excel</Link>.
            </p>
          </div>
        )}
      </div>

      {travelers.length >= 300 && (
        <p className="dim" style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          Visar max 300 resultat. Använd sökfältet för att filtrera.
        </p>
      )}

      <style>{`
        .rs-filters {
          display: flex; gap: 10px; margin-bottom: 20px;
          flex-wrap: wrap; align-items: center;
        }
        .rs-search { flex: 1; min-width: 280px; }
        .rs-search input {
          width: 100%; padding: 12px 16px;
          border: 1px solid var(--c-line); background: #fff;
          font-family: var(--f-sans); font-size: 14px;
        }
        .rs-search input:focus { border-color: var(--c-ink); outline: none; box-shadow: 0 0 0 3px rgba(12,30,62,0.06); }
        .rs-filters select {
          padding: 12px 14px; border: 1px solid var(--c-line);
          font-family: var(--f-sans); font-size: 13px; background: #fff;
        }

        .rs-list { display: grid; gap: 6px; }
        .rs-card {
          display: grid;
          grid-template-columns: 44px 1fr 180px 30px;
          gap: 16px; align-items: center;
          padding: 16px 20px; background: #fff;
          border: 1px solid var(--c-line-soft);
          transition: all 120ms;
        }
        .rs-card:hover { border-color: var(--c-ink); box-shadow: 0 2px 8px rgba(12,30,62,0.05); }

        .rs-card-avatar {
          width: 44px; height: 44px;
          border-radius: 50%; border: 1px solid var(--c-gold);
          display: grid; place-items: center;
          font-size: 18px; color: var(--c-gold);
          background: var(--c-cream); flex-shrink: 0;
        }

        .rs-card-main { min-width: 0; }
        .rs-card-name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
        .rs-card-name h3 { font-size: 17px; margin: 0; white-space: nowrap; }
        .rs-card-badges { display: flex; gap: 4px; }

        .rs-card-details {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 4px 14px;
        }
        .rs-detail { }
        .rs-label {
          display: block; font-size: 9px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--c-text-faint); font-weight: 600;
        }
        .rs-value { font-size: 13px; color: var(--c-ink); }
        .rs-value.mono { font-family: var(--f-mono); font-size: 12px; letter-spacing: 0.04em; }

        .rs-card-trip {
          display: flex; flex-direction: column; gap: 4px;
          text-align: right; min-width: 0;
        }
        .rs-trip-name {
          font-family: var(--f-serif); font-size: 13px; color: var(--c-ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .rs-trip-ref {
          font-family: var(--f-mono); font-size: 10px; color: var(--c-gold);
          letter-spacing: 0.08em;
        }

        .rs-card-arrow {
          color: var(--c-gold); font-size: 16px; text-align: center;
        }

        .rs-empty {
          padding: 56px 32px; text-align: center;
          background: #fff; border: 1px dashed var(--c-line);
        }

        @media (max-width: 1024px) {
          .rs-card-details { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .rs-card { grid-template-columns: 40px 1fr auto; gap: 12px; padding: 14px 16px; }
          .rs-card-trip { display: none; }
          .rs-card-details { grid-template-columns: 1fr 1fr 1fr; gap: 4px 10px; }
          .rs-card-avatar { width: 40px; height: 40px; font-size: 16px; }
        }
        @media (max-width: 480px) {
          .rs-card { grid-template-columns: 1fr; gap: 8px; }
          .rs-card-avatar { display: none; }
          .rs-card-details { grid-template-columns: 1fr 1fr; }
          .rs-card-arrow { display: none; }
          .rs-filters { flex-direction: column; }
          .rs-search { min-width: 0; }
        }
      `}</style>
    </div>
  );
}
