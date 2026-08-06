import Link from "next/link";
import { prisma } from "@/lib/db";
import { resetPassword } from "@/app/actions/password-reset";

export const metadata = { title: "Återställ lösenord" };

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function AterstallLosenPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  // Token-validering före vi visar formuläret — undvik att exponera input-fält
  // för en länk som ändå inte funkar.
  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { id: true, usedAt: true, expiresAt: true },
  });

  const invalid = !row || row.usedAt || row.expiresAt < new Date();

  if (invalid) {
    return (
      <div className="container narrow" style={{ maxWidth: 480 }}>
        <span className="eyebrow gold">Min sida</span>
        <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Ogiltig länk</h1>
        <p className="dim" style={{ fontSize: 15, marginBottom: 24 }}>
          Återställningslänken är ogiltig, har använts eller har gått ut. Begär en ny länk nedan.
        </p>
        <p style={{ fontSize: 14, marginTop: 24, textAlign: "center" }}>
          <Link href="/glomt-losen" className="btn-link">Begär ny återställningslänk</Link>
        </p>
      </div>
    );
  }

  const errorMsg = error ? decodeURIComponent(error) : null;
  // Binda token till server action så formuläret bara behöver skicka lösenord+confirm.
  const action = resetPassword.bind(null, token);

  return (
    <div className="container narrow" style={{ maxWidth: 480 }}>
      <span className="eyebrow gold">Min sida</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Välj nytt lösenord</h1>
      <p className="dim" style={{ fontSize: 15, marginBottom: 32 }}>
        Ange ett nytt lösenord för ditt konto. Lösenordet behöver vara minst 8 tecken.
      </p>

      <form action={action} style={{ display: "grid", gap: 16 }}>
        <div className="field">
          <label htmlFor="reset-pw">Nytt lösenord</label>
          <input id="reset-pw" name="password" type="password" autoComplete="new-password" required minLength={8} />
          <span className="hint">Minst 8 tecken</span>
        </div>

        <div className="field">
          <label htmlFor="reset-confirm">Bekräfta lösenord</label>
          <input id="reset-confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </div>

        {errorMsg && <p className="err" role="alert">{errorMsg}</p>}

        <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }}>
          Spara nytt lösenord →
        </button>
      </form>

      <p style={{ fontSize: 14, marginTop: 28, textAlign: "center" }}>
        <Link href="/logga-in" className="btn-link">Tillbaka till inloggning</Link>
      </p>
    </div>
  );
}
