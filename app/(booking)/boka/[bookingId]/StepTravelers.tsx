import type { Booking, Package, PackageTier, Traveler, Payment } from "@prisma/client";
import { addTraveler, removeTraveler, advanceToReview } from "@/app/actions/bookings";

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
        Lägg till varje resenär. Pass laddas upp efter bokning är bekräftad — du behöver bara namn, personnummer och passnummer nu.
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

        <form action={async (fd: FormData) => {
          "use server";
          await addTraveler(booking.id, fd);
        }} className="trv-form">
          <div className="grid2">
            <div className="field">
              <label>Förnamn</label>
              <input name="firstName" required />
            </div>
            <div className="field">
              <label>Efternamn</label>
              <input name="lastName" required />
            </div>
            <div className="field">
              <label>Personnummer (ÅÅÅÅMMDD-XXXX)</label>
              <input name="personnummer" placeholder="19850315-1234" />
            </div>
            <div className="field">
              <label>Passnummer</label>
              <input name="passportNo" />
            </div>
            <div className="field">
              <label>Födelsedatum</label>
              <input name="birthDate" type="date" />
            </div>
            <div className="field">
              <label>Kön</label>
              <select name="gender" defaultValue="">
                <option value="">—</option>
                <option value="M">Man</option>
                <option value="F">Kvinna</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" name="isMahram" /> Mahram (släkting som följer som ledsagare)
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" name="needsAssist" /> Behöver assistans (rörelse, syn, hörsel)
            </label>
          </div>

          <button type="submit" className="btn btn-ghost" style={{ marginTop: 24 }}>Spara resenär</button>
        </form>
      </details>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--c-line-soft)" }}>
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
        .add-trv { padding: 18px 22px; background: var(--c-paper); border: 1px dashed var(--c-line); cursor: pointer; }
        .add-trv summary { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); cursor: pointer; list-style: none; }
        .add-trv[open] summary { margin-bottom: 24px; color: var(--c-gold); }
        .trv-form .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 720px) { .trv-form .grid2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
