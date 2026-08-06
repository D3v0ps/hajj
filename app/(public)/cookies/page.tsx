export const metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <article style={{ padding: "80px 0" }}>
      <div className="container narrow">
        <span className="eyebrow gold">Cookies</span>
        <h1 style={{ marginTop: 14, marginBottom: 24 }}>Cookies</h1>
        <p>Vi använder enbart strikt nödvändiga cookies för att webbplatsen ska fungera (inloggningssessioner, CSRF-skydd). Vi använder inte spårningskakor och inga tredjeparts-cookies för marknadsföring.</p>
        <p className="dim" style={{ marginTop: 16 }}>Tabell över använda cookies kommer att läggas in när vi aktiverar analytics — för närvarande sparar vi endast den session-cookie som krävs av inloggningen.</p>
      </div>
    </article>
  );
}
