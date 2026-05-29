"use client";

import { useState, useTransition } from "react";
import type { Package } from "@prisma/client";

type Action = (formData: FormData) => Promise<{ ok: boolean; error?: string } | void>;

// JSON-formerna som lagras i Package.flight*/hotels/transfers/itinerary.
type FlightLike = {
  airline?: string; flightNo?: string;
  from?: string; to?: string;
  departTime?: string; arriveTime?: string;
  terminal?: string; notes?: string;
};
type HotelLike = {
  city?: string; name?: string; rating?: number;
  address?: string; distHaram?: string;
  checkIn?: string; checkOut?: string; phone?: string; notes?: string;
};
type TransferLike = { type?: string; from?: string; to?: string; notes?: string };
type ItineraryLike = { date?: string; title?: string; description?: string; highlights?: string[] };

// Antal "tomma rader" som alltid renderas — kontoret fyller i vad som behövs.
// Tomma rader filtreras bort serverside vid sparning.
const HOTEL_ROWS = 4;
const TRANSFER_ROWS = 4;
const ITINERARY_ROWS = 12;

function FlightFieldset({ name, label, data }: { name: "flightOutbound" | "flightReturn"; label: string; data: FlightLike | null }) {
  const d = data ?? {};
  return (
    <fieldset>
      <legend>Resväska — {label}</legend>
      <div className="grid3">
        <div className="field"><label>Flygbolag</label>
          <input name={`${name}.airline`} defaultValue={d.airline ?? ""} placeholder="Saudia" /></div>
        <div className="field"><label>Flygnummer</label>
          <input name={`${name}.flightNo`} defaultValue={d.flightNo ?? ""} placeholder="SV108" /></div>
        <div className="field"><label>Terminal</label>
          <input name={`${name}.terminal`} defaultValue={d.terminal ?? ""} placeholder="5" /></div>
        <div className="field"><label>Från</label>
          <input name={`${name}.from`} defaultValue={d.from ?? ""} placeholder="ARN" /></div>
        <div className="field"><label>Till</label>
          <input name={`${name}.to`} defaultValue={d.to ?? ""} placeholder="JED" /></div>
        <div className="field"></div>
        <div className="field"><label>Avgångstid</label>
          <input name={`${name}.departTime`} type="datetime-local" defaultValue={d.departTime ?? ""} /></div>
        <div className="field"><label>Ankomsttid</label>
          <input name={`${name}.arriveTime`} type="datetime-local" defaultValue={d.arriveTime ?? ""} /></div>
        <div className="field"></div>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label>Anteckning</label>
        <input name={`${name}.notes`} defaultValue={d.notes ?? ""} placeholder="Direktflyg, måltid ombord" />
      </div>
    </fieldset>
  );
}

