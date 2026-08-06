"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type NavItem = { href: string; label: string };
type LocaleItem = { code: string; label: string; href: string; active: boolean };

export function MobileMenu({
  items,
  locales = [],
  myPageLabel = "Min sida",
  languageLabel = "Språk",
  phone,
  phoneDisplay,
}: {
  items: NavItem[];
  locales?: LocaleItem[];
  myPageLabel?: string;
  languageLabel?: string;
  phone?: string;
  phoneDisplay?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Stäng meny" : "Öppna meny"}
        aria-expanded={open}
        className="mobile-toggle mobile-only"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕" : "≡"}
      </button>

      {open && (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobilmeny">
          <nav className="mobile-nav" aria-label="Mobilmeny-navigation">
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link href="/min-sida" className="mn-portal" onClick={() => setOpen(false)}>
              {myPageLabel} →
            </Link>
          </nav>

          {phone && phoneDisplay && (
            <a className="mn-phone" href={`tel:${phone}`} onClick={() => setOpen(false)}>
              📞 {phoneDisplay}
            </a>
          )}

          {locales.length > 0 && (
            <div className="mn-locales">
              <span className="mn-locales-label">{languageLabel}</span>
              <div className="mn-locales-row">
                {locales.map((l) => (
                  <Link
                    key={l.code}
                    href={l.href}
                    hrefLang={l.code}
                    onClick={() => setOpen(false)}
                    className={l.active ? "mn-loc active" : "mn-loc"}
                    aria-current={l.active ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .mobile-toggle {
          background: transparent;
          border: 1px solid var(--c-line);
          color: var(--c-ink);
          font-size: 22px;
          line-height: 1;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .mobile-drawer {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: var(--c-paper);
          z-index: 100;
          padding: 80px 24px calc(24px + env(safe-area-inset-bottom));
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .mobile-nav { display: flex; flex-direction: column; gap: 4px; }
        .mobile-nav a {
          font-family: var(--f-serif);
          font-size: 22px;
          color: var(--c-ink);
          padding: 18px 0;
          border-bottom: 1px solid var(--c-line-soft);
          min-height: 44px;
        }
        .mobile-nav a:hover { color: var(--c-gold); }
        .mn-portal { color: var(--c-gold) !important; margin-top: 16px; }
        .mn-phone {
          display: inline-flex; align-items: center; gap: 8px;
          margin-top: 24px; font-size: 18px; font-weight: 600; color: var(--c-ink);
          min-height: 44px;
        }
        .mn-locales { margin-top: 32px; border-top: 1px solid var(--c-line-soft); padding-top: 20px; }
        .mn-locales-label {
          display: block; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--c-text-muted); font-weight: 700; margin-bottom: 12px;
        }
        .mn-locales-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .mn-loc {
          padding: 10px 18px; border: 1px solid var(--c-line); font-size: 15px;
          color: var(--c-ink); min-height: 44px; display: inline-flex; align-items: center;
        }
        .mn-loc.active { border-color: var(--c-gold); color: var(--c-gold); font-weight: 600; }
        @media (min-width: 981px) {
          .mobile-toggle, .mobile-drawer { display: none !important; }
        }
      `}</style>
    </>
  );
}
