"use client";

import { useState } from "react";

export type TierOption = {
  id: string;
  name: string;
  roomType: string;
  ageCategory: "ADULT" | "CHILD" | "INFANT";
  ageMin: number;
  ageMax: number;
  pricePerPerson: number;
};

const ROOM_LABELS: Record<string, string> = {
  DOUBLE: "2-bäddsrum",
  TRIPLE: "3-bäddsrum",
  QUAD: "4-bäddsrum",
  QUINTUPLE: "5-bäddsrum",
  FAMILY: "Familjerum",
};

const AGE_LABELS: Record<string, string> = {
  ADULT: "Vuxen",
  CHILD: "Barn",
  INFANT: "Spädbarn",
};

function ageRange(t: TierOption): string {
  if (t.ageCategory === "ADULT") return `${t.ageMin}+ år`;
  return `${t.ageMin}–${t.ageMax} år`;
}

export function TierSelector({
  tiers,
  departCities,
  action,
  defaultQuantities,
  defaultDeparture,
}: {
  tiers: TierOption[];
  departCities: string[];
  action: (formData: FormData) => void;
  defaultQuantities: Record<string, number>;
  defaultDeparture: string | null;
}) {
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const t of tiers) init[t.id] = defaultQuantities[t.id] ?? 0;
    return init;
  });

  const total = Object.values(qty).reduce((s, n) => s + n, 0);
  const totalPrice = tiers.reduce((s, t) => s + (qty[t.id] ?? 0) * t.pricePerPerson, 0);

  // Sortera: vuxna först (efter pris), sedan barn, sedan spädbarn
  const order = { ADULT: 0, CHILD: 1, INFANT: 2 };
  const sorted = [...tiers].sort((a, b) => {
    if (order[a.ageCategory] !== order[b.ageCategory]) return order[a.ageCategory] - order[b.ageCategory];
    return a.pricePerPerson - b.pricePerPerson;
  });

  const set = (id: string, v: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(20, v)) }));

  return (
    <form action={action}>
      <span className="section-mark">— Steg 2 av 5</span>
      <h2 style={{ fontSize: 32, marginTop: 12, marginBottom: 8 }}>Välj resenärer & rum</h2>
      <p className="dim" style={{ marginBottom: 28 }}>
        Ange antal resenärer per kategori och rumstyp. Du kan blanda vuxna, barn och spädbarn
        i samma bokning — t.ex. 4 vuxna och 2 barn.
      </p>

      {departCities.length > 0 && (
        <div className="field" style={{ maxWidth: 320, marginBottom: 24 }}>
          <label htmlFor="departureCity">Avreseort</label>
          <select id="departureCity" name="departureCity" defaultValue={defaultDeparture ?? departCities[0]}>
            {departCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      <div className="tier-rows">
        {sorted.map((t) => (
          <div key={t.id} className={`tier-row ${(qty[t.id] ?? 0) > 0 ? "selected" : ""}`}>
            <div className="tier-row-info">
              <div className="tier-row-title">
                {AGE_LABELS[t.ageCategory]}: {ROOM_LABELS[t.roomType] ?? t.roomType}
                <span className="tier-row-age"> ({ageRange(t)})</span>
              </div>
              <div className="tier-row-price serif tnum">{t.pricePerPerson.toLocaleString("sv-SE")} kr</div>
            </div>
            <div className="tier-row-qty">
              <span className="qty-label">Antal</span>
              <div className="qty-stepper">
                <button type="button" aria-label="Minska" onClick={() => set(t.id, (qty[t.id] ?? 0) - 1)}>−</button>
                <input
                  type="number"
                  name={`qty_${t.id}`}
                  min={0}
                  max={20}
                  value={qty[t.id] ?? 0}
                  onChange={(e) => set(t.id, parseInt(e.target.value) || 0)}
                  aria-label={`Antal ${AGE_LABELS[t.ageCategory]} ${ROOM_LABELS[t.roomType]}`}
                />
                <button type="button" aria-label="Öka" onClick={() => set(t.id, (qty[t.id] ?? 0) + 1)}>+</button>
              </div>
            </div>
          </div>
        ))}
        {tiers.length === 0 && (
          <div className="dim" style={{ padding: 24, background: "var(--c-cream)", textAlign: "center" }}>
            Inga priser är upplagda för den här resan ännu.
          </div>
        )}
      </div>

      <div className="tier-total">
        <div>
          <span className="dim" style={{ fontSize: 13 }}>{total} resenärer valda</span>
        </div>
        <div className="tier-total-amount">
          <span className="dim" style={{ fontSize: 12 }}>Totalt</span>
          <span className="serif tnum" style={{ fontSize: 28, color: "var(--c-ink)" }}>
            {totalPrice.toLocaleString("sv-SE")} kr
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
        <button type="submit" className="btn btn-primary" disabled={total === 0}>
          Fortsätt till resenäruppgifter →
        </button>
      </div>

      <style>{`
        .tier-rows { display: flex; flex-direction: column; }
        .tier-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 4px; border-bottom: 1px solid var(--c-line-soft); gap: 16px;
        }
        .tier-row.selected { background: #FFFAEC; padding-left: 14px; padding-right: 14px; border-color: var(--c-gold-soft); }
        .tier-row-info { flex: 1; min-width: 0; }
        .tier-row-title { font-size: 15px; color: var(--c-ink); font-weight: 500; }
        .tier-row-age { color: var(--c-text-muted); font-weight: 400; font-size: 13px; }
        .tier-row-price { font-size: 20px; margin-top: 4px; }
        .tier-row-qty { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .qty-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-text-muted); font-weight: 600; }
        .qty-stepper { display: flex; align-items: center; border: 1px solid var(--c-line); }
        .qty-stepper button {
          width: 38px; height: 40px; background: var(--c-paper); border: 0;
          font-size: 18px; color: var(--c-ink); cursor: pointer;
        }
        .qty-stepper button:hover { background: var(--c-cream); }
        .qty-stepper input {
          width: 52px; height: 40px; border: 0; border-left: 1px solid var(--c-line);
          border-right: 1px solid var(--c-line); text-align: center;
          font-family: var(--f-mono); font-size: 15px;
          -moz-appearance: textfield;
        }
        .qty-stepper input::-webkit-outer-spin-button,
        .qty-stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .tier-total {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 24px; padding: 18px 22px; background: var(--c-cream); border: 1px solid var(--c-line);
        }
        .tier-total-amount { display: flex; flex-direction: column; align-items: flex-end; }
        @media (max-width: 560px) {
          .tier-row { flex-direction: column; align-items: stretch; gap: 10px; }
          .tier-row-qty { flex-direction: row; justify-content: space-between; align-items: center; }
        }
      `}</style>
    </form>
  );
}
