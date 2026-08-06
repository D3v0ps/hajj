import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { requestRefund } from "@/app/actions/refunds";

export const dynamic = "force-dynamic";

type Params = Promise<{ bookingId: string }>;
type SearchParams = Promise<{ error?: string }>;

// Speglar `BLOCKED_FOR_REFUND_REQUEST` i app/actions/refunds.ts — håll synkat.
const BLOCKED_STATUSES = ["COMPLETED", "CANCELLED"] as const;

const REFUND_LABELS: Record<string, string> = {
  NONE: "—",
  REQUESTED: "Mottagen — under granskning",
  APPROVED: "Godkänd",
  REJECTED: "Avslagen",
  PROCESSED: "Återbetald",
};

const REFUND_DESC: Record<string, string> = {
  REQUESTED:
    "Vi har mottagit din begäran och hanterar den så snart vi kan. Du kontaktas via e-post och i Meddelanden här på Min sida.",
  APPROVED:
    "Din begäran är godkänd. Eventuell återbetalning behandlas i nästa steg enligt resevillkoren.",
  REJECTED:
    "Din begäran kunde tyvärr inte godkännas. Se meddelandet från kontoret för detaljer.",
  PROCESSED:
    "Återbetalning genomförd enligt resevillkoren. Se Betalningar i bokningen för transaktionsdetaljer.",
};

