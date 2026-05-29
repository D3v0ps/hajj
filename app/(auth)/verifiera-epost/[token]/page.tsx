import Link from "next/link";
import { verifyEmail } from "@/app/actions/email-verification";

export const metadata = { title: "Bekräfta e-post" };

type Params = Promise<{ token: string }>;

export default async function VerifieraEpostPage({ params }: { params: Params }) {
  const { token } = await params;
  const result = await verifyEmail(token);

  if (result.ok) {
    return (
      <div className="container narrow" style={{ maxWidth: 480 }}>
        <span className="eyebrow gold">Min sida</span>
        <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>E-post bekräftad</h1>
        <p
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

  const heading =
    result.reason === "used" ? "Redan bekräftad" :
    result.reason === "expired" ? "Länken har gått ut" :
    "Ogiltig länk";

  const message =
    result.reason === "used"
      ? "Den här länken har redan använts. Logga in som vanligt — din e-post är bekräftad."
      : result.reason === "expired"
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
