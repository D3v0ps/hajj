import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Logga in" };

export default function LoggaInPage() {
  return (
    <div className="container narrow" style={{ maxWidth: 480 }}>
      <span className="eyebrow gold">Min sida</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Logga in</h1>
      <p className="dim" style={{ fontSize: 15, marginBottom: 32 }}>
        Logga in med din e-post och lösenord. BankID kommer i nästa fas.
      </p>

      <LoginForm />

      <p style={{ fontSize: 14, marginTop: 28, textAlign: "center" }}>
        Inget konto än? <Link href="/skapa-konto" className="btn-link">Skapa konto</Link>
      </p>
    </div>
  );
}
