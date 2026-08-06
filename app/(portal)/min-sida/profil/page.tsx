import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { updateProfile, changePassword, requestEmailChange } from "@/app/actions/profile";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string }>;

const OK_MESSAGES: Record<string, string> = {
  profile_updated: "Dina uppgifter har sparats.",
  password_changed: "Lösenordet har bytts.",
  email_change_sent:
    "Vi har skickat en bekräftelselänk till den nya e-postadressen. Klicka på länken i mejlet för att slutföra bytet (giltig i 24 timmar).",
  email_changed: "Din inloggnings-e-post har uppdaterats.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_form: "Något fält var ogiltigt — försök igen.",
  name_too_short: "Ange minst 2 tecken i namnet.",
  name_too_long: "Namnet är för långt.",
  phone_too_long: "Telefonnumret är för långt.",
  current_required: "Ange ditt nuvarande lösenord.",
  password_too_short: "Det nya lösenordet måste vara minst 8 tecken.",
  password_too_long: "Lösenordet är för långt.",
  password_mismatch: "Det nya lösenordet och bekräftelsen matchar inte.",
  current_password_wrong: "Det nuvarande lösenordet stämmer inte.",
  no_password_set: "Kontot har inget lösenord — använd glömt-lösenord istället.",
  rate_limited: "För många försök. Vänta en minut och försök igen.",
  invalid_email: "Ogiltig e-postadress.",
  email_too_long: "E-postadressen är för lång.",
  same_email: "Den nya adressen är samma som den nuvarande.",
  email_taken: "Adressen används redan av ett annat konto.",
};

export default async function ProfilPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");

  const { ok, error } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, phone: true, createdAt: true },
  });
  if (!user) redirect("/logga-in");

  const okMsg = ok ? OK_MESSAGES[ok] ?? null : null;
  const errMsg = error ? ERROR_MESSAGES[error] ?? null : null;

  return (
    <div className="container narrow">
      <span className="eyebrow gold">Konto</span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 12 }}>Profil &amp; inställningar</h1>
      <p className="dim" style={{ maxWidth: 640, marginBottom: 24 }}>
        Hantera dina kontouppgifter, lösenord och inloggnings-e-post.
      </p>

      {okMsg && (
        <div role="status" className="flash flash-ok">
          {okMsg}
        </div>
      )}
      {errMsg && (
        <div role="alert" className="flash flash-err">
          {errMsg}
        </div>
      )}

      {/* SECTION 1 — Personuppgifter */}
      <section className="card">
        <header className="card-h">
          <h2>Personuppgifter</h2>
          <p className="dim">Ditt namn och telefonnummer. Används vid bokningar och kontakt från kontoret.</p>
        </header>
        <form action={updateProfile} className="form">
          <div className="field">
            <label htmlFor="prof-name">Namn</label>
            <input
              id="prof-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={user.name ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="prof-phone">Telefon</label>
            <input
              id="prof-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={40}
              defaultValue={user.phone ?? ""}
              placeholder="+46 70 123 45 67"
            />
            <span className="hint">Frivilligt. Används om kontoret behöver nå dig snabbt.</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Spara uppgifter</button>
          </div>
        </form>
      </section>

      {/* SECTION 2 — Lösenord */}
      <section className="card">
        <header className="card-h">
          <h2>Lösenord</h2>
          <p className="dim">Byt lösenord. Det nya lösenordet måste vara minst 8 tecken.</p>
        </header>
        <form action={changePassword} className="form" autoComplete="off">
          <div className="field">
            <label htmlFor="pw-current">Nuvarande lösenord</label>
            <input
              id="pw-current"
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pw-next">Nytt lösenord</label>
            <input
              id="pw-next"
              name="next"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <span className="hint">Minst 8 tecken.</span>
          </div>
          <div className="field">
            <label htmlFor="pw-confirm">Bekräfta nytt lösenord</label>
            <input
              id="pw-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Byt lösenord</button>
          </div>
        </form>
      </section>

      {/* SECTION 3 — E-post */}
      <section className="card">
        <header className="card-h">
          <h2>E-post</h2>
          <p className="dim">
            Din inloggnings-e-post. Vid byte skickar vi en bekräftelselänk till den nya adressen —
            bytet sker först när du klickar på länken.
          </p>
        </header>
        <form action={requestEmailChange} className="form">
          <div className="field">
            <label htmlFor="em-current">Nuvarande e-post</label>
            <input
              id="em-current"
              name="currentEmail"
              type="email"
              value={user.email}
              readOnly
              aria-readonly="true"
              disabled
            />
          </div>
          <div className="field">
            <label htmlFor="em-new">Ny e-post</label>
            <input
              id="em-new"
              name="newEmail"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
            />
            <span className="hint">Vi mejlar bekräftelselänk till denna adress.</span>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Skicka bekräftelselänk</button>
          </div>
        </form>
      </section>

      <style>{`
        .flash {
          padding: 14px 18px;
          margin-bottom: 24px;
          font-size: 14px;
          border-width: 1px;
          border-style: solid;
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
        .card {
          background: #fff;
          border: 1px solid var(--c-line-soft);
          padding: 28px 32px;
          margin-bottom: 24px;
        }
        .card-h { margin-bottom: 24px; }
        .card-h h2 {
          font-family: var(--f-serif);
          font-size: 22px;
          color: var(--c-ink);
          margin: 0 0 6px 0;
        }
        .card-h p { margin: 0; font-size: 14px; max-width: 560px; }
        .form { display: grid; gap: 16px; }
        .form-actions { margin-top: 8px; }
        .field input:disabled,
        .field input:read-only {
          background: var(--c-paper);
          color: var(--c-text-muted);
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .card { padding: 22px 20px; }
          .card-h h2 { font-size: 19px; }
        }
      `}</style>
    </div>
  );
}
