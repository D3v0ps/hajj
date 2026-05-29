import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { stripeEnabled } from "@/lib/stripe";
import { createFinalPaymentCheckout } from "@/app/actions/final-payment";

export const dynamic = "force-dynamic";

type Params = Promise<{ bookingId: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function SlutbetalningPage({
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
    include: { package: true, payments: true },
  });
  if (!booking || booking.userId !== session.user.id) notFound();

  // Slutbetalning är bara aktuell efter att anmälningsavgiften är betald.
  if (
    booking.status !== "PAID_DEPOSIT" &&
    booking.status !== "CONFIRMED" &&
    booking.status !== "PAID_FULL"
  ) {
    redirect(`/min-sida/bokningar/${booking.id}`);
  }

  const paidSum = booking.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);
  const remaining = booking.totalAmount - paidSum;
  const alreadyPaid = booking.status === "PAID_FULL" || remaining <= 0;

  // Aktiv (PENDING) "final"-Payment finns redan → visa info (ej dubbel-knapp).
  const pendingFinal = booking.payments.find(
    (p) =>
      p.status === "PENDING" &&
      (p.metadata as { kind?: string } | null)?.kind === "final",
  );

  const fmt = (n: number) => n.toLocaleString("sv-SE");

  return (
    <div className="container narrow">
      <Link href={`/min-sida/bokningar/${booking.id}`} className="dim" style={{ fontSize: 13 }}>
        ← Tillbaka till bokningen
      </Link>

      <span className="eyebrow gold" style={{ marginTop: 24, display: "block" }}>
        Slutbetalning
      </span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 8 }}>{booking.package.title}</h1>
      <p className="dim">
        Bokningsref {booking.reference.slice(0, 12).toUpperCase()}
      </p>

      <div className="fp-grid">
        <div>
          <span className="eyebrow">Totalpris</span>
          <p className="serif tnum">{fmt(booking.totalAmount)} kr</p>
        </div>
        <div>
          <span className="eyebrow">Betalt</span>
          <p className="serif tnum">{fmt(paidSum)} kr</p>
        </div>
        <div>
          <span className="eyebrow">Kvar att betala</span>
          <p className="serif tnum" style={{ color: alreadyPaid ? "var(--c-ink)" : "var(--c-gold)" }}>
            {fmt(Math.max(0, remaining))} kr
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            marginTop: 24,
            padding: "12px 16px",
            background: "#fff",
            border: "1px solid var(--c-warn)",
            color: "var(--c-warn)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {error}
        </p>
      )}

      <div style={{ marginTop: 32 }}>
        {alreadyPaid ? (
          <div className="fp-info">
            <strong className="serif" style={{ fontSize: 18, color: "var(--c-ink)" }}>
              Bokningen är slutbetald
            </strong>
            <p className="dim" style={{ marginTop: 6, fontSize: 14 }}>
              Vi hör av oss inför avresan med all praktisk information.
            </p>
          </div>
        ) : pendingFinal ? (
          <div className="fp-info">
            <strong className="serif" style={{ fontSize: 18, color: "var(--c-ink)" }}>
              En slutbetalning har redan startats
            </strong>
            <p className="dim" style={{ marginTop: 6, fontSize: 14 }}>
              Slutför pågående betalning eller vänta tills den löper ut innan en
              ny startas. Kontakta kontoret om du behöver hjälp.
            </p>
          </div>
        ) : !stripeEnabled ? (
          <div className="fp-info">
            <strong className="serif" style={{ fontSize: 18, color: "var(--c-ink)" }}>
              Kortbetalning ej aktiverad
            </strong>
            <p className="dim" style={{ marginTop: 6, fontSize: 14 }}>
              Kontakta kontoret för slutbetalning via Swish, bankgiro eller
              faktura.
            </p>
          </div>
        ) : (
          <form action={createFinalPaymentCheckout.bind(null, booking.id)}>
            <button type="submit" className="fp-btn">
              <span>
                <strong>Betala slutbelopp</strong>
                <span className="dim" style={{ fontSize: 12, display: "block" }}>
                  Säker betalning via Stripe · Visa, Mastercard
                </span>
              </span>
              <span className="fp-amount tnum">{fmt(remaining)} kr →</span>
            </button>
            <p className="dim" style={{ fontSize: 12, marginTop: 12 }}>
              Vid lyckad betalning markeras bokningen som slutbetald automatiskt.
            </p>
          </form>
        )}
      </div>

      <style>{`
        .fp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 24px; background: var(--c-cream); margin-top: 32px; }
        .fp-grid p { font-size: 22px; color: var(--c-ink); margin: 6px 0 0; }
        .fp-info { padding: 20px 22px; background: #fff; border: 1px solid var(--c-line); }
        .fp-btn {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; padding: 18px 22px; background: var(--c-ink); color: #fff;
          border: 0; cursor: pointer; text-align: left; transition: background 160ms;
          gap: 12px; font: inherit;
        }
        .fp-btn:hover { background: #08152e; }
        .fp-btn strong { font-family: var(--f-serif); font-size: 17px; }
        .fp-btn .dim { color: #8B9AB8; }
        .fp-amount { font-family: var(--f-serif); font-size: 18px; color: var(--c-gold); flex-shrink: 0; }
        @media (max-width: 900px) { .fp-grid { grid-template-columns: 1fr 1fr; gap: 14px; padding: 18px; } .fp-grid p { font-size: 20px; } }
        @media (max-width: 480px) { .fp-grid { grid-template-columns: 1fr; padding: 16px; } }
      `}</style>
    </div>
  );
}
