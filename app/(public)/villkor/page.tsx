export const metadata = { title: "Resevillkor" };

export default function VillkorPage() {
  return (
    <article style={{ padding: "80px 0" }}>
      <div className="container narrow">
        <span className="eyebrow gold">Resevillkor</span>
        <h1 style={{ marginTop: 14, marginBottom: 24 }}>Resevillkor — Hadj Omra Resor</h1>
        <p className="dim">Utdrag. Fullständiga villkor skickas vid bokningsbekräftelse och finns alltid tillgängliga på Min sida.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>1. Bokning och anmälningsavgift</h2>
        <p>Bokning sker via vår hemsida eller per telefon. Bokningen blir bindande när anmälningsavgift om 5 000 kr per person betalats. Anmälningsavgiften räknas av från slutpriset.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>2. Slutbetalning</h2>
        <p>Slutbetalning ska vara oss tillhanda senast 30 dagar före avresa. Vid utebliven betalning har Hadj Omra Resor rätt att häva bokningen och ta ut skälig ersättning.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>3. Avbokning</h2>
        <p>
          Vid avbokning 30 dagar eller mer före avresa återbetalas anmälningsavgiften minus en administrativ avgift om 500 kr. Vid avbokning närmare avresedatum gäller följande:
        </p>
        <ul style={{ marginLeft: 20 }}>
          <li>15–29 dagar före avresa: 50 % av paketpriset behålls.</li>
          <li>0–14 dagar före avresa: 100 % av paketpriset behålls.</li>
        </ul>
        <p>Vi rekommenderar att teckna avbeställningsskydd via reseförsäkring.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>4. Resegaranti</h2>
        <p>Hadj Omra Resor ställer säkerhet hos Kammarkollegiet enligt paketreselagen (2018:1217). Detta säkerställer återbetalning vid arrangörens insolvens.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>5. Resenärens skyldigheter</h2>
        <p>
          Resenären ansvarar för giltigt pass (minst 7 mån från utresedatum), för korrekta personuppgifter, för att anlända i god tid till samlingsplatser, samt för att följa anvisningar från reseledare och saudiska myndigheter.
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>6. Ändringar och force majeure</h2>
        <p>Hadj Omra Resor kan tvingas göra mindre ändringar i program på grund av omständigheter utanför vår kontroll (väder, myndighetsbeslut, säkerhetsläge). Vid större ändringar erbjuds resenären att häva bokningen utan kostnad.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>7. Tvist</h2>
        <p>Tvister ska i första hand försöka lösas direkt med oss. Konsumentvägledningen (ARN) eller allmän domstol kan annars anlitas.</p>
      </div>
    </article>
  );
}
