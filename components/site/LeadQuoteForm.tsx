"use client";

import { useState, useTransition } from "react";
import { submitLead } from "@/app/actions/leads";

export type LeadFormStrings = {
  ribbon: string;
  title: string;
  name: string;
  email: string;
  phone: string;
  travelType: string;
  message: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  sendAnother: string;
  gdpr: string;
  optionPlaceholder: string;
  optionOmra: string;
  optionHajj: string;
  optionBadal: string;
  optionVisa: string;
};

const DEFAULT_STRINGS: LeadFormStrings = {
  ribbon: "Begär offert · svar inom 24 h",
  title: "Vad letar du efter?",
  name: "Namn",
  email: "E-post",
  phone: "Telefon",
  travelType: "Typ av resa",
  message: "Meddelande (valfritt)",
  submit: "Skicka förfrågan",
  submitting: "Skickar…",
  successTitle: "Förfrågan mottagen",
  successBody: "En reseplanerare kontaktar dig inom 24 timmar (vardagar inom 4 timmar).",
  sendAnother: "Skicka en till",
  gdpr: "Genom att skicka godkänner du att vi behandlar dina uppgifter enligt vår integritetspolicy.",
  optionPlaceholder: "Välj…",
  optionOmra: "Omra",
  optionHajj: "Hajj",
  optionBadal: "Hadj Badal",
  optionVisa: "Endast visum",
};

export function LeadQuoteForm({ strings = DEFAULT_STRINGS }: { strings?: LeadFormStrings }) {
  const t = strings;
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="quote-card success-card" role="status" aria-live="polite">
        <div className="ribbon">{t.successTitle}</div>
        <h3 style={{ marginBottom: 12 }}>{t.successTitle}</h3>
        <p className="dim" style={{ fontSize: 14 }}>{t.successBody}</p>
        <button
          className="btn btn-ghost"
          style={{ marginTop: 20 }}
          onClick={() => setDone(false)}
        >
          {t.sendAnother}
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
      <div className="ribbon">{t.ribbon}</div>
      <h3 style={{ marginBottom: 18 }}>{t.title}</h3>

      <div className="quote-grid">
        <div className="field">
          <label htmlFor="lead-name">{t.name}</label>
          <input id="lead-name" name="name" required aria-required="true" />
        </div>

        <div className="field">
          <label htmlFor="lead-email">{t.email}</label>
          <input id="lead-email" name="email" type="email" required aria-required="true" autoComplete="email" />
        </div>

        <div className="field">
          <label htmlFor="lead-phone">{t.phone}</label>
          <input id="lead-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" />
        </div>

        <div className="field">
          <label htmlFor="lead-type">{t.travelType}</label>
          <select id="lead-type" name="travelType" defaultValue="">
            <option value="">{t.optionPlaceholder}</option>
            <option value="OMRA">{t.optionOmra}</option>
            <option value="HAJJ">{t.optionHajj}</option>
            <option value="HADJ_BADAL">{t.optionBadal}</option>
            <option value="VISUM">{t.optionVisa}</option>
          </select>
        </div>

        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="lead-msg">{t.message}</label>
          <textarea id="lead-msg" name="message" rows={3} />
        </div>
      </div>

      {error && <p className="err" role="alert" style={{ marginTop: 12 }}>{error}</p>}

      <button type="submit" className="btn btn-primary" style={{ marginTop: 20, width: "100%", justifyContent: "center" }} disabled={pending}>
        {pending ? t.submitting : `${t.submit} →`}
      </button>

      <p className="dim" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.55 }}>{t.gdpr}</p>
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
