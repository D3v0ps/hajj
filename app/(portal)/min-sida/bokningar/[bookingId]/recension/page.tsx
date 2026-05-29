import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { submitReview } from "@/app/actions/reviews";

export const dynamic = "force-dynamic";

type Params = Promise<{ bookingId: string }>;
type Search = Promise<{ error?: string }>;

function StarRow({ rating }: { rating: number }) {
  // Statisk visning av valt betyg (1–5 stjärnor med ★/☆).
  const stars: string[] = [];
  for (let i = 1; i <= 5; i++) stars.push(i <= rating ? "★" : "☆");
  return (
    <span
      aria-label={`${rating} av 5 stjärnor`}
      title={`${rating} / 5`}
      style={{ color: "var(--c-gold)", fontSize: 22, letterSpacing: 2 }}
    >
      {stars.join("")}
    </span>
  );
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { bookingId } = await params;
  const { error } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: true },
  });
  if (!booking || booking.userId !== session.user.id) notFound();

  const existing = await prisma.review.findUnique({
    where: { bookingId_userId: { bookingId: booking.id, userId: session.user.id } },
  });

  const backLink = (
    <Link
      href={`/min-sida/bokningar/${booking.id}`}
      className="dim"
      style={{ fontSize: 13 }}
    >
      ← Bokningen
    </Link>
  );

  // Fall 1: bokningen är inte avslutad än.
  if (booking.status !== "COMPLETED") {
    return (
      <div className="container narrow">
        {backLink}
        <span className="eyebrow gold" style={{ marginTop: 24, display: "block" }}>
          Omdöme
        </span>
        <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>
          {booking.package.title}
        </h1>
        <p className="dim" style={{ maxWidth: 540 }}>
          Du kan lämna omdöme efter resan. När din bokning är markerad som
          avslutad öppnas formuläret här.
        </p>
      </div>
    );
  }

  // Fall 2: kunden har redan lämnat omdöme — read-only kvittens.
  if (existing) {
    return (
      <div className="container narrow">
        {backLink}
        <span className="eyebrow gold" style={{ marginTop: 24, display: "block" }}>
          Omdöme
        </span>
        <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>
          Tack, ditt omdöme är inskickat
        </h1>
        <p className="dim" style={{ maxWidth: 540, marginBottom: 28 }}>
          Du har lämnat ett omdöme för {booking.package.title}. Tack för att du
          delar med dig av din upplevelse.
        </p>

        <div className="review-box">
          <div className="review-row">
            <span className="eyebrow">Betyg</span>
            <StarRow rating={existing.rating} />
          </div>
          {existing.body && (
            <div className="review-row">
              <span className="eyebrow">Ditt omdöme</span>
              <p className="serif" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                {existing.body}
              </p>
            </div>
          )}
          <div className="review-row">
            <span className="eyebrow">Får publiceras på sajten</span>
            <p className="serif" style={{ marginTop: 6 }}>
              {existing.isPublic ? "Ja" : "Nej"}
            </p>
          </div>
          <div className="review-row">
            <span className="eyebrow">Inskickat</span>
            <p className="serif" style={{ marginTop: 6 }}>
              {new Date(existing.createdAt).toLocaleDateString("sv-SE")}
            </p>
          </div>
        </div>

        <style>{`
          .review-box {
            padding: 24px; background: var(--c-cream);
            display: grid; gap: 18px;
          }
          .review-row { display: block; }
        `}</style>
      </div>
    );
  }

  // Fall 3: formulär — låt kund välja stjärnor + text + publicering.
  return (
    <div className="container narrow">
      {backLink}
      <span className="eyebrow gold" style={{ marginTop: 24, display: "block" }}>
        Lämna omdöme
      </span>
      <h1 style={{ fontSize: 32, marginTop: 12, marginBottom: 8 }}>
        Hur var din resa?
      </h1>
      <p className="dim" style={{ maxWidth: 540, marginBottom: 24 }}>
        {booking.package.title}. Ditt omdöme hjälper oss att bli bättre och
        andra resenärer att välja rätt paket.
      </p>

      {error && (
        <p role="alert" className="form-error">
          {decodeURIComponent(error)}
        </p>
      )}

      <form action={submitReview} className="review-form">
        <input type="hidden" name="bookingId" value={booking.id} />

        <fieldset className="rate">
          <legend className="eyebrow">Betyg</legend>
          <div className="rate-options" role="radiogroup" aria-label="Välj betyg 1 till 5 stjärnor">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="rate-opt">
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  required
                  defaultChecked={n === 5}
                />
                <span aria-hidden="true" className="rate-stars">
                  {"★".repeat(n)}
                  <span className="rate-empty">{"☆".repeat(5 - n)}</span>
                </span>
                <span className="rate-num">{n}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span className="eyebrow">Ditt omdöme (valfritt)</span>
          <textarea
            name="body"
            rows={6}
            maxLength={2000}
            placeholder="Berätta om upplevelsen — boende, reseledare, mat, helheten."
          />
        </label>

        <label className="check">
          <input type="checkbox" name="isPublic" defaultChecked />
          <span>Får publiceras på sajten</span>
        </label>

        <div className="actions">
          <button type="submit" className="btn btn-primary">
            Skicka omdöme
          </button>
          <Link
            href={`/min-sida/bokningar/${booking.id}`}
            className="btn btn-ghost"
          >
            Avbryt
          </Link>
        </div>
      </form>

      <style>{`
        .form-error {
          background: #FBE9E2; color: var(--c-warn);
          padding: 10px 14px; margin-bottom: 20px;
          font-size: 13px; border: 1px solid #F3CFC0;
        }
        .review-form { display: grid; gap: 24px; max-width: 640px; }
        .rate { border: 0; padding: 0; margin: 0; }
        .rate legend { margin-bottom: 10px; }
        .rate-options {
          display: grid; grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }
        .rate-opt {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; padding: 10px 4px;
          background: #fff; border: 1px solid var(--c-line-soft);
          cursor: pointer; transition: all 120ms;
        }
        .rate-opt:hover { border-color: var(--c-gold); }
        .rate-opt:has(input:checked) {
          border-color: var(--c-gold); background: #FFF7E6;
        }
        .rate-opt input { position: absolute; opacity: 0; pointer-events: none; }
        .rate-stars {
          color: var(--c-gold); font-size: 16px; letter-spacing: 1px;
        }
        .rate-empty { color: var(--c-line); }
        .rate-num {
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--c-text-muted); font-weight: 700;
        }
        .field { display: grid; gap: 8px; }
        .field textarea {
          padding: 12px 14px; border: 1px solid var(--c-line);
          font-family: var(--f-sans); font-size: 14px; resize: vertical;
          background: #fff;
        }
        .check {
          display: flex; align-items: center; gap: 10px;
          font-size: 14px;
        }
        .check input { width: 16px; height: 16px; }
        .actions {
          display: flex; gap: 12px; flex-wrap: wrap;
        }
        @media (max-width: 600px) {
          .rate-options { grid-template-columns: repeat(5, 1fr); gap: 4px; }
          .rate-opt { padding: 8px 2px; }
          .rate-stars { font-size: 13px; letter-spacing: 0; }
        }
      `}</style>
    </div>
  );
}
