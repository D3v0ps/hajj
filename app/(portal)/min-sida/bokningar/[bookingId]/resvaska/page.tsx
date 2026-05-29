import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = Promise<{ bookingId: string }>;

type FlightJson = {
  airline?: string;
  flightNo?: string;
  from?: string;
  to?: string;
  departTime?: string; // ISO
  arriveTime?: string;
  terminal?: string;
  notes?: string;
};

type HotelJson = {
  city?: string; // "Mekka", "Medina"
  name?: string;
  rating?: number;
  address?: string;
  distHaram?: string;
  checkIn?: string;
  checkOut?: string;
  phone?: string;
  notes?: string;
};

type TransferJson = {
  type?: string;
  from?: string;
  to?: string;
  notes?: string;
};

type ItineraryDay = {
  date?: string;
  title?: string;
  description?: string;
  highlights?: string[];
};

const PORTAL_STATUSES_WITH_PACK = ["CONFIRMED", "PAID_DEPOSIT", "PAID_FULL", "COMPLETED"];

function fmtDateTime(s: string | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return s;
  }
}

function FlightCard({ label, flight }: { label: string; flight: FlightJson | null | undefined }) {
  if (!flight) {
    return (
      <div className="tp-card">
        <span className="tp-eyebrow">{label}</span>
        <p className="dim" style={{ fontSize: 14, marginTop: 8 }}>Information kommer närmare avresan.</p>
      </div>
    );
  }
  return (
    <div className="tp-card">
      <span className="tp-eyebrow">{label}</span>
      <div className="flight-head">
        <strong className="serif">{flight.airline ?? "—"}</strong>
        {flight.flightNo && <span className="flight-no">{flight.flightNo}</span>}
      </div>
      <div className="flight-grid">
        <div><span className="lbl">Från</span><span className="val">{flight.from ?? "—"}</span></div>
        <div><span className="lbl">Till</span><span className="val">{flight.to ?? "—"}</span></div>
        <div><span className="lbl">Avgång</span><span className="val">{fmtDateTime(flight.departTime)}</span></div>
        <div><span className="lbl">Ankomst</span><span className="val">{fmtDateTime(flight.arriveTime)}</span></div>
        {flight.terminal && <div><span className="lbl">Terminal</span><span className="val">{flight.terminal}</span></div>}
      </div>
      {flight.notes && <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>{flight.notes}</p>}
    </div>
  );
}

function HotelCard({ hotel }: { hotel: HotelJson }) {
  return (
    <div className="tp-card">
      <span className="tp-eyebrow">Hotell · {hotel.city ?? "—"}</span>
      <strong className="serif" style={{ fontSize: 19, display: "block", marginTop: 8 }}>{hotel.name ?? "—"}</strong>
      {typeof hotel.rating === "number" && (
        <p style={{ marginTop: 4, color: "var(--c-gold)", fontSize: 14 }}>
          {"★".repeat(Math.round(hotel.rating))}
          <span className="dim" style={{ marginLeft: 8 }}>{hotel.rating}/5</span>
        </p>
      )}
      <div className="flight-grid" style={{ marginTop: 12 }}>
        {hotel.address && <div><span className="lbl">Adress</span><span className="val">{hotel.address}</span></div>}
        {hotel.distHaram && <div><span className="lbl">Avstånd</span><span className="val">{hotel.distHaram}</span></div>}
        {hotel.checkIn && <div><span className="lbl">Incheckning</span><span className="val">{hotel.checkIn}</span></div>}
        {hotel.checkOut && <div><span className="lbl">Utcheckning</span><span className="val">{hotel.checkOut}</span></div>}
        {hotel.phone && <div><span className="lbl">Telefon</span><span className="val">{hotel.phone}</span></div>}
      </div>
      {hotel.notes && <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>{hotel.notes}</p>}
    </div>
  );
}

