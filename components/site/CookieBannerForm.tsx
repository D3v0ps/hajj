"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { setConsent } from "@/app/actions/consent";

export function CookieBannerForm({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const panelId = useId();

  // Tre separata formulär — varje knapp tar ett oberoende beslut.
  // På så vis kan användaren välja utan att famla med dolda fält.
  return (
    <div className="cb-inner">
      <div className="cb-text">
        <h2 className="cb-title">Vi värnar om din integritet</h2>
        <p className="cb-body">
          Vi använder cookies för att webbplatsen ska fungera, mäta hur den
          används och förbättra upplevelsen. Nödvändiga cookies är alltid på.
          Du kan när som helst ändra dina val på vår{" "}
          <Link href="/cookies" className="cb-link">cookiesida</Link>.
        </p>
      </div>

      <div className="cb-actions" role="group" aria-label="Cookieval">
        {/* Endast nödvändiga — analytics & marketing stängs av */}
        <form action={setConsent}>
          <input type="hidden" name="analytics" value="false" />
          <input type="hidden" name="marketing" value="false" />
          <input type="hidden" name="next" value={pathname} />
          <button type="submit" className="cb-btn cb-btn-ghost">
            Endast nödvändiga
          </button>
        </form>

        <button
          type="button"
          className="cb-btn cb-btn-ghost"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Dölj inställningar" : "Anpassa"}
        </button>

        {/* Acceptera alla — båda kategorierna på */}
        <form action={setConsent}>
          <input type="hidden" name="analytics" value="true" />
          <input type="hidden" name="marketing" value="true" />
          <input type="hidden" name="next" value={pathname} />
          <button type="submit" className="cb-btn cb-btn-primary">
            Acceptera alla
          </button>
        </form>
      </div>

      {open && (
        <div id={panelId} className="cb-panel" role="region" aria-label="Kategorier">
          <form action={setConsent} className="cb-categories">
            <input type="hidden" name="next" value={pathname} />

            <label className="cb-cat">
              <span className="cb-cat-head">
                <span className="cb-cat-name">Nödvändiga</span>
                <span className="cb-cat-state">Alltid på</span>
              </span>
              <span className="cb-cat-desc">
                Krävs för inloggning, säkerhet (CSRF) och bokningsflödet.
                Kan inte stängas av.
              </span>
              {/* Disabled checkbox för visuell tydlighet — värdet skickas separat */}
              <input
                type="checkbox"
                checked
                disabled
                aria-label="Nödvändiga cookies (alltid på)"
                className="cb-toggle"
                readOnly
              />
            </label>

            <label className="cb-cat">
              <span className="cb-cat-head">
                <span className="cb-cat-name">Analys</span>
                <span className="cb-cat-state">{analytics ? "På" : "Av"}</span>
              </span>
              <span className="cb-cat-desc">
                Hjälper oss förstå hur sajten används — t.ex. vilka sidor som besöks
                mest. Ingen identifiering av enskilda personer.
              </span>
              <input
                type="checkbox"
                name="analytics"
                value="true"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="cb-toggle"
              />
            </label>

            <label className="cb-cat">
              <span className="cb-cat-head">
                <span className="cb-cat-name">Marknadsföring</span>
                <span className="cb-cat-state">{marketing ? "På" : "Av"}</span>
              </span>
              <span className="cb-cat-desc">
                Används för annonsering och uppföljning av kampanjer. Vi använder
                idag inga tredjeparts-marknadsförings-cookies, men reserverar
                kategorin för framtida bruk.
              </span>
              <input
                type="checkbox"
                name="marketing"
                value="true"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="cb-toggle"
              />
            </label>

            <div className="cb-panel-actions">
              <button type="submit" className="cb-btn cb-btn-primary">
                Spara mina val
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
