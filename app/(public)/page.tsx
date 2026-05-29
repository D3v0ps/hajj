import Link from "next/link";
import { prisma } from "@/lib/db";
import { LeadQuoteForm } from "@/components/site/LeadQuoteForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hadj Omra Resor — Hajj & Omra från Sverige sedan 1985",
  description:
    "Sveriges äldsta arrangör av Hajj och Omra. Resegaranti hos Kammarkollegiet, svensk reseledare, Swish och Klarna. Boka tryggt från Stockholm.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hadj Omra Resor — Hajj & Omra från Sverige sedan 1985",
    description:
      "Sveriges äldsta arrangör av Hajj och Omra. Resegaranti hos Kammarkollegiet, svensk reseledare, Swish och Klarna.",
    type: "website",
    locale: "sv_SE",
  },
};

export default async function HomePage() {
  const featured = await prisma.package
    .findMany({
      where: { status: "PUBLISHED" },
      orderBy: { startDate: "asc" },
      take: 3,
      include: { tiers: { orderBy: { pricePerPerson: "asc" } } },
    })
    .catch(() => []);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="hero-eyebrow">
                <span className="line" />
                <span className="eyebrow gold">Hajj · Omra · Hadj Badal</span>
              </div>
              <h1>
                Vallfärden börjar med <em>förtroende</em> — sedan 1985.
              </h1>
              <p className="hero-lede">
                Sveriges äldsta arrangör av Hajj och Omra. Resegaranti hos
                Kammarkollegiet, svensk service från start till hemkomst, och
                den lokala kunskap som bara fyrtio års erfarenhet ger.
              </p>
              <div className="hero-cta-row">
                <Link href="/omra" className="btn btn-primary">
                  Se Omra-paket →
                </Link>
                <Link href="/hajj-2027" className="btn btn-gold">
                  Hajj 2027 — anmäl intresse
                </Link>
              </div>

              <div className="hero-jumpers">
                <Link href="/omra">
                  <span className="num">02 · OMRA</span>
                  <span className="label">Året runt</span>
                  <span className="desc">Påsk, sommar, vinter</span>
                </Link>
                <Link href="/hajj-2027">
                  <span className="num">03 · HAJJ 2027</span>
                  <span className="label">Begränsade platser</span>
                  <span className="desc">Anmäl intresse</span>
                </Link>
                <Link href="/hadj-badal">
                  <span className="num">04 · BADAL</span>
                  <span className="label">Hajj i annans namn</span>
                  <span className="desc">Bokningsbar tjänst</span>
                </Link>
                <Link href="/visum">
                  <span className="num">05 · VISUM</span>
                  <span className="label">Visumservice</span>
                  <span className="desc">Med dokumentstöd</span>
                </Link>
              </div>
            </div>

            <aside className="quote-card-wrap">
              <LeadQuoteForm />
            </aside>
          </div>
        </div>

        <div className="container">
          <div className="trust-bar">
            <div className="ti">
              <div className="v">40+ år</div>
              <div className="l">Erfarenhet</div>
            </div>
            <div className="ti">
              <div className="v">Kammarkollegiet</div>
              <div className="l">Resegaranti</div>
            </div>
            <div className="ti">
              <div className="v">Stockholm · Göteborg</div>
              <div className="l">Svenska kontor</div>
            </div>
            <div className="ti">
              <div className="v">Swish · Klarna</div>
              <div className="l">Svensk betalkultur</div>
            </div>
            <div className="ti">
              <div className="v">SV · EN · AR</div>
              <div className="l">Språk</div>
            </div>
          </div>
        </div>
      </section>

      {/* AKTUELLA PAKET */}
      <section style={{ padding: "96px 0" }}>
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-mark">— 01 / Aktuella paket</span>
              <h2 style={{ marginTop: 14, fontWeight: 380 }}>
                Boka <em>direkt</em>, eller fråga om offert.
              </h2>
            </div>
            <p className="rhs">
              Alla våra paket inkluderar visum, hotell, flyg, busstransport,
              guide och seminarier. Filtrera på datum, hotellstandard och
              rumstyp på respektive sida.
            </p>
          </div>

          <div className="featured-grid">
            {featured.length === 0 ? (
              <div className="featured-empty">
                <p>
                  Paket fylls i av kontoret via admin. När de publiceras visas
                  de här. Tills dess — kontakta oss för en personlig offert.
                </p>
              </div>
            ) : (
              featured.map((pkg) => {
                const fromPrice = pkg.tiers[0]?.pricePerPerson ?? 0;
                return (
                  <article key={pkg.id} className="pkg-card">
                    <div className="pkg-card-img" />
                    <div className="pkg-card-body">
                      <span className="tag gold">{pkg.type}</span>
                      <h3 style={{ marginTop: 12 }}>{pkg.title}</h3>
                      {pkg.subtitle && <p className="dim" style={{ fontSize: 14 }}>{pkg.subtitle}</p>}
                      {pkg.startDate && (
                        <p className="meta">
                          {new Date(pkg.startDate).toLocaleDateString("sv-SE")} —{" "}
                          {pkg.endDate
                            ? new Date(pkg.endDate).toLocaleDateString("sv-SE")
                            : "ej fastställt"}
                        </p>
                      )}
                      <div className="pkg-price">
                        <span className="dim" style={{ fontSize: 12 }}>Från</span>
                        <span className="serif tnum" style={{ fontSize: 28, color: "var(--c-ink)" }}>
                          {fromPrice.toLocaleString("sv-SE")} kr
                        </span>
                        <span className="dim" style={{ fontSize: 12 }}>per person</span>
                      </div>
                      <Link href={`/paket/${pkg.slug}`} className="btn-link">
                        Visa paket →
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* FÖRTROENDE / WHY US */}
      <section style={{ background: "var(--c-cream)", padding: "96px 0" }}>
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-mark">— 02 / Förtroende</span>
              <h2 style={{ marginTop: 14, fontWeight: 380 }}>
                Det vi har vunnit på <em>fyrtio år</em> går inte att kopiera.
              </h2>
            </div>
            <p className="rhs">
              Religiös förankring, personlig service och en svensk närvaro vid
              varje steg. Inte en internationell aktör med callcenter — en
              svensk resebyrå du kan besöka i Stockholm.
            </p>
          </div>

          <div className="why-grid">
            {[
              { n: "01", t: "Resegaranti hos Kammarkollegiet", b: "Säkrad inbetalning, utbetalas tillbaka om vi som arrangör inte kan uppfylla resan. Verifierbart hos myndigheten." },
              { n: "02", t: "Svenska kontor och kontaktvägar", b: "Stockholms moské på Kapellgränd, Göteborg efter bokning. Telefon, e-post och kontaktblanketter — på svenska, av svensktalande." },
              { n: "03", t: "Reseledare på plats", b: "Erfarna ledare som följer gruppen genom hela resan. Rituella förklaringar, gruppöversyn, akut-stöd dygnet runt under resan." },
              { n: "04", t: "Svensk betalmiljö", b: "Swish, Klarna och kort i en trygg svensk betalmiljö enligt GDPR. Inga internationella betalningsmellanhänder för dig som kund." },
              { n: "05", t: "Religiös förankring", b: "Vi följer Saudiarabiens officiella process via Nusuk och respekterar resans andliga karaktär i varje moment." },
              { n: "06", t: "Tusentals pilgrimer", b: "Fyrtio år av Hajj och Omra-arrangemang. Vi vet vad som fungerar — och vad som inte gör det." },
            ].map((it) => (
              <article key={it.n} className="why-card">
                <span className="section-mark">{it.n}</span>
                <h3 style={{ marginTop: 12, marginBottom: 10 }}>{it.t}</h3>
                <p className="dim" style={{ fontSize: 14, lineHeight: 1.6 }}>{it.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section style={{ padding: "96px 0" }}>
        <div className="container narrow">
          <div className="section-head" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <span className="section-mark">— 03 / Så funkar det</span>
              <h2 style={{ marginTop: 14, fontWeight: 380 }}>
                Femstegsprocess från <em>intresse till hemkomst</em>.
              </h2>
            </div>
          </div>

          <ol className="process">
            {[
              { t: "Begär offert eller välj paket", b: "Använd vårt offertformulär för en skräddarsydd offert, eller boka direkt ett av våra publicerade paket. Du får svar inom 24 timmar." },
              { t: "Skapa konto och fyll i ansökan", b: "Skapa ett konto med e-post. Lägg till resenärer, ladda upp pass via kamera, och ange eventuella särskilda behov." },
              { t: "Ladda upp dokument", b: "Pass, passfoto, eventuellt uppehållstillstånd. Vi granskar och återkommer om något behöver kompletteras." },
              { t: "Granska och betala anmälningsavgift", b: "5 000 kr per person bekräftar din plats. Slutbetalning 30 dagar före avresa, via Swish, Klarna, kort eller bankgiro." },
              { t: "Resa, ritualer, hemkomst", b: "Reseledare följer gruppen, dagligt program, akutkontakt dygnet runt. Efter hemkomst: kvitto, intyg, möjlighet att lämna omdöme." },
            ].map((s, i) => (
              <li key={i}>
                <div className="num">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <h3 style={{ fontSize: 22, marginBottom: 6 }}>{s.t}</h3>
                  <p className="dim" style={{ fontSize: 15, lineHeight: 1.6 }}>{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <style>{`
        .hero { padding: 64px 0 0; }
        .hero-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 56px;
          align-items: end;
          padding-bottom: 56px;
        }
        .hero-eyebrow { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
        .hero-eyebrow .line { width: 56px; height: 1px; background: var(--c-gold); }
        .hero h1 { font-weight: 360; margin-bottom: 28px; }
        .hero h1 em { font-style: italic; font-weight: 380; color: var(--c-gold); }
        .hero-lede { font-size: 20px; color: var(--c-text-muted); max-width: 540px; margin-bottom: 36px; line-height: 1.5; }
        .hero-cta-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 48px; }
        .hero-cta-row .btn { flex: 1 1 auto; min-width: 200px; justify-content: center; }
        .hero-jumpers {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-top: 1px solid var(--c-line);
          margin-top: 8px;
        }
        .hero-jumpers a {
          padding: 22px 18px 22px 0;
          border-right: 1px solid var(--c-line);
          display: block;
          transition: background 160ms, padding 160ms;
        }
        .hero-jumpers a:last-child { border-right: 0; padding-right: 0; }
        .hero-jumpers a:hover { background: var(--c-cream); padding-left: 12px; padding-right: 8px; }
        .hero-jumpers .num { font-family: var(--f-mono); font-size: 11px; color: var(--c-gold); letter-spacing: 0.14em; display: block; margin-bottom: 6px; }
        .hero-jumpers .label { font-family: var(--f-serif); font-size: 18px; color: var(--c-ink); font-weight: 460; display: block; }
        .hero-jumpers .desc { font-size: 12px; color: var(--c-text-muted); margin-top: 4px; display: block; }

        .featured-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .featured-empty {
          padding: 48px;
          background: var(--c-cream);
          border: 1px dashed var(--c-line);
          color: var(--c-text-muted);
          text-align: center;
          grid-column: 1 / -1;
        }
        .pkg-card { background: #fff; border: 1px solid var(--c-line-soft); display: flex; flex-direction: column; transition: all 200ms; }
        .pkg-card:hover { border-color: var(--c-ink); transform: translateY(-2px); }
        .pkg-card-img { height: 180px; background: var(--c-cream); border-bottom: 1px solid var(--c-line-soft); }
        .pkg-card-body { padding: 26px; display: flex; flex-direction: column; gap: 12px; }
        .pkg-price { display: flex; align-items: baseline; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

        .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .why-card { background: var(--c-paper); padding: 32px; border: 1px solid var(--c-line); }

        .process { list-style: none; padding: 0; counter-reset: step; display: flex; flex-direction: column; gap: 28px; }
        .process li { display: grid; grid-template-columns: 80px 1fr; gap: 24px; padding: 24px 0; border-top: 1px solid var(--c-line); }
        .process li:last-child { border-bottom: 1px solid var(--c-line); }
        .process .num { font-family: var(--f-mono); font-size: 14px; color: var(--c-gold); letter-spacing: 0.16em; padding-top: 4px; }

        @media (max-width: 1024px) {
          .featured-grid { grid-template-columns: 1fr 1fr; }
          .why-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr; gap: 40px; padding-bottom: 40px; }
          .hero-jumpers { grid-template-columns: 1fr 1fr; }
          .hero-jumpers a {
            padding: 18px 14px 18px 0;
            border-bottom: 1px solid var(--c-line);
          }
          .hero-jumpers a:nth-child(2n) { border-right: 0; padding-right: 0; }
          .hero-jumpers a:nth-last-child(-n+2) { border-bottom: 0; }
        }
        @media (max-width: 640px) {
          .hero { padding: 32px 0 0; }
          .hero-grid { gap: 32px; }
          .hero-lede { font-size: 17px; margin-bottom: 28px; }
          .hero-cta-row { gap: 10px; margin-bottom: 36px; }
          .hero-cta-row .btn { width: 100%; }
          .hero-jumpers { grid-template-columns: 1fr; }
          .hero-jumpers a {
            padding: 16px 0;
            border-right: 0;
            border-bottom: 1px solid var(--c-line);
          }
          .hero-jumpers a:last-child { border-bottom: 0; }
          .hero-jumpers a:hover { padding-left: 8px; padding-right: 0; }
          .featured-grid, .why-grid { grid-template-columns: 1fr; gap: 16px; }
          .featured-empty { padding: 28px 20px; }
          .pkg-card-body { padding: 20px; }
          .why-card { padding: 22px; }
          .process li { grid-template-columns: 60px 1fr; gap: 14px; padding: 20px 0; }
        }
      `}</style>
    </>
  );
}
