import { SITE } from "@/lib/config";

export const metadata = { title: "Tillgänglighet" };

export default function TillganglighetPage() {
  return (
    <article style={{ padding: "80px 0" }}>
      <div className="container narrow">
        <span className="eyebrow gold">Tillgänglighet</span>
        <h1 style={{ marginTop: 14, marginBottom: 24 }}>Tillgänglighetsförklaring</h1>
        <p className="dim">Senast bedömd: maj 2026 · {SITE.legalName}</p>

        <p>
          {SITE.name} strävar efter att webbplatsen ska kunna användas av alla,
          oavsett funktionsförmåga. Vi följer EU:s tillgänglighetsdirektiv
          (European Accessibility Act) som omfattar privata aktörer från
          28 juni 2025.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Status</h2>
        <p>
          Webbplatsen är delvis förenlig med WCAG 2.2 AA. Identifierade brister
          som vi arbetar med (planerat åtgärdat senast Q4 2026):
        </p>
        <ul style={{ marginLeft: 20, lineHeight: 1.7 }}>
          <li>Komplettering av ARIA-attribut och status-meddelanden i formulär</li>
          <li>Förbättring av kontrast i fotsidor och småtext</li>
          <li>Synliga fokus-markeringar på alla interaktiva element</li>
          <li>Alt-texter på alla bilder när dessa publiceras</li>
          <li>Skip-to-content-länk i sidstrukturen</li>
        </ul>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Rapportera brister</h2>
        <p>
          Om något inte fungerar för dig, meddela oss på <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          Vi svarar inom 5 arbetsdagar och åtgärdar bristen så snart som möjligt.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Tillsyn</h2>
        <p>
          För privata e-handelstjänster har Konsumentverket tillsyn över lagen
          om vissa produkters och tjänsters tillgänglighet (2023:254) som
          genomför EAA i Sverige. Klagomål kan anmälas till Konsumentverket
          via deras webbplats konsumentverket.se.
        </p>
      </div>
    </article>
  );
}