function HotelsFieldset({ data }: { data: HotelLike[] | null }) {
  const rows: HotelLike[] = [...(data ?? []), ...Array.from({ length: HOTEL_ROWS }, () => ({}))].slice(0, Math.max(HOTEL_ROWS, (data?.length ?? 0) + 1));
  return (
    <fieldset>
      <legend>Resväska — Hotell</legend>
      <p className="dim" style={{ fontSize: 12, marginBottom: 14 }}>Tomma rader sparas inte. Lägg till så många du behöver.</p>
      {rows.map((h, i) => (
        <div key={i} className="row-card">
          <div className="row-card-head">Hotell #{i + 1}</div>
          <div className="grid3">
            <div className="field"><label>Stad</label>
              <select name={`hotels.${i}.city`} defaultValue={h.city ?? ""}>
                <option value="">—</option><option value="Mekka">Mekka</option><option value="Medina">Medina</option><option value="Jeddah">Jeddah</option><option value="Other">Annan</option>
              </select></div>
            <div className="field"><label>Hotellnamn</label>
              <input name={`hotels.${i}.name`} defaultValue={h.name ?? ""} placeholder="Swissôtel Al Maqam" /></div>
            <div className="field"><label>Stjärnor</label>
              <select name={`hotels.${i}.rating`} defaultValue={h.rating ? String(h.rating) : ""}>
                <option value="">—</option>{[3, 4, 5].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
              </select></div>
            <div className="field"><label>Avstånd till Haram/Nabawi</label>
              <input name={`hotels.${i}.distHaram`} defaultValue={h.distHaram ?? ""} placeholder="100 m" /></div>
            <div className="field"><label>Incheckning</label>
              <input name={`hotels.${i}.checkIn`} type="date" defaultValue={h.checkIn ?? ""} /></div>
            <div className="field"><label>Utcheckning</label>
              <input name={`hotels.${i}.checkOut`} type="date" defaultValue={h.checkOut ?? ""} /></div>
            <div className="field"><label>Telefon</label>
              <input name={`hotels.${i}.phone`} defaultValue={h.phone ?? ""} /></div>
            <div className="field" style={{ gridColumn: "span 2" }}><label>Anteckning</label>
              <input name={`hotels.${i}.notes`} defaultValue={h.notes ?? ""} /></div>
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function TransfersFieldset({ data }: { data: TransferLike[] | null }) {
  const rows: TransferLike[] = [...(data ?? []), ...Array.from({ length: TRANSFER_ROWS }, () => ({}))].slice(0, Math.max(TRANSFER_ROWS, (data?.length ?? 0) + 1));
  return (
    <fieldset>
      <legend>Resväska — Transport på plats</legend>
      <p className="dim" style={{ fontSize: 12, marginBottom: 14 }}>Buss, taxi, tåg — tomma rader sparas inte.</p>
      {rows.map((t, i) => (
        <div key={i} className="row-card">
          <div className="row-card-head">Transfer #{i + 1}</div>
          <div className="grid3">
            <div className="field"><label>Typ</label>
              <input name={`transfers.${i}.type`} defaultValue={t.type ?? ""} placeholder="Buss" /></div>
            <div className="field"><label>Från</label>
              <input name={`transfers.${i}.from`} defaultValue={t.from ?? ""} placeholder="Jeddah flygplats" /></div>
            <div className="field"><label>Till</label>
              <input name={`transfers.${i}.to`} defaultValue={t.to ?? ""} placeholder="Mekka-hotell" /></div>
          </div>
          <div className="field" style={{ marginTop: 8 }}><label>Anteckning</label>
            <input name={`transfers.${i}.notes`} defaultValue={t.notes ?? ""} /></div>
        </div>
      ))}
    </fieldset>
  );
}

function ItineraryFieldset({ data }: { data: ItineraryLike[] | null }) {
  const rows: ItineraryLike[] = [...(data ?? []), ...Array.from({ length: ITINERARY_ROWS }, () => ({}))].slice(0, Math.max(ITINERARY_ROWS, (data?.length ?? 0) + 2));
  return (
    <fieldset>
      <legend>Resväska — Dagsprogram</legend>
      <p className="dim" style={{ fontSize: 12, marginBottom: 14 }}>En rad per dag. Tomma dagar sparas inte. Highlights = kommaseparerad lista.</p>
      {rows.map((d, i) => (
        <details key={i} className="row-card" open={i < 3 || !!d.title}>
          <summary className="row-card-head row-card-summary">Dag {i + 1}{d.title ? ` — ${d.title}` : ""}</summary>
          <div className="grid3">
            <div className="field"><label>Datum</label>
              <input name={`itinerary.${i}.date`} type="date" defaultValue={d.date ?? ""} /></div>
            <div className="field" style={{ gridColumn: "span 2" }}><label>Rubrik</label>
              <input name={`itinerary.${i}.title`} defaultValue={d.title ?? ""} placeholder="Avresa Stockholm — ankomst Mekka" /></div>
          </div>
          <div className="field" style={{ marginTop: 8 }}><label>Beskrivning</label>
            <textarea name={`itinerary.${i}.description`} rows={2} defaultValue={d.description ?? ""} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Höjdpunkter (kommaseparerade)</label>
            <input name={`itinerary.${i}.highlights`} defaultValue={(d.highlights ?? []).join(", ")} placeholder="Incheckning Arlanda, Direktflyg, Anländer hotell" /></div>
        </details>
      ))}
    </fieldset>
  );
}

export function PackageForm({ pkg, action, submitLabel = "Spara" }: { pkg?: Package | null; action: Action; submitLabel?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(fd) => {
        setError(null);
        setSaved(false);
        start(async () => {
          const res = await action(fd);
          if (res && res.ok === false) setError(res.error ?? "Fel");
          else if (res && res.ok === true) setSaved(true);
        });
      }}
      className="pk-form"
    >
      <fieldset>
        <legend>Grunduppgifter</legend>
        <div className="grid2">
          <div className="field">
            <label>Titel</label>
            <input name="title" defaultValue={pkg?.title ?? ""} required />
          </div>
          <div className="field">
            <label>Slug (URL)</label>
            <input name="slug" defaultValue={pkg?.slug ?? ""} placeholder="omra-ramadan-2027" required pattern="[a-z0-9-]+" />
          </div>
          <div className="field">
            <label>Underrubrik</label>
            <input name="subtitle" defaultValue={pkg?.subtitle ?? ""} />
          </div>
          <div className="field">
            <label>Status</label>
            <select name="status" defaultValue={pkg?.status ?? "DRAFT"}>
              <option value="DRAFT">Utkast</option>
              <option value="PUBLISHED">Publicerat</option>
              <option value="SOLD_OUT">Slutsåld</option>
              <option value="ARCHIVED">Arkiverat</option>
            </select>
          </div>
          <div className="field">
            <label>Typ</label>
            <select name="type" defaultValue={pkg?.type ?? "OMRA"}>
              <option value="OMRA">Omra</option>
              <option value="HAJJ">Hajj</option>
              <option value="HADJ_BADAL">Hadj Badal</option>
              <option value="VISUM">Visum</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Avreseorter (en per rad — flera tillåtna)</label>
            <textarea
              name="departCities"
              rows={3}
              defaultValue={(pkg?.departCities && pkg.departCities.length > 0 ? pkg.departCities : pkg?.departCity ? [pkg.departCity] : []).join("\n")}
              placeholder={"Stockholm\nGöteborg\nMalmö"}
            />
            <span className="hint">Resenären väljer avreseort i bokningen. Skriv en stad per rad.</span>
          </div>
          <div className="field">
            <label>Stad (destination)</label>
            <input name="city" defaultValue={pkg?.city ?? ""} placeholder="Mecka + Medina" />
          </div>
          <div className="field">
            <label>Antal dagar totalt</label>
            <input name="durationDays" type="number" defaultValue={pkg?.durationDays ?? ""} />
          </div>
          <div className="field">
            <label>Nätter i Makkah</label>
            <input name="nightsMakkah" type="number" min="0" defaultValue={pkg?.nightsMakkah ?? ""} placeholder="t.ex. 5" />
          </div>
          <div className="field">
            <label>Nätter i Madinah</label>
            <input name="nightsMadinah" type="number" min="0" defaultValue={pkg?.nightsMadinah ?? ""} placeholder="t.ex. 4" />
          </div>
          <div className="field">
            <label>Startdatum</label>
            <input name="startDate" type="date" defaultValue={pkg?.startDate ? new Date(pkg.startDate).toISOString().slice(0, 10) : ""} />
          </div>
          <div className="field">
            <label>Slutdatum</label>
            <input name="endDate" type="date" defaultValue={pkg?.endDate ? new Date(pkg.endDate).toISOString().slice(0, 10) : ""} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>Sammanfattning (för listsida)</label>
          <textarea name="summary" rows={2} defaultValue={pkg?.summary ?? ""} maxLength={500} />
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>Beskrivning (för paketsidan)</label>
          <textarea name="description" rows={5} defaultValue={pkg?.description ?? ""} maxLength={5000} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Hotell &amp; logi</legend>
        <div className="grid2">
          <div className="field">
            <label>Hotell Mecka</label>
            <input name="hotelMakkah" defaultValue={pkg?.hotelMakkah ?? ""} />
          </div>
          <div className="field">
            <label>Avstånd till Haram (m)</label>
            <input name="distHaramM" type="number" defaultValue={pkg?.distHaramM ?? ""} />
          </div>
          <div className="field">
            <label>Hotell Medina</label>
            <input name="hotelMadinah" defaultValue={pkg?.hotelMadinah ?? ""} />
          </div>
          <div className="field">
            <label>Avstånd till Nabawi (m)</label>
            <input name="distNabawiM" type="number" defaultValue={pkg?.distNabawiM ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Inkluderingar (en per rad)</legend>
        <textarea name="inclusions" rows={6} defaultValue={pkg?.inclusions?.join("\n") ?? ""} placeholder="Visum&#10;Direktflyg från Stockholm&#10;Hotell i Mecka&#10;..." />
      </fieldset>

      <fieldset>
        <legend>Tillkommer / undantag (en per rad)</legend>
        <textarea name="excludeNotes" rows={3} defaultValue={pkg?.excludeNotes?.join("\n") ?? ""} />
      </fieldset>

      <fieldset>
        <legend>Digital resväska — gruppinfo</legend>
        <p className="dim" style={{ fontSize: 12, marginBottom: 14 }}>
          Visas i kundens digitala resväska efter bokningsbekräftelse. Tom = info kommer närmare avresan.
        </p>
        <div className="grid2">
          <div className="field">
            <label>Reseledare</label>
            <input name="leaderName" defaultValue={pkg?.leaderName ?? ""} />
          </div>
          <div className="field">
            <label>Reseledare telefon</label>
            <input name="leaderPhone" type="tel" defaultValue={pkg?.leaderPhone ?? ""} />
          </div>
          <div className="field">
            <label>Akutkontakt 24/7</label>
            <input name="emergencyContact" defaultValue={pkg?.emergencyContact ?? ""} placeholder="Namn + telefon" />
          </div>
          <div className="field">
            <label>WhatsApp-grupp (länk)</label>
            <input name="whatsappLink" defaultValue={pkg?.whatsappLink ?? ""} placeholder="https://chat.whatsapp.com/..." />
          </div>
          <div className="field">
            <label>Samlingsplats</label>
            <input name="gatheringPoint" defaultValue={pkg?.gatheringPoint ?? ""} placeholder="Arlanda T5 incheckning rad 12" />
          </div>
          <div className="field">
            <label>Samlingstid</label>
            <input name="gatheringTime" defaultValue={pkg?.gatheringTime ?? ""} placeholder="3 timmar före avgång" />
          </div>
        </div>
      </fieldset>

      <FlightFieldset name="flightOutbound" label="Utflyg" data={(pkg?.flightOutbound ?? null) as FlightLike | null} />
      <FlightFieldset name="flightReturn"   label="Hemflyg" data={(pkg?.flightReturn ?? null) as FlightLike | null} />
      <HotelsFieldset data={(pkg?.hotels ?? null) as HotelLike[] | null} />
      <TransfersFieldset data={(pkg?.transfers ?? null) as TransferLike[] | null} />
      <ItineraryFieldset data={(pkg?.itinerary ?? null) as ItineraryLike[] | null} />

      {error && <p className="err">{error}</p>}
      {saved && <p style={{ color: "var(--c-green-soft)", fontSize: 13, fontWeight: 600 }}>✓ Sparat</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Sparar..." : submitLabel}
        </button>
      </div>

      <style>{`
        .pk-form fieldset { border: 1px solid var(--c-line); padding: 24px; margin-bottom: 20px; background: #fff; }
        .pk-form legend { padding: 0 10px; font-family: var(--f-sans); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--c-gold); font-weight: 700; }
        .pk-form .row-card { padding: 12px 14px; background: var(--c-paper); border: 1px solid var(--c-line-soft); margin-bottom: 10px; }
        .pk-form .row-card-head { font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.1em; color: var(--c-text-muted); margin-bottom: 10px; text-transform: uppercase; }
        .pk-form details.row-card .row-card-summary { cursor: pointer; margin-bottom: 0; }
        .pk-form details.row-card[open] .row-card-summary { margin-bottom: 10px; }
        .pk-form .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 900px) { .pk-form .grid2 { grid-template-columns: 1fr; } }
        @media (max-width: 640px) {
          .pk-form fieldset { padding: 18px 16px; }
        }
      `}</style>
    </form>
  );
}
