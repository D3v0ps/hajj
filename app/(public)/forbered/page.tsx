import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Förbered din vallfärd",
  description:
    "Förberedelsechecklista, packlista, ritualguide och vanliga frågor inför Hajj och Omra.",
};

// Källan för både UI-rendering och FAQPage JSON-LD så de aldrig kan glida isär.
// Innehåller frågor/svar som direkt speglar resan: betalning, vaccin, barn,
// avbokning, språk, transfer, dokument (pass-krav) och Swish.
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Vad ingår i ett Omra-paket?",
    a: "Visum, flyg, hotell i Mecka och Medina, busstransport mellan städerna, svensk reseledare på plats samt religiösa seminarier inför resan. Detaljerade inklusioner anges per paket.",
  },
  {
    q: "Hur länge måste mitt pass vara giltigt?",
    a: "Passet måste vara giltigt minst 7 månader från utresedatumet enligt Saudiarabiens regler. Saknar du tid — förnya passet i god tid innan resa.",
  },
  {
    q: "Kan jag betala på avbetalning?",
    a: "Ja, vi erbjuder Klarna och avbetalningsplan från anmälan till 30 dagar före avresa.",
  },
  {
    q: "Kan jag betala med Swish?",
    a: "Ja. Swish, Klarna, kort och bankgiro accepteras. Anmälningsavgiften (5 000 kr per person) bekräftar platsen, slutbetalning sker senast 30 dagar före avresa.",
  },
  {
    q: "Vilka vaccin behöver jag?",
    a: "Meningokock-vaccin (ACWY) är obligatoriskt enligt saudisk lag. Säsongsinfluensa rekommenderas. Vid pandemiska perioder kan ytterligare krav gälla.",
  },
  {
    q: "Får barn följa med?",
    a: "Ja, men barn under 18 år måste resa med förälder eller mahram. Pris för barn varierar med åldern.",
  },
  {
    q: "Vad händer om jag måste avboka?",
    a: "Anmälningsavgift (5 000 kr) återbetalas vid avbokning 30 dagar eller mer före avresa. Vid senare avbokning gäller resevillkoren — läs dem för fullständig info.",
  },
  {
    q: "Vilket språk pratas på resan?",
    a: "Svenska. Reseledaren pratar både svenska, arabiska och engelska. Religiös guide kommunicerar primärt på svenska.",
  },
  {
    q: "Hur tar jag mig till flygplatsen?",
    a: "Egen anslutning till Stockholm-Arlanda eller Göteborg-Landvetter. Vi hjälper med tips och kan koordinera med andra resenärer.",
  },
];

// JSON-LD för FAQPage så Google kan visa rikt FAQ-resultat. Återanvänder samma
// källa som UI-listan nedan — uppdateras alltid synkat.
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((it) => ({
    "@type": "Question",
    name: it.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: it.a,
    },
  })),
};

