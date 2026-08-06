"use client";

import { useFormStatus } from "react-dom";
import { registerUser } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ justifyContent: "center", width: "100%" }}>
      {pending ? "Skapar konto..." : "Skapa konto →"}
    </button>
  );
}

export function RegisterForm({ error }: { error: string | null }) {
  return (
    <form action={registerUser} style={{ display: "grid", gap: 16 }}>
      <div className="field">
        <label htmlFor="reg-name">Namn</label>
        <input id="reg-name" name="name" autoComplete="name" required />
      </div>

      <div className="field">
        <label htmlFor="reg-email">E-post</label>
        <input id="reg-email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="field">
        <label htmlFor="reg-pw">Lösenord</label>
        <input id="reg-pw" name="password" type="password" autoComplete="new-password" required minLength={6} />
        <span className="hint">Minst 6 tecken</span>
      </div>

      <div className="field">
        <label htmlFor="reg-confirm">Bekräfta lösenord</label>
        <input id="reg-confirm" name="confirm" type="password" autoComplete="new-password" required minLength={6} />
      </div>

      {error && <p className="err" role="alert">{error}</p>}

      <SubmitButton />

      <p className="dim" style={{ fontSize: 12, lineHeight: 1.55 }}>
        Genom att skapa konto godkänner du våra resevillkor och att vi behandlar dina uppgifter enligt vår integritetspolicy.
      </p>
    </form>
  );
}
