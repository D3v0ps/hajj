import type { Metadata } from "next";
import { DemoFlow } from "./DemoFlow";

export const metadata: Metadata = {
  title: "Demo — så fungerar bokningen",
  description:
    "Klicka dig igenom hela bokningsflödet som om du var en kund. Visar paketval, kontoskapande, dokument, granskning och betalning — utan att skapa något riktigt.",
};

export default function DemoPage() {
  return (
    <>
      <section style={{ padding: "64px 0 32px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container narrow">
          <span className="eyebrow gold">Demo · interaktiv</span>
          <h1 style={{ marginTop: 16, marginBottom: 18 }}>
            Bokningsresan på <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>en minut</em>.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 640, lineHeight: 1.55 }}>
            Klicka dig igenom som om du var en kund. Den här sidan är ett
            internt skyltfönster — inget sparas, ingen bokning skapas, ingen
            betalning genomförs. Avsikten är att visa flödet och responsiviteten.
          </p>

          <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="tag">5-stegs flöde</span>
            <span className="tag gold">Ingen DB-skrivning</span>
            <span className="tag">Mobilanpassat</span>
            <span className="tag">~60 sek att klara</span>
          </div>
        </div>
      </section>

      <section style={{ padding: "48px 0 96px", background: "var(--c-cream)" }}>
        <div className="container narrow">
          <DemoFlow />
        </div>
      </section>
    </>
  );
}
