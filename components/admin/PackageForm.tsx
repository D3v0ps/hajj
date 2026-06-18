"use client";

import { useState, useTransition } from "react";
import type { Package } from "@prisma/client";

type Action = (formData: FormData) => Promise<{ ok: boolean; error?: string } | void>;

// Förvalda avreseorter — admin kan lägga till fler direkt i fältet.
const DEPARTURE_PRESETS = ["Stockholm", "Göteborg", "Malmö"];
// Vanliga destinationer (rullgardin via datalist — fri text tillåts också).
const DESTINATION_OPTIONS = ["Mekka & Medina", "Mekka", "Medina", "Jeddah"];

function isoDate(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function PackageForm({ pkg, action, submitLabel = "Spara" }: { pkg?: Package | null; action: Action; submitLabel?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Avreseorter — chips. Initieras från befintliga värden.
  const initialCities = pkg?.departCities && pkg.departCities.length > 0
    ? pkg.departCities
    : pkg?.departCity ? [pkg.departCity] : [];
  const [cities, setCities] = useState<string[]>(initialCities);
  const [cityInput, setCityInput] = useState("");

  // Datum + auto-beräknat antal dagar.
  const [startDate, setStartDate] = useState(isoDate(pkg?.startDate));
  const [endDate, setEndDate] = useState(isoDate(pkg?.endDate));
  const [duration, setDuration] = useState(pkg?.durationDays ? String(pkg.durationDays) : "");

  // Bild — förhandsvisning av vald fil + möjlighet att ta bort befintlig bild.
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  function recomputeDuration(s: string, e: string) {
    if (s && e) {
      const days = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000);
      if (days > 0) setDuration(String(days));
    }
  }

  function addCity(name: string) {
    const c = name.trim();
    if (!c) return;
    setCities((prev) => (prev.some((x) => x.toLowerCase() === c.toLowerCase()) ? prev : [...prev, c]));
    setCityInput("");
  }
  function removeCity(name: string) {
    setCities((prev) => prev.filter((x) => x !== name));
  }
  function togglePreset(name: string) {
    setCities((prev) => (prev.some((x) => x.toLowerCase() === name.toLowerCase())
      ? prev.filter((x) => x.toLowerCase() !== name.toLowerCase())
      : [...prev, name]));
  }

  return (
    <form
      action={(fd) => {
        setError(null);
        start(async () => {
          // Vid lyckad sparning redirectar server-actionen (skapad → redigera-sida,
          // sparad → ?saved=1) — då navigerar vi och ingen "toast" behövs. Bara fel
          // returneras och visas inline här.
          const res = await action(fd);
          if (res && res.ok === false) setError(res.error ?? "Fel");
        });
      }}
      className="pk-form"
    >
      <fieldset>
        <legend>Grunduppgifter</legend>
        <div className="grid2">
          <div className="field">
            <label htmlFor="pk-title">Titel</label>
            <input id="pk-title" name="title" defaultValue={pkg?.title ?? ""} required />
          </div>
          <div className="field">
            <label htmlFor="pk-slug">Slug (URL)</label>
            <input id="pk-slug" name="slug" defaultValue={pkg?.slug ?? ""} placeholder="omra-ramadan-2027" required pattern="[a-z0-9-]+" />
          </div>
          <div className="field">
            <label htmlFor="pk-subtitle">Underrubrik</label>
            <input id="pk-subtitle" name="subtitle" defaultValue={pkg?.subtitle ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="pk-status">Status</label>
            <select id="pk-status" name="status" defaultValue={pkg?.status ?? "DRAFT"}>
              <option value="DRAFT">Utkast (syns inte publikt)</option>
              <option value="PUBLISHED">Publicerat (syns på sajten)</option>
              <option value="SOLD_OUT">Slutsåld</option>
              <option value="ARCHIVED">Arkiverat</option>
            </select>
            <span className="hint">Sätt &quot;Publicerat&quot; när paketet ska synas för kunder. Förhandsgranska först.</span>
          </div>
          <div className="field">
            <label htmlFor="pk-type">Typ</label>
            <select id="pk-type" name="type" defaultValue={pkg?.type === "VISUM" ? "OMRA" : (pkg?.type ?? "OMRA")}>
              <option value="OMRA">Omra</option>
              <option value="HAJJ">Hajj</option>
              <option value="HADJ_BADAL">Hadj Badal</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pk-city">Destination</label>
            <input id="pk-city" name="city" list="dest-options" defaultValue={pkg?.city ?? ""} placeholder="Välj eller skriv…" autoComplete="off" />
            <datalist id="dest-options">
              {DESTINATION_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>
        </div>

        {/* Avreseorter — väljbara chips + lägg till egen */}
        <div className="field" style={{ marginTop: 16 }}>
          <label>Avreseorter</label>
          <div className="city-presets">
            {DEPARTURE_PRESETS.map((p) => {
              const active = cities.some((c) => c.toLowerCase() === p.toLowerCase());
              return (
                <button
                  type="button"
                  key={p}
                  className={active ? "city-chip active" : "city-chip"}
                  onClick={() => togglePreset(p)}
                  aria-pressed={active}
                >
                  {active ? "✓ " : "+ "}{p}
                </button>
              );
            })}
          </div>

          {/* Valda orter som inte är förval visas som borttagbara chips */}
          {cities.filter((c) => !DEPARTURE_PRESETS.some((p) => p.toLowerCase() === c.toLowerCase())).length > 0 && (
            <div className="city-selected">
              {cities
                .filter((c) => !DEPARTURE_PRESETS.some((p) => p.toLowerCase() === c.toLowerCase()))
                .map((c) => (
                  <span key={c} className="city-tag">
                    {c}
                    <button type="button" onClick={() => removeCity(c)} aria-label={`Ta bort ${c}`}>✕</button>
                  </span>
                ))}
            </div>
          )}

          <div className="city-add">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCity(cityInput); } }}
              placeholder="Lägg till annan avreseort…"
            />
            <button type="button" className="btn btn-ghost" onClick={() => addCity(cityInput)}>Lägg till</button>
          </div>
          <span className="hint">Resenären väljer avreseort i bokningen.</span>

          {/* Dolda fält som faktiskt skickas in (ett per ort). */}
          {cities.map((c) => <input key={c} type="hidden" name="departCities" value={c} />)}
        </div>

        <div className="grid3" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="pk-start">Startdatum</label>
            <input id="pk-start" name="startDate" type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); recomputeDuration(e.target.value, endDate); }} />
          </div>
          <div className="field">
            <label htmlFor="pk-end">Slutdatum</label>
            <input id="pk-end" name="endDate" type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); recomputeDuration(startDate, e.target.value); }} />
          </div>
          <div className="field">
            <label htmlFor="pk-duration">Antal dagar totalt</label>
            <input id="pk-duration" name="durationDays" type="number" min="1" value={duration}
              onChange={(e) => setDuration(e.target.value)} placeholder="auto från datum" />
            <span className="hint">Fylls i automatiskt från datumen — kan justeras.</span>
          </div>
          <div className="field">
            <label htmlFor="pk-nm">Nätter i Makkah</label>
            <input id="pk-nm" name="nightsMakkah" type="number" min="0" defaultValue={pkg?.nightsMakkah ?? ""} placeholder="t.ex. 5" />
          </div>
          <div className="field">
            <label htmlFor="pk-nmd">Nätter i Madinah</label>
            <input id="pk-nmd" name="nightsMadinah" type="number" min="0" defaultValue={pkg?.nightsMadinah ?? ""} placeholder="t.ex. 4" />
          </div>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="pk-summary">Sammanfattning (för listsida)</label>
          <textarea id="pk-summary" name="summary" rows={2} defaultValue={pkg?.summary ?? ""} maxLength={500} />
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="pk-desc">Beskrivning (för paketsidan)</label>
          <textarea id="pk-desc" name="description" rows={5} defaultValue={pkg?.description ?? ""} maxLength={5000} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Bild</legend>
        <div className="field">
          <label htmlFor="pk-image">Omslagsbild för resan</label>

          {/* Förhandsvisning: ny vald fil → befintlig bild → inget */}
          {newImagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pk-img-preview" src={newImagePreview} alt="Vald bild" />
          ) : pkg?.imageUrl && !removeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pk-img-preview" src={`/api/paket-bild/${pkg.id}`} alt="Nuvarande bild" />
          ) : (
            <div className="pk-img-empty">Ingen bild vald än</div>
          )}

          <input
            id="pk-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setNewImagePreview(f ? URL.createObjectURL(f) : null);
              if (f) setRemoveImage(false);
            }}
          />
          <span className="hint">JPG, PNG, WebP eller GIF · max 6 MB. Visas högst upp på resans sida och i listorna.</span>

          {pkg?.imageUrl && !newImagePreview && (
            <label className="pk-img-remove">
              <input type="checkbox" name="removeImage" value="1" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
              Ta bort nuvarande bild
            </label>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>Hotell &amp; logi</legend>
        <div className="grid2">
          <div className="field">
            <label htmlFor="pk-hm">Hotell Mecka</label>
            <input id="pk-hm" name="hotelMakkah" defaultValue={pkg?.hotelMakkah ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="pk-dh">Avstånd till Haram (m)</label>
            <input id="pk-dh" name="distHaramM" type="number" defaultValue={pkg?.distHaramM ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="pk-hmd">Hotell Medina</label>
            <input id="pk-hmd" name="hotelMadinah" defaultValue={pkg?.hotelMadinah ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="pk-dn">Avstånd till Nabawi (m)</label>
            <input id="pk-dn" name="distNabawiM" type="number" defaultValue={pkg?.distNabawiM ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Inkluderingar (en per rad)</legend>
        <textarea name="inclusions" rows={6} defaultValue={pkg?.inclusions?.join("\n") ?? ""} placeholder="Visum&#10;Direktflyg från Stockholm&#10;Hotell i Mecka&#10;..." />
      </fieldset>

      <fieldset>
        <legend>Tillkommer / undantag (en per rad)</legend>
        <textarea name="excludeNotes" rows={3} defaultValue={pkg?.excludeNotes?.join("\n") ?? ""} placeholder="Lämna tomt om inget tillkommer — då visas sektionen inte alls för kunden." />
      </fieldset>

      <fieldset>
        <legend>Övrigt (bra att veta)</legend>
        <textarea name="notes" rows={4} defaultValue={pkg?.notes ?? ""} maxLength={5000}
          placeholder="Fri text med övrig information som visas för kunden på resans sida. Lämna tomt om inget — då döljs sektionen helt." />
      </fieldset>

      {error && <p className="err" role="alert">{error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Sparar..." : submitLabel}
        </button>
      </div>

      <style>{`
        .pk-form fieldset { border: 1px solid var(--c-line); padding: 24px; margin-bottom: 20px; background: #fff; }
        .pk-form legend { padding: 0 10px; font-family: var(--f-sans); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--c-gold); font-weight: 700; }
        .pk-form .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pk-form .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .pk-form .field { display: flex; flex-direction: column; gap: 6px; }
        .pk-form .field label { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .pk-form .field .hint { font-size: 12px; color: var(--c-text-muted); text-transform: none; letter-spacing: 0; font-weight: 400; }
        .pk-form input, .pk-form select, .pk-form textarea { padding: 10px 12px; border: 1px solid var(--c-line); background: #fff; font: inherit; }
        .pk-form input:focus, .pk-form select:focus, .pk-form textarea:focus { outline: 2px solid var(--c-gold); outline-offset: -1px; }

        .city-presets { display: flex; gap: 8px; flex-wrap: wrap; }
        .city-chip {
          padding: 8px 14px; border: 1px solid var(--c-line); background: #fff;
          font-size: 13px; cursor: pointer; color: var(--c-ink); font: inherit;
        }
        .city-chip:hover { border-color: var(--c-gold); }
        .city-chip.active { background: var(--c-ink); color: #fff; border-color: var(--c-ink); }
        .city-selected { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .city-tag {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 6px 4px 12px; background: var(--c-cream); border: 1px solid var(--c-line-soft);
          font-size: 13px;
        }
        .city-tag button { border: 0; background: transparent; cursor: pointer; color: var(--c-warn); font-size: 12px; padding: 2px 4px; }
        .city-add { display: flex; gap: 8px; margin-top: 8px; }
        .city-add input { flex: 1; }
        .city-add .btn { padding: 8px 14px; font-size: 13px; white-space: nowrap; }

        .pk-img-preview { display: block; max-width: 320px; width: 100%; height: auto; border: 1px solid var(--c-line); margin-bottom: 8px; }
        .pk-img-empty {
          display: flex; align-items: center; justify-content: center;
          max-width: 320px; height: 160px; background: var(--c-cream);
          border: 1px dashed var(--c-line); color: var(--c-text-muted);
          font-size: 13px; margin-bottom: 8px;
        }
        .pk-img-remove { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 13px; text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--c-warn); }
        .pk-img-remove input { width: auto; }

        @media (max-width: 900px) {
          .pk-form .grid2 { grid-template-columns: 1fr; }
          .pk-form .grid3 { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .pk-form fieldset { padding: 18px 16px; }
          .pk-form .grid3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </form>
  );
}
