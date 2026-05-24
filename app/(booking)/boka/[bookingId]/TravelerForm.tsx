"use client";

import { useState, useCallback } from "react";
import { PassportScanner } from "@/components/booking/PassportScanner";

type ScannedData = {
  firstName?: string;
  lastName?: string;
  passportNo?: string;
  nationality?: string;
  birthDate?: string;
  gender?: string;
  expiryDate?: string;
};

export function TravelerForm({ bookingId, action }: { bookingId: string; action: (bookingId: string, fd: FormData) => Promise<void> }) {
  const [scanned, setScanned] = useState<ScannedData | null>(null);

  const handleScanResult = useCallback((data: Partial<ScannedData>) => {
    setScanned(data as ScannedData);
  }, []);

  return (
    <>
      <PassportScanner onResult={handleScanResult} />

      <form action={(fd) => action(bookingId, fd)} className="trv-form">
        <div className="grid2">
          <div className="field">
            <label>Förnamn</label>
            <input name="firstName" required defaultValue={scanned?.firstName ?? ""} key={`fn-${scanned?.firstName ?? ""}`} />
          </div>
          <div className="field">
            <label>Efternamn</label>
            <input name="lastName" required defaultValue={scanned?.lastName ?? ""} key={`ln-${scanned?.lastName ?? ""}`} />
          </div>
          <div className="field">
            <label>Personnummer (ÅÅÅÅMMDD-XXXX)</label>
            <input name="personnummer" inputMode="numeric" autoComplete="off" placeholder="19850315-1234" />
          </div>
          <div className="field">
            <label>Passnummer</label>
            <input name="passportNo" autoComplete="off" defaultValue={scanned?.passportNo ?? ""} key={`pn-${scanned?.passportNo ?? ""}`} />
          </div>
          <div className="field">
            <label>Födelsedatum</label>
            <input name="birthDate" type="date" defaultValue={scanned?.birthDate ?? ""} key={`bd-${scanned?.birthDate ?? ""}`} />
          </div>
          <div className="field">
            <label>Kön</label>
            <select name="gender" defaultValue={scanned?.gender ?? ""} key={`g-${scanned?.gender ?? ""}`}>
              <option value="">—</option>
              <option value="M">Man</option>
              <option value="F">Kvinna</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" name="isMahram" /> Mahram (släkting som ledsagar)
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" name="needsAssist" /> Behöver assistans
          </label>
        </div>

        <button type="submit" className="btn btn-ghost" style={{ marginTop: 24 }}>Spara resenär</button>
      </form>
    </>
  );
}
