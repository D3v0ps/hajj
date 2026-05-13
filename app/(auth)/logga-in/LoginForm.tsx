"use client";

import { useState, useTransition } from "react";
import { loginUser } from "@/app/actions/auth";

export function LoginForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        start(async () => {
          const res = await loginUser(formData);
          if (res && res.ok === false) setError(res.error);
        });
      }}
      style={{ display: "grid", gap: 16 }}
    >
      <div className="field">
        <label htmlFor="login-email">E-post</label>
        <input id="login-email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="field">
        <label htmlFor="login-pw">Lösenord</label>
        <input id="login-pw" name="password" type="password" autoComplete="current-password" required />
      </div>

      {error && <p className="err">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={pending} style={{ justifyContent: "center" }}>
        {pending ? "Loggar in..." : "Logga in →"}
      </button>
    </form>
  );
}
