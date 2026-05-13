"use client";

import { useState, useTransition } from "react";
import { registerUser } from "@/app/actions/auth";

export function RegisterForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        start(async () => {
          const res = await registerUser(formData);
          if (res && res.ok === false) setError(res.error);
        });
      }}
      style={{ display: "grid", gap: 16 }}
    >
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

      {error && <p className="err">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ justifyContent: "center" }}>
        {pending ? "Skapar konto..." : "Skapa konto →"}
      </button>

      <p className="dim" style={{ fontSize: 12, lineHeight: 1.55 }}>
        Genom att skapa konto godkänner du våra resevillkor och att vi behandlar dina uppgifter enligt vår integritetspolicy.
      </p>
    </form>
  );
}
