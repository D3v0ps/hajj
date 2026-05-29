import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Logga in" };

type SearchParams = Promise<{ error?: string; registered?: string; reset?: string }>;

export default async function LoggaInPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, registered, reset } = await searchParams;

  const errorMsg = error === "credentials" ? "Fel e-post eller lösenord." : null;

  return (
    <div className="container narrow" style={{ maxWidth: 480 }}>
      <span className="eyebrow gold">Min sida</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Logga in</h1>
      <p className="dim" style={{ fontSize: 15, marginBottom: 32 }}>
        Logga in med din e-post och lösenord.
      </p>

      {registered && (
        <p style={{ padding: "12px 16px", background: "#E6F1EA", border: "1px solid var(--c-green-soft)", color: "var(--c-green)", fontSize: 14, marginBottom: 20 }}>
          Konto skapat. Logga in med din e-post.
        </p>
      )}

      {reset && (
        <p style={{ padding: "12px 16px", background: "#E6F1EA", border: "1px solid var(--c-green-soft)", color: "var(--c-green)", fontSize: 14, marginBottom: 20 }}>
          Lösenordet är uppdaterat. Logga in med ditt nya lösenord.
        </p>
      )}

      <LoginForm error={errorMsg} />

      <p style={{ fontSize: 14, marginTop: 18, textAlign: "center" }}>
        <a href="/glomt-losen" className="btn-link">Glömt lösenord?</a>
      </p>

      <p style={{ fontSize: 14, marginTop: 28, textAlign: "center" }}>
        Inget konto än? <Link href="/skapa-konto" className="btn-link">Skapa konto</Link>
      </p>
    </div>
  );
}