export default function ForberedPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <section style={{ padding: "80px 0 56px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="eyebrow gold">Förbered dig</span>
          <h1 style={{ marginTop: 18, marginBottom: 24, maxWidth: 880 }}>
            Innan du reser — det här gör du <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>på rätt sätt</em>.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720, lineHeight: 1.6 }}>
            En andlig och praktisk förberedelse spar oro under själva resan.
            Här är vår sammanställda guide: dokument, packlista, ritualer och
            de vanligaste frågorna.
          </p>
        </div>
      </section>

      <section id="dokument" style={{ padding: "80px 0", borderBottom: "1px solid var(--c-line-soft)" }}>
        <div className="container narrow">
          <span className="section-mark">— 01 / Dokument</span>
          <h2 style={{ marginTop: 14, marginBottom: 24 }}>Dokument-checklista</h2>
          <ul className="checklist">
            <li>Pass giltigt minst <strong>7 månader</strong> från utresedatum</li>
            <li>Passfoto i färg, vit bakgrund, 4×4 eller 5×5 cm, utan glasögon</li>
            <li>Kopia på uppehållstillstånd (om du inte är svensk medborgare)</li>
            <li>Vaccinationsbevis för meningokock (krav från Saudiarabien)</li>
            <li>Reseförsäkring som täcker pilgrimsresor</li>
            <li>Medicinjournal om du tar receptbelagda mediciner</li>
            <li>Bokningsbekräftelse + reseprogram (vi tillhandahåller)</li>
          </ul>
        </div>
      </section>

      <section id="packlista" style={{ padding: "80px 0", borderBottom: "1px solid var(--c-line-soft)", background: "var(--c-cream)" }}>
        <div className="container narrow">
          <span className="section-mark">— 02 / Packlista</span>
          <h2 style={{ marginTop: 14, marginBottom: 24 }}>Vad packar du?</h2>

          <div className="pack-grid">
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Religiöst</h3>
              <ul className="checklist">
                <li>Ihram-tyg (män, två stycken)</li>
                <li>Modesta kläder för kvinnor (abaya, hijab/sjal)</li>
                <li>Tasbih (radband)</li>
                <li>Liten dua-bok eller mobilapp</li>
                <li>Sittunderlag för bön i moské</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Praktiskt</h3>
              <ul className="checklist">
                <li>Bekväma sandaler (lätta att ta av/på)</li>
                <li>Solskydd, hatt eller sjal</li>
                <li>Vattenflaska + munskydd (Mecka är dammigt)</li>
                <li>Powerbank + adapter (typ G)</li>
                <li>Liten ryggsäck för dagsbruk</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Hälsa</h3>
              <ul className="checklist">
                <li>Personliga mediciner i originalförpackning</li>
                <li>Smärtstillande, plåster, vätskeersättning</li>
                <li>Halstabletter, näsdroppar (luften är torr)</li>
                <li>Solkräm SPF 50</li>
                <li>Magmedicin, hudkräm</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="ritual" style={{ padding: "80px 0", borderBottom: "1px solid var(--c-line-soft)" }}>
        <div className="container narrow">
          <span className="section-mark">— 03 / Ritualguide (kort)</span>
          <h2 style={{ marginTop: 14, marginBottom: 24 }}>Översiktlig ritualguide</h2>
          <p className="dim" style={{ maxWidth: 720, marginBottom: 32 }}>
            Detta är en mycket förenklad översikt. Reseledaren och vår
            religiöse guide går igenom varje steg på plats. Vi rekommenderar
            också att läsa en utförlig guide innan resan.
          </p>

          <ol className="ritual">
            {[
              { t: "Ihram", b: "Anta tillståndet ihram vid miqat med rätt intentions-formulering. Recitera talbiyah." },
              { t: "Tawaf (ankomst)", b: "Sju varv runt Kaaba moturs, börja vid den svarta stenen. För Omra-pilgrimer: detta är Tawaf al-Umrah." },
              { t: "Sa'i", b: "Sju turer mellan Safa och Marwa." },
              { t: "Mina (8 Dhul Hijja)", b: "Övernatta i tält i Mina, fyra böner." },
              { t: "Arafat (9 Dhul Hijja)", b: "Stå i Arafat från middag till solnedgång — Hajj-dagen." },
              { t: "Muzdalifah", b: "Övernatta utomhus, samla småstenar för stenkastningen." },
              { t: "Mina + Jamarat", b: "Stenkastning, offra (eller delta i offer), klipp/raka håret, ta av ihram." },
              { t: "Tawaf al-Ifadah + Sa'i", b: "Återvänd till Mecka för det avslutande tawaf och sa'i." },
              { t: "Stanna i Mina (11–13 Dhul Hijja)", b: "Daglig stenkastning vid de tre Jamarat." },
              { t: "Tawaf al-Wada", b: "Avskedsrundan runt Kaaba innan hemresa." },
            ].map((s, i) => (
              <li key={i}>
                <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
                <strong>{s.t}</strong>
                <span className="dim"> — {s.b}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" style={{ padding: "80px 0" }}>
        <div className="container narrow">
          <span className="section-mark">— 04 / Vanliga frågor</span>
          <h2 style={{ marginTop: 14, marginBottom: 24 }}>FAQ</h2>

          <div className="faq">
            {FAQ_ITEMS.map((it, i) => (
              <details key={i} className="faq-item">
                <summary>{it.q}</summary>
                <p className="dim">{it.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .checklist { list-style: none; padding: 0; display: grid; gap: 10px; }
        .checklist li { padding-left: 24px; position: relative; line-height: 1.6; }
        .checklist li:before { content: "✓"; position: absolute; left: 0; color: var(--c-gold); font-weight: 700; }
        .pack-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .ritual { list-style: none; padding: 0; display: grid; gap: 14px; }
        .ritual li { padding: 14px 18px; background: var(--c-paper); border-left: 2px solid var(--c-gold); }
        .step-num { font-family: var(--f-mono); font-size: 11px; color: var(--c-gold); margin-right: 12px; }
        .faq { display: flex; flex-direction: column; gap: 8px; }
        .faq-item { padding: 18px 22px; background: #fff; border: 1px solid var(--c-line); }
        .faq-item summary { cursor: pointer; font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); list-style: none; }
        .faq-item summary::marker { display: none; }
        .faq-item[open] summary { color: var(--c-gold); margin-bottom: 12px; }
        @media (max-width: 980px) { .pack-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 640px) {
          .pack-grid { grid-template-columns: 1fr; gap: 24px; }
          .ritual li { padding: 12px 14px; font-size: 14px; }
          .faq-item { padding: 14px 18px; }
          .faq-item summary { font-size: 17px; }
        }
      `}</style>
    </>
  );
}
