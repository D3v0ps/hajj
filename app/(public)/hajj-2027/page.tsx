import { LeadQuoteForm } from "@/components/site/LeadQuoteForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hajj 2027 — anmäl intresse",
  description:
    "Hajj 2027: begränsade platser, partneravtal med saudisk arrangör, allt inkluderat. Anmäl ditt intresse — så återkommer vi med en personlig genomgång.",
};

export default function Hajj2027Page() {
  return (
    <>
      <section style={{ padding: "80px 0 56px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="eyebrow gold">Hajj · Dhul Hijja 1449 / juni 2027</span>
          <h1 style={{ marginTop: 18, marginBottom: 24, maxWidth: 880 }}>
            Hajj 2027 — <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>begränsade platser</em>, allt inkluderat.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720, lineHeight: 1.6 }}>
            Vi har ett etablerat partneravtal med en saudisk arrangör som är
            ackrediterad av Ministry of Hajj. Plats är begränsad och beslutas i
            kvotsystem av Saudiarabien — anmäl ditt intresse tidigt, så
            kontaktar vi dig så snart fördelningen är klar.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <span className="tag gold">Begränsade platser</span>
            <span className="tag">Visum + flyg + hotell</span>
            <span className="tag">Reseledare på plats</span>
            <span className="tag">Religiös vägledning</span>
            <span className="tag">Avbetalning möjlig</span>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container split-main-aside">
          <div>
            <span className="section-mark">— 01 / Vad ingår</span>
            <h2 style={{ marginTop: 14, marginBottom: 24 }}>Hela resan, från Sverige till hemkomst.</h2>

            <ul className="incl">
              {[
                "Saudiskt Hajj-visum via partneravtal",
                "Direktflyg från Stockholm/Göteborg till Jeddah",
                "Hotell i Mecka inom 600 m från Haram",
                "Hotell i Medina inom 300 m från Nabawi",
                "Tält i Mina och Arafat enligt Nusuk-standard",
                "Buss-transfers mellan alla platser",
                "Måltider efter program",
                "Svensk reseledare och religiös guide",
                "Daglig vägledning i ritualernas utförande",
                "24/7 akutkontakt under hela resan",
                "Förresemöte i Stockholm/Göteborg",
                "Kvitto, intyg och resedokumentation efter hemkomst",
              ].map((it) => (
                <li key={it}><span className="check">✓</span> {it}</li>
              ))}
            </ul>

            <div style={{ marginTop: 40, padding: "24px 28px", background: "var(--c-cream)", borderLeft: "3px solid var(--c-gold)" }}>
              <p className="eyebrow gold" style={{ marginBottom: 8 }}>Pris kommuniceras separat</p>
              <p style={{ margin: 0, fontSize: 14, color: "var(--c-text)", lineHeight: 1.6 }}>
                Prisbild för Hajj-paket sätts efter att Saudiarabien meddelat
                årets kvotpriser. Anmäl intresse nedan — vi återkommer med
                indikativt pris och slutpris så snart vi har dem.
              </p>
            </div>
          </div>

          <aside>
            <LeadQuoteForm />
          </aside>
        </div>
      </section>

      <section style={{ padding: "80px 0", background: "var(--c-cream)" }}>
        <div className="container narrow">
          <span className="section-mark">— 02 / Tidslinje</span>
          <h2 style={{ marginTop: 14, marginBottom: 32 }}>Så ser tidslinjen ut.</h2>

          <ol className="timeline">
            {[
              { d: "Nu", t: "Anmäl intresse", b: "Vi noterar dig på listan och hör av oss för en personlig genomgång." },
              { d: "Q4 2026", t: "Bekräftelse av kvot", b: "Saudiarabien meddelar kvoten för Sverige. Vi bekräftar plats och pris." },
              { d: "Jan 2027", t: "Anmälningsavgift + dokument", b: "5 000 kr per person bekräftar din plats. Pass och dokument granskas." },
              { d: "Mar–Apr 2027", t: "Visum-process via partner", b: "Vi sköter ansökan via Nusuk och vår saudiska partner." },
              { d: "Maj 2027", t: "Slutbetalning + förresemöte", b: "Resterande summa betalas. Möte med reseledare, packlista, ritualgenomgång." },
              { d: "Juni 2027", t: "Avresa", b: "Direktflyg från Stockholm/Göteborg. Reseledare följer hela vägen." },
            ].map((s, i) => (
              <li key={i}>
                <div className="dot" />
                <div className="when">{s.d}</div>
                <div className="what">
                  <h3 style={{ fontSize: 22, marginBottom: 6 }}>{s.t}</h3>
                  <p className="dim" style={{ fontSize: 14 }}>{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <style>{`
        .incl { list-style: none; padding: 0; display: grid; gap: 12px; }
        .incl li { display: grid; grid-template-columns: 24px 1fr; gap: 10px; font-size: 15px; line-height: 1.5; }
        .incl .check { color: var(--c-gold); font-weight: 700; }

        .timeline { list-style: none; padding: 0; margin: 0; position: relative; }
        .timeline:before {
          content: ""; position: absolute; left: 24px; top: 8px; bottom: 8px;
          width: 1px; background: var(--c-line);
        }
        .timeline li { display: grid; grid-template-columns: 50px 140px 1fr; gap: 18px; padding: 22px 0; align-items: start; }
        .timeline .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--c-gold); margin-left: 18px; margin-top: 8px; position: relative; z-index: 1; }
        .timeline .when { font-family: var(--f-mono); font-size: 12px; color: var(--c-text-muted); letter-spacing: 0.12em; padding-top: 8px; }

        @media (max-width: 980px) {
          .timeline li { grid-template-columns: 30px 100px 1fr; }
        }
        @media (max-width: 640px) {
          .timeline li { grid-template-columns: 28px 1fr; gap: 14px; padding: 16px 0; }
          .timeline .when { padding-top: 4px; font-size: 11px; }
          .timeline li > .when { grid-column: 2; margin-top: -8px; margin-bottom: 4px; }
          .timeline .what { grid-column: 2; }
          .timeline:before { left: 14px; }
          .timeline .dot { margin-left: 8px; }
        }
      `}</style>
    </>
  );
}
