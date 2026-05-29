import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ trip?: string }>;

const TYPE_LABEL: Record<string, string> = {
  HAJJ: "Hajj",
  OMRA: "Omra",
  HADJ_BADAL: "Hadj Badal",
  VISUM: "Visum",
};

export default async function ResegrupperPage({ searchParams }: { searchParams: SearchParams }) {
  const { trip } = await searchParams;

  const packages = await prisma.package.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { bookings: true } },
      bookings: {
        orderBy: { createdAt: "asc" },
        include: {
          travelers: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
          payments: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  // Standardval: vald resa, annars senaste (listan är sorterad startDate desc).
  const selected = (trip ? packages.find((p) => p.id === trip) : packages[0]) ?? packages[0] ?? null;

  const bookings = selected?.bookings ?? [];
  const allTravelers = bookings.flatMap((b) => b.travelers);
  const allPayments = bookings.flatMap((b) => b.payments);

  // Ekonomi (belopp lagras i hela kronor).
  const paidTotal = allPayments
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + p.amount, 0);
  const bookedTotal = bookings.reduce((s, b) => s + b.totalAmount, 0);
  const outstandingTotal = Math.max(bookedTotal - paidTotal, 0);

  // Ålderskategorier.
  const ageCount = { ADULT: 0, CHILD: 0, INFANT: 0 };
  for (const t of allTravelers) {
    if (t.ageCategory === "CHILD") ageCount.CHILD++;
    else if (t.ageCategory === "INFANT") ageCount.INFANT++;
    else ageCount.ADULT++;
  }

  // Rumsindelning — gruppera på roomAssignment, otilldelade sist.
  const roomGroups = new Map<string, typeof allTravelers>();
  for (const t of allTravelers) {
    const room = t.roomAssignment?.trim() || "__none__";
    const list = roomGroups.get(room) ?? [];
    list.push(t);
    roomGroups.set(room, list);
  }
  const assignedRooms = [...roomGroups.keys()].filter((r) => r !== "__none__");
  const roomEntries = [
    ...[...roomGroups.entries()].filter(([r]) => r !== "__none__").sort((a, b) => a[0].localeCompare(b[0], "sv")),
    ...[...roomGroups.entries()].filter(([r]) => r === "__none__"),
  ];

  const fmtKr = (n: number) => n.toLocaleString("sv-SE");
  const fmtDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("sv-SE") : "—";

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / resegrupper</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Resegrupper
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            Operativ översikt per resa — resenärer, rum, flyg och betalningar.
          </p>
        </div>
      </div>

      {/* Resväljare — vanligt GET-formulär (serverkomponent kan ej använda onChange) */}
      <form className="gr-selector" method="get">
        <div className="field" style={{ flex: 1, minWidth: 260 }}>
          <label htmlFor="trip-select">Välj resa</label>
          <select id="trip-select" name="trip" defaultValue={selected?.id ?? ""}>
            {packages.length === 0 && <option value="">Inga resor</option>}
            {packages.map((p) => {
              const pax = p.bookings.reduce((s, b) => s + b.travelers.length, 0);
              return (
                <option key={p.id} value={p.id}>
                  {p.title} · {p._count.bookings} bokningar · {pax} resenärer
                </option>
              );
            })}
          </select>
        </div>
        <button type="submit" className="btn btn-primary gr-selector-btn">
          Visa resa
        </button>
        {trip && (
          <Link href="/admin/resegrupper" className="btn btn-ghost gr-selector-btn">
            Återställ
          </Link>
        )}
      </form>

      {!selected ? (
        <div className="adm-card">
          <div className="b" style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ margin: 0 }}>
              Inga resor hittades.{" "}
              <Link href="/admin/import" className="btn-link">Importera Excel</Link> eller{" "}
              <Link href="/admin/paket" className="btn-link">skapa en resa</Link>.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Sammanfattning — marinblå strip */}
          <div className="gr-summary">
            <div className="gr-sum-main">
              <span className="adm-pill gold" style={{ alignSelf: "flex-start" }}>
                {TYPE_LABEL[selected.type] ?? selected.type}
              </span>
              <h2>{selected.title}</h2>
              <p>
                {fmtDate(selected.startDate)} – {fmtDate(selected.endDate)}
                {selected.durationDays ? ` · ${selected.durationDays} dagar` : ""}
                {` · ${bookings.length} bokningar`}
              </p>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v">{allTravelers.length}</div>
              <div className="gr-l">Resenärer</div>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v">
                {ageCount.ADULT}
                <span className="gr-split"> / {ageCount.CHILD} / {ageCount.INFANT}</span>
              </div>
              <div className="gr-l">Vuxna / Barn / Spädbarn</div>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v">{assignedRooms.length}</div>
              <div className="gr-l">Rum</div>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v" style={{ color: "var(--c-gold-soft)" }}>{fmtKr(paidTotal)} kr</div>
              <div className="gr-l">Betalt</div>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v" style={{ color: outstandingTotal > 0 ? "#E0A96D" : "var(--c-gold-soft)" }}>
                {fmtKr(outstandingTotal)} kr
              </div>
              <div className="gr-l">Utestående</div>
            </div>
          </div>

          <div className="adm-tabs" style={{ marginTop: 20 }}>
            <span className="adm-tab active">Resenärer <span className="count">{allTravelers.length}</span></span>
            <span className="adm-tab">Rumsindelning <span className="count">{assignedRooms.length}</span></span>
            <span className="adm-tab">Betalningar <span className="count">{allPayments.length}</span></span>
          </div>

          {/* Resenärstabell — alla relevanta formuläruppgifter */}
          <div className="adm-card">
            <div className="h">
              Resenärer
              <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
                {allTravelers.length} st
              </span>
            </div>
            <div className="b dense">
              {allTravelers.length === 0 ? (
                <div className="b" style={{ textAlign: "center" }}>
                  <p className="dim" style={{ margin: 0 }}>Inga resenärer registrerade på denna resa ännu.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table gr-table">
                    <thead>
                      <tr>
                        <th scope="col">Nr</th>
                        <th scope="col">Namn</th>
                        <th scope="col">Kategori</th>
                        <th scope="col">E-post</th>
                        <th scope="col">Telefon</th>
                        <th scope="col">Personnr</th>
                        <th scope="col">Passnr</th>
                        <th scope="col">Pass giltigt</th>
                        <th scope="col">Nationalitet</th>
                        <th scope="col">Födelsedatum</th>
                        <th scope="col">Rum</th>
                        <th scope="col">Flyg ut</th>
                        <th scope="col">Flyg hem</th>
                        <th scope="col">Betalning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.flatMap((b, bi) => {
                        const offset = bookings.slice(0, bi).reduce((s, x) => s + x.travelers.length, 0);
                        return b.travelers.map((t, i) => {
                          const fullEmail = t.email ?? b.user?.email ?? null;
                          const cat =
                            t.ageCategory === "CHILD" ? "Barn" :
                            t.ageCategory === "INFANT" ? "Spädbarn" : "Vuxen";
                          return (
                            <tr key={t.id}>
                              <td className="tnum dim">{offset + i + 1}</td>
                              <td>
                                <strong style={{ fontFamily: "var(--f-serif)", fontSize: 14 }}>
                                  {t.firstName} {t.lastName}
                                </strong>
                                {t.gender && (
                                  <span className="dim" style={{ marginLeft: 6, fontSize: 11 }}>
                                    ({t.gender === "M" ? "M" : t.gender === "F" ? "K" : t.gender})
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={`adm-pill ${
                                  t.ageCategory === "CHILD" ? "info" :
                                  t.ageCategory === "INFANT" ? "warn" : "outline"
                                }`} style={{ fontSize: 9 }}>{cat}</span>
                              </td>
                              <td>
                                {fullEmail ? (
                                  <a href={`mailto:${fullEmail}`} className="gr-link">{fullEmail}</a>
                                ) : "—"}
                              </td>
                              <td className="tnum">
                                {t.phone ? <a href={`tel:${t.phone}`} className="gr-link">{t.phone}</a> : "—"}
                              </td>
                              <td className="mono">{t.personnummer ?? "—"}</td>
                              <td className="mono">{t.passportNo ?? "—"}</td>
                              <td className="tnum">{fmtDate(t.passportExp)}</td>
                              <td>{t.nationality ?? "—"}</td>
                              <td className="tnum">{fmtDate(t.birthDate)}</td>
                              <td>{t.roomAssignment ?? <span className="dim">Ej tilldelat</span>}</td>
                              <td>{t.flightOut ?? "—"}</td>
                              <td>{t.flightReturn ?? "—"}</td>
                              <td>{t.paymentNote ?? "—"}</td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Övrig viktig information — tydligt synliga anteckningar */}
          {allTravelers.some((t) => t.notes?.trim()) && (
            <div className="adm-card">
              <div className="h">
                Övrig viktig information
                <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
                  {allTravelers.filter((t) => t.notes?.trim()).length} noteringar
                </span>
              </div>
              <div className="b">
                <div className="gr-notes">
                  {allTravelers
                    .filter((t) => t.notes?.trim())
                    .map((t) => (
                      <div key={t.id} className="gr-note">
                        <div className="gr-note-name">{t.firstName} {t.lastName}</div>
                        <p className="gr-note-body">{t.notes}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Rumsindelning */}
          <div className="adm-card">
            <div className="h">
              Rumsindelning
              <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
                {assignedRooms.length} rum
              </span>
            </div>
            <div className="b">
              {allTravelers.length === 0 ? (
                <p className="dim" style={{ margin: 0 }}>Inga resenärer att fördela ännu.</p>
              ) : (
                <div className="gr-rooming">
                  {roomEntries.map(([room, travelers]) => {
                    const isNone = room === "__none__";
                    return (
                      <div key={room} className={`gr-room${isNone ? " is-none" : ""}`}>
                        <div className="gr-room-head">
                          <strong>{isNone ? "Ej tilldelat rum" : room}</strong>
                          <span className="dim">{travelers.length} pers</span>
                        </div>
                        <div className="gr-room-body">
                          {travelers.map((t) => (
                            <div key={t.id} className="gr-room-person">
                              <span className="gr-av" aria-hidden="true">
                                {t.gender === "M" ? "♂" : t.gender === "F" ? "♀" : "·"}
                              </span>
                              <span className="gr-room-pname">{t.firstName} {t.lastName}</span>
                              {t.ageCategory === "CHILD" && <span className="adm-pill info" style={{ fontSize: 8 }}>Barn</span>}
                              {t.ageCategory === "INFANT" && <span className="adm-pill warn" style={{ fontSize: 8 }}>Spädbarn</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .gr-selector {
          display: flex; align-items: flex-end; gap: 12px;
          padding: 16px 18px; background: #fff; border: 1px solid var(--c-line-soft);
          margin-bottom: 20px; flex-wrap: wrap;
        }
        .gr-selector .field select {
          padding: 12px 14px; border: 1px solid var(--c-line); background: #fff;
          font-family: var(--f-sans); font-size: 14px; width: 100%;
        }
        .gr-selector .field select:focus { border-color: var(--c-ink); outline: none; box-shadow: 0 0 0 3px rgba(12,30,62,0.06); }
        .gr-selector-btn { padding: 12px 20px; font-size: 14px; min-height: 46px; }

        /* Sammanfattning */
        .gr-summary {
          display: grid; grid-template-columns: 1.7fr repeat(5, 1fr);
          background: var(--c-ink); color: #fff;
        }
        .gr-sum-main {
          padding: 22px 24px; display: flex; flex-direction: column; gap: 8px;
          justify-content: center;
        }
        .gr-sum-main h2 { margin: 0; font-family: var(--f-serif); font-size: 22px; color: #fff; font-weight: 460; }
        .gr-sum-main p { margin: 0; font-size: 13px; color: #8B9AB8; }
        .gr-sum-item {
          padding: 18px 16px; border-left: 1px solid #152545;
          display: flex; flex-direction: column; justify-content: center;
        }
        .gr-v { font-family: var(--f-serif); font-size: 24px; color: #fff; font-weight: 460; line-height: 1.05; }
        .gr-split { font-size: 17px; color: #8B9AB8; }
        .gr-l {
          font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
          color: #4A6080; font-weight: 700; margin-top: 6px; line-height: 1.3;
        }

        /* Resenärstabell */
        .table-wrap .gr-table { min-width: 1100px; }
        .gr-table { font-size: 12.5px; }
        .gr-table th, .gr-table td { padding: 10px 12px; vertical-align: top; }
        .gr-table .mono { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.02em; white-space: nowrap; }
        .gr-table .tnum { font-variant-numeric: tabular-nums; white-space: nowrap; }
        .gr-link { color: var(--c-ink); border-bottom: 1px solid var(--c-line); }
        .gr-link:hover { color: var(--c-gold); border-bottom-color: var(--c-gold); }

        /* Övrig viktig information */
        .gr-notes { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .gr-note {
          border: 1px solid var(--c-line-soft); border-left: 3px solid var(--c-gold);
          background: var(--c-paper); padding: 12px 14px;
        }
        .gr-note-name { font-family: var(--f-serif); font-size: 14px; color: var(--c-ink); margin-bottom: 4px; }
        .gr-note-body { margin: 0; font-size: 13px; color: var(--c-text); line-height: 1.5; white-space: pre-wrap; }

        /* Rumsindelning */
        .gr-rooming { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
        .gr-room { border: 1px solid var(--c-line-soft); background: var(--c-paper); }
        .gr-room.is-none { border-style: dashed; }
        .gr-room-head {
          padding: 10px 14px; background: var(--c-cream);
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid var(--c-line-soft);
        }
        .gr-room-head strong { font-family: var(--f-serif); font-size: 15px; color: var(--c-ink); }
        .gr-room-body { padding: 8px 14px; display: flex; flex-direction: column; gap: 6px; }
        .gr-room-person { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .gr-room-pname { flex: 1; min-width: 0; }
        .gr-av {
          width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
          border: 1px solid var(--c-gold); display: grid; place-items: center;
          font-size: 12px; color: var(--c-gold);
        }

        @media (max-width: 1024px) {
          .gr-summary { grid-template-columns: 1fr 1fr 1fr; }
          .gr-sum-main { grid-column: 1 / -1; }
        }
        @media (max-width: 640px) {
          .gr-summary { grid-template-columns: 1fr 1fr; }
          .gr-sum-item { padding: 14px 12px; }
          .gr-v { font-size: 19px; }
          .gr-selector { flex-direction: column; align-items: stretch; }
          .gr-selector-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
