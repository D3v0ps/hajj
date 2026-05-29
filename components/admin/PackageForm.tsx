"use client";

import { useState, useTransition } from "react";
import type { Package } from "@prisma/client";

type Action = (formData: FormData) => Promise<{ ok: boolean; error?: string } | void>;

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
        .pk-form .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 900px) { .pk-form .grid2 { grid-template-columns: 1fr; } }
        @media (max-width: 640px) {
          .pk-form fieldset { padding: 18px 16px; }
        }
      `}</style>
    </form>
  );
}
