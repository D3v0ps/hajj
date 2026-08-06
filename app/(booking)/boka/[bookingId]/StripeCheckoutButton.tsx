"use client";

import { useState } from "react";

export function StripeCheckoutButton({ bookingId, amount }: { bookingId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Kunde inte starta betalning.");
        setLoading(false);
      }
    } catch {
      setError("Nätverksfel — försök igen.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={loading} className="stripe-btn">
        <span>
          <strong>Betala med kort nu</strong>
          <span className="dim" style={{ fontSize: 12, display: "block" }}>Säker betalning via Stripe · Visa, Mastercard</span>
        </span>
        <span className="stripe-amount tnum">{loading ? "Öppnar..." : `${amount.toLocaleString("sv-SE")} kr →`}</span>
      </button>
      {error && <p className="err" style={{ marginTop: 8 }}>{error}</p>}
      <style>{`
        .stripe-btn {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; padding: 18px 22px; background: var(--c-ink); color: #fff;
          border: 0; cursor: pointer; text-align: left; transition: background 160ms;
          gap: 12px;
        }
        .stripe-btn:hover:not(:disabled) { background: #08152e; }
        .stripe-btn:disabled { opacity: 0.6; cursor: wait; }
        .stripe-btn strong { font-family: var(--f-serif); font-size: 17px; }
        .stripe-btn .dim { color: #8B9AB8; }
        .stripe-amount { font-family: var(--f-serif); font-size: 18px; color: var(--c-gold); flex-shrink: 0; }
      `}</style>
    </div>
  );
}
