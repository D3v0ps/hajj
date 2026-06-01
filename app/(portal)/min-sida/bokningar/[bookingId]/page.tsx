import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = Promise<{ bookingId: string }>;
type SearchParams = Promise<{ paid?: string }>;

// Speglar `BLOCKED_FOR_REFUND_REQUEST` i app/actions/refunds.ts — håll synkat.
const REFUND_BLOCKED_STATUSES = ["COMPLETED", "CANCELLED"] as const;

const REFUND_LABELS: Record<string, string> = {
  NONE: "—",
  REQUESTED: "Avbokning begärd",
  APPROVED: "Avbokning godkänd",
  REJECTED: "Avbokning avslagen",
  PROCESSED: "Återbetald",
};

export default async function BokningDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { bookingId } = await params;
  const { paid } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: true, tier: true, travelers: true, payments: true, messages: true },
  });
  if (!booking || booking.userId !== session.user.id) notFound();

  // Hämta ev. omdöme för att visa rätt CTA/kvittens vid avslutad resa.
  const existingReview =
    booking.status === "COMPLETED"
      ? await prisma.review.findUnique({
          where: {
            bookingId_userId: {
              bookingId: booking.id,
              userId: session.user.id,
            },
          },
          select: { id: true },
        })
      : null;

  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "—");
  const refundAllowed =
    booking.refundStatus === "NONE" &&
    !(REFUND_BLOCKED_STATUSES as readonly string[]).includes(booking.status);
  const refundActive = booking.refundStatus !== "NONE";
  const refundClass = booking.refundStatus.toLowerCase();
  const refundLabel = REFUND_LABELS[booking.refundStatus] ?? booking.refundStatus;

  // Slutbetalning: visa CTA när anmälningsavgiften är betald men slutpriset
  // återstår. Visa "Slutbetalt" när bokningen är PAID_FULL.
  const paidSum = booking.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);
  const remaining = booking.totalAmount - paidSum;
  const canPayFinal =
    (booking.status === "PAID_DEPOSIT" || booking.status === "CONFIRMED") &&
    remaining > 0 &&
    // Inga slutbetalningar medan en avbokningsbegäran är öppen.
    booking.refundStatus === "NONE";
  const isFullyPaid = booking.status === "PAID_FULL" || booking.status === "COMPLETED";

  return (
    <div className="container narrow">
      <Link href="/min-sida" className="dim" style={{ fontSize: 13 }}>← Översikt</Link>

      <span className="eyebrow gold" style={{ marginTop: 24, display: "block" }}>
        Ref {booking.reference.slice(0, 12).toUpperCase()}
      </span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 8 }}>{booking.package.title}</h1>
      <p className="dim">{booking.package.subtitle}</p>

      {["CONFIRMED", "PAID_DEPOSIT", "PAID_FULL", "COMPLETED"].includes(booking.status) && (
        <Link href={`/min-sida/bokningar/${booking.id}/resvaska`} className="tp-link" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: "var(--c-cream)", border: "1px solid var(--c-line-soft)",
          borderLeft: "3px solid var(--c-gold)", marginTop: 22,
        }}>
          <span><strong className="serif">Digital resväska</strong>
            <span className="dim" style={{ fontSize: 13, marginLeft: 10 }}>flyg, hotell, dagsprogram & kontakter</span>
          </span>
          <span style={{ color: "var(--c-gold)" }}>→</span>
        </Link>
      )}

      {refundActive && (
        <div className={`rf-banner rf-banner-${refundClass}`} role="status">
          <span className={`rf-pill rf-pill-${refundClass}`}>{refundLabel}</span>
          <span className="rf-banner-text">
            Mottagen {booking.refundRequestedAt ? new Date(booking.refundRequestedAt).toLocaleDateString("sv-SE") : "—"}.{" "}
            <Link href={`/min-sida/bokningar/${booking.id}/avboka`} className="btn-link">Visa detaljer →</Link>
          </span>
        </div>
      )}

      <div className="kv-grid">
        <div><span className="eyebrow">Status</span><p className="serif">{booking.status}</p></div>
        <div><span className="eyebrow">Avresa</span><p className="serif">{fmtDate(booking.package.startDate)}</p></div>
        <div><span className="eyebrow">Hemkomst</span><p className="serif">{fmtDate(booking.package.endDate)}</p></div>
        <div><span className="eyebrow">Rumstyp</span><p className="serif">{booking.tier?.name ?? "—"}</p></div>
        <div><span className="eyebrow">Resenärer</span><p className="serif">{booking.travelers.length}</p></div>
        <div><span className="eyebrow">Totalpris</span><p className="serif tnum">{booking.totalAmount.toLocaleString("sv-SE")} kr</p></div>
      </div>

      {paid === "final" && (
        <div className="paid-ok" role="status">
          <strong className="serif">Tack — slutbetalningen är mottagen.</strong>
          <span className="dim" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
            Vi hör av oss inför avresan med all praktisk information.
          </span>
        </div>
      )}

      {isFullyPaid && booking.status !== "COMPLETED" && (
        <div className="fin-banner">
          <span className="tag green">Slutbetalt</span>
          <span className="dim" style={{ fontSize: 13 }}>
            Hela resekostnaden är betald.
          </span>
        </div>
      )}

      {canPayFinal && (
        <div className="fin-cta">
          <div>
            <strong className="serif" style={{ fontSize: 18, color: "var(--c-ink)" }}>
              Slutbetalning återstår
            </strong>
            <p className="dim" style={{ fontSize: 13, marginTop: 4 }}>
              {remaining.toLocaleString("sv-SE")} kr kvar att betala — senast 30 dagar före avresa.
            </p>
          </div>
          <Link
            href={`/min-sida/bokningar/${booking.id}/slutbetalning`}
            className="btn btn-primary"
          >
            Betala slutbelopp →
          </Link>
        </div>
      )}

      {refundAllowed && (
        <div className="rf-cta">
          <Link
            href={`/min-sida/bokningar/${booking.id}/avboka`}
            className="btn btn-ghost"
            style={{ padding: "10px 22px", fontSize: 13 }}
          >
            Begär avbokning
          </Link>
          <span className="dim" style={{ fontSize: 12 }}>
            Avgifter följer <Link href="/villkor" className="btn-link">resevillkoren</Link>.
          </span>
        </div>
      )}

      {booking.status === "COMPLETED" && (
        <div className="review-cta">
          {existingReview ? (
            <>
              <p className="serif" style={{ fontSize: 17, marginBottom: 8 }}>
                Du har lämnat ett omdöme — tack!
              </p>
              <Link
                href={`/min-sida/bokningar/${booking.id}/recension`}
                className="btn-link"
              >
                Se ditt omdöme →
              </Link>
            </>
          ) : (
            <>
              <p className="serif" style={{ fontSize: 17, marginBottom: 4 }}>
                Hur var din resa?
              </p>
              <p className="dim" style={{ fontSize: 13, marginBottom: 14 }}>
                Berätta om upplevelsen — det tar bara en minut.
              </p>
              <Link
                href={`/min-sida/bokningar/${booking.id}/recension`}
                className="btn btn-gold"
              >
                Lämna omdöme
              </Link>
            </>
          )}
        </div>
      )}

      <h2 style={{ fontSize: 24, marginTop: 40, marginBottom: 16 }}>Resenärer</h2>
      <ul className="trv-grid">
        {booking.travelers.map((t) => (
          <li key={t.id}>
            <strong>{t.firstName} {t.lastName}</strong>
            <span className="dim">
              {t.ageCategory === "ADULT" ? "Vuxen" : t.ageCategory === "CHILD" ? "Barn" : "Spädbarn"}
              {" · "}{t.personnummer ?? "—"}
              {t.passportNo && ` · pass ${t.passportNo}`}
              {t.nationality && ` · ${t.nationality}`}
            </span>
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 24, marginTop: 40, marginBottom: 16 }}>Betalningar</h2>
      {booking.payments.length === 0 ? (
        <p className="dim">Inga betalningar registrerade.</p>
      ) : (
        <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Betalningar för bokningen</caption>
          <thead><tr><th scope="col">Datum</th><th scope="col">Belopp</th><th scope="col">Metod</th><th scope="col">Status</th><th scope="col">Ref</th></tr></thead>
          <tbody>
            {booking.payments.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.createdAt).toLocaleDateString("sv-SE")}</td>
                <td className="tnum">{p.amount.toLocaleString("sv-SE")} kr</td>
                <td>{p.method}</td>
                <td>{p.status}</td>
                <td className="serif">{p.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <style>{`
        .kv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 24px; background: var(--c-cream); margin-top: 32px; }
        .kv-grid p { font-size: 18px; color: var(--c-ink); margin: 6px 0 0; }
        .trv-grid { list-style: none; padding: 0; display: grid; gap: 8px; }
        .trv-grid li { padding: 14px 18px; background: #fff; border: 1px solid var(--c-line-soft); display: grid; gap: 4px; }
        .trv-grid strong { font-family: var(--f-serif); font-size: 17px; color: var(--c-ink); }
        .review-cta { margin-top: 24px; padding: 20px 24px; background: var(--c-cream); border-left: 3px solid var(--c-gold); }
        .fin-cta { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 20px 22px; background: #fff; border: 1px solid var(--c-gold); margin-top: 24px; }
        .fin-banner { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #fff; border: 1px solid var(--c-line-soft); margin-top: 24px; }
        .paid-ok { padding: 14px 18px; background: #fff; border: 1px solid var(--c-green-soft); margin-top: 20px; }
        .paid-ok strong { color: var(--c-ink); font-size: 16px; }

        .rf-banner {
          margin-top: 22px; padding: 14px 18px;
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
          background: #fff; border: 1px solid var(--c-line-soft);
          border-left: 3px solid var(--c-gold);
          font-size: 14px;
        }
        .rf-banner-approved  { border-left-color: var(--c-green-soft); }
        .rf-banner-rejected  { border-left-color: var(--c-warn); }
        .rf-banner-processed { border-left-color: var(--c-ink); }
        .rf-banner-text { color: var(--c-text); }

        .rf-pill {
          display: inline-flex; align-items: center;
          padding: 4px 10px; font-size: 11px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          border: 1px solid; background: transparent;
        }
        .rf-pill-requested { color: var(--c-gold);  border-color: var(--c-gold); background: #FFF7E6; }
        .rf-pill-approved  { color: var(--c-green); border-color: var(--c-green-soft); background: #E6F1EA; }
        .rf-pill-rejected  { color: var(--c-warn);  border-color: var(--c-warn); background: #FBE9E2; }
        .rf-pill-processed { color: var(--c-ink);   border-color: var(--c-ink);  background: #fff; }
        .rf-pill-none      { color: var(--c-text-muted); border-color: var(--c-line); }

        .rf-cta {
          margin-top: 18px; display: flex; align-items: center;
          gap: 12px; flex-wrap: wrap;
        }
        @media (max-width: 900px) { .kv-grid { grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px; } }
        @media (max-width: 640px) { .fin-cta { flex-direction: column; align-items: stretch; gap: 14px; } }
        @media (max-width: 480px) { .kv-grid { grid-template-columns: 1fr; padding: 16px; } }
      `}</style>
    </div>
  );
}
