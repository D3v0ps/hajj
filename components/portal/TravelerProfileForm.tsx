import { COUNTRY_OPTIONS, CIVIL_STATUS_OPTIONS } from "@/lib/countries";

type ProfileFields = {
  id?: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  ageCategory: "ADULT" | "CHILD" | "INFANT";
  isSelf: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  personnummer: string | null;
  passportNo: string | null;
  passportExp: Date | null;
  passIssueDate: Date | null;
  passIssuePlace: string | null;
  birthDate: Date | null;
  gender: string | null;
  nationality: string | null;
  civilStatus: string | null;
  occupation: string | null;
  birthCountry: string | null;
  birthCity: string | null;
  notes: string | null;
};

const toDateValue = (d: Date | null) => d ? new Date(d).toISOString().slice(0, 10) : "";

export function TravelerProfileForm({
  action,
  profile,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  profile?: ProfileFields;
  submitLabel: string;
}) {
  const p = profile;
  return (
    <form action={action} className="tp-form">
      {p?.id && <input type="hidden" name="id" value={p.id} />}

      <fieldset>
        <legend>Identitet</legend>
        <div className="row">
          <div className="field"><label>Förnamn *</label><input name="firstName" required defaultValue={p?.firstName ?? ""} /></div>
          <div className="field"><label>Efternamn *</label><input name="lastName" required defaultValue={p?.lastName ?? ""} /></div>
        </div>
        <div className="row">
          <div className="field"><label>Relation</label>
            <input name="relationship" placeholder="t.ex. make, fru, barn, förälder" defaultValue={p?.relationship ?? ""} />
          </div>
          <div className="field"><label>Ålderskategori</label>
            <select name="ageCategory" defaultValue={p?.ageCategory ?? "ADULT"}>
              <option value="ADULT">Vuxen (12+)</option>
              <option value="CHILD">Barn (2–11)</option>
              <option value="INFANT">Spädbarn (0–1)</option>
            </select>
          </div>
          <div className="field"><label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
            <input type="checkbox" name="isSelf" defaultChecked={p?.isSelf ?? false} /> Det här är jag
          </label></div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Kontakt</legend>
        <div className="row">
          <div className="field"><label>E-post</label><input type="email" name="email" defaultValue={p?.email ?? ""} /></div>
          <div className="field"><label>Mobil</label><input type="tel" name="phone" defaultValue={p?.phone ?? ""} /></div>
        </div>
        <div className="field"><label>Adress</label><input name="address" placeholder="Gata, postnummer, ort" defaultValue={p?.address ?? ""} /></div>
      </fieldset>

      <fieldset>
        <legend>Identitet & pass</legend>
        <div className="row">
          <div className="field"><label>Personnummer</label><input name="personnummer" placeholder="ÅÅÅÅMMDD-XXXX" defaultValue={p?.personnummer ?? ""} /></div>
          <div className="field"><label>Födelsedatum</label><input type="date" name="birthDate" defaultValue={toDateValue(p?.birthDate ?? null)} /></div>
          <div className="field"><label>Kön</label>
            <select name="gender" defaultValue={p?.gender ?? ""}>
              <option value="">—</option><option value="M">Man</option><option value="F">Kvinna</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field"><label>Passnummer</label><input name="passportNo" defaultValue={p?.passportNo ?? ""} /></div>
          <div className="field"><label>Pass utfärdat</label><input type="date" name="passIssueDate" defaultValue={toDateValue(p?.passIssueDate ?? null)} /></div>
          <div className="field"><label>Pass giltigt t.o.m.</label><input type="date" name="passportExp" defaultValue={toDateValue(p?.passportExp ?? null)} /></div>
        </div>
        <div className="row">
          <div className="field"><label>Utfärdandeort</label><input name="passIssuePlace" defaultValue={p?.passIssuePlace ?? ""} /></div>
          <div className="field"><label>Nationalitet</label>
            <select name="nationality" defaultValue={p?.nationality ?? ""}>
              <option value="">Välj land…</option>
              {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Födelse & övrigt</legend>
        <div className="row">
          <div className="field"><label>Födelseland</label>
            <select name="birthCountry" defaultValue={p?.birthCountry ?? ""}>
              <option value="">Välj land…</option>
              {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>Födelseort</label><input name="birthCity" defaultValue={p?.birthCity ?? ""} /></div>
          <div className="field"><label>Yrke</label><input name="occupation" defaultValue={p?.occupation ?? ""} /></div>
        </div>
        <div className="field"><label>Civilstånd</label>
          <select name="civilStatus" defaultValue={p?.civilStatus ?? ""}>
            <option value="">—</option>
            {CIVIL_STATUS_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="field"><label>Anteckningar</label>
          <input name="notes" placeholder="Allergier, särskilda behov, mediciner…" defaultValue={p?.notes ?? ""} />
        </div>
      </fieldset>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>

      <style>{`
        .tp-form fieldset { border: 1px solid var(--c-line-soft); padding: 18px 20px; margin: 0 0 18px; background: #fff; }
        .tp-form legend { padding: 0 8px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .tp-form .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 12px; }
        .tp-form .row:has(.field:nth-child(2):last-child) { grid-template-columns: 1fr 1fr; }
        .tp-form .field { display: flex; flex-direction: column; gap: 6px; }
        .tp-form .field label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .tp-form input, .tp-form select {
          padding: 9px 12px; border: 1px solid var(--c-line); background: #fff; font: inherit;
        }
        .tp-form input:focus, .tp-form select:focus { outline: 2px solid var(--c-gold); outline-offset: -1px; }
        @media (max-width: 720px) { .tp-form .row { grid-template-columns: 1fr; } }
      `}</style>
    </form>
  );
}
