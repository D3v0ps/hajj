export const metadata = { title: "Tillgänglighet" };

export default function TillganglighetPage() {
  return (
    <article style={{ padding: "80px 0" }}>
      <div className="container narrow">
        <span className="eyebrow gold">Tillgänglighet</span>
        <h1 style={{ marginTop: 14, marginBottom: 24 }}>Tillgänglighetsförklaring</h1>
        <p>Hadj Omra Resor strävar efter att webbplatsen ska kunna användas av alla, oavsett funktionsförmåga. Vi följer EU:s tillgänglighetsdirektiv (European Accessibility Act) i kraft sedan 28 juni 2025.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Status</h2>
        <p>Webbplatsen är delvis förenlig med standarden WCAG 2.2 AA. Pågående arbete: kontrastförbättringar för vissa sektioner, fullständig tangentbordsnavigering i bokningsflöden, alt-texter på alla bilder.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Rapportera brister</h2>
        <p>Om något inte fungerar för dig, meddela oss på info@hajj.karimkhalil.se. Vi svarar inom 5 arbetsdagar och åtgärdar bristen så snart som möjligt.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Tillsyn</h2>
        <p>Myndigheten för digital förvaltning (DIGG) har tillsyn över lagen om tillgänglighet till digital offentlig service. Klagomål kan anmälas till DIGG via deras webbplats.</p>
      </div>
    </article>
  );
}
