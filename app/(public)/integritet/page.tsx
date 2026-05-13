export const metadata = { title: "Integritetspolicy" };

export default function IntegritetPage() {
  return (
    <article style={{ padding: "80px 0" }}>
      <div className="container narrow">
        <span className="eyebrow gold">Integritet</span>
        <h1 style={{ marginTop: 14, marginBottom: 24 }}>Integritetspolicy</h1>
        <p className="dim">Senast uppdaterad: maj 2026</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Personuppgiftsansvarig</h2>
        <p>
          Hadj Omra Resor AB är personuppgiftsansvarig för behandlingen av
          dina personuppgifter på denna webbplats och i samband med din
          bokning. Kontakt: info@hajj.karimkhalil.se
        </p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Vilka uppgifter samlar vi in?</h2>
        <ul style={{ marginLeft: 20, lineHeight: 1.7 }}>
          <li>Namn, e-post, telefon (kontaktuppgifter)</li>
          <li>Personnummer, passuppgifter, passfoto (för visumansökan)</li>
          <li>Eventuella särskilda behov, mahram-uppgifter</li>
          <li>Betalningsinformation (vi sparar inte kortuppgifter — Stripe/Swish hanterar dem)</li>
          <li>Cookies för inloggning och webbplatsens funktion</li>
        </ul>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Varför behandlar vi dina uppgifter?</h2>
        <p>För att fullgöra avtalet om resa, för att uppfylla rättsliga krav (saudiska myndigheter, bokföring), och för säkerhet under resa.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Hur länge sparar vi uppgifterna?</h2>
        <p>Bokningsinformation sparas i 7 år enligt bokföringslagen. Passuppgifter raderas inom 12 månader efter avslutad resa.</p>

        <h2 style={{ fontSize: 22, marginTop: 32, marginBottom: 12 }}>Dina rättigheter</h2>
        <p>Du har rätt att begära utdrag, rättelse eller radering av dina uppgifter. Skicka begäran till info@hajj.karimkhalil.se. Vid klagomål kan du vända dig till Integritetsskyddsmyndigheten (IMY).</p>
      </div>
    </article>
  );
}
