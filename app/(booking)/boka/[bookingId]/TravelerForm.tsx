"use client";

import { useState, useCallback } from "react";
import { PassportScanner } from "@/components/booking/PassportScanner";
import { COUNTRY_OPTIONS, CIVIL_STATUS_OPTIONS } from "@/lib/countries";

type ScannedData = {
  firstName?: string;
  lastName?: string;
  passportNo?: string;
  nationality?: string;
  birthDate?: string;
  gender?: string;
  expiryDate?: string;
};

export function TravelerForm({
  bookingId,
  action,
  defaultAgeCategory = "ADULT",
}: {
  bookingId: string;
  action: (bookingId: string, fd: FormData) => Promise<void>;
  defaultAgeCategory?: "ADULT" | "CHILD" | "INFANT";
}) {
  const [scanned, setScanned] = useState<ScannedData | null>(null);

  const handleScanResult = useCallback((data: Partial<ScannedData>) => {
    setScanned(data as ScannedData);
  }, []);

  // OCR-nationalitet är ofta ISO-3 (t.ex. SWE) — mappa de vanligaste till svenska namn
  const mapNationality = (raw?: string): string => {
    if (!raw) return "";
    const m: Record<string, string> = { SWE: "Sverige", SOM: "Somalia", ERI: "Eritrea", SYR: "Syrien", IRQ: "Irak", IRN: "Iran", AFG: "Afghanistan", TUR: "Turkiet", MAR: "Marocko" };
    return m[raw.toUpperCase()] ?? "";
  };

  return (
    <>
      <PassportScanner onResult={handleScanResult} />

      <form action={(fd) => action(bookingId, fd)} className="trv-form">
        <div className="grid3">
          <div className="field">
            <label>Förnamn *</label>
            <input name="firstName" required defaultValue={scanned?.firstName ?? ""} key={`fn-${scanned?.firstName ?? ""}`} />
          </div>
          <div className="field">
            <label>Efternamn *</label>
            <input name="lastName" required defaultValue={scanned?.lastName ?? ""} key={`ln-${scanned?.lastName ?? ""}`} />
          </div>
          <div className="field">
            <label>Ålderskategori *</label>
            <select name="ageCategory" defaultValue={defaultAgeCategory}>
              <option value="ADULT">Vuxen (12+ år)</option>
              <option value="CHILD">Barn (2–11 år)</option>
              <option value="INFANT">Spädbarn (0–1 år)</option>
            </select>
          </div>

          <div className="field">
            <label>E-post</label>
            <input name="email" type="email" autoComplete="off" />
          </div>
          <div className="field">
            <label>Mobilnummer</label>
            <input name="phone" type="tel" inputMode="tel" autoComplete="off" />
          </div>
          <div className="field">
            <label>Kön</label>
            <select name="gender" defaultValue={scanned?.gender ?? ""} key={`g-${scanned?.gender ?? ""}`}>
              <option value="">—</option>
              <option value="M">Man</option>
              <option value="F">Kvinna</option>
            </select>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Adress</label>
            <input name="address" autoComplete="off" placeholder="Gata, postnummer, ort" />
          </div>

          <div className="field">
            <label>Personnummer</label>
            <input name="personnummer" inputMode="numeric" autoComplete="off" placeholder="ÅÅÅÅMMDD-XXXX" />
          </div>
          <div className="field">
            <label>Födelsedatum</label>
            <input name="birthDate" type="date" defaultValue={scanned?.birthDate ?? ""} key={`bd-${scanned?.birthDate ?? ""}`} />
          </div>
          <div className="field">
            <label>Civilstånd</label>
            <select name="civilStatus" defaultValue="">
              <option value="">—</option>
              {CIVIL_STATUS_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Nationalitet</label>
            <select name="nationality" defaultValue={mapNationality(scanned?.nationality)} key={`nat-${scanned?.nationality ?? ""}`}>
              <option value="">Välj land...</option>
              {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Födelseland</label>
            <select name="birthCountry" defaultValue="">
              <option value="">Välj land...</option>
              {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Födelseort</label>
            <input name="birthCity" autoComplete="off" />
          </div>

          <div className="field">
            <label>Yrke</label>
            <input name="occupation" autoComplete="off" />
          </div>
          <div className="field">
            <label>Passnummer</label>
            <input name="passportNo" autoComplete="off" defaultValue={scanned?.passportNo ?? ""} key={`pn-${scanned?.passportNo ?? ""}`} />
          </div>
          <div className="field">
            <label>Land/stad där passet utfärdats</label>
            <input name="passIssuePlace" autoComplete="off" />
          </div>

          <div className="field">
            <label>Passets utfärdandedatum</label>
            <input name="passIssueDate" type="date" />
          </div>
          <div className="field">
            <label>Passets utgångsdatum</label>
            <input name="passportExp" type="date" defaultValue={scanned?.expiryDate ?? ""} key={`pe-${scanned?.expiryDate ?? ""}`} />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 24 }}>Spara resenär</button>
      </form>
    </>
  );
}
