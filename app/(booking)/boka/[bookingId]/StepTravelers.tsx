import type { Booking, Package, PackageTier, Traveler, Payment } from "@prisma/client";
import { addTraveler, removeTraveler, advanceToReview } from "@/app/actions/bookings";
import { TravelerForm } from "./TravelerForm";

type Props = {
  booking: Booking & {
    package: Package & { tiers: PackageTier[] };
    tier: PackageTier | null;
    travelers: Traveler[];
    payments: Payment[];
  };
};

export function StepTravelers({ booking }: Props) {
  return (
    <div>
      <span className="section-mark">— Steg 3 av 5</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>Resenärer & dokument</h2>
      <p className="dim" style={{ marginBottom: 32 }}>
        Ladda upp passbild — uppgifter fylls i automatiskt via OCR. Eller fyll i manuellt.
      </p>

      <div className="trv-list">
        {booking.travelers.map((t, i) => (
          <article key={t.id} className="trv-row">
            <div className="num">{String(i + 1).padStart(2, "0")}</div>
            <div className="info">
              <strong>{t.firstName} {t.lastName}</strong>
              <span className="dim" style={{ fontSize: 13 }}>
                {t.personnummer && <span>{t.personnummer} · </span>}
                {t.passportNo && <span>Pass {t.passportNo}</span>}
                {t.isMahram && <span className="tag" style={{ marginLeft: 8 }}>Mahram</span>}
                {t.needsAssist && <span className="tag warn" style={{ marginLeft: 8 }}>Assistans</span>}
              </span>
            </div>
            <form action={async () => {
              "use server";
              await removeTraveler(booking.id, t.id);
            }}>
              <button type="submit" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Ta bort</button>
            </form>
          </article>
        ))}
      </div>

      <details className="add-trv" open={booking.travelers.length === 0}>
        <summary>+ Lägg till resenär</summary>
        <TravelerForm bookingId={booking.id} action={addTraveler} />
      </details>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--c-line-soft)", flexWrap: "wrap", gap: 12 }}>
        <p className="dim" style={{ fontSize: 14 }}>
          {booking.travelers.length} av {booking.travelerCount} resenärer tillagda.
        </p>
        <form action={async () => {
          "use server";
          await advanceToReview(booking.id);
        }}>
          <button type="submit" className="btn btn-primary" disabled={booking.travelers.length === 0}>Granska bokning →</button>
        </form>
      </div>

      <style>{`
        .trv-list { display: grid; gap: 10px; margin-bottom: 24px; }
        .trv-row { display: grid; grid-template-columns: 40px 1fr auto; gap: 18px; align-items: center; padding: 16px 20px; background: var(--c-cream); border: 1px solid var(--c-line-soft); }
        .trv-row .num { font-family: var(--f-mono); font-size: 12px; color: var(--c-gold); letter-spacing: 0.12em; }
        .trv-row .info { display: flex; flex-direction: column; gap: 4px; }
        .add-trv { padding: 18px 22px; background: var(--c-paper); border: 1px dashed var(--c-line); }
        .add-trv summary { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); cursor: pointer; list-style: none; }
        .add-trv[open] summary { margin-bottom: 24px; color: var(--c-gold); }
        .trv-form .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 720px) { .trv-form .grid2 { grid-template-columns: 1fr; } }
        @media (max-width: 480px) {
          .trv-row { grid-template-columns: 1fr; gap: 8px; padding: 14px 16px; }
          .add-trv { padding: 16px 18px; }
        }
      `}</style>
    </div>
  );
}
