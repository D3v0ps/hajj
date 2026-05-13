"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

type NavItem = { href: string; label: string };

export function MobileMenu({ items }: { items: NavItem[] }) {
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
              Min sida →
            </Link>
          </nav>
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
          padding: 80px 24px 24px;
          overflow-y: auto;
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
        @media (min-width: 981px) {
          .mobile-toggle, .mobile-drawer { display: none !important; }
        }
      `}</style>
    </>
  );
}
