import Link from "next/link";
import type { Booking, Package, PackageTier, Traveler, Payment } from "@prisma/client";
import { acceptAndAdvance } from "@/app/actions/bookings";

type Props = {
  booking: Booking & {
    package: Package & { tiers: PackageTier[] };
    tier: PackageTier | null;
    travelers: Traveler[];
    payments: Payment[];
  };
};

export function StepReview({ booking }: Props) {
  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "—");

  return (
    <form action={acceptAndAdvance.bind(null, booking.id)}>
      <span className="section-mark">— Steg 4 av 5</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 16 }}>Granska bokningen</h2>
      <p className="dim" style={{ marginBottom: 32 }}>
        Kontrollera att allt stämmer. När du fortsätter registreras bokningen som mottagen och kontoret kontaktar dig för dokumentupload och slutbetalning.
      </p>

      <div className="rev-grid">
        <div>
          <span className="eyebrow">Paket</span>
          <p className="serif" style={{ fontSize: 20, margin: "6px 0 0" }}>{booking.package.title}</p>
          {booking.package.subtitle && <p className="dim" style={{ fontSize: 13 }}>{booking.package.subtitle}</p>}
        </div>

        <div>
          <span className="eyebrow">Datum</span>
          <p className="serif" style={{ fontSize: 18, margin: "6px 0 0" }}>
            {fmtDate(booking.package.startDate)} — {fmtDate(booking.package.endDate)}
          </p>
        </div>

        <div>
          <span className="eyebrow">Rumstyp</span>
          <p className="serif" style={{ fontSize: 18, margin: "6px 0 0" }}>{booking.tier?.name ?? "—"}</p>
          <span className="dim" style={{ fontSize: 13 }}>{booking.tier?.pricePerPerson?.toLocaleString("sv-SE")} kr per person</span>
        </div>

        <div>
          <span className="eyebrow">Resenärer</span>
          <p className="serif" style={{ fontSize: 18, margin: "6px 0 0" }}>{booking.travelers.length} st</p>
        </div>
      </div>

      <h3 style={{ fontSize: 20, marginTop: 32, marginBottom: 12 }}>Resenärer</h3>
      <ol className="rev-trvs">
        {booking.travelers.map((t) => (
          <li key={t.id}>
            <strong>{t.firstName} {t.lastName}</strong>
            <span className="dim" style={{ fontSize: 13 }}>
              {t.personnummer ?? "Personnummer ej angivet"}
              {t.passportNo && ` · Pass ${t.passportNo}`}
              {t.isMahram && " · Mahram"}
              {t.needsAssist && " · Assistans"}
            </span>
          </li>
        ))}
      </ol>

      <div className="rev-total">
        <div>
          <span className="eyebrow">Totalpris</span>
          <p className="serif tnum" style={{ fontSize: 36, margin: 0 }}>
            {booking.totalAmount.toLocaleString("sv-SE")} kr
          </p>
          <span className="dim" style={{ fontSize: 13 }}>
            varav anmälningsavgift {booking.depositAmount.toLocaleString("sv-SE")} kr per person betalas i nästa steg
          </span>
        </div>
      </div>

      <div className="rev-accept">
        <label>
          <input type="checkbox" name="acceptTerms" required /> Jag har läst och godkänner <Link href="/villkor" target="_blank" className="btn-link">resevillkoren</Link>.
        </label>
        <label>
          <input type="checkbox" name="acceptPrivacy" required /> Jag samtycker till att Hadj Omra Resor behandlar mina uppgifter enligt <Link href="/integritet" target="_blank" className="btn-link">integritetspolicyn</Link>.
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 40 }}>
        <button type="submit" className="btn btn-primary">Godkänn och fortsätt till betalning →</button>
      </div>

      <style>{`
        .rev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 32px; padding: 24px; background: var(--c-cream); border: 1px solid var(--c-line); }
        .rev-trvs { list-style: none; padding: 0; display: grid; gap: 8px; }
        .rev-trvs li { display: grid; gap: 4px; padding: 14px 18px; background: var(--c-paper); border: 1px solid var(--c-line-soft); }
        .rev-total { margin-top: 32px; padding: 24px; background: var(--c-ink); color: #fff; }
        .rev-total .eyebrow { color: var(--c-gold); }
        .rev-total p { color: #fff; }
        .rev-accept { display: grid; gap: 10px; margin-top: 32px; padding: 18px 22px; border: 1px solid var(--c-line-soft); }
        .rev-accept label { display: flex; gap: 10px; align-items: start; font-size: 14px; line-height: 1.5; }
        .rev-accept .btn-link { color: var(--c-gold); }
      `}</style>
    </form>
  );
}
