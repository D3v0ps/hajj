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

export function StepRoom({ booking }: Props) {
  return (
    <form action={saveRoomChoice.bind(null, booking.id)}>
      <span className="section-mark">— Steg 2 av 5</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>Välj rumstyp och antal</h2>
      <p className="dim" style={{ marginBottom: 32 }}>
        {booking.package.title}. Pris per person varierar med rumstyp. Du kan ändra valet senare i bokningsflödet.
      </p>

      <fieldset className="tier-field">
        <legend className="eyebrow" style={{ marginBottom: 14 }}>Rumstyp</legend>
        <div className="tier-grid">
          {booking.package.tiers.map((t) => (
            <label key={t.id} className="tier-opt">
              <input type="radio" name="tierId" value={t.id} defaultChecked={booking.tierId === t.id} required />
              <div>
                <div className="tier-name">{t.name}</div>
                <div className="tier-meta">{t.roomType.toLowerCase()}</div>
                <div className="tier-price serif tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</div>
                <div className="dim" style={{ fontSize: 11 }}>per person</div>
                {t.notes && <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>{t.notes}</div>}
              </div>
            </label>
          ))}
          {booking.package.tiers.length === 0 && (
            <p className="dim">
              Paketet har inga rumstyper definierade. Be admin lägga till dem.
            </p>
          )}
        </div>
      </fieldset>

      <div className="field" style={{ maxWidth: 280, marginTop: 32 }}>
        <label htmlFor="tc">Antal resenärer</label>
        <input id="tc" name="travelerCount" type="number" min={1} max={10} defaultValue={booking.travelerCount} required />
        <span className="hint">Du fyller i deras uppgifter i nästa steg.</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 40 }}>
        <button type="submit" className="btn btn-primary">Fortsätt till resenärer →</button>
      </div>

      <style>{`
        .tier-field { border: 0; padding: 0; margin: 0; }
        .tier-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
        .tier-opt { display: grid; grid-template-columns: 24px 1fr; gap: 12px; padding: 18px; border: 1px solid var(--c-line); cursor: pointer; transition: all 160ms; min-height: 44px; }
        .tier-opt:hover { border-color: var(--c-ink); }
        .tier-opt:has(input:checked) { border-color: var(--c-gold); background: #FFFAEC; }
        .tier-opt input { margin-top: 4px; }
        .tier-name { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); }
        .tier-meta { font-size: 11px; color: var(--c-text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin: 2px 0 12px; }
        .tier-price { font-size: 24px; color: var(--c-ink); }
      `}</style>
    </form>
  );
}
