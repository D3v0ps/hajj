import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ trip?: string }>;

export default async function ResegrupperPage({ searchParams }: { searchParams: SearchParams }) {
  const { trip } = await searchParams;

  const packages = await prisma.package.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { bookings: true } },
      bookings: {
        include: {
          travelers: true,
          payments: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  const selected = trip ? packages.find((p) => p.id === trip) : packages[0];
  const allTravelers = selected?.bookings.flatMap((b) => b.travelers) ?? [];
  const allPayments = selected?.bookings.flatMap((b) => b.payments) ?? [];
  const paidTotal = allPayments.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0);
  const pendingTotal = allPayments.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);

  const roomGroups: Record<string, typeof allTravelers> = {};
  allTravelers.forEach((t) => {
    const room = t.roomAssignment ?? "Ej tilldelat";
    if (!roomGroups[room]) roomGroups[room] = [];
    roomGroups[room].push(t);
  });

  const genderCount = { M: 0, F: 0, other: 0 };
  allTravelers.forEach((t) => {
    if (t.gender === "M") genderCount.M++;
    else if (t.gender === "F") genderCount.F++;
    else genderCount.other++;
  });

  const assistCount = allTravelers.filter((t) => t.needsAssist).length;
  const mahramCount = allTravelers.filter((t) => t.isMahram).length;

  const fmtKr = (n: number) => n.toLocaleString("sv-SE");
  const fmtDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("sv-SE") : "—";

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">admin / resegrupper</p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            Resegrupper
          </h1>
        </div>
      </div>

      {/* Trip selector */}
      <form className="trip-selector" method="get">
        <label htmlFor="trip-select" className="eyebrow" style={{ marginRight: 12 }}>Välj resa</label>
        <select
          id="trip-select"
          name="trip"
          defaultValue={selected?.id ?? ""}
          style={{ flex: 1, maxWidth: 400, padding: "10px 14px", border: "1px solid var(--c-line)", fontFamily: "var(--f-sans)", fontSize: 14 }}
        >
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p._count.bookings} bokningar, {p.bookings.flatMap((b) => b.travelers).length} resenärer)
            </option>
          ))}
        </select>
        <noscript><button type="submit" className="btn btn-ghost" style={{ padding: "10px 14px" }}>Visa</button></noscript>
      </form>

      {!selected ? (
        <div className="adm-card"><div className="b" style={{ textAlign: "center" }}>
          <p>Inga resor hittades. <Link href="/admin/import" className="btn-link">Importera Excel</Link> eller <Link href="/admin/paket/ny" className="btn-link">skapa en resa</Link>.</p>
        </div></div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="gr-summary">
            <div className="gr-sum-main">
              <h2 style={{ margin: 0, fontSize: 22, color: "#fff" }}>{selected.title}</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8B9AB8" }}>
                {fmtDate(selected.startDate)} — {fmtDate(selected.endDate)}
                {selected.durationDays && ` · ${selected.durationDays} dagar`}
              </p>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v">{allTravelers.length}</div>
              <div className="gr-l">Resenärer</div>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v">{genderCount.M}M / {genderCount.F}F</div>
              <div className="gr-l">Kön</div>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v">{Object.keys(roomGroups).length}</div>
              <div className="gr-l">Rum</div>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v">{assistCount}</div>
              <div className="gr-l">Assistans</div>
            </div>
            <div className="gr-sum-item">
              <div className="gr-v" style={{ color: "var(--c-gold)" }}>{fmtKr(paidTotal)} kr</div>
              <div className="gr-l">Betalt</div>
            </div>
          </div>

          {/* Tabs (static for now, just rendering all sections) */}
          <div className="adm-tabs" style={{ marginTop: 20 }}>
            <span className="adm-tab active">Resenärer <span className="count">{allTravelers.length}</span></span>
            <span className="adm-tab">Rooming <span className="count">{Object.keys(roomGroups).length}</span></span>
            <span className="adm-tab">Betalningar <span className="count">{allPayments.length}</span></span>
            <span className="adm-tab">Hälsa <span className="count">{assistCount}</span></span>
          </div>

          {/* Resenärer tabell */}
          <div className="adm-card">
            <div className="h">
              Alla resenärer
              <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
                {allTravelers.length} st
              </span>
            </div>
            <div className="b dense">
              <div className="table-wrap">
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th scope="col">Nr</th>
                    <th scope="col">Namn</th>
                    <th scope="col">Kön</th>
                    <th scope="col">Födelsedatum</th>
                    <th scope="col">Pass nr</th>
                    <th scope="col">Nationalitet</th>
                    <th scope="col">Rum</th>
                    <th scope="col">Flyg ut</th>
                    <th scope="col">Flyg hem</th>
                    <th scope="col">Betalning</th>
                    <th scope="col">Anteckningar</th>
                  </tr>
                </thead>
                <tbody>
                  {allTravelers.map((t, i) => (
                    <tr key={t.id}>
                      <td className="tnum">{i + 1}</td>
                      <td>
                        <strong style={{ fontFamily: "var(--f-serif)" }}>{t.firstName} {t.lastName}</strong>
                      </td>
                      <td>{t.gender ?? "—"}</td>
                      <td className="tnum">
                        {t.birthDate ? new Date(t.birthDate).toLocaleDateString("sv-SE") : t.personnummer ?? "—"}
                      </td>
                      <td style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>{t.passportNo ?? "—"}</td>
                      <td>{t.nationality ?? "—"}</td>
                      <td>{t.roomAssignment ?? "—"}</td>
                      <td>{t.flightOut ?? "—"}</td>
                      <td>{t.flightReturn ?? "—"}</td>
                      <td>{t.paymentNote ?? "—"}</td>
                      <td className="dim" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.notes ?? ""}
                        {t.needsAssist && <span className="adm-pill warn" style={{ marginLeft: 4 }}>Assistans</span>}
                        {t.isMahram && <span className="adm-pill gold" style={{ marginLeft: 4 }}>Mahram</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          {/* Rooming */}
          <div className="adm-card">
            <div className="h">
              Rumsindelning
              <span className="dim" style={{ fontSize: 12, fontFamily: "var(--f-sans)" }}>
                {Object.keys(roomGroups).length} rum
              </span>
            </div>
            <div className="b">
              <div className="rooming-grid">
                {Object.entries(roomGroups).map(([room, travelers]) => (
                  <div key={room} className="room-card">
                    <div className="room-head">
                      <strong>{room}</strong>
                      <span className="dim">{travelers.length} pers</span>
                    </div>
                    <div className="room-occupants">
                      {travelers.map((t) => (
                        <div key={t.id} className="room-person">
                          <span className="room-av">{t.gender === "M" ? "♂" : t.gender === "F" ? "♀" : "·"}</span>
                          <span>{t.firstName} {t.lastName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hälsa & assistans */}
          {(assistCount > 0 || mahramCount > 0) && (
            <div className="adm-card">
              <div className="h">Hälsa & assistans</div>
              <div className="b dense">
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th scope="col">Resenär</th>
                      <th scope="col">Typ</th>
                      <th scope="col">Anteckningar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTravelers.filter((t) => t.needsAssist || t.isMahram).map((t) => (
                      <tr key={t.id}>
                        <td><strong style={{ fontFamily: "var(--f-serif)" }}>{t.firstName} {t.lastName}</strong></td>
                        <td>
                          {t.needsAssist && <span className="adm-pill warn">Assistans</span>}
                          {t.isMahram && <span className="adm-pill gold" style={{ marginLeft: 4 }}>Mahram</span>}
                        </td>
                        <td className="dim">{t.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .trip-selector {
          display: flex; align-items: center; gap: 8px;
          padding: 14px 18px; background: #fff; border: 1px solid var(--c-line-soft);
          margin-bottom: 20px; flex-wrap: wrap;
        }

        .gr-summary {
          display: grid; grid-template-columns: 1.6fr repeat(5, 1fr);
          gap: 0; background: var(--c-ink); margin-bottom: 0;
        }
        .gr-sum-main { padding: 22px 24px; }
        .gr-sum-item {
          padding: 18px 16px; border-left: 1px solid #152545;
          display: flex; flex-direction: column; justify-content: center;
        }
        .gr-v { font-family: var(--f-serif); font-size: 22px; color: #fff; font-weight: 460; }
        .gr-l { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #4A6080; font-weight: 700; margin-top: 4px; }

        .rooming-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        .room-card { border: 1px solid var(--c-line-soft); background: var(--c-paper); }
        .room-head {
          padding: 10px 14px; background: var(--c-cream);
          display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid var(--c-line-soft);
        }
        .room-head strong { font-family: var(--f-serif); font-size: 15px; color: var(--c-ink); }
        .room-occupants { padding: 8px 14px; display: flex; flex-direction: column; gap: 6px; }
        .room-person { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .room-av {
          width: 24px; height: 24px; border-radius: 50%;
          border: 1px solid var(--c-gold); display: grid; place-items: center;
          font-size: 12px; color: var(--c-gold); flex-shrink: 0;
        }

        @media (max-width: 900px) {
          .gr-summary { grid-template-columns: 1fr 1fr 1fr; }
          .gr-sum-main { grid-column: 1 / -1; }
        }
        @media (max-width: 640px) {
          .gr-summary { grid-template-columns: 1fr 1fr; }
          .gr-sum-item { padding: 14px 12px; }
          .gr-v { font-size: 18px; }
        }
      `}</style>
    </div>
  );
}