export default async function TravelPackPage({ params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  const { bookingId } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: true, tier: true, travelers: { orderBy: { createdAt: "asc" } } },
  });
  if (!booking || booking.userId !== session.user.id) notFound();

  if (!PORTAL_STATUSES_WITH_PACK.includes(booking.status)) {
    return (
      <div className="container narrow" style={{ padding: "32px 0 80px" }}>
        <Link href={`/min-sida/bokningar/${booking.id}`} className="dim" style={{ fontSize: 13 }}>← Tillbaka</Link>
        <h1 style={{ fontSize: 28, marginTop: 14 }}>Digital resväska</h1>
        <div className="tp-card" style={{ marginTop: 20 }}>
          <p className="dim">
            Den digitala resväskan öppnas när din bokning är bekräftad och anmälningsavgiften betald.
          </p>
        </div>
      </div>
    );
  }

  const pkg = booking.package;
  const flightOut = pkg.flightOutbound as FlightJson | null;
  const flightHome = pkg.flightReturn as FlightJson | null;
  const hotels = (pkg.hotels as HotelJson[] | null) ?? [];
  const transfers = (pkg.transfers as TransferJson[] | null) ?? [];
  const itinerary = (pkg.itinerary as ItineraryDay[] | null) ?? [];

  return (
    <div className="container" style={{ padding: "32px 0 80px" }}>
      <Link href={`/min-sida/bokningar/${booking.id}`} className="dim" style={{ fontSize: 13 }}>← Tillbaka till bokningen</Link>
      <span className="eyebrow gold" style={{ marginTop: 18, display: "block" }}>
        Ref {booking.reference.slice(0, 12).toUpperCase()}
      </span>
      <h1 style={{ fontSize: 36, marginTop: 14, marginBottom: 6 }}>{pkg.title}</h1>
      <p className="dim" style={{ marginBottom: 32 }}>
        Din digitala resväska — allt du behöver inför, under och efter resan.
      </p>

      {/* Snabb-fakta */}
      <div className="quick-row">
        <div className="qr"><span className="lbl">Avresa</span><strong>{pkg.startDate ? new Date(pkg.startDate).toLocaleDateString("sv-SE") : "—"}</strong></div>
        <div className="qr"><span className="lbl">Hemkomst</span><strong>{pkg.endDate ? new Date(pkg.endDate).toLocaleDateString("sv-SE") : "—"}</strong></div>
        <div className="qr"><span className="lbl">Nätter Mekka</span><strong>{pkg.nightsMakkah ?? "—"}</strong></div>
        <div className="qr"><span className="lbl">Nätter Medina</span><strong>{pkg.nightsMadinah ?? "—"}</strong></div>
        <div className="qr"><span className="lbl">Resenärer</span><strong>{booking.travelers.length}</strong></div>
      </div>

      {/* Samlingstid */}
      {(pkg.gatheringTime || pkg.gatheringPoint || pkg.whatsappLink) && (
        <section style={{ marginTop: 32 }}>
          <h2 className="tp-h2">Samling & gruppinfo</h2>
          <div className="tp-card highlight">
            {pkg.gatheringTime && <div className="kv"><span className="lbl">Samlingstid</span><span className="val">{pkg.gatheringTime}</span></div>}
            {pkg.gatheringPoint && <div className="kv"><span className="lbl">Samlingsplats</span><span className="val">{pkg.gatheringPoint}</span></div>}
            {pkg.whatsappLink && (
              <p style={{ marginTop: 12 }}>
                <a href={pkg.whatsappLink} target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ padding: "8px 16px", fontSize: 13 }}>
                  Gå med i gruppens WhatsApp →
                </a>
              </p>
            )}
          </div>
        </section>
      )}

      {/* Flyg */}
      <section style={{ marginTop: 32 }}>
        <h2 className="tp-h2">Flyg</h2>
        <div className="tp-grid">
          <FlightCard label="Utresa" flight={flightOut} />
          <FlightCard label="Hemresa" flight={flightHome} />
        </div>
      </section>

      {/* Hotell */}
      {hotels.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 className="tp-h2">Hotell</h2>
          <div className="tp-grid">
            {hotels.map((h, i) => <HotelCard key={i} hotel={h} />)}
          </div>
        </section>
      )}

      {/* Transfer */}
      {transfers.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 className="tp-h2">Transport på plats</h2>
          <div className="tp-grid">
            {transfers.map((t, i) => (
              <div key={i} className="tp-card">
                <span className="tp-eyebrow">{t.type ?? "Transfer"}</span>
                <p className="serif" style={{ fontSize: 16, marginTop: 8 }}>
                  {t.from ?? "—"} → {t.to ?? "—"}
                </p>
                {t.notes && <p className="dim" style={{ fontSize: 13, marginTop: 8 }}>{t.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dagsprogram */}
      {itinerary.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2 className="tp-h2">Dagsprogram</h2>
          <ol className="tp-itinerary">
            {itinerary.map((d, i) => (
              <li key={i}>
                <div className="day-n">Dag {i + 1}{d.date && <span className="day-date">{new Date(d.date).toLocaleDateString("sv-SE")}</span>}</div>
                <div>
                  {d.title && <strong className="serif" style={{ fontSize: 17 }}>{d.title}</strong>}
                  {d.description && <p style={{ marginTop: 6, lineHeight: 1.6 }}>{d.description}</p>}
                  {d.highlights && d.highlights.length > 0 && (
                    <ul className="highlights">{d.highlights.map((h, hi) => <li key={hi}>{h}</li>)}</ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Kontakter */}
      <section style={{ marginTop: 32 }}>
        <h2 className="tp-h2">Kontakter</h2>
        <div className="tp-grid">
          {pkg.leaderName && (
            <div className="tp-card">
              <span className="tp-eyebrow">Reseledare</span>
              <strong className="serif" style={{ fontSize: 18, display: "block", marginTop: 6 }}>{pkg.leaderName}</strong>
              {pkg.leaderPhone && <p style={{ marginTop: 6 }}><a href={`tel:${pkg.leaderPhone}`}>{pkg.leaderPhone}</a></p>}
            </div>
          )}
          {pkg.emergencyContact && (
            <div className="tp-card">
              <span className="tp-eyebrow">Akutkontakt 24/7</span>
              <p className="serif" style={{ fontSize: 17, marginTop: 6 }}>{pkg.emergencyContact}</p>
            </div>
          )}
          <div className="tp-card">
            <span className="tp-eyebrow">Kontoret</span>
            <p className="serif" style={{ fontSize: 17, marginTop: 6 }}>Hadj Omra Resor</p>
            <p className="dim" style={{ fontSize: 13 }}>Stockholm</p>
          </div>
        </div>
      </section>

      <style>{`
        .tp-h2 { font-family: var(--f-serif); font-size: 22px; margin: 0 0 18px; color: var(--c-ink); }
        .tp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
        .tp-card { padding: 20px 22px; background: #fff; border: 1px solid var(--c-line-soft); }
        .tp-card.highlight { background: #FFF7E6; border-color: var(--c-gold-soft); }
        .tp-eyebrow { font-family: var(--f-sans); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: var(--c-gold); }
        .quick-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; padding: 18px; background: var(--c-cream); border: 1px solid var(--c-line-soft); margin-top: 8px; }
        .quick-row .qr { display: flex; flex-direction: column; gap: 4px; }
        .quick-row .lbl, .flight-grid .lbl, .kv .lbl { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 700; }
        .quick-row strong, .flight-grid .val, .kv .val { font-family: var(--f-serif); font-size: 15px; color: var(--c-ink); }
        .flight-head { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
        .flight-head strong { font-size: 18px; color: var(--c-ink); }
        .flight-no { font-family: var(--f-mono); font-size: 12px; padding: 2px 8px; background: var(--c-cream); }
        .flight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
        .flight-grid > div { display: flex; flex-direction: column; gap: 4px; }
        .kv { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
        .tp-itinerary { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0; }
        .tp-itinerary li { display: grid; grid-template-columns: 120px 1fr; gap: 18px; padding: 18px 0; border-top: 1px solid var(--c-line-soft); }
        .tp-itinerary li:first-child { border-top: 0; }
        .day-n { font-family: var(--f-mono); font-size: 13px; color: var(--c-gold); letter-spacing: 0.1em; }
        .day-date { display: block; font-family: var(--f-sans); font-size: 11px; color: var(--c-text-muted); margin-top: 4px; }
        .highlights { padding-left: 18px; margin: 10px 0 0; }
        .highlights li { padding: 2px 0; font-size: 14px; }
        @media (max-width: 720px) {
          .tp-itinerary li { grid-template-columns: 1fr; gap: 6px; }
          .flight-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
