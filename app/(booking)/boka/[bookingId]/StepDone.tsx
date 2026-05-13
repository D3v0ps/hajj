import Link from "next/link";
import type { Booking, Package, PackageTier, Traveler, Payment } from "@prisma/client";

type Props = {
  booking: Booking & {
    package: Package & { tiers: PackageTier[] };
    tier: PackageTier | null;
    travelers: Traveler[];
    payments: Payment[];
  };
};

export function StepDone({ booking }: Props) {
  const latestPayment = booking.payments[booking.payments.length - 1];
  return (
    <div>
      <span className="section-mark">— Bokning mottagen</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>Tack — vi har din bokning.</h2>
      <p className="dim" style={{ marginBottom: 24, fontSize: 16 }}>
        Bokningsreferens <strong style={{ color: "var(--c-ink)" }}>{booking.reference.slice(0, 12).toUpperCase()}</strong>. Kontoret kontaktar dig inom 24 timmar med nästa steg.
      </p>

      <ol className="next-list">
        <li>
          <span className="num">01</span>
          <div>
            <strong>Bekräftelse via e-post</strong>
            <p className="dim" style={{ fontSize: 13 }}>Kommer till {booking.contactEmail ?? "din e-post"} inom 5 minuter.</p>
          </div>
        </li>
        <li>
          <span className="num">02</span>
          <div>
            <strong>
              {latestPayment?.method === "BANKGIRO" || latestPayment?.method === "INVOICE"
                ? "Inbetalningskort/faktura skickas"
                : "Betalningslänk skickas"}
            </strong>
            <p className="dim" style={{ fontSize: 13 }}>Inom 24 timmar — håll utkik i din e-post.</p>
          </div>
        </li>
        <li>
          <span className="num">03</span>
          <div>
            <strong>Ladda upp dokument på Min sida</strong>
            <p className="dim" style={{ fontSize: 13 }}>Pass, passfoto, eventuellt uppehållstillstånd. Vi granskar och återkommer.</p>
          </div>
        </li>
        <li>
          <span className="num">04</span>
          <div>
            <strong>Slutbetalning 30 dagar före avresa</strong>
            <p className="dim" style={{ fontSize: 13 }}>Vi skickar påminnelse 45 dagar före avresa.</p>
          </div>
        </li>
      </ol>

      <div style={{ display: "flex", gap: 12, marginTop: 40, justifyContent: "flex-end" }}>
        <Link href="/min-sida" className="btn btn-primary">Gå till Min sida →</Link>
      </div>

      <style>{`
        .next-list { list-style: none; padding: 0; display: grid; gap: 18px; }
        .next-list li { display: grid; grid-template-columns: 60px 1fr; gap: 14px; padding: 18px 20px; background: var(--c-cream); border: 1px solid var(--c-line-soft); }
        .next-list .num { font-family: var(--f-mono); font-size: 14px; color: var(--c-gold); letter-spacing: 0.14em; padding-top: 4px; }
        .next-list strong { display: block; font-family: var(--f-serif); font-size: 17px; color: var(--c-ink); margin-bottom: 4px; }
        .next-list p { margin: 0; }
      `}</style>
    </div>
  );
}
