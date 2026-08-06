import { SetupForm } from "./SetupForm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup — skapa admin",
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  // Returnera 404 om setup-mode inte är aktivt — en angripare ska inte ens
  // se formuläret. /api/setup-admin är redan skyddad, men sidan var öppen.
  if (process.env.SETUP_MODE !== "1") notFound();
  return (
    <section style={{ padding: "80px 0" }}>
      <div className="container narrow" style={{ maxWidth: 520 }}>
        <span className="eyebrow gold">Engångs-setup</span>
        <h1 style={{ fontSize: 32, marginTop: 14, marginBottom: 12 }}>Skapa admin-konto</h1>
        <p className="dim" style={{ fontSize: 15, marginBottom: 8 }}>
          Den här sidan fungerar bara när <code>SETUP_MODE=1</code> är satt i
          serverns miljövariabler. Fyll i e-post och lösenord — kontot skapas
          (eller uppdateras om det redan finns) med ADMIN-roll.
        </p>
        <p className="dim" style={{ fontSize: 13, marginBottom: 32, padding: "10px 14px", background: "var(--c-cream)", border: "1px solid var(--c-line)" }}>
          Stäng av setup-mode efter att du loggat in genom att sätta
          SETUP_MODE=0 i docker-compose .env på servern.
        </p>

        <SetupForm />
      </div>
    </section>
  );
}
