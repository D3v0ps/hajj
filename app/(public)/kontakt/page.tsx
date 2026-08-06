import { LeadQuoteForm } from "@/components/site/LeadQuoteForm";
import { SITE } from "@/lib/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontakta Hadj Omra Resor — telefon, e-post, kontor i Stockholm och Göteborg.",
};

export default function KontaktPage() {
  return (
    <>
      <section style={{ padding: "80px 0 56px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="eyebrow gold">Kontakt</span>
          <h1 style={{ marginTop: 18, marginBottom: 24, maxWidth: 880 }}>
            Vi finns för dig — <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>på riktigt</em>.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720, lineHeight: 1.6 }}>
            Vi svarar på alla samtal personligen — inga köer, inga
            chatbottar. Telefon, e-post eller besök efter bokad tid.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container kontakt-grid">
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 24 }}>Kontoren</h2>

            <div className="contact-card">
              <span className="eyebrow">{SITE.offices.stockholm.label}</span>
              <p className="address">
                {SITE.offices.stockholm.address}<br />
                {SITE.offices.stockholm.postal}
              </p>
              <p className="dim" style={{ fontSize: 14 }}>{SITE.offices.stockholm.note}</p>
            </div>

            <div className="contact-card">
              <span className="eyebrow">{SITE.offices.goteborg.label}</span>
              <p className="address">
                {SITE.offices.goteborg.address}<br />
                {SITE.offices.goteborg.postal}
              </p>
              <p className="dim" style={{ fontSize: 14 }}>{SITE.offices.goteborg.note}</p>
            </div>

            <div className="contact-card">
              <span className="eyebrow">Telefon</span>
              <p className="address" style={{ fontSize: 22 }}>
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phoneDisplay}</a>
              </p>
              <p className="dim" style={{ fontSize: 14 }}>
                Vardagar 9–17. Akut under resa: dygnet-runt-nummer skickas till alla resenärer före avresa.
              </p>
            </div>

            <div className="contact-card">
              <span className="eyebrow">E-post</span>
              <p className="address" style={{ fontSize: 18 }}>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </p>
            </div>
          </div>

          <aside>
            <LeadQuoteForm />
          </aside>
        </div>
      </section>

      <style>{`
        .contact-card { padding: 24px 0; border-bottom: 1px solid var(--c-line-soft); }
        .contact-card:last-of-type { border-bottom: 0; }
        .contact-card .eyebrow { display: block; margin-bottom: 10px; }
        .address { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); margin: 0 0 8px; line-height: 1.5; }
        .address a { color: var(--c-ink); border-bottom: 1px solid var(--c-gold); }
        .kontakt-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 64px; }
        @media (max-width: 980px) {
          .kontakt-grid { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>
    </>
  );
}
