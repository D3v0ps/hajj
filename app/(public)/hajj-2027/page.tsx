import Link from "next/link";
import { prisma } from "@/lib/db";
import { primaryDisplayPrice } from "@/lib/pricing";
import { LeadQuoteForm } from "@/components/site/LeadQuoteForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hajj — anmälan & registrering",
  description:
    "Hajj med svensk reseledare: begränsade platser enligt Saudiarabiens kvotsystem. Anmäl intresse kostnadsfritt eller registrera dig direkt på ett öppet paket — administrationsavgift 2 500 kr per person.",
};

export const dynamic = "force-dynamic";

// Anmälningsflödet — samma struktur som etablerade Hajj-arrangörer använder:
// kostnadsfri intresseanmälan → platsbesked enligt kvot → digital registrering
// med administrationsavgift → dokument/visum → slutbetalning → förresemöte.
const STEPS = [
  {
    n: "01",
    t: "Anmäl intresse — kostnadsfritt",
    b: "Fyll i intresseanmälan så står du på vår lista. Ingen avgift och inget åtagande i det här steget.",
  },
  {
    n: "02",
    t: "Personlig genomgång & platsbesked",
    b: "När Saudiarabien släppt kvoten kontaktar vi dig, går igenom paket och pris och bekräftar att det finns plats för dig och ditt sällskap.",
  },
  {
    n: "03",
    t: "Registrering + administrationsavgift 2 500 kr",
    b: "Du registrerar alla resenärer digitalt — samma enkla flöde som våra Umrah-bokningar: kontaktuppgifter, rumsval och resenärsuppgifter. Registreringen bekräftas med en administrationsavgift på 2 500 kr per person (dras av från slutpriset).",
  },
  {
    n: "04",
    t: "Pass, dokument & visum",
    b: "Vi granskar pass (måste gälla minst 6 månader efter hemresa) och sköter hela visumprocessen via Nusuk och vår saudiska partner.",
  },
  {
    n: "05",
    t: "Slutbetalning enligt betalplan",
    b: "Resterande belopp betalas enligt en betalplan vi går igenom tillsammans — delbetalning är möjlig. Allt ska vara reglerat före avresa.",
  },
  {
    n: "06",
    t: "Förresemöte & avresa",
    b: "Obligatoriskt förresemöte med ritualgenomgång, packlista och praktisk information. Sedan avresa med svensk reseledare som följer gruppen hela vägen.",
  },
];

