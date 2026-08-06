import { LeadQuoteForm } from "@/components/site/LeadQuoteForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hadj Badal — Hajj i annans namn",
  description:
    "Hadj Badal är möjligheten att låta någon utföra Hajj i en annan persons namn — för avliden eller för någon som är förhindrad. Vi hjälper med uppdrag, dokumentation och genomförande.",
};

export default function HadjBadalPage() {
  return (
    <>
      <section style={{ padding: "80px 0 56px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="eyebrow gold">Hadj Badal</span>
          <h1 style={{ marginTop: 18, marginBottom: 24, maxWidth: 880 }}>
            Hadj Badal — Hajj <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>i annans namn</em>.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720, lineHeight: 1.6 }}>
            Hadj Badal innebär att en person som redan utfört sin egen Hajj
            utför Hajj på uppdrag av en annan person — antingen någon som är
            avliden, eller någon som inte själv kan resa på grund av sjukdom
            eller ålder. Vi förmedlar uppdrag, dokumenterar genomförandet och
            återkommer med intyg efter Hajj.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container split-main-aside">
          <div>
            <span className="section-mark">— 01 / Så fungerar det</span>
            <h2 style={{ marginTop: 14, marginBottom: 24 }}>Uppdrag, genomförande, intyg.</h2>

            <ol className="badal-steps">
              {[
                { t: "Beställ uppdrag", b: "Ange för vem Hajj ska utföras (avliden eller levande), dennes namn och relation till dig som beställare. Vi diskuterar omfattning (Hajj, eller Hajj + Omra) och pris." },
                { t: "Vi tilldelar uppdrag", b: "Vi knyter uppdraget till en av våra erfarna pilgrimer som redan utfört sin egen Hajj. Du får uppgifter om vem som genomför uppdraget och var, så du kan följa det andligt." },
                { t: "Hajj genomförs", b: "Den utsedda pilgrimen utför hela Hajj med rätt intentionsformulering (niyyah) på den persons vägnar du angett. Detta dokumenteras." },
                { t: "Du får intyg", b: "Efter hemkomst får du ett intyg som bekräftar att Hajj genomförts på den angivna personens vägnar, inklusive datum och pilgrimens namn." },
              ].map((s, i) => (
                <li key={i}>
                  <div className="num">{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <h3 style={{ fontSize: 20, marginBottom: 6 }}>{s.t}</h3>
                    <p className="dim" style={{ fontSize: 14, lineHeight: 1.6 }}>{s.b}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div style={{ marginTop: 40, padding: "24px 28px", background: "var(--c-cream)", borderLeft: "3px solid var(--c-gold)" }}>
              <p className="eyebrow gold" style={{ marginBottom: 8 }}>Religiösa villkor</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                Den som utför Hadj Badal måste ha utfört sin egen Hajj först.
                Vi följer de fyra rättsskolornas (madhab) generella riktlinjer
                och kan diskutera enskilda spörsmål med vår religiösa rådgivare
                vid behov.
              </p>
            </div>
          </div>

          <aside>
            <LeadQuoteForm />
          </aside>
        </div>
      </section>

      <style>{`
        .badal-steps { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 28px; }
        .badal-steps li { display: grid; grid-template-columns: 60px 1fr; gap: 18px; padding-bottom: 22px; border-bottom: 1px solid var(--c-line-soft); }
        .badal-steps li:last-child { border-bottom: 0; }
        .badal-steps .num { font-family: var(--f-mono); font-size: 14px; color: var(--c-gold); letter-spacing: 0.16em; padding-top: 4px; }
        @media (max-width: 640px) {
          .badal-steps li { grid-template-columns: 40px 1fr; gap: 12px; padding-bottom: 16px; }
        }
      `}</style>
    </>
  );
}
