import { headers } from "next/headers";
import { hasConsent } from "@/lib/consent";
import { CookieBannerForm } from "./CookieBannerForm";

/**
 * Server-component som visar GDPR-cookie-bannern om inget val gjorts.
 * Renderar `null` om cookien `cookieConsent` redan finns.
 *
 * Designsystem: navy/guld/cream. Mobilanpassad (full-bredd),
 * max-bredd 720px på desktop, kortet ankrar nedtill.
 */
export async function CookieBanner() {
  if (await hasConsent()) return null;

  // Försök hämta nuvarande path så att redirect efter "spara" inte kastar
  // tillbaka användaren till `/`. Server-komponenter får inte request-path
  // direkt, men `referer` matchar i praktiken sidan användaren just laddat.
  const hdrs = await headers();
  const referer = hdrs.get("referer") ?? "";
  let next = "/";
  if (referer) {
    try {
      const u = new URL(referer);
      if (u.pathname.startsWith("/")) next = u.pathname + (u.search || "");
    } catch {
      // ignorera trasig referer
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookieinställningar"
      aria-describedby="cb-desc"
      className="cb-root"
    >
      <span id="cb-desc" className="sr-only">
        Webbplatsen använder cookies. Välj vilka kategorier du godkänner.
      </span>
      <CookieBannerForm pathname={next} />

      <style>{`
        .cb-root {
          position: fixed;
          left: 16px;
          right: 16px;
          bottom: 16px;
          z-index: 150;
          background: var(--c-paper);
          border: 1px solid var(--c-line);
          box-shadow: 0 14px 40px rgba(12, 30, 62, 0.18);
          color: var(--c-text);
        }
        @media (min-width: 721px) {
          .cb-root {
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            width: min(720px, calc(100vw - 32px));
            bottom: 24px;
          }
        }
        .cb-inner {
          padding: 22px 24px;
          display: grid;
          gap: 16px;
        }
        @media (max-width: 720px) {
          .cb-inner { padding: 18px 18px; gap: 14px; }
        }
        .cb-text { display: grid; gap: 6px; }
        .cb-title {
          font-family: var(--f-serif);
          font-size: 20px;
          line-height: 1.2;
          color: var(--c-ink);
          letter-spacing: -0.01em;
          font-weight: 460;
          margin: 0;
        }
        .cb-body {
          font-size: 14px;
          line-height: 1.55;
          color: var(--c-text-muted);
          margin: 0;
        }
        .cb-link {
          color: var(--c-ink);
          font-weight: 600;
          border-bottom: 1px solid var(--c-gold);
        }
        .cb-link:hover { color: var(--c-gold); }

        .cb-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .cb-actions form { display: contents; }
        @media (max-width: 720px) {
          .cb-actions { flex-direction: column; align-items: stretch; }
          .cb-actions form { display: block; }
          .cb-actions form button,
          .cb-actions > button { width: 100%; justify-content: center; }
        }

        .cb-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 18px;
          font-family: var(--f-sans);
          font-size: 14px;
          font-weight: 600;
          border: 1px solid transparent;
          border-radius: 2px;
          cursor: pointer;
          min-height: 44px;
          line-height: 1;
          transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
        }
        .cb-btn-primary {
          background: var(--c-ink);
          color: #fff;
          border-color: var(--c-ink);
        }
        .cb-btn-primary:hover { background: #08152e; border-color: #08152e; }
        .cb-btn-ghost {
          background: transparent;
          color: var(--c-ink);
          border-color: var(--c-line);
        }
        .cb-btn-ghost:hover { border-color: var(--c-ink); }

        .cb-panel {
          border-top: 1px solid var(--c-line-soft);
          padding-top: 16px;
          margin-top: 4px;
        }
        .cb-categories {
          display: grid;
          gap: 10px;
        }
        .cb-cat {
          display: grid;
          grid-template-columns: 1fr auto;
          grid-template-areas:
            "head toggle"
            "desc desc";
          gap: 6px 16px;
          padding: 14px 16px;
          background: #fff;
          border: 1px solid var(--c-line-soft);
          cursor: pointer;
        }
        .cb-cat-head {
          grid-area: head;
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: var(--f-sans);
        }
        .cb-cat-name {
          font-weight: 700;
          font-size: 14px;
          color: var(--c-ink);
          letter-spacing: 0.01em;
        }
        .cb-cat-state {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--c-text-muted);
          font-weight: 600;
          padding: 3px 8px;
          border: 1px solid var(--c-line);
          background: var(--c-cream);
        }
        .cb-cat-desc {
          grid-area: desc;
          font-size: 13px;
          line-height: 1.55;
          color: var(--c-text-muted);
        }
        .cb-toggle {
          grid-area: toggle;
          width: 22px;
          height: 22px;
          accent-color: var(--c-gold);
          align-self: center;
        }
        .cb-toggle:disabled { opacity: 0.6; cursor: not-allowed; }

        .cb-panel-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
        }
        @media (max-width: 720px) {
          .cb-panel-actions { justify-content: stretch; }
          .cb-panel-actions .cb-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}
