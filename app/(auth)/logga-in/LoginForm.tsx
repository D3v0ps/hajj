"use client";

import { useFormStatus } from "react-dom";
import { loginUser } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ justifyContent: "center", width: "100%" }}>
      {pending ? "Loggar in..." : "Logga in →"}
    </button>
  );
}

export function LoginForm({ error }: { error: string | null }) {
  return (
    <form action={loginUser} style={{ display: "grid", gap: 16 }}>
      <div className="field">
        <label htmlFor="login-email">E-post</label>
        <input id="login-email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="field">
        <label htmlFor="login-pw">Lösenord</label>
        <input id="login-pw" name="password" type="password" autoComplete="current-password" required />
      </div>

      {error && <p className="err" role="alert">{error}</p>}

      <SubmitButton />
    </form>
  );
}
