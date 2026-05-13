import Link from "next/link";
import { LeadQuoteForm } from "@/components/site/LeadQuoteForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visumservice — Omra och turistvisum",
  description:
    "Visumservice för Omra och Saudiarabien. Vi hjälper med eligibility-check, dokumentlista, ansökan och status.",
};

export default function VisumPage() {
  return (
    <>
      <section style={{ padding: "80px 0 56px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="eyebrow gold">Visumservice</span>
          <h1 style={{ marginTop: 18, marginBottom: 24, maxWidth: 880 }}>
            Visum till Saudiarabien — vi <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>sköter processen</em>.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720, lineHeight: 1.6 }}>
            Behöver du bara visum, eller ska du resa privat och vill ha hjälp
            med ansökan? Vi gör eligibility-kontroll, samlar in nödvändiga
            dokument och hanterar ansökan via Nusuk eller saudiska e-tjänster.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container split-main-aside">
          <div>
            <span className="section-mark">— 01 / Visumtyper</span>
            <h2 style={{ marginTop: 14, marginBottom: 24 }}>Vi hjälper med dessa typer</h2>

            <div className="visa-grid">
              {[
                { t: "Omra-visum", b: "Specifikt för Omra-resor. Tidsbegränsat och knutet till resa under viss period.", p: "1 800 kr" },
                { t: "Hajj-visum", b: "Endast via vår partner och inom kvotsystem. Hanteras inom våra Hajj-paket.", p: "Inkluderat i Hajj-paket" },
                { t: "Turistvisum (e-Visa)", b: "För turism, släktbesök och religiösa besök till Mecka utanför Hajj-period.", p: "1 500 kr" },
                { t: "Visum för uppehållstillståndsinnehavare", b: "Hjälp för dig med svenskt UT som behöver dokument-extraservice.", p: "2 200 kr" },
              ].map((v) => (
                <article key={v.t} className="visa-card">
                  <h3 style={{ fontSize: 20, marginBottom: 8 }}>{v.t}</h3>
                  <p className="dim" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{v.b}</p>
                  <span className="serif" style={{ fontSize: 18, color: "var(--c-ink)" }}>{v.p}</span>
                </article>
              ))}
            </div>

            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontSize: 22, marginBottom: 12 }}>Vad behövs?</h3>
              <ul className="checklist">
                <li>Pass giltigt minst 7 månader från utresedatum</li>
                <li>Passfoto i färg, vit bakgrund, 4×4 eller 5×5 cm, utan glasögon</li>
                <li>Kopia på uppehållstillstånd om du inte är svensk medborgare</li>
                <li>Vaccinationsintyg (gäller vissa typer)</li>
                <li>Bokningsbekräftelse på flyg och hotell (vi hjälper)</li>
              </ul>
            </div>
          </div>

          <aside>
            <LeadQuoteForm />
          </aside>
        </div>
      </section>

      <style>{`
        .visa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .visa-card { background: #fff; border: 1px solid var(--c-line); padding: 24px; }
        .checklist { list-style: none; padding: 0; display: grid; gap: 10px; }
        .checklist li { padding-left: 24px; position: relative; line-height: 1.6; }
        .checklist li:before { content: "✓"; position: absolute; left: 0; color: var(--c-gold); font-weight: 700; }
        @media (max-width: 720px) { .visa-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
