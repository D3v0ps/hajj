type Step = {
  num: number;
  name: string;
  meta?: string;
};

const STEPS: Step[] = [
  { num: 1, name: "Logga in", meta: "Konto" },
  { num: 2, name: "Välj rumstyp" },
  { num: 3, name: "Resenärer & dokument" },
  { num: 4, name: "Granska & godkänn" },
  { num: 5, name: "Betala anmälningsavgift" },
];

export function ProgressNav({ currentStep, packageTitle }: { currentStep: number; packageTitle: string }) {
  return (
    <aside className="bo-progress">
      <span className="mark">— Bokning · Steg {Math.min(currentStep, 5)} av 5</span>
      <h2 style={{ fontWeight: 380, fontSize: 28, marginBottom: 8 }}>
        {currentStep >= 6 ? <>Bokning <em>mottagen</em>.</> : currentStep >= 4 ? <>Du är <em>nästan klar</em>.</> : currentStep >= 3 ? <>Du är <em>halvvägs</em>.</> : <>Påbörja <em>din bokning</em>.</>}
      </h2>
      <p className="dim" style={{ fontSize: 13, marginBottom: 28 }}>{packageTitle}</p>

      <div className="bo-steps">
        {STEPS.map((s) => {
          const state = currentStep > s.num ? "done" : currentStep === s.num ? "now" : "pending";
          return (
            <div key={s.num} className={`bo-step ${state}`}>
              <div className="ind">{state === "done" ? "✓" : s.num}</div>
              <div>
                <div className="name">{s.name}</div>
                <div className="meta">
                  {state === "done" ? "Klart" : state === "now" ? "Du är här" : s.meta ?? ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .bo-progress { padding: 32px 28px; background: var(--c-cream); border: 1px solid var(--c-line); position: sticky; top: 80px; }
        .bo-progress .mark { font-family: var(--f-mono); font-size: 11px; color: var(--c-gold); letter-spacing: 0.16em; display: block; margin-bottom: 14px; }
        .bo-progress h2 em { font-style: italic; color: var(--c-gold); }
        .bo-steps { display: flex; flex-direction: column; gap: 18px; }
        .bo-step { display: grid; grid-template-columns: 32px 1fr; gap: 14px; align-items: start; opacity: 0.45; }
        .bo-step.done, .bo-step.now { opacity: 1; }
        .bo-step .ind {
          width: 32px; height: 32px; display: grid; place-items: center;
          border: 1px solid var(--c-line); background: var(--c-paper);
          font-family: var(--f-mono); font-size: 13px; color: var(--c-text-muted);
        }
        .bo-step.done .ind { background: var(--c-green-soft); color: #fff; border-color: var(--c-green-soft); }
        .bo-step.now .ind { background: var(--c-ink); color: #fff; border-color: var(--c-ink); }
        .bo-step .name { font-family: var(--f-serif); font-size: 16px; color: var(--c-ink); margin-bottom: 2px; }
        .bo-step .meta { font-size: 11px; color: var(--c-text-muted); letter-spacing: 0.04em; text-transform: uppercase; }
      `}</style>
    </aside>
  );
}
