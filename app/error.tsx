"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "80px 24px" }}>
      <div className="container narrow" style={{ textAlign: "center" }}>
        <p className="eyebrow gold">Ett fel uppstod</p>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: "20px 0 16px" }}>
          Något gick fel
        </h1>
        <p className="dim" style={{ fontSize: 17, maxWidth: 520, margin: "0 auto 12px" }}>
          Vi loggar problemet. Försök ladda om sidan, eller kontakta oss om felet återkommer.
        </p>
        {error.digest && (
          <p className="dim" style={{ fontSize: 12, fontFamily: "var(--f-mono)", marginBottom: 32 }}>
            Felreferens: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={reset} className="btn btn-primary">Försök igen</button>
          <Link href="/" className="btn btn-ghost">Till hemsidan</Link>
          <Link href="/kontakt" className="btn btn-ghost">Kontakta oss</Link>
        </div>
      </div>
    </div>
  );
}
