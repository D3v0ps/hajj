import Link from "next/link";
import { verifyEmailWithToken } from "@/app/actions/email-verification";

export const metadata = {
  title: "Bekräfta e-post",
  // Hindra sökmotorer från att indexera token-bärande URL:er.
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ status?: "ok" | "invalid" | "expired" | "used" }>;

export default async function VerifieraEpostPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { token } = await params;
  const { status } = await searchParams;

  if (status === "ok") {
    return (
      <div className="container narrow" style={{ maxWidth: 480 }}>
        <span className="eyebrow gold">Min sida</span>
        <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>E-post bekräftad</h1>
        <p
          role="status"
          style={{
            padding: "12px 16px",
            background: "#E6F1EA",
            border: "1px solid var(--c-green-soft)",
            color: "var(--c-green)",
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          Tack! Din e-postadress är nu bekräftad.
        </p>
        <p className="dim" style={{ fontSize: 15, marginBottom: 28 }}>
          Du kan nu logga in och börja boka resa, ladda upp dokument och följa ditt ärende.
        </p>
        <p style={{ fontSize: 14, textAlign: "center" }}>
          <Link href="/logga-in" className="btn-link">Logga in</Link>
        </p>
      </div>
    );
  }

  if (status === "invalid" || status === "expired" || status === "used") {
    const heading =
      status === "used" ? "Redan bekräftad" :
      status === "expired" ? "Länken har gått ut" :
      "Ogiltig länk";
    const message =
      status === "used"
        ? "Den här länken har redan använts. Logga in som vanligt — din e-post är bekräftad."
        : status === "expired"
        ? "Bekräftelselänken är giltig i 24 timmar och har gått ut. Logga in så kan vi skicka en ny länk."
        : "Bekräftelselänken är ogiltig. Den kan ha kopierats fel — kontrollera mejlet och försök igen.";
    return (
      <div className="container narrow" style={{ maxWidth: 480 }}>
        <span className="eyebrow gold">Min sida</span>
        <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>{heading}</h1>
        <p className="dim" style={{ fontSize: 15, marginBottom: 28 }}>{message}</p>
        <p style={{ fontSize: 14, textAlign: "center" }}>
          <Link href="/logga-in" className="btn-link">Tillbaka till inloggning</Link>
        </p>
      </div>
    );
  }

  // Default-läget: visa bekräftelseknapp. Tokenen konsumeras INTE förrän
  // användaren klickar — så Outlook/Gmail/antivirus-prefetch av URL:en kan
  // inte slå sönder verifieringen för den riktiga användaren.
  return (
    <div className="container narrow" style={{ maxWidth: 480 }}>
      <span className="eyebrow gold">Min sida</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Bekräfta din e-post</h1>
      <p className="dim" style={{ fontSize: 15, marginBottom: 28 }}>
        Klicka på knappen nedan för att bekräfta att det är du som äger den här e-postadressen.
        Länken är giltig i 24 timmar.
      </p>
      <form action={verifyEmailWithToken}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          Bekräfta e-post →
        </button>
      </form>
      <p className="dim" style={{ fontSize: 12, textAlign: "center", marginTop: 16 }}>
        Skickade vi mejlet av misstag? Bortse från det.
      </p>
    </div>
  );
}
