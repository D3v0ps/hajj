import type { Booking, Package, PackageTier, Traveler, Payment } from "@prisma/client";
import { saveRoomChoice } from "@/app/actions/bookings";

type Props = {
  booking: Booking & {
    package: Package & { tiers: PackageTier[] };
    tier: PackageTier | null;
    travelers: Traveler[];
    payments: Payment[];
  };
};

const AGE_LABELS: Record<string, string> = {
  ADULT: "Vuxen",
  CHILD: "Barn",
  INFANT: "Spädbarn",
};

export function StepRoom({ booking }: Props) {
  const tiers = booking.package.tiers;
  const adults = tiers.filter((t) => t.ageCategory === "ADULT");
  const children = tiers.filter((t) => t.ageCategory === "CHILD");
  const infants = tiers.filter((t) => t.ageCategory === "INFANT");
  const hasAgePricing = children.length > 0 || infants.length > 0;

  return (
    <form action={saveRoomChoice.bind(null, booking.id)}>
      <span className="section-mark">— Steg 2 av 5</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>Välj rumstyp och antal</h2>
      <p className="dim" style={{ marginBottom: 32 }}>
        {booking.package.title}. Pris per person varierar med rumstyp{hasAgePricing ? " och ålder" : ""}. Du kan ändra valet senare i bokningsflödet.
      </p>

      {/* Adult tiers */}
      {adults.length > 0 && (
        <fieldset className="tier-fieldset">
          <legend className="eyebrow" style={{ marginBottom: 14 }}>
            {AGE_LABELS.ADULT} ({adults[0].ageMin}+ år)
          </legend>
          <div className="tier-grid-demo">
            {adults.map((t) => (
              <label key={t.id} className="tier-opt-demo">
                <input type="radio" name="tierId" value={t.id} defaultChecked={booking.tierId === t.id} required style={{ marginTop: 3 }} />
                <div>
                  <div className="tier-opt-head">
                    <strong>{t.name}</strong>
                  </div>
                  <div className="dim small">{t.roomType.toLowerCase()}</div>
                  <div className="tier-price serif tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</div>
                  <div className="dim small">per person</div>
                  {t.notes && <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>{t.notes}</div>}
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Child tiers */}
      {children.length > 0 && (
        <fieldset className="tier-fieldset" style={{ marginTop: 20 }}>
          <legend className="eyebrow" style={{ marginBottom: 14 }}>
            {AGE_LABELS.CHILD} ({children[0].ageMin}–{children[0].ageMax} år)
          </legend>
          <div className="tier-grid-demo">
            {children.map((t) => (
              <div key={t.id} className="tier-info-card">
                <div className="tier-opt-head">
                  <strong>{t.name}</strong>
                </div>
                <div className="dim small">{t.roomType.toLowerCase()}</div>
                <div className="tier-price serif tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</div>
                <div className="dim small">per barn</div>
              </div>
            ))}
          </div>
          <p className="dim" style={{ marginTop: 10, fontSize: 12 }}>
            Barnpriser adderas automatiskt baserat på resenärernas ålder i nästa steg.
          </p>
        </fieldset>
      )}

      {/* Infant tiers */}
      {infants.length > 0 && (
        <fieldset className="tier-fieldset" style={{ marginTop: 20 }}>
          <legend className="eyebrow" style={{ marginBottom: 14 }}>
            {AGE_LABELS.INFANT} ({infants[0].ageMin}–{infants[0].ageMax} år)
          </legend>
          <div className="tier-grid-demo">
            {infants.map((t) => (
              <div key={t.id} className="tier-info-card">
                <strong>{t.name}</strong>
                <div className="tier-price serif tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</div>
                <div className="dim small">per spädbarn</div>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      {/* No tiers at all */}
      {tiers.length === 0 && (
        <div className="dim" style={{ padding: 32, background: "var(--c-cream)", border: "1px dashed var(--c-line)", textAlign: "center" }}>
          Paketet har inga priskombinationer. Be admin lägga till dem.
        </div>
      )}

      <div className="field" style={{ maxWidth: 280, marginTop: 32 }}>
        <label htmlFor="tc">Antal resenärer totalt (vuxna + barn)</label>
        <input id="tc" name="travelerCount" type="number" min={1} max={10} defaultValue={booking.travelerCount} required />
        <span className="hint">Du fyller i ålder per resenär i nästa steg.</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 40 }}>
        <button type="submit" className="btn btn-primary">Fortsätt till resenärer →</button>
      </div>

      <style>{`
        .tier-fieldset { border: 0; padding: 0; margin: 0; }
        .tier-grid-demo { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
        .tier-opt-demo {
          display: grid; grid-template-columns: 20px 1fr; gap: 10px;
          padding: 16px; border: 1px solid var(--c-line);
          cursor: pointer; transition: all 160ms; min-height: 44px;
        }
        .tier-opt-demo:hover { border-color: var(--c-ink); }
        .tier-opt-demo:has(input:checked) { border-color: var(--c-gold); background: #FFFAEC; }
        .tier-info-card {
          padding: 16px; border: 1px solid var(--c-line-soft); background: var(--c-cream);
        }
        .tier-opt-head strong { font-family: var(--f-serif); font-size: 16px; color: var(--c-ink); }
        .tier-price { font-size: 22px; color: var(--c-ink); margin-top: 8px; }
        .small { font-size: 12px; }
        @media (max-width: 640px) {
          .tier-grid-demo { grid-template-columns: 1fr; }
        }
      `}</style>
    </form>
  );
}
