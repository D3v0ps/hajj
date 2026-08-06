import Link from "next/link";
import { requestReset } from "@/app/actions/password-reset";

export const metadata = { title: "Glömt lösenord" };

type SearchParams = Promise<{ sent?: string; error?: string }>;

export default async function GlomtLosenPage({ searchParams }: { searchParams: SearchParams }) {
  const { sent, error } = await searchParams;

  if (sent) {
    return (
      <div className="container narrow" style={{ maxWidth: 480 }}>
        <span className="eyebrow gold">Min sida</span>
        <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Kolla mejlen</h1>
        <p className="dim" style={{ fontSize: 15, marginBottom: 24 }}>
          Om det finns ett konto kopplat till adressen har vi skickat en återställningslänk.
          Länken är giltig i 1 timme.
        </p>
        <p className="dim" style={{ fontSize: 14, marginBottom: 28 }}>
          Hittar du inte mejlet? Kolla skräpposten eller försök igen om en stund.
        </p>
        <p style={{ fontSize: 14, textAlign: "center" }}>
          <Link href="/logga-in" className="btn-link">Tillbaka till inloggning</Link>
        </p>
      </div>
    );
  }

  const errorMsg = error ? decodeURIComponent(error) : null;

  return (
    <div className="container narrow" style={{ maxWidth: 480 }}>
      <span className="eyebrow gold">Min sida</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Glömt lösenord?</h1>
      <p className="dim" style={{ fontSize: 15, marginBottom: 32 }}>
        Ange din e-postadress så skickar vi en länk för att välja ett nytt lösenord.
      </p>

      <form action={requestReset} style={{ display: "grid", gap: 16 }}>
        <div className="field">
          <label htmlFor="reset-email">E-post</label>
          <input id="reset-email" name="email" type="email" autoComplete="email" required />
        </div>

        {errorMsg && <p className="err" role="alert">{errorMsg}</p>}

        <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }}>
          Skicka återställningslänk →
        </button>
      </form>

      <p style={{ fontSize: 14, marginTop: 28, textAlign: "center" }}>
        Kom du på lösenordet? <Link href="/logga-in" className="btn-link">Logga in</Link>
      </p>
    </div>
  );
}
