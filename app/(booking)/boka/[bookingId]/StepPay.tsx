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
  { v: "SWISH" as const, label: "Swish", note: "Vi skickar betalningsuppgifter via mejl." },
  { v: "KLARNA" as const, label: "Klarna", note: "Vi skickar en Klarna-faktura till din e-post." },
  { v: "CARD" as const, label: "Kort (Visa / Mastercard)", note: "Vi skickar en betallänk till din e-post." },
  { v: "BANKGIRO" as const, label: "Bankgiro", note: "Vi mejlar inbetalningskort med OCR-nummer." },
  { v: "INVOICE" as const, label: "Faktura", note: "Företag eller förening — vi mejlar faktura." },
];

export function StepPay({ booking }: Props) {
  const totalDeposit = booking.depositAmount * booking.travelerCount;

  return (
    <div>
      <span className="section-mark">— Steg 5 av 5</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>Betala anmälningsavgift</h2>
      <p className="dim" style={{ marginBottom: 32 }}>
        Anmälningsavgift {booking.depositAmount.toLocaleString("sv-SE")} kr per person, totalt <strong className="tnum" style={{ color: "var(--c-ink)" }}>{totalDeposit.toLocaleString("sv-SE")} kr</strong>. Välj betalsätt — kontoret skickar betalningsuppgifter till din e-post inom 24 timmar. Slutbetalning sker 30 dagar före avresa.
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
              <span className="pay-arrow">Välj →</span>
            </button>
          </form>
        ))}
      </div>

      <style>{`
        .dep-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; padding: 20px; background: var(--c-cream); border: 1px solid var(--c-line); }
        .pay-list { display: grid; gap: 8px; }
        .pay-opt {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; padding: 16px 20px;
          background: #fff; border: 1px solid var(--c-line);
          text-align: left; cursor: pointer; font: inherit; color: inherit;
          transition: all 160ms; min-height: 44px;
        }
        .pay-opt:hover { border-color: var(--c-ink); }
        .pay-opt strong { font-family: var(--f-serif); font-size: 16px; color: var(--c-ink); display: block; margin-bottom: 2px; }
        .pay-arrow { color: var(--c-gold); font-size: 13px; font-weight: 600; flex-shrink: 0; }
        @media (max-width: 640px) { .dep-summary { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
