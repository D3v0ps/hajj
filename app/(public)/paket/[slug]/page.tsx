import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { createBooking } from "@/app/actions/bookings";
import type { Metadata } from "next";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await prisma.package.findUnique({ where: { slug } }).catch(() => null);
  if (!pkg) return { title: "Paket hittas ej" };
  return {
    title: pkg.title,
    description: pkg.summary ?? `${pkg.type}-paket arrangerat av Hadj Omra Resor.`,
  };
}

export const dynamic = "force-dynamic";

export default async function PackageDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const pkg = await prisma.package
    .findUnique({
      where: { slug },
      include: { tiers: { orderBy: { pricePerPerson: "asc" } } },
    })
    .catch(() => null);

  if (!pkg) notFound();

  // Visa fyrbäddspriset (vuxen) överst — inte det billigaste barn-/spädbarnspriset.
  const adultQuad = pkg.tiers
    .filter((t) => t.ageCategory === "ADULT" && t.roomType === "QUAD")
    .sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0];
  const adultCheapest = pkg.tiers
    .filter((t) => t.ageCategory === "ADULT")
    .sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0];
  const fromTier = adultQuad ?? adultCheapest ?? pkg.tiers[0];
  const fromPrice = fromTier?.pricePerPerson ?? 0;
  const fromLabel = adultQuad ? "Fyrbädd, pris från" : "Pris från";
  const departCities = pkg.departCities.length > 0 ? pkg.departCities : pkg.departCity ? [pkg.departCity] : [];
  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("sv-SE") : "—");

  // ── Strukturerad data ────────────────────────────────────────────────
  // Lägsta pris bland alla tiers → Offer.price. Vi använder Math.min så vi
  // täcker även fall där den enda tiern är barn/spädbarn.
  const lowestPrice =
    pkg.tiers.length > 0
      ? Math.min(...pkg.tiers.map((t) => t.pricePerPerson))
      : 0;
  // ISO-datum (YYYY-MM-DD) för Offer.validFrom — schema.org godtar Date eller DateTime.
  const validFromIso = pkg.startDate
    ? new Date(pkg.startDate).toISOString().slice(0, 10)
    : undefined;
  // PUBLISHED → InStock, övrigt (DRAFT/ARCHIVED) → PreOrder så Google inte indexerar dem som direkt köpbara.
  const availability =
    pkg.status === "PUBLISHED"
      ? "https://schema.org/InStock"
      : "https://schema.org/PreOrder";
  const baseUrl = process.env.APP_URL ?? "https://hajj.karimkhalil.se";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pkg.title,
    description:
      pkg.description ??
      pkg.summary ??
      `${pkg.type}-paket arrangerat av Hadj Omra Resor.`,
    brand: { "@type": "Brand", name: "Hadj Omra Resor" },
    category: pkg.type,
    url: `${baseUrl}/paket/${pkg.slug}`,
    offers: {
      "@type": "Offer",
      price: lowestPrice,
      priceCurrency: "SEK",
      availability,
      url: `${baseUrl}/paket/${pkg.slug}`,
      ...(validFromIso ? { validFrom: validFromIso } : {}),
    },
  };

  // BreadcrumbList: Hem → typkategori → paket
  const categoryLabel =
    pkg.type === "OMRA"
      ? "Omra"
      : pkg.type === "HAJJ"
        ? "Hajj"
        : pkg.type === "HADJ_BADAL"
          ? "Hadj Badal"
          : "Visum";
  const categorySlug =
    pkg.type === "OMRA"
      ? "omra"
      : pkg.type === "HAJJ"
        ? "hajj-2027"
        : pkg.type === "HADJ_BADAL"
          ? "hadj-badal"
          : "visum";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Hem",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryLabel,
        item: `${baseUrl}/${categorySlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: pkg.title,
        item: `${baseUrl}/paket/${pkg.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section style={{ padding: "64px 0 32px", borderBottom: "1px solid var(--c-line)" }}>
        <div className="container">
          <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
            <Link href={`/${pkg.type === "OMRA" ? "omra" : pkg.type === "HAJJ" ? "hajj-2027" : pkg.type === "HADJ_BADAL" ? "hadj-badal" : "visum"}`} className="dim" style={{ fontSize: 13 }}>
              ← Tillbaka
            </Link>
            <span className="tag gold">{pkg.type}</span>
          </div>

          <h1 style={{ marginBottom: 12, maxWidth: 900 }}>{pkg.title}</h1>
          {pkg.subtitle && <p style={{ fontSize: 18, color: "var(--c-text-muted)", maxWidth: 720 }}>{pkg.subtitle}</p>}
        </div>
      </section>

      <section style={{ padding: "48px 0" }}>
        <div className="container paket-grid">
          <div>
            <div className="pkg-hero-img" />

            <h2 style={{ fontSize: 28, marginTop: 40, marginBottom: 16 }}>Beskrivning</h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--c-text)" }}>
              {pkg.description ?? pkg.summary ?? "Beskrivning fylls i av kontoret via admin."}
            </p>

            {pkg.inclusions.length > 0 && (
              <>
                <h2 style={{ fontSize: 28, marginTop: 48, marginBottom: 16 }}>Vad ingår</h2>
                <ul className="checklist">
                  {pkg.inclusions.map((it: string, i: number) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </>
            )}

            {pkg.excludeNotes.length > 0 && (
              <>
                <h2 style={{ fontSize: 28, marginTop: 48, marginBottom: 16 }}>Tillkommer</h2>
                <ul className="checklist excl">
                  {pkg.excludeNotes.map((it: string, i: number) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </>
            )}

            <h2 style={{ fontSize: 28, marginTop: 48, marginBottom: 16 }}>Hotell &amp; logi</h2>
            <div className="hotels">
              {pkg.hotelMakkah && (
                <div>
                  <span className="eyebrow">Mecka</span>
                  <p className="serif" style={{ fontSize: 18, margin: "4px 0" }}>{pkg.hotelMakkah}</p>
                  {pkg.distHaramM && <p className="dim" style={{ fontSize: 13 }}>{pkg.distHaramM} m till Haram</p>}
                </div>
              )}
              {pkg.hotelMadinah && (
                <div>
                  <span className="eyebrow">Medina</span>
                  <p className="serif" style={{ fontSize: 18, margin: "4px 0" }}>{pkg.hotelMadinah}</p>
                  {pkg.distNabawiM && <p className="dim" style={{ fontSize: 13 }}>{pkg.distNabawiM} m till Nabawi</p>}
                </div>
              )}
            </div>
          </div>

          <aside>
            <div className="book-card">
              <span className="eyebrow gold">Boka direkt</span>

              <div style={{ marginTop: 14 }}>
                <span className="dim" style={{ fontSize: 12 }}>{fromLabel}</span>
                <div className="serif tnum" style={{ fontSize: 36, color: "var(--c-ink)", lineHeight: 1 }}>
                  {fromPrice.toLocaleString("sv-SE")} kr
                </div>
                <span className="dim" style={{ fontSize: 12 }}>per person</span>
              </div>

              <hr className="rule" style={{ margin: "20px 0" }} />

              <dl className="kv">
                {pkg.startDate && (
                  <>
                    <dt>Avresa</dt>
                    <dd>{fmtDate(pkg.startDate)}</dd>
                  </>
                )}
                {pkg.endDate && (
                  <>
                    <dt>Hemkomst</dt>
                    <dd>{fmtDate(pkg.endDate)}</dd>
                  </>
                )}
                {pkg.durationDays && (
                  <>
                    <dt>Dagar</dt>
                    <dd>{pkg.durationDays}</dd>
                  </>
                )}
                {pkg.nightsMakkah != null && (
                  <>
                    <dt>Nätter Makkah</dt>
                    <dd>{pkg.nightsMakkah}</dd>
                  </>
                )}
                {pkg.nightsMadinah != null && (
                  <>
                    <dt>Nätter Madinah</dt>
                    <dd>{pkg.nightsMadinah}</dd>
                  </>
                )}
                {departCities.length > 0 && (
                  <>
                    <dt>Avreseort{departCities.length > 1 ? "er" : ""}</dt>
                    <dd>{departCities.join(", ")}</dd>
                  </>
                )}
              </dl>

              {pkg.tiers.length > 0 && (() => {
                const adults = pkg.tiers.filter((t) => t.ageCategory === "ADULT");
                const children = pkg.tiers.filter((t) => t.ageCategory === "CHILD");
                const infants = pkg.tiers.filter((t) => t.ageCategory === "INFANT");
                return (
                  <>
                    <hr className="rule" style={{ margin: "20px 0" }} />
                    {adults.length > 0 && (
                      <>
                        <span className="eyebrow">Vuxen ({adults[0]?.ageMin}+ år)</span>
                        <ul className="tier-list">
                          {adults.map((t) => (
                            <li key={t.id}>
                              <span>{t.roomType === "QUAD" ? "4-bädd" : t.roomType === "TRIPLE" ? "3-bädd" : t.roomType === "DOUBLE" ? "2-bädd" : t.name}</span>
                              <strong className="tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</strong>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {children.length > 0 && (
                      <>
                        <span className="eyebrow" style={{ marginTop: 16, display: "block" }}>Barn ({children[0]?.ageMin}–{children[0]?.ageMax} år)</span>
                        <ul className="tier-list">
                          {children.map((t) => (
                            <li key={t.id}>
                              <span>{t.roomType === "QUAD" ? "4-bädd" : t.roomType === "TRIPLE" ? "3-bädd" : t.roomType === "DOUBLE" ? "2-bädd" : t.name}</span>
                              <strong className="tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</strong>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {infants.length > 0 && (
                      <>
                        <span className="eyebrow" style={{ marginTop: 16, display: "block" }}>Spädbarn ({infants[0]?.ageMin}–{infants[0]?.ageMax} år)</span>
                        <ul className="tier-list">
                          {infants.map((t) => (
                            <li key={t.id}>
                              <span>{t.name}</span>
                              <strong className="tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</strong>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                );
              })()}

              <form action={createBooking.bind(null, pkg.id)} style={{ marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  Påbörja bokning →
                </button>
              </form>

              <p className="dim" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5, textAlign: "center" }}>
                Resegaranti hos Kammarkollegiet · Avbeställning enligt resevillkor
              </p>
            </div>
          </aside>
        </div>
      </section>

      <style>{`
        .pkg-hero-img { height: 360px; background: var(--c-cream); border: 1px solid var(--c-line); }
        .checklist { list-style: none; padding: 0; display: grid; gap: 10px; }
        .checklist li { padding-left: 24px; position: relative; line-height: 1.6; }
        .checklist li:before { content: "✓"; position: absolute; left: 0; color: var(--c-gold); font-weight: 700; }
        .checklist.excl li:before { content: "−"; color: var(--c-warn); }
        .hotels { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px; background: var(--c-cream); }
        .book-card { background: #fff; border: 1px solid var(--c-line); padding: 28px; position: sticky; top: 100px; }
        .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin: 0; font-size: 14px; }
        .kv dt { color: var(--c-text-muted); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }
        .kv dd { margin: 0; color: var(--c-ink); font-family: var(--f-serif); }
        .tier-list { list-style: none; padding: 0; display: grid; gap: 8px; margin-top: 8px; }
        .tier-list li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--c-line-soft); font-size: 14px; }
        .tier-list strong { color: var(--c-ink); }
        .paket-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 56px; }
        @media (max-width: 980px) {
          .paket-grid { grid-template-columns: 1fr; gap: 32px; }
          .book-card { position: static; }
          .pkg-hero-img { height: 220px; }
        }
        @media (max-width: 640px) {
          .pkg-hero-img { height: 180px; }
          .book-card { padding: 22px; }
          .kv { grid-template-columns: 1fr; gap: 10px 0; }
          .hotels { grid-template-columns: 1fr; gap: 18px; padding: 18px; }
        }
      `}</style>
    </>
  );
}
