import Link from "next/link";
import { prisma } from "@/lib/db";
import { primaryDisplayPrice } from "@/lib/pricing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Omra-paket — året runt",
  description:
    "Omra med svensk reseledare. Påsk, sommar, vinter och utvalda helger. Inkluderar visum, flyg, hotell, busstransport och guide.",
};

export const dynamic = "force-dynamic";

export default async function OmraPage() {
  const packages = await prisma.package
    .findMany({
      where: { type: "OMRA", status: "PUBLISHED" },
      orderBy: { startDate: "asc" },
      include: { tiers: { orderBy: { pricePerPerson: "asc" } } },
    })
    .catch(() => []);

  return (
    <>
      <section style={{ padding: "80px 0 56px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <span className="eyebrow gold">Omra · året runt</span>
          <h1 style={{ marginTop: 18, marginBottom: 24, maxWidth: 880 }}>
            Omra-resor med <em style={{ color: "var(--c-gold)", fontStyle: "italic" }}>svensk reseledare</em> och full service.
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720, lineHeight: 1.6 }}>
            Vi arrangerar Omra-resor under påsk-, sommar- och vinterlovet samt
            utvalda helger. Alla paket inkluderar visum, flyg från Stockholm
            eller Göteborg, hotell i Mecka och Medina, busstransport, måltider
            efter program, samt erfaren reseledare och religiös vägledning.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <span className="tag gold">Visum ingår</span>
            <span className="tag">Flyg från Sverige</span>
            <span className="tag">Hotell nära Haram</span>
            <span className="tag">Reseledare på plats</span>
            <span className="tag">Religiös vägledning</span>
          </div>
        </div>
      </section>

      <section style={{ padding: "64px 0" }}>
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-mark">— 01 / Aktuella avgångar</span>
              <h2 style={{ marginTop: 14 }}>Välj datum, jämför paket.</h2>
            </div>
            <p className="rhs">
              Pris från-belopp visas per person i fyrbäddsrum. Tre- och
              tvåbäddsrum kostar mellan 1 000 och 4 000 kr extra per person.
            </p>
          </div>

          {packages.length === 0 ? (
            <div className="empty">
              <p style={{ fontSize: 18 }}>
                Inga paket är publicerade ännu. Kontoret lägger upp dem via
                administrationen — de visas här så snart de är klara.
              </p>
              <p className="dim" style={{ marginTop: 12 }}>
                Vill du ändå höra om kommande resor? <Link href="/#offert" className="btn-link">Skicka en förfrågan</Link>
              </p>
            </div>
          ) : (
            <div className="pkg-list">
              {packages.map((pkg) => {
                const fromPrice = primaryDisplayPrice(pkg.tiers);
                return (
                  <Link key={pkg.id} href={`/paket/${pkg.slug}`} className="pkg-row">
                    <div className="pkg-row-img" />
                    <div className="pkg-row-body">
                      <span className="tag gold" style={{ alignSelf: "flex-start" }}>{pkg.type}</span>
                      <h3 style={{ marginTop: 12, marginBottom: 8 }}>{pkg.title}</h3>
                      {pkg.subtitle && <p className="dim" style={{ fontSize: 15 }}>{pkg.subtitle}</p>}
                      <div className="pkg-row-meta">
                        {pkg.startDate && (
                          <span>
                            {new Date(pkg.startDate).toLocaleDateString("sv-SE")} —{" "}
                            {pkg.endDate ? new Date(pkg.endDate).toLocaleDateString("sv-SE") : "ej fastställt"}
                          </span>
                        )}
                        {pkg.durationDays && <span>{pkg.durationDays} dagar</span>}
                        {pkg.departCity && <span>Avgång: {pkg.departCity}</span>}
                        {pkg.hotelMakkah && <span>Mecka: {pkg.hotelMakkah}</span>}
                      </div>
                    </div>
                    <div className="pkg-row-price">
                      <span className="dim" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}>Från</span>
                      <span className="serif tnum" style={{ fontSize: 28, color: "var(--c-ink)" }}>
                        {fromPrice.toLocaleString("sv-SE")} kr
                      </span>
                      <span className="dim" style={{ fontSize: 12 }}>per person</span>
                      <span className="btn-link" style={{ marginTop: 14 }}>Visa paket →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <style>{`
        .pkg-list { display: flex; flex-direction: column; gap: 16px; }
        .pkg-row {
          display: grid;
          grid-template-columns: 220px 1fr 220px;
          background: #fff;
          border: 1px solid var(--c-line-soft);
          transition: all 200ms;
        }
        .pkg-row:hover { border-color: var(--c-ink); }
        .pkg-row-img { background: var(--c-cream); min-height: 100%; }
        .pkg-row-body { padding: 28px; display: flex; flex-direction: column; }
        .pkg-row-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 16px; font-size: 13px; color: var(--c-text-muted); }
        .pkg-row-meta span { padding-right: 16px; border-right: 1px solid var(--c-line); }
        .pkg-row-meta span:last-child { border-right: 0; }
        .pkg-row-price {
          padding: 28px;
          border-left: 1px solid var(--c-line-soft);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: 4px;
          background: var(--c-paper);
        }
        .empty { background: var(--c-cream); border: 1px dashed var(--c-line); padding: 48px; text-align: center; }
        @media (max-width: 980px) {
          .pkg-row { grid-template-columns: 1fr; }
          .pkg-row-img { height: 160px; min-height: 160px; }
          .pkg-row-price { border-left: 0; border-top: 1px solid var(--c-line-soft); }
        }
        @media (max-width: 640px) {
          .pkg-row-body, .pkg-row-price { padding: 20px; }
          .pkg-row-meta span { border-right: 0; padding-right: 0; }
          .empty { padding: 32px 20px; }
        }
      `}</style>
    </>
  );
}
