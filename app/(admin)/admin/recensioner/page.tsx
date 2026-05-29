import Link from "next/link";
import { prisma } from "@/lib/db";
import { setReviewPublic } from "@/app/actions/reviews";

export const dynamic = "force-dynamic";

function StarRow({ rating }: { rating: number }) {
  // Stjärnvisning för admin-lista (1–5).
  const stars: string[] = [];
  for (let i = 1; i <= 5; i++) stars.push(i <= rating ? "★" : "☆");
  return (
    <span
      aria-label={`${rating} av 5 stjärnor`}
      title={`${rating} / 5`}
      style={{ color: "var(--c-gold)", fontSize: 15, letterSpacing: 1 }}
    >
      {stars.join("")}
    </span>
  );
}

export default async function AdminReviewsPage() {
  // Hämta alla omdömen, nyast först. Inkludera kund och paket för listvyn.
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      booking: {
        select: {
          id: true,
          reference: true,
          package: { select: { title: true } },
        },
      },
    },
    take: 500,
  });

  // Statistik: snitt + antal. Räkna även hur många som är publika.
  const count = reviews.length;
  const avg = count
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : 0;
  const publicCount = reviews.filter((r) => r.isPublic).length;

  return (
    <div>
      <span className="eyebrow gold">Omdömen</span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 8 }}>
        Kundernas omdömen
      </h1>
      <p className="dim" style={{ marginBottom: 24, maxWidth: 640 }}>
        Omdömen från resor som markerats som avslutade. Växla publicering för
        att moderera vad som visas på sajten.
      </p>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="l">Snittbetyg</div>
          <div className="v">
            {count ? (
              <>
                {avg.toFixed(1)}{" "}
                <span style={{ color: "var(--c-gold)", fontSize: 20 }}>★</span>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
        <div className="adm-stat">
          <div className="l">Antal omdömen</div>
          <div className="v">{count}</div>
        </div>
        <div className="adm-stat">
          <div className="l">Publika</div>
          <div className="v">{publicCount}</div>
        </div>
      </div>

      {count === 0 ? (
        <p className="dim" style={{ padding: 40, textAlign: "center" }}>
          Inga omdömen ännu.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Omdömen från kunder</caption>
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Betyg</th>
                <th scope="col">Kund</th>
                <th scope="col">Paket</th>
                <th scope="col">Omdöme</th>
                <th scope="col">Publik</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => {
                const preview = r.body
                  ? r.body.length > 140
                    ? r.body.slice(0, 140).trim() + "…"
                    : r.body
                  : null;
                const customer = r.user.name || r.user.email;
                return (
                  <tr key={r.id}>
                    <td>
                      {new Date(r.createdAt).toLocaleDateString("sv-SE")}
                    </td>
                    <td>
                      <StarRow rating={r.rating} />
                    </td>
                    <td>
                      <div className="serif">{customer}</div>
                      {r.user.name && (
                        <div className="dim" style={{ fontSize: 11 }}>
                          {r.user.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/admin/bokningar/${r.booking.id}`}
                        className="btn-link"
                      >
                        {r.booking.package.title}
                      </Link>
                    </td>
                    <td className="dim" style={{ fontSize: 13, maxWidth: 360 }}>
                      {preview ?? "—"}
                    </td>
                    <td>
                      <form
                        action={setReviewPublic.bind(null, r.id)}
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <label
                          style={{
                            display: "inline-flex",
                            gap: 6,
                            alignItems: "center",
                            fontSize: 12,
                          }}
                        >
                          <input
                            type="checkbox"
                            name="isPublic"
                            defaultChecked={r.isPublic}
                          />
                          <span className="dim">Publicera</span>
                        </label>
                        <button
                          type="submit"
                          className="btn btn-ghost"
                          style={{ padding: "6px 10px", fontSize: 11 }}
                        >
                          Spara
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
