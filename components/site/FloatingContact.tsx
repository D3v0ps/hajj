"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type FloatingStrings = {
  ariaOpen: string;
  ariaClose: string;
  ariaDialog: string;
  eyebrow: string;
  hours: string;
  call: string;
  callSub: string;
  whatsapp: string;
  whatsappSub: string;
  quote: string;
  quoteSub: string;
};

const DEFAULT_STRINGS: FloatingStrings = {
  ariaOpen: "Öppna kontaktpanel",
  ariaClose: "Stäng kontaktpanel",
  ariaDialog: "Kontakta oss",
  eyebrow: "Kontakt",
  hours: "Vardagar 09–17. Vi svarar normalt inom 4 timmar.",
  call: "Ring",
  callSub: "Direkt till kontoret",
  whatsapp: "WhatsApp",
  whatsappSub: "Skicka meddelande",
  quote: "Begär offert",
  quoteSub: "Svar inom 24 h",
};

type Props = {
  /** Internationellt format med plus och inga mellanslag, t.ex. "+46700000000". */
  phoneE164: string;
  /** Visningsformat för knappen, t.ex. "070-000 00 00". */
  phoneDisplay: string;
  /** Locale-aware href till offertsektionen (default `/#offert`). */
  offertHref?: string;
  strings?: FloatingStrings;
};

/**
 * Flytande kontaktknapp i nedre högra hörnet — finns på alla publika sidor.
 * Mobilvänlig (44×44 touch-targets), navy-bg, guld-accent.
 *
 * Expanderbar panel med tre val:
 *  - Ring (tel:-länk)
 *  - WhatsApp (wa.me-länk)
 *  - Begär offert (#offert på startsidan)
 *
 * TODO: telefonnummer ska fyllas i av byrån via env (SITE_PHONE/SITE_PHONE_DISPLAY).
 * Placeholdervärden i `app/(public)/layout.tsx` används tills riktigt nummer satts.
 */
export function FloatingContact({ phoneE164, phoneDisplay, offertHref = "/#offert", strings = DEFAULT_STRINGS }: Props) {
  const t = strings;
  const [open, setOpen] = useState(false);

  // Stäng med Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const telHref = `tel:${phoneE164.replace(/\s/g, "")}`;
  const waNumber = phoneE164.replace(/[^\d]/g, ""); // wa.me kräver bara siffror
  const waHref = `https://wa.me/${waNumber}`;

  return (
    <div className={`fc ${open ? "fc-open" : ""}`}>
      {open && (
        <div className="fc-panel" role="dialog" aria-modal="false" aria-label={t.ariaDialog}>
          <div className="fc-panel-head">
            <span className="fc-eyebrow">{t.eyebrow}</span>
            <button type="button" className="fc-close" aria-label={t.ariaClose} onClick={() => setOpen(false)}>✕</button>
          </div>
          <p className="fc-lede">{t.hours}</p>

          <a href={telHref} className="fc-action" onClick={() => setOpen(false)}>
            <span className="fc-icon" aria-hidden="true">☎</span>
            <span className="fc-action-body">
              <strong>{t.call}</strong>
              <span>{phoneDisplay}</span>
            </span>
          </a>

          <a href={waHref} className="fc-action" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <span className="fc-icon" aria-hidden="true">✆</span>
            <span className="fc-action-body">
              <strong>{t.whatsapp}</strong>
              <span>{t.whatsappSub}</span>
            </span>
          </a>

          <Link href={offertHref} className="fc-action" onClick={() => setOpen(false)}>
            <span className="fc-icon" aria-hidden="true">✎</span>
            <span className="fc-action-body">
              <strong>{t.quote}</strong>
              <span>{t.quoteSub}</span>
            </span>
          </Link>
        </div>
      )}

      <button
        type="button"
        className="fc-fab"
        aria-label={open ? t.ariaClose : t.ariaOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <span aria-hidden="true">✕</span>
        ) : (
          <>
            <span className="fc-fab-icon" aria-hidden="true">☎</span>
            <span className="fc-fab-label">{t.eyebrow}</span>
          </>
        )}
      </button>

      <style>{`
        .fc {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 60;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 14px;
          /* Säkerhetsavstånd ovanför mobil hemknapp */
          padding-bottom: env(safe-area-inset-bottom);
        }
        .fc-fab {
          background: var(--c-ink);
          color: #fff;
          border: 1px solid var(--c-gold);
          border-radius: 999px;
          padding: 14px 22px;
          font-family: var(--f-sans);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.02em;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(12, 30, 62, 0.22);
          transition: background 160ms ease, transform 160ms ease;
          min-height: 48px;
          min-width: 48px;
        }
        .fc-fab:hover { background: #08152e; transform: translateY(-1px); }
        .fc-fab:focus-visible { outline: 2px solid var(--c-gold); outline-offset: 3px; }
        .fc-fab-icon { color: var(--c-gold); font-size: 16px; line-height: 1; }
        .fc-fab-label { font-weight: 600; }

        .fc-open .fc-fab {
          background: var(--c-gold);
          color: #fff;
          border-color: var(--c-gold);
          padding: 0;
          width: 48px;
          height: 48px;
          justify-content: center;
          font-size: 18px;
        }

        .fc-panel {
          background: var(--c-ink);
          color: #fff;
          border: 1px solid var(--c-gold);
          width: min(320px, calc(100vw - 40px));
          padding: 20px 22px 22px;
          box-shadow: 0 12px 36px rgba(12, 30, 62, 0.28);
          border-radius: 4px;
        }
        .fc-panel-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .fc-eyebrow {
          font-family: var(--f-sans);
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--c-gold);
          font-weight: 700;
        }
        .fc-close {
          background: transparent;
          border: 0;
          color: #C3CCD8;
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
          min-height: 32px;
          line-height: 1;
        }
        .fc-close:hover { color: #fff; }
        .fc-lede {
          font-size: 12px;
          color: #C3CCD8;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }
        .fc-action {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          margin-bottom: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid #2A3F62;
          color: #fff;
          min-height: 56px;
          transition: background 140ms ease, border-color 140ms ease;
        }
        .fc-action:last-child { margin-bottom: 0; }
        .fc-action:hover {
          background: rgba(181, 137, 75, 0.12);
          border-color: var(--c-gold);
        }
        .fc-icon {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--c-gold);
          color: var(--c-gold);
          border-radius: 2px;
          font-size: 14px;
          flex-shrink: 0;
        }
        .fc-action-body {
          display: flex;
          flex-direction: column;
          line-height: 1.3;
        }
        .fc-action-body strong {
          font-family: var(--f-serif);
          font-weight: 500;
          font-size: 16px;
          color: #fff;
        }
        .fc-action-body span {
          font-size: 12px;
          color: #C3CCD8;
          margin-top: 2px;
        }

        @media (max-width: 640px) {
          .fc { right: 14px; bottom: 14px; gap: 10px; }
          .fc-fab { padding: 12px 18px; font-size: 13px; }
          .fc-panel { padding: 18px 18px 18px; }
        }
        /* Dölj på utskrift */
        @media print { .fc { display: none !important; } }
      `}</style>
    </div>
  );
}
