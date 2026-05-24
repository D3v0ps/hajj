import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Skapa konto" };

type SearchParams = Promise<{ error?: string }>;

export default async function SkapaKontoPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  return (
    <div className="container narrow" style={{ maxWidth: 480 }}>
      <span className="eyebrow gold">Min sida</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Skapa konto</h1>
      <p className="dim" style={{ fontSize: 15, marginBottom: 32 }}>
        Du behöver ett konto för att boka, ladda upp dokument och följa din resa.
      </p>

      <RegisterForm error={error ? decodeURIComponent(error) : null} />

      <p style={{ fontSize: 14, marginTop: 28, textAlign: "center" }}>
        Har du redan konto? <Link href="/logga-in" className="btn-link">Logga in</Link>
      </p>
    </div>
  );
}
