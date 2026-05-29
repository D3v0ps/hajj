import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { confirmEmailChange } from "@/app/actions/profile";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ email?: string }>;

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
  const { email } = await searchParams;

  const result = await confirmEmailChange(token, email ?? "");

  return (
    <div className="container narrow" style={{ maxWidth: 640 }}>
      <span className="eyebrow gold">E-postbyte</span>
      <h1 style={{ fontSize: 32, marginTop: 14, marginBottom: 16 }}>
        {result.ok ? "E-posten har uppdaterats" : REASON_TEXT[result.reason].title}
      </h1>

      {result.ok ? (
        <>
          <div role="status" className="flash flash-ok">
            Din inloggnings-e-post är nu <strong>{result.newEmail}</strong>. Logga in med den
            nya adressen nästa gång.
          </div>
          <p style={{ marginTop: 24 }}>
            <Link href="/min-sida/profil" className="btn btn-primary">Tillbaka till profil</Link>
          </p>
        </>
      ) : (
        <>
          <div role="alert" className="flash flash-err">
            {REASON_TEXT[result.reason].body}
          </div>
          <p style={{ marginTop: 24 }}>
            <Link href="/min-sida/profil" className="btn btn-ghost">Till profilen</Link>
          </p>
        </>
      )}

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
    </div>
  );
}
