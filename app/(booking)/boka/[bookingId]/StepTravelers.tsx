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

const AGE_LABELS: Record<string, string> = { ADULT: "Vuxen", CHILD: "Barn", INFANT: "Spädbarn" };

export function StepTravelers({ booking }: Props) {
  const total = booking.travelerCount;
  const done = booking.travelers.length;
  const remaining = Math.max(0, total - done);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Räkna registrerade per ålderskategori mot förväntat
  const regByAge = { ADULT: 0, CHILD: 0, INFANT: 0 };
  booking.travelers.forEach((t) => { regByAge[t.ageCategory] = (regByAge[t.ageCategory] ?? 0) + 1; });
  const expected = { ADULT: booking.adultCount, CHILD: booking.childCount, INFANT: booking.infantCount };

  // Vilken ålderskategori är näst på tur (för att förifylla formuläret)
  const nextAge: "ADULT" | "CHILD" | "INFANT" =
    regByAge.ADULT < expected.ADULT ? "ADULT"
    : regByAge.CHILD < expected.CHILD ? "CHILD"
    : regByAge.INFANT < expected.INFANT ? "INFANT"
    : "ADULT";

  return (
    <div>
      <span className="section-mark">— Steg 3 av 5</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 12 }}>Resenäruppgifter</h2>
      <p className="dim" style={{ marginBottom: 24 }}>
        Registrera uppgifter för varje resenär. Ladda upp passbild så fylls fälten i automatiskt,
        eller skriv in manuellt.
      </p>

      {/* Progress-tracker */}
      <div className="trv-progress">
        <div className="trv-progress-head">
          <strong>{done} av {total} resenärer klara</strong>
          {remaining > 0
            ? <span className="dim">{remaining} återstår</span>
            : <span className="trv-all-done">✓ Alla registrerade</span>}
        </div>
        <div className="trv-progress-bar">
          <div className="trv-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="trv-progress-legend">
          {expected.ADULT > 0 && <span className={regByAge.ADULT >= expected.ADULT ? "leg-done" : ""}>{AGE_LABELS.ADULT}: {regByAge.ADULT}/{expected.ADULT}</span>}
          {expected.CHILD > 0 && <span className={regByAge.CHILD >= expected.CHILD ? "leg-done" : ""}>{AGE_LABELS.CHILD}: {regByAge.CHILD}/{expected.CHILD}</span>}
          {expected.INFANT > 0 && <span className={regByAge.INFANT >= expected.INFANT ? "leg-done" : ""}>{AGE_LABELS.INFANT}: {regByAge.INFANT}/{expected.INFANT}</span>}
        </div>
      </div>

      {/* Registrerade resenärer */}
      {booking.travelers.length > 0 && (
        <div className="trv-list">
          {booking.travelers.map((t, i) => (
            <article key={t.id} className="trv-row">
              <div className="num">{String(i + 1).padStart(2, "0")}</div>
              <div className="info">
                <strong>{t.firstName} {t.lastName} <span className="trv-age-tag">{AGE_LABELS[t.ageCategory]}</span></strong>
                <span className="dim" style={{ fontSize: 13 }}>
                  {t.passportNo ? `Pass ${t.passportNo}` : "Pass ej angivet"}
                  {t.nationality && ` · ${t.nationality}`}
                  {t.email && ` · ${t.email}`}
                </span>
              </div>
              <form action={removeTraveler.bind(null, booking.id, t.id)}>
                <button type="submit" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Ta bort</button>
              </form>
            </article>
          ))}
        </div>
      )}

      {/* Lägg till nästa resenär (bara om det fattas några) */}
      {remaining > 0 && (
        <details className="add-trv" open={done === 0}>
          <summary>+ Lägg till resenär ({done + 1} av {total})</summary>
          <TravelerForm bookingId={booking.id} action={addTraveler} defaultAgeCategory={nextAge} />
        </details>
      )}

      <div className="trv-footer">
        <p className="dim" style={{ fontSize: 14 }}>
          {remaining > 0
            ? `Registrera ${remaining} resenär${remaining > 1 ? "er" : ""} till för att fortsätta.`
            : "Alla resenärer är registrerade."}
        </p>
        <form action={advanceToReview.bind(null, booking.id)}>
          <button type="submit" className="btn btn-primary" disabled={remaining > 0}>Granska bokning →</button>
        </form>
      </div>

      <style>{`
        .trv-progress { background: var(--c-cream); border: 1px solid var(--c-line); padding: 18px 22px; margin-bottom: 24px; }
        .trv-progress-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .trv-progress-head strong { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); }
        .trv-all-done { color: var(--c-green-soft); font-weight: 600; font-size: 13px; }
        .trv-progress-bar { height: 8px; background: #fff; border: 1px solid var(--c-line-soft); overflow: hidden; }
        .trv-progress-fill { height: 100%; background: var(--c-gold); transition: width 300ms; }
        .trv-progress-legend { display: flex; gap: 16px; margin-top: 12px; font-size: 12px; color: var(--c-text-muted); flex-wrap: wrap; }
        .trv-progress-legend .leg-done { color: var(--c-green-soft); font-weight: 600; }
        .trv-list { display: grid; gap: 10px; margin-bottom: 24px; }
        .trv-row { display: grid; grid-template-columns: 40px 1fr auto; gap: 18px; align-items: center; padding: 16px 20px; background: #fff; border: 1px solid var(--c-line-soft); }
        .trv-row .num { font-family: var(--f-mono); font-size: 12px; color: var(--c-gold); letter-spacing: 0.12em; }
        .trv-row .info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .trv-age-tag { font-family: var(--f-sans); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-gold); border: 1px solid var(--c-gold-soft); padding: 1px 6px; margin-left: 6px; }
        .add-trv { padding: 18px 22px; background: var(--c-paper); border: 1px dashed var(--c-line); margin-bottom: 24px; }
        .add-trv summary { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); cursor: pointer; list-style: none; }
        .add-trv summary::-webkit-details-marker { display: none; }
        .add-trv[open] summary { margin-bottom: 24px; color: var(--c-gold); }
        .trv-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; border-top: 1px solid var(--c-line-soft); flex-wrap: wrap; gap: 12px; }
        .trv-form .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .trv-form .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media (max-width: 720px) { .trv-form .grid2, .trv-form .grid3 { grid-template-columns: 1fr; } }
        @media (max-width: 480px) {
          .trv-row { grid-template-columns: 1fr; gap: 8px; padding: 14px 16px; }
          .add-trv { padding: 16px 18px; }
        }
      `}</style>
    </div>
  );
}
