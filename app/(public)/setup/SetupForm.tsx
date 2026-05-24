"use client";

import { useState } from "react";

export function SetupForm() {
  const [email, setEmail] = useState("admin@karimkhalil.se");
  const [password, setPassword] = useState("test123");
  const [name, setName] = useState("Admin");
  const [result, setResult] = useState<{ ok?: boolean; error?: string; message?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <div className="field">
          <label htmlFor="setup-name">Namn</label>
          <input id="setup-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="setup-email">E-post (används för inloggning)</label>
          <input id="setup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="setup-pw">Lösenord</label>
          <input id="setup-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: "center" }}>
          {loading ? "Skapar..." : "Skapa / uppdatera admin →"}
        </button>
      </form>

      {result && (
        <div
          role="alert"
          style={{
            marginTop: 20,
            padding: "16px 20px",
            background: result.ok ? "#E6F1EA" : "#FBE9E2",
            border: `1px solid ${result.ok ? "var(--c-green-soft)" : "var(--c-warn)"}`,
            fontSize: 14,
          }}
        >
          {result.ok ? (
            <div>
              <strong style={{ color: "var(--c-green)" }}>Klart!</strong>
              <p style={{ margin: "8px 0 0" }}>{result.message}</p>
              <a href="/logga-in" className="btn btn-primary" style={{ marginTop: 16, display: "inline-flex" }}>
                Gå till inloggning →
              </a>
            </div>
          ) : (
            <div>
              <strong style={{ color: "var(--c-warn)" }}>Fel:</strong> {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
