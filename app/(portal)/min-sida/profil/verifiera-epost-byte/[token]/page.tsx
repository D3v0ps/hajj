import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { confirmEmailChangeViaForm } from "@/app/actions/profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bekräfta e-postbyte",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ email?: string; status?: string }>;

const REASON_TEXT: Record<string, { title: string; body: string }> = {
  invalid_token: {
    title: "Länken är ogiltig",
    body: "Bekräftelselänken känns inte igen. Begär en ny via Profil → E-post.",
  },
  expired: {
    title: "Länken har gått ut",
    body: "Bekräftelselänken är giltig i 24 timmar och har nu förfallit. Begär en ny via Profil → E-post.",
  },
  used: {
    title: "Länken är redan använd",
    body: "Den här bekräftelselänken har redan använts. Om du försöker byta igen, begär en ny länk.",
  },
  email_taken: {
    title: "E-postadressen är upptagen",
    body: "Den nya adressen registrerades på ett annat konto innan du hann bekräfta. Begär ett nytt byte med en annan adress.",
  },
  bad_email: {
    title: "Länken är trasig",
    body: "E-postadressen i länken kunde inte tolkas. Begär en ny bekräftelselänk via Profil → E-post.",
  },
};

export default async function VerifieraEpostBytePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const { token } = await params;
  const { email, status } = await searchParams;

  // Lyckat byte (efter att användaren klickat och POST kört).
  if (status === "ok") {
    return (
      <div className="container narrow" style={{ maxWidth: 640 }}>
        <span className="eyebrow gold">E-postbyte</span>
        <h1 style={{ fontSize: 32, marginTop: 14, marginBottom: 16 }}>E-posten har uppdaterats</h1>
        <div role="status" className="flash flash-ok">
          Din inloggnings-e-post är nu <strong>{email ?? "uppdaterad"}</strong>. Logga in med den nya adressen nästa gång.
        </div>
        <p style={{ marginTop: 24 }}>
          <Link href="/min-sida/profil" className="btn btn-primary">Tillbaka till profil</Link>
        </p>
        <FlashStyles />
      </div>
    );
  }

  // Fel-statusar
  if (status && REASON_TEXT[status]) {
    return (
      <div className="container narrow" style={{ maxWidth: 640 }}>
        <span className="eyebrow gold">E-postbyte</span>
        <h1 style={{ fontSize: 32, marginTop: 14, marginBottom: 16 }}>{REASON_TEXT[status].title}</h1>
        <div role="alert" className="flash flash-err">{REASON_TEXT[status].body}</div>
        <p style={{ marginTop: 24 }}>
          <Link href="/min-sida/profil" className="btn btn-ghost">Till profilen</Link>
        </p>
        <FlashStyles />
      </div>
    );
  }

  // Default: visa bekräftelseknapp (förhindrar prefetch-konsumering).
  return (
    <div className="container narrow" style={{ maxWidth: 640 }}>
      <span className="eyebrow gold">E-postbyte</span>
      <h1 style={{ fontSize: 32, marginTop: 14, marginBottom: 16 }}>Bekräfta e-postbyte</h1>
      <p className="dim" style={{ fontSize: 15, marginBottom: 28 }}>
        Klicka på knappen nedan för att bekräfta att du vill byta inloggningsadress.
        Länken är giltig i 24 timmar.
      </p>
      <form action={confirmEmailChangeViaForm}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email ?? ""} />
        <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          Bekräfta e-postbyte →
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <Link href="/min-sida/profil" className="btn-link" style={{ fontSize: 13 }}>← Avbryt</Link>
      </p>
      <FlashStyles />
    </div>
  );
}

function FlashStyles() {
  return (
    <style>{`
      .flash {
        padding: 16px 20px;
        font-size: 14px;
        border-width: 1px;
        border-style: solid;
        line-height: 1.6;
      }
      .flash-ok {
        background: #E6F1EA;
        border-color: var(--c-green-soft);
        color: var(--c-green);
      }
      .flash-err {
        background: #FBE9E2;
        border-color: var(--c-warn);
        color: var(--c-warn);
      }
    `}</style>
  );
}