export default async function AvbokaPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
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

  const isBlocked = (BLOCKED_STATUSES as readonly string[]).includes(booking.status);
  const hasRequest = booking.refundStatus !== "NONE";
  const refundLabel = REFUND_LABELS[booking.refundStatus] ?? booking.refundStatus;
  const refundDesc = REFUND_DESC[booking.refundStatus];
  const ref = booking.reference.slice(0, 12).toUpperCase();
  const fmtDateTime = (d: Date | null) =>
    d ? new Date(d).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="container narrow">
      <Link href={`/min-sida/bokningar/${booking.id}`} className="dim" style={{ fontSize: 13 }}>
        ← Tillbaka till bokningen
      </Link>

      <span className="eyebrow gold" style={{ marginTop: 24, display: "block" }}>
        Ref {ref}
      </span>
      <h1 style={{ fontSize: 32, marginTop: 14, marginBottom: 8 }}>Avbokning / återbetalning</h1>
      <p className="dim" style={{ marginBottom: 24 }}>
        {booking.package.title}
      </p>

      {hasRequest ? (
        <section className="rf-status" aria-label="Avbokningsbegäran-status">
          <div className="rf-status-head">
            <span className={`rf-pill rf-pill-${booking.refundStatus.toLowerCase()}`}>{refundLabel}</span>
            <span className="dim" style={{ fontSize: 13 }}>
              Mottagen {fmtDateTime(booking.refundRequestedAt)}
            </span>
          </div>
          <p className="rf-status-headline">Din avbokningsbegäran är: {refundLabel.toLowerCase()}.</p>
          {refundDesc && <p className="rf-status-body">{refundDesc}</p>}

          {booking.refundReason && (
            <div className="rf-reason-box">
              <span className="eyebrow">Din anledning</span>
              <p className="rf-reason-text">{booking.refundReason}</p>
            </div>
          )}

          <div className="rf-legal-note">
            <p>
              <strong>Avgifter följer resevillkoren.</strong> Hadj Omra Resor omfattas av paketreselagen
              (2018:1217) och resegaranti hos Kammarkollegiet. Vilken del av inbetalt belopp som
              återbetalas beror på hur nära avresedatum begäran inkom.
            </p>
            <p>
              <Link href="/villkor" className="btn-link">Läs fullständiga resevillkor →</Link>
            </p>
          </div>

          <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={`/min-sida/bokningar/${booking.id}`} className="btn btn-ghost" style={{ padding: "10px 20px", fontSize: 13 }}>
              Tillbaka till bokningen
            </Link>
            <Link href="/min-sida/meddelanden" className="btn btn-gold" style={{ padding: "10px 20px", fontSize: 13 }}>
              Visa meddelanden
            </Link>
          </div>
        </section>
      ) : isBlocked ? (
        <section className="rf-blocked" role="status">
          <p>
            Den här bokningen har status <strong>{booking.status}</strong> och kan inte avbokas via Min sida.
            Kontakta kontoret om du har frågor.
          </p>
          <Link href={`/min-sida/bokningar/${booking.id}`} className="btn btn-ghost" style={{ padding: "10px 20px", fontSize: 13, marginTop: 16 }}>
            Tillbaka till bokningen
          </Link>
        </section>
      ) : (
        <>
          {error && (
            <div role="alert" className="rf-error">
              <strong>Något stämde inte:</strong> {error}
            </div>
          )}

          <section className="rf-form-wrap">
            <div className="rf-info">
              <h2 style={{ fontSize: 18, margin: "0 0 8px 0" }}>Innan du skickar in</h2>
              <ul>
                <li>
                  Avgifter följer <Link href="/villkor" className="btn-link">resevillkoren</Link> — avresekostnader,
                  administrativa avgifter och eventuellt självrisk kan dras av återbetalningen.
                </li>
                <li>
                  Som arrangör omfattas vi av <strong>paketreselagen (2018:1217)</strong> och har resegaranti
                  hos Kammarkollegiet.
                </li>
                <li>
                  Vi rekommenderar att kontrollera om du har avbeställningsskydd via din reseförsäkring.
                </li>
                <li>
                  Kontoret återkommer via e-post och i Meddelanden här på Min sida när din begäran är hanterad.
                </li>
              </ul>
            </div>

            <form action={requestRefund} className="rf-form">
              <input type="hidden" name="bookingId" value={booking.id} />
              <div className="field">
                <label htmlFor="rf-reason">
                  Anledning till avbokning <span style={{ color: "var(--c-warn)" }}>*</span>
                </label>
                <textarea
                  id="rf-reason"
                  name="reason"
                  required
                  rows={6}
                  maxLength={2000}
                  placeholder="Beskriv varför du vill avboka. Ange gärna sjukdom, ändrade omständigheter, eller annan information som hjälper oss bedöma ärendet."
                />
                <small className="dim">Max 2000 tecken.</small>
              </div>

              <div className="rf-actions">
                <Link href={`/min-sida/bokningar/${booking.id}`} className="btn btn-ghost" style={{ padding: "10px 20px", fontSize: 13 }}>
                  Avbryt
                </Link>
                <button type="submit" className="btn btn-primary" style={{ padding: "10px 22px", fontSize: 13 }}>
                  Skicka begäran
                </button>
              </div>
            </form>
          </section>
        </>
      )}

      <style>{`
        .rf-status {
          background: #fff; border: 1px solid var(--c-line-soft);
          border-left: 4px solid var(--c-gold);
          padding: 28px 32px; margin-top: 8px;
        }
        .rf-status-head {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
        }
        .rf-status-headline {
          font-family: var(--f-serif); font-size: 20px; color: var(--c-ink);
          margin: 0 0 10px 0;
        }
        .rf-status-body {
          margin: 0 0 18px 0; line-height: 1.6; color: var(--c-text);
        }
        .rf-pill {
          display: inline-flex; align-items: center;
          padding: 6px 14px; font-size: 12px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          border: 1px solid; background: transparent;
        }
        .rf-pill-requested { color: var(--c-gold); border-color: var(--c-gold); background: #FFF7E6; }
        .rf-pill-approved  { color: var(--c-green); border-color: var(--c-green-soft); background: #E6F1EA; }
        .rf-pill-rejected  { color: var(--c-warn);  border-color: var(--c-warn); background: #FBE9E2; }
        .rf-pill-processed { color: var(--c-ink);   border-color: var(--c-ink);  background: #fff; }
        .rf-pill-none      { color: var(--c-text-muted); border-color: var(--c-line); }

        .rf-reason-box {
          background: var(--c-paper);
          border-left: 3px solid var(--c-gold);
          padding: 14px 18px; margin-top: 6px;
        }
        .rf-reason-text { margin: 6px 0 0; white-space: pre-wrap; line-height: 1.55; }

        .rf-legal-note {
          margin-top: 24px; padding-top: 18px;
          border-top: 1px dashed var(--c-line-soft);
          font-size: 13px; color: var(--c-text-muted); line-height: 1.55;
        }
        .rf-legal-note p { margin: 0 0 8px 0; }

        .rf-blocked {
          padding: 32px; background: #fff; border: 1px dashed var(--c-line);
          line-height: 1.55;
        }

        .rf-error {
          background: #FBE9E2; border: 1px solid var(--c-warn);
          color: var(--c-warn); padding: 12px 16px;
          margin-bottom: 20px; font-size: 14px;
        }

        .rf-form-wrap { display: grid; grid-template-columns: 1fr; gap: 18px; }
        .rf-info {
          background: var(--c-cream); padding: 20px 24px;
          border-left: 3px solid var(--c-gold);
        }
        .rf-info ul { margin: 0; padding-left: 20px; }
        .rf-info li { font-size: 13.5px; line-height: 1.6; margin-bottom: 6px; color: var(--c-text); }

        .rf-form { background: #fff; border: 1px solid var(--c-line-soft); padding: 24px 28px; }
        .rf-form .field { display: grid; gap: 6px; }
        .rf-form label { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .rf-form textarea {
          width: 100%; padding: 12px 14px;
          border: 1px solid var(--c-line); font-family: var(--f-sans);
          font-size: 14px; resize: vertical; background: var(--c-paper);
        }
        .rf-form textarea:focus { border-color: var(--c-ink); outline: none; background: #fff; }
        .rf-actions {
          display: flex; justify-content: flex-end; gap: 12px;
          margin-top: 20px; flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .rf-status { padding: 22px 18px; }
          .rf-form { padding: 18px; }
          .rf-actions { justify-content: stretch; }
          .rf-actions .btn { flex: 1; text-align: center; }
        }
      `}</style>
    </div>
  );
}
