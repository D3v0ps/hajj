import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om oss",
  description:
    "Hadj Omra Resor — Sveriges äldsta arrangör av Hajj och Omra med över 40 års erfarenhet, baserad i Stockholms moské.",
};

export default function OmOssPage() {
  return (
    <>
      <section style={{ padding: "80px 0 56px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="eyebrow gold">Om oss</span>
          <h1 style={{ marginTop: 18, marginBottom: 24, maxWidth: 880 }}>
            Sedan 1985, från <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>Stockholms moské</em>.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720, lineHeight: 1.6 }}>
            Hadj Omra Resor är Sveriges äldsta arrangör av Hajj och Omra. Från
            kontoret på Kapellgränd i Stockholm har vi hjälpt tusentals svenska
            pilgrimer i över fyra decennier — med personlig service, religiös
            förankring och resegaranti hos Kammarkollegiet.
          </p>
        </div>
      </section>

      <section style={{ padding: "80px 0" }}>
        <div className="container narrow">
          <div className="om-grid">
            <div>
              <span className="section-mark">— Vår historia</span>
              <h2 style={{ marginTop: 14, marginBottom: 16, fontSize: 32 }}>Fyrtio år av vallfärd från Sverige</h2>
              <p>
                Det började 1985 med en handfull resenärer per år. Idag arrangerar
                vi flera Omra-grupper varje säsong och en Hajj-grupp varje år.
                Vi har sett pilgrimer återvända som sina egnas föräldrar, sett
                generationer åka tillsammans, och vi har lärt oss varje detalj
                som gör en resa lättare för en svensk muslim.
              </p>
              <p>
                Vår kontorsplats i Stockholms moské är inte en slump — vi är
                rotade i den svensk-muslimska gemenskapen och tar ansvaret att
                representera den seriöst.
              </p>
            </div>

            <div>
              <span className="section-mark">— Vad vi står för</span>
              <h2 style={{ marginTop: 14, marginBottom: 16, fontSize: 32 }}>Värderingar som inte ändras</h2>

              <div className="vals">
                <div>
                  <strong>Trygghet före allt.</strong>
                  <p className="dim">Resegaranti, transparenta villkor, säker inbetalning och svensk lag.</p>
                </div>
                <div>
                  <strong>Religiös integritet.</strong>
                  <p className="dim">Vi följer den officiella saudiska processen och respekterar resans andliga karaktär i varje moment.</p>
                </div>
                <div>
                  <strong>Personlig service.</strong>
                  <p className="dim">Du får en namngiven kontaktperson från första samtalet. Inga callcenter, inga skript.</p>
                </div>
                <div>
                  <strong>Svensk närvaro.</strong>
                  <p className="dim">Vi finns på plats i Stockholm och Göteborg — och vi är på plats med dig under hela resan.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "80px 0", background: "var(--c-cream)" }}>
        <div className="container">
          <div className="trust-bar" style={{ background: "#fff", border: "1px solid var(--c-line)" }}>
            <div className="ti">
              <div className="v">1985</div>
              <div className="l">Grundades</div>
            </div>
            <div className="ti">
              <div className="v">40+</div>
              <div className="l">År av Hajj/Omra</div>
            </div>
            <div className="ti">
              <div className="v">5 000+</div>
              <div className="l">Pilgrimer</div>
            </div>
            <div className="ti">
              <div className="v">2</div>
              <div className="l">Kontor i Sverige</div>
            </div>
            <div className="ti">
              <div className="v">Kammarkollegiet</div>
              <div className="l">Resegaranti</div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .om-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; }
        .om-grid p { font-size: 16px; line-height: 1.7; color: var(--c-text); margin-bottom: 16px; }
        .vals { display: grid; gap: 18px; margin-top: 16px; }
        .vals strong { display: block; font-family: var(--f-serif); font-size: 18px; margin-bottom: 4px; color: var(--c-ink); }
        .vals p { margin: 0; font-size: 14px; line-height: 1.55; }
        @media (max-width: 800px) { .om-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
