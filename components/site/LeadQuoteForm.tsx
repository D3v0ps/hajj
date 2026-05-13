"use client";

import { useState, useTransition } from "react";
import { submitLead } from "@/app/actions/leads";

export function LeadQuoteForm() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="quote-card success-card">
        <div className="ribbon">Tack — vi hör av oss</div>
        <h3 style={{ marginBottom: 12 }}>Förfrågan mottagen</h3>
        <p className="dim" style={{ fontSize: 14 }}>
          En reseplanerare kontaktar dig inom 24 timmar (vardagar inom 4 timmar).
          Vi går igenom datum, paket och eventuella särskilda behov.
        </p>
        <button
          className="btn btn-ghost"
          style={{ marginTop: 20 }}
          onClick={() => setDone(false)}
        >
          Skicka en till
        </button>
        <style>{leadStyles}</style>
      </div>
    );
  }

  return (
    <form
      className="quote-card"
      action={(formData) => {
        setError(null);
        start(async () => {
          const res = await submitLead(formData);
          if (res.ok) setDone(true);
          else setError(res.error);
        });
      }}
    >
      <div className="ribbon">Begär offert · svar inom 24 h</div>
      <h3 style={{ marginBottom: 6 }}>Vad letar du efter?</h3>
      <p className="dim" style={{ fontSize: 13, marginBottom: 22 }}>
        Berätta lite — vi återkommer med ett förslag som passar din resa.
      </p>

      <div className="quote-grid">
        <div className="field">
          <label htmlFor="lead-name">Namn</label>
          <input id="lead-name" name="name" required />
        </div>

        <div className="field">
          <label htmlFor="lead-email">E-post</label>
          <input id="lead-email" name="email" type="email" required />
        </div>

        <div className="field">
          <label htmlFor="lead-phone">Telefon</label>
          <input id="lead-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" />
        </div>

        <div className="field">
          <label htmlFor="lead-type">Typ av resa</label>
          <select id="lead-type" name="travelType" defaultValue="">
            <option value="">Välj...</option>
            <option value="OMRA">Omra</option>
            <option value="HAJJ">Hajj</option>
            <option value="HADJ_BADAL">Hadj Badal</option>
            <option value="VISUM">Endast visum</option>
          </select>
        </div>

        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="lead-msg">Meddelande (valfritt)</label>
          <textarea id="lead-msg" name="message" rows={3} />
        </div>
      </div>

      {error && <p className="err" style={{ marginTop: 12 }}>{error}</p>}

      <button type="submit" className="btn btn-primary" style={{ marginTop: 20, width: "100%", justifyContent: "center" }} disabled={pending}>
        {pending ? "Skickar..." : "Skicka förfrågan →"}
      </button>

      <p className="dim" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.55 }}>
        Vi behandlar dina uppgifter enligt GDPR. Genom att skicka samtycker du
        till att vi kontaktar dig om din förfrågan.
      </p>
      <style>{leadStyles}</style>
    </form>
  );
}

const leadStyles = `
  .quote-card {
    background: #fff;
    border: 1px solid var(--c-line);
    padding: 32px;
    margin-bottom: 56px;
    position: relative;
  }
  .quote-card .ribbon {
    background: var(--c-cream);
    border: 1px solid var(--c-line-soft);
    color: var(--c-ink);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 700;
    padding: 8px 14px;
    display: inline-block;
    margin-bottom: 20px;
  }
  .quote-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .quote-card.success-card { border-color: var(--c-green-soft); }
  @media (max-width: 640px) {
    .quote-card { padding: 24px 20px; }
    .quote-grid { grid-template-columns: 1fr; gap: 12px; }
  }
`;
