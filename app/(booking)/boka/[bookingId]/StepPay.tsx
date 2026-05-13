import type { Booking, Package, PackageTier, Traveler, Payment } from "@prisma/client";
import { recordDepositIntent } from "@/app/actions/bookings";

type Props = {
  booking: Booking & {
    package: Package & { tiers: PackageTier[] };
    tier: PackageTier | null;
    travelers: Traveler[];
    payments: Payment[];
  };
};

const METHODS = [
  { v: "SWISH" as const, label: "Swish", note: "Direktbetalning. Kommer i fas 2." },
  { v: "KLARNA" as const, label: "Klarna", note: "Betala om 30 dagar eller dela upp. Kommer i fas 2." },
  { v: "CARD" as const, label: "Kort (Stripe)", note: "Visa, Mastercard. Kommer i fas 2." },
  { v: "BANKGIRO" as const, label: "Bankgiro", note: "Vi mejlar inbetalningskort med OCR." },
  { v: "INVOICE" as const, label: "Faktura", note: "Företag/förening. Kontoret kontaktar dig." },
];

export function StepPay({ booking }: Props) {
  const totalDeposit = booking.depositAmount * booking.travelerCount;

  return (
    <div>
      <span className="section-mark">— Steg 5 av 5</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>Betala anmälningsavgift</h2>
      <p className="dim" style={{ marginBottom: 32 }}>
        För att bekräfta bokningen betalas {booking.depositAmount.toLocaleString("sv-SE")} kr per person, totalt <strong className="tnum" style={{ color: "var(--c-ink)" }}>{totalDeposit.toLocaleString("sv-SE")} kr</strong>. Slutbetalning sker 30 dagar före avresa.
      </p>

      <div className="dep-summary">
        <div>
          <span className="eyebrow">Anmälningsavgift</span>
          <p className="serif tnum" style={{ fontSize: 28, margin: "4px 0 0" }}>{totalDeposit.toLocaleString("sv-SE")} kr</p>
          <span className="dim" style={{ fontSize: 12 }}>{booking.travelerCount} resenärer × {booking.depositAmount.toLocaleString("sv-SE")} kr</span>
        </div>
        <div>
          <span className="eyebrow">Slutpris</span>
          <p className="serif tnum" style={{ fontSize: 28, margin: "4px 0 0" }}>{booking.totalAmount.toLocaleString("sv-SE")} kr</p>
          <span className="dim" style={{ fontSize: 12 }}>betalas senast 30 dagar före avresa</span>
        </div>
      </div>

      <h3 style={{ fontSize: 20, marginTop: 32, marginBottom: 16 }}>Välj betalsätt</h3>
      <div className="pay-list">
        {METHODS.map((m) => (
          <form key={m.v} action={recordDepositIntent.bind(null, booking.id, m.v)}>
            <button type="submit" className="pay-opt">
              <div>
                <strong>{m.label}</strong>
                <span className="dim" style={{ fontSize: 12 }}>{m.note}</span>
              </div>
              <span className="btn-link" style={{ borderBottom: 0 }}>Välj →</span>
            </button>
          </form>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: "18px 22px", background: "var(--c-cream)", borderLeft: "3px solid var(--c-gold)" }}>
        <p className="eyebrow gold" style={{ marginBottom: 6 }}>Fas 1 — manuell hantering</p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
          Direktbetalning via Swish, Klarna och Stripe aktiveras i fas 2. Tills dess registreras din betalningsavsikt och kontoret skickar inbetalningskort eller faktura inom 24 timmar.
        </p>
      </div>
    </div>
  );
}