export default async function HajjPage() {
  const packages = await prisma.package
    .findMany({
      where: { type: "HAJJ", status: "PUBLISHED" },
      include: { tiers: { orderBy: { pricePerPerson: "asc" } } },
      orderBy: { startDate: "asc" },
    })
    .catch(() => []);

  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : null);

  return (
    <>
      <section style={{ padding: "80px 0 56px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="eyebrow gold">Hajj · begränsade platser enligt kvot</span>
          <h1 style={{ marginTop: 18, marginBottom: 24, maxWidth: 880 }}>
            Hajj med svensk reseledare — <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>från anmälan till Arafat</em>.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720, lineHeight: 1.6 }}>
            Vi arrangerar Hajj genom ett etablerat partneravtal med en saudisk
            arrangör ackrediterad av Ministry of Hajj. Platserna är begränsade
            och fördelas enligt Saudiarabiens kvotsystem — anmäl dig tidigt.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <span className="tag gold">Administrationsavgift 2 500 kr</span>
            <span className="tag">Visum + flyg + hotell</span>
            <span className="tag">Svensk reseledare</span>
            <span className="tag">Religiös vägledning</span>
            <span className="tag">Delbetalning möjlig</span>
          </div>
        </div>
      </section>

      {/* Öppna paket — bokas i samma digitala flöde som Umrah */}
      <section className="section-pad" style={{ borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="section-mark">— 01 / Öppna Hajj-paket</span>
          <h2 style={{ marginTop: 14, marginBottom: 24 }}>
            {packages.length > 0 ? "Registrera dig på ett öppet paket." : "Inga öppna paket just nu."}
          </h2>

          {packages.length > 0 ? (
            <div className="hajj-pkgs">
              {packages.map((p) => {
                const from = primaryDisplayPrice(p.tiers);
                return (
                  <article key={p.id} className="hajj-pkg">
                    <div>
                      <h3 style={{ fontSize: 22, marginBottom: 8 }}>{p.title}</h3>
                      <p className="dim" style={{ fontSize: 13, margin: 0 }}>
                        {[
                          fmtDate(p.startDate),
                          p.durationDays ? `${p.durationDays} dagar` : null,
                          p.departCities.length > 0 ? `från ${p.departCities.join("/")}` : null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="hajj-pkg-cta">
                      {from > 0 && (
                        <div style={{ textAlign: "right" }}>
                          <span className="dim" style={{ fontSize: 11, display: "block" }}>Pris från</span>
                          <strong className="serif tnum" style={{ fontSize: 20 }}>{from.toLocaleString("sv-SE")} kr</strong>
                        </div>
                      )}
                      <Link href={`/paket/${p.slug}`} className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
                        Se paket &amp; registrera →
                      </Link>
                    </div>
                  </article>
                );
              })}
              <p className="dim" style={{ fontSize: 13, marginTop: 4 }}>
                Registreringen sker digitalt i samma flöde som våra Umrah-resor och
                bekräftas med administrationsavgiften på 2 500 kr per person.
              </p>
            </div>
          ) : (
            <div style={{ padding: "24px 28px", background: "var(--c-cream)", borderLeft: "3px solid var(--c-gold)", maxWidth: 720 }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>
                Nästa Hajj-säsongs paket öppnar så snart Saudiarabien meddelat
                kvot och priser. <strong>Anmäl ditt intresse</strong> i formuläret
                nedan — de på listan får förtur när registreringen öppnar.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="section-pad">
        <div className="container split-main-aside">
          <div>
            <span className="section-mark">— 02 / Så går anmälan till</span>
            <h2 style={{ marginTop: 14, marginBottom: 24 }}>Sex steg, inga överraskningar.</h2>

            <ol className="hajj-steps">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="num">{s.n}</span>
                  <div>
                    <h3 style={{ fontSize: 19, marginBottom: 6 }}>{s.t}</h3>
                    <p className="dim" style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.b}</p>
                  </div>
                </li>
              ))}
            </ol>

            <span className="section-mark" style={{ display: "block", marginTop: 48 }}>— 03 / Vad ingår</span>
            <h2 style={{ marginTop: 14, marginBottom: 24 }}>Hela resan, från Sverige till hemkomst.</h2>

            <ul className="incl">
              {[
                "Saudiskt Hajj-visum via partneravtal (Nusuk)",
                "Direktflyg från Stockholm/Göteborg till Jeddah",
                "Hotell i Mecka nära Haram",
                "Hotell i Medina nära Nabawi",
                "Tält i Mina och Arafat enligt Nusuk-standard",
                "Buss-transfers mellan alla platser",
                "Måltider efter program",
                "Svensk reseledare och religiös guide",
                "Daglig vägledning i ritualernas utförande",
                "24/7 akutkontakt under hela resan",
                "Obligatoriskt förresemöte med ritualgenomgång",
                "Kvitto, intyg och resedokumentation efter hemkomst",
              ].map((it) => (
                <li key={it}><span className="check">✓</span> {it}</li>
              ))}
            </ul>

            <span className="section-mark" style={{ display: "block", marginTop: 48 }}>— 04 / Krav &amp; bra att veta</span>
            <h2 style={{ marginTop: 14, marginBottom: 24 }}>Det här behöver du ha koll på.</h2>
            <ul className="incl">
              {[
                "Passet måste vara giltigt minst 6 månader efter hemresedatumet",
                "Vaccinationer enligt Saudiarabiens aktuella inresekrav",
                "Administrationsavgiften (2 500 kr/person) dras av från slutpriset",
                "Slutpriset fastställs när Saudiarabien satt årets kvotpriser",
                "Delbetalning enligt överenskommen betalplan — allt reglerat före avresa",
                "Avbokningsvillkor enligt våra resevillkor och Kammarkollegiets resegaranti",
              ].map((it) => (
                <li key={it}><span className="check">✓</span> {it}</li>
              ))}
            </ul>
          </div>

          <aside>
            <LeadQuoteForm />
          </aside>
        </div>
      </section>

      <style>{`
        .hajj-pkgs { display: grid; gap: 10px; max-width: 860px; }
        .hajj-pkg {
          display: flex; justify-content: space-between; align-items: center; gap: 20px;
          padding: 20px 24px; background: #fff; border: 1px solid var(--c-line);
        }
        .hajj-pkg-cta { display: flex; align-items: center; gap: 18px; }
        .hajj-steps { list-style: none; padding: 0; margin: 0; display: grid; gap: 22px; }
        .hajj-steps li { display: grid; grid-template-columns: 48px 1fr; gap: 16px; align-items: start; }
        .hajj-steps .num {
          font-family: var(--f-mono); font-size: 13px; color: var(--c-gold);
          border: 1px solid var(--c-gold-soft); width: 40px; height: 40px;
          display: grid; place-items: center; letter-spacing: 0.08em;
        }
        .incl { list-style: none; padding: 0; display: grid; gap: 12px; }
        .incl li { display: grid; grid-template-columns: 24px 1fr; gap: 10px; font-size: 15px; line-height: 1.5; }
        .incl .check { color: var(--c-gold); font-weight: 700; }

        @media (max-width: 640px) {
          .hajj-pkg { flex-direction: column; align-items: stretch; }
          .hajj-pkg-cta { justify-content: space-between; }
        }
      `}</style>
    </>
  );
}
