"use client";

import { useState, useEffect, useRef } from "react";

type Step =
  | "intro"
  | "package"
  | "login"
  | "details"
  | "review"
  | "pay"
  | "processing"
  | "done";

type Pkg = { id: string; title: string; sub: string; date: string; from: number; days: number; tone: "cream" | "gold" | "navy" };
type Tier = { id: string; name: string; extra: number; label: string };

const PACKAGES: Pkg[] = [
  {
    id: "p1",
    title: "Omra Sommarlov 2026",
    sub: "Familjevänlig resa under skolornas sommarlov",
    date: "31 jul – 10 aug 2026",
    from: 19900,
    days: 11,
    tone: "cream",
  },
  {
    id: "p2",
    title: "Omra Påsklov 2026",
    sub: "Tio dagar med svensk reseledare",
    date: "2 – 12 apr 2026",
    from: 19900,
    days: 11,
    tone: "gold",
  },
  {
    id: "p3",
    title: "Hajj 2027 — Dhul Hijja 1449",
    sub: "Begränsade platser via saudisk partner",
    date: "25 maj – 15 jun 2027",
    from: 89000,
    days: 22,
    tone: "navy",
  },
];

const TIERS: Tier[] = [
  { id: "t4", name: "4-bädd", extra: 0, label: "Familjevänligt, samma kön" },
  { id: "t3", name: "3-bädd", extra: 1000, label: "Mer privat" },
  { id: "t2", name: "2-bädd", extra: 2000, label: "Maximal privat" },
];

const METHODS = [
  { id: "swish", label: "Swish", desc: "Direktbetalning från svensk bank", icon: "🇸🇪" },
  { id: "klarna", label: "Klarna", desc: "Dela upp eller betala om 30 dagar", icon: "K" },
  { id: "card", label: "Visa · Mastercard", desc: "Bankkort, säkert via Stripe", icon: "💳" },
  { id: "invoice", label: "Faktura", desc: "Företag eller förening", icon: "✉" },
];

const STEPS_VISIBLE = [
  { key: "package", name: "Välj paket" },
  { key: "login", name: "Logga in" },
  { key: "details", name: "Rum & resenärer" },
  { key: "review", name: "Granska" },
  { key: "pay", name: "Betala" },
] as const;

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function randomRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function DemoFlow() {
  const [step, setStep] = useState<Step>("intro");
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [tier, setTier] = useState<Tier>(TIERS[0]);
  const [travelers, setTravelers] = useState(2);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [method, setMethod] = useState<string | null>(null);
  const [bookingRef] = useState(() => randomRef());
  const flowRef = useRef<HTMLDivElement>(null);

  // Scrolla in viewporten på det aktiva steget (men inte vid intro)
  useEffect(() => {
    if (step !== "intro" && flowRef.current) {
      const top = flowRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, [step]);

  const total = pkg ? (pkg.from + tier.extra) * travelers : 0;
  const deposit = 5000 * travelers;

  // Beräkna visuell progress för stripen
  const stepOrder = ["intro", "package", "login", "details", "review", "pay", "processing", "done"];
  const stepIdx = stepOrder.indexOf(step);
  const visibleIdx = Math.min(Math.max(stepIdx - 1, 0), 5);

  async function gotoProcessing() {
    setStep("processing");
    await delay(1600);
    setStep("done");
  }

  async function simulateLogin() {
    // Konto-skapande / inloggning med e-post — kort fördröjning för att kännas äkta.
    setStep("login");
    await delay(900);
    setStep("details");
  }

  function reset() {
    setStep("intro");
    setPkg(null);
    setTier(TIERS[0]);
    setTravelers(2);
    setAcceptTerms(false);
    setAcceptPrivacy(false);
    setMethod(null);
  }

  return (
    <div ref={flowRef} className="demo-card">
      {step !== "intro" && step !== "done" && (
        <ProgressStrip currentIdx={visibleIdx} />
      )}

      <div key={step} className="demo-step fade-in">
        {step === "intro" && (
          <StepIntro onStart={() => setStep("package")} />
        )}

        {step === "package" && (
          <StepPackage
            onPick={(p) => {
              setPkg(p);
              simulateLogin();
            }}
          />
        )}

        {step === "login" && <StepLogin />}

        {step === "details" && pkg && (
          <StepDetails
            pkg={pkg}
            tier={tier}
            setTier={setTier}
            travelers={travelers}
            setTravelers={setTravelers}
            onNext={() => setStep("review")}
            onBack={() => setStep("package")}
          />
        )}

        {step === "review" && pkg && (
          <StepReview
            pkg={pkg}
            tier={tier}
            travelers={travelers}
            total={total}
            deposit={deposit}
            acceptTerms={acceptTerms}
            setAcceptTerms={setAcceptTerms}
            acceptPrivacy={acceptPrivacy}
            setAcceptPrivacy={setAcceptPrivacy}
            onNext={() => setStep("pay")}
            onBack={() => setStep("details")}
          />
        )}

        {step === "pay" && pkg && (
          <StepPay
            total={total}
            deposit={deposit}
            method={method}
            setMethod={setMethod}
            onPay={gotoProcessing}
            onBack={() => setStep("review")}
          />
        )}

        {step === "processing" && (
          <StepProcessing method={METHODS.find((m) => m.id === method)?.label ?? "betalsätt"} />
        )}

        {step === "done" && pkg && (
          <StepDone
            pkg={pkg}
            tier={tier}
            travelers={travelers}
            total={total}
            bookingRef={bookingRef}
            method={METHODS.find((m) => m.id === method)?.label ?? "Swish"}
            onReset={reset}
          />
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

/* ---------- Steg-komponenter ---------- */

function ProgressStrip({ currentIdx }: { currentIdx: number }) {
  return (
    <div className="strip" aria-label="Demo-progress">
      {STEPS_VISIBLE.map((s, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "now" : "pending";
        return (
          <div key={s.key} className={`strip-step ${state}`}>
            <div className="strip-ind">{state === "done" ? "✓" : i + 1}</div>
            <div className="strip-name">{s.name}</div>
          </div>
        );
      })}
    </div>
  );
}

function StepIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="intro">
      <span className="section-mark">Demo · cirka 60 sekunder</span>
      <h2 style={{ fontSize: "clamp(28px, 4vw, 38px)", marginTop: 14, marginBottom: 18 }}>
        Klicka dig igenom som en kund.
      </h2>
      <p className="dim" style={{ fontSize: 16, maxWidth: 560, lineHeight: 1.6 }}>
        Du väljer paket, skapar ett konto, väljer rumstyp och resenärer,
        godkänner villkoren och betalar via Swish, Klarna eller kort.
        Ingen riktig data sparas. Du kan göra om så ofta du vill.
      </p>

      <ul className="intro-tips">
        <li>Allt händer i webbläsaren — perfekt på mobil för demonstration</li>
        <li>Realistisk fördröjning på kontoskapande + betalning så det känns äkta</li>
        <li>Tryck &quot;Spela igen&quot; när du är klar för att börja om</li>
      </ul>

      <button className="btn btn-primary big-cta" onClick={onStart}>
        Starta demo →
      </button>
    </div>
  );
}

function StepPackage({ onPick }: { onPick: (p: Pkg) => void }) {
  return (
    <div>
      <span className="section-mark">Steg 1 av 5</span>
      <h3 style={{ fontSize: 26, marginTop: 12, marginBottom: 12 }}>Välj paket</h3>
      <p className="dim" style={{ marginBottom: 24, fontSize: 14 }}>
        Klicka på det paket du vill boka. På riktiga sajten kan du också filtrera på
        datum, stad, hotellstandard och rumstyp.
      </p>

      <div className="pkg-cards">
        {PACKAGES.map((p) => (
          <button key={p.id} className={`pkg-card pkg-card-${p.tone}`} onClick={() => onPick(p)}>
            <div className="pkg-card-img" aria-hidden="true" />
            <div className="pkg-card-body">
              <span className="tag gold" style={{ alignSelf: "flex-start" }}>
                {p.id === "p3" ? "Hajj" : "Omra"}
              </span>
              <h4>{p.title}</h4>
              <p className="dim">{p.sub}</p>
              <div className="pkg-card-meta">
                <span>{p.date}</span>
                <span>{p.days} dagar</span>
              </div>
              <div className="pkg-card-price">
                <span className="dim small">Från</span>
                <strong>{p.from.toLocaleString("sv-SE")} kr</strong>
                <span className="dim small">per person</span>
              </div>
              <div className="pkg-card-cta">Välj paket →</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepLogin() {
  return (
    <div className="login-mock">
      <span className="section-mark">Steg 2 av 5 · Konto</span>
      <h3 style={{ fontSize: 26, marginTop: 12, marginBottom: 24 }}>Skapa konto med e-post</h3>

      <div className="bankid-box">
        <div className="bankid-spinner" aria-hidden="true">
          <div className="spinner-ring" />
        </div>
        <p className="bankid-status">Förbereder ditt konto…</p>
        <p className="dim small">
          (Demo — på den skarpa sajten skapar du ett konto med e-post + lösenord
          eller loggar in i befintligt konto.)
        </p>
      </div>
    </div>
  );
}

function StepDetails({
  pkg,
  tier,
  setTier,
  travelers,
  setTravelers,
  onNext,
  onBack,
}: {
  pkg: Pkg;
  tier: Tier;
  setTier: (t: Tier) => void;
  travelers: number;
  setTravelers: (n: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <span className="section-mark">Steg 3 av 5</span>
      <h3 style={{ fontSize: 26, marginTop: 12, marginBottom: 8 }}>Rum & resenärer</h3>
      <p className="dim" style={{ marginBottom: 24, fontSize: 14 }}>
        Du bokar <strong>{pkg.title}</strong>. Välj rumstyp och hur många ni är.
      </p>

      <div className="tier-grid-demo">
        {TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tier-opt-demo ${tier.id === t.id ? "selected" : ""}`}
            onClick={() => setTier(t)}
          >
            <div className="tier-opt-head">
              <strong>{t.name}</strong>
              <span className="tier-opt-extra">
                {t.extra === 0 ? "" : `+${t.extra.toLocaleString("sv-SE")} kr/p`}
              </span>
            </div>
            <p className="dim small">{t.label}</p>
          </button>
        ))}
      </div>

      <div className="counter">
        <span className="counter-label">Antal resenärer</span>
        <div className="counter-controls">
          <button
            type="button"
            onClick={() => setTravelers(Math.max(1, travelers - 1))}
            aria-label="Minska antal"
          >
            −
          </button>
          <span className="counter-value">{travelers}</span>
          <button
            type="button"
            onClick={() => setTravelers(Math.min(8, travelers + 1))}
            aria-label="Öka antal"
          >
            +
          </button>
        </div>
      </div>

      <div className="traveler-card">
        <span className="eyebrow">Resenär 1 av {travelers} · auto-ifylld från ditt konto</span>
        <p style={{ margin: "10px 0 4px", fontFamily: "var(--f-serif)", fontSize: 18 }}>
          Karim Khalil
        </p>
        <p className="dim small">
          19850315-1234 · pass 12345678 · senare i flödet laddas pass + foto upp på Min sida
        </p>
      </div>

      <div className="footer-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Byt paket</button>
        <button type="button" className="btn btn-primary" onClick={onNext}>Granska bokning →</button>
      </div>
    </div>
  );
}

function StepReview({
  pkg,
  tier,
  travelers,
  total,
  deposit,
  acceptTerms,
  setAcceptTerms,
  acceptPrivacy,
  setAcceptPrivacy,
  onNext,
  onBack,
}: {
  pkg: Pkg;
  tier: Tier;
  travelers: number;
  total: number;
  deposit: number;
  acceptTerms: boolean;
  setAcceptTerms: (v: boolean) => void;
  acceptPrivacy: boolean;
  setAcceptPrivacy: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = acceptTerms && acceptPrivacy;
  return (
    <div>
      <span className="section-mark">Steg 4 av 5</span>
      <h3 style={{ fontSize: 26, marginTop: 12, marginBottom: 8 }}>Granska bokningen</h3>
      <p className="dim" style={{ marginBottom: 24, fontSize: 14 }}>
        Kontrollera att allt stämmer. När du fortsätter registreras bokningen och
        kontoret kontaktar dig för dokumentupload + slutbetalning.
      </p>

      <div className="rev-grid-demo">
        <div><span className="eyebrow">Paket</span><p>{pkg.title}</p></div>
        <div><span className="eyebrow">Datum</span><p>{pkg.date}</p></div>
        <div><span className="eyebrow">Rumstyp</span><p>{tier.name}</p></div>
        <div><span className="eyebrow">Resenärer</span><p>{travelers} st</p></div>
      </div>

      <div className="rev-total-demo">
        <div>
          <span className="eyebrow gold">Totalpris</span>
          <p className="serif tnum big">{total.toLocaleString("sv-SE")} kr</p>
          <p className="dim small">
            varav anmälningsavgift {deposit.toLocaleString("sv-SE")} kr betalas nu
          </p>
        </div>
      </div>

      <div className="accept-block">
        <label>
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
          <span>Jag har läst och godkänner <a className="btn-link">resevillkoren</a>.</span>
        </label>
        <label>
          <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} />
          <span>Jag samtycker till behandling enligt <a className="btn-link">integritetspolicyn</a>.</span>
        </label>
      </div>

      <div className="footer-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Ändra</button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNext}
          disabled={!canContinue}
        >
          Fortsätt till betalning →
        </button>
      </div>
    </div>
  );
}

function StepPay({
  total,
  deposit,
  method,
  setMethod,
  onPay,
  onBack,
}: {
  total: number;
  deposit: number;
  method: string | null;
  setMethod: (id: string) => void;
  onPay: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <span className="section-mark">Steg 5 av 5</span>
      <h3 style={{ fontSize: 26, marginTop: 12, marginBottom: 8 }}>Betala anmälningsavgift</h3>
      <p className="dim" style={{ marginBottom: 12, fontSize: 14 }}>
        Anmälningsavgift <strong className="tnum">{deposit.toLocaleString("sv-SE")} kr</strong>
        {" "}av totala <strong className="tnum">{total.toLocaleString("sv-SE")} kr</strong>.
        Slutbetalning sker 30 dagar före avresa.
      </p>

      <div className="pay-list-demo">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`pay-opt-demo ${method === m.id ? "selected" : ""}`}
            onClick={() => setMethod(m.id)}
          >
            <div className="pay-icon" aria-hidden="true">{m.icon}</div>
            <div className="pay-text">
              <strong>{m.label}</strong>
              <span className="dim small">{m.desc}</span>
            </div>
            <span className="pay-arrow">{method === m.id ? "●" : "○"}</span>
          </button>
        ))}
      </div>

      <div className="footer-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Tillbaka</button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPay}
          disabled={!method}
        >
          Betala {deposit.toLocaleString("sv-SE")} kr →
        </button>
      </div>
    </div>
  );
}

function StepProcessing({ method }: { method: string }) {
  return (
    <div className="processing">
      <div className="spinner-ring big" aria-hidden="true" />
      <p className="processing-label">Bearbetar betalning via {method}…</p>
      <p className="dim small">Detta är en demo — ingen riktig betalning sker.</p>
    </div>
  );
}

function StepDone({
  pkg,
  tier,
  travelers,
  total,
  bookingRef,
  method,
  onReset,
}: {
  pkg: Pkg;
  tier: Tier;
  travelers: number;
  total: number;
  bookingRef: string;
  method: string;
  onReset: () => void;
}) {
  return (
    <div className="done">
      <div className="done-check" aria-hidden="true">✓</div>
      <span className="section-mark">Bokning bekräftad</span>
      <h3 style={{ fontSize: 28, marginTop: 12, marginBottom: 10 }}>
        Tack — bokningen är registrerad.
      </h3>
      <p className="dim" style={{ fontSize: 15, marginBottom: 24 }}>
        Referens <strong style={{ color: "var(--c-ink)" }}>{bookingRef}</strong> ·
        betald via {method} · skickad till karim@example.com (demo).
      </p>

      <div className="done-summary">
        <div><span className="eyebrow">Paket</span><p>{pkg.title}</p></div>
        <div><span className="eyebrow">Datum</span><p>{pkg.date}</p></div>
        <div><span className="eyebrow">Rumstyp</span><p>{tier.name} · {travelers} resenärer</p></div>
        <div><span className="eyebrow">Totalt</span><p className="tnum">{total.toLocaleString("sv-SE")} kr</p></div>
      </div>

      <ol className="next-steps">
        {[
          "Bekräftelse via e-post inom 5 min",
          "Ladda upp pass + passfoto på Min sida (inom 7 dagar)",
          "Vi granskar dokumenten och återkommer",
          "Slutbetalning 30 dagar före avresa",
          "Förresemöte i Stockholm 2 veckor före avresa",
        ].map((t, i) => (
          <li key={i}>
            <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>

      <div className="done-actions">
        <button type="button" className="btn btn-primary" onClick={onReset}>
          ↻ Spela igen
        </button>
        <a href="/skapa-konto" className="btn btn-ghost">
          Skapa riktigt konto →
        </a>
      </div>
    </div>
  );
}

/* ---------- Stilar ---------- */

const styles = `
  .demo-card {
    background: #fff;
    border: 1px solid var(--c-line);
    padding: 40px 48px;
    min-height: 480px;
  }

  .demo-step {
    min-height: 360px;
  }

  .fade-in {
    animation: demoFadeIn 320ms ease-out;
  }
  @keyframes demoFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .fade-in { animation: none; }
  }

  /* Progress-strip */
  .strip {
    display: flex;
    gap: 0;
    margin-bottom: 32px;
    border-bottom: 1px solid var(--c-line-soft);
    padding-bottom: 18px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .strip-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 1 0 80px;
    opacity: 0.4;
    transition: opacity 200ms;
    text-align: center;
  }
  .strip-step.done, .strip-step.now { opacity: 1; }
  .strip-ind {
    width: 28px; height: 28px;
    border: 1px solid var(--c-line);
    background: var(--c-paper);
    color: var(--c-text-muted);
    font-family: var(--f-mono); font-size: 12px;
    display: grid; place-items: center;
    transition: all 200ms;
  }
  .strip-step.done .strip-ind { background: var(--c-green-soft); color: #fff; border-color: var(--c-green-soft); }
  .strip-step.now .strip-ind { background: var(--c-ink); color: #fff; border-color: var(--c-ink); }
  .strip-name { font-size: 11px; letter-spacing: 0.06em; color: var(--c-text-muted); text-transform: uppercase; font-weight: 600; }

  /* Intro */
  .intro-tips {
    list-style: none; padding: 0;
    margin: 28px 0;
    display: grid; gap: 10px;
    max-width: 560px;
  }
  .intro-tips li {
    padding-left: 24px;
    position: relative;
    font-size: 14px;
    line-height: 1.55;
  }
  .intro-tips li::before {
    content: "→";
    position: absolute; left: 0;
    color: var(--c-gold);
    font-weight: 700;
  }
  .big-cta {
    padding: 18px 32px;
    font-size: 16px;
  }

  /* Paket-kort */
  .pkg-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .pkg-card {
    background: #fff;
    border: 1px solid var(--c-line);
    text-align: left;
    cursor: pointer;
    transition: all 180ms;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0;
    font: inherit;
    color: inherit;
  }
  .pkg-card:hover { border-color: var(--c-ink); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(12, 30, 62, 0.08); }
  .pkg-card-img { height: 110px; }
  .pkg-card-cream .pkg-card-img { background: var(--c-cream); }
  .pkg-card-gold .pkg-card-img { background: linear-gradient(135deg, var(--c-gold), var(--c-gold-soft)); }
  .pkg-card-navy .pkg-card-img { background: var(--c-ink); }
  .pkg-card-body { padding: 20px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .pkg-card-body h4 { font-family: var(--f-serif); font-size: 18px; margin: 4px 0 0; color: var(--c-ink); line-height: 1.25; font-weight: 460; }
  .pkg-card-body .dim { font-size: 13px; line-height: 1.5; }
  .pkg-card-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; color: var(--c-text-muted); margin-top: 4px; }
  .pkg-card-meta span:not(:last-child)::after { content: "·"; margin-left: 12px; color: var(--c-line); }
  .pkg-card-price { display: flex; align-items: baseline; gap: 6px; margin-top: 8px; font-family: var(--f-serif); }
  .pkg-card-price strong { font-size: 22px; color: var(--c-ink); }
  .pkg-card-price .small { font-size: 11px; }
  .pkg-card-cta { color: var(--c-gold); font-size: 13px; font-weight: 600; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--c-line-soft); }

  /* Kontoskapande-mock */
  .login-mock { display: flex; flex-direction: column; align-items: flex-start; }
  .bankid-box {
    margin-top: 24px;
    padding: 40px;
    background: var(--c-cream);
    border: 1px solid var(--c-line);
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .bankid-spinner { width: 56px; height: 56px; display: grid; place-items: center; }
  .spinner-ring {
    width: 40px; height: 40px;
    border: 3px solid var(--c-line);
    border-top-color: var(--c-gold);
    border-radius: 50%;
    animation: spin 800ms linear infinite;
  }
  .spinner-ring.big { width: 56px; height: 56px; border-width: 4px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .bankid-status { font-family: var(--f-serif); font-size: 18px; margin: 0; color: var(--c-ink); }

  /* Rum & resenärer */
  .tier-grid-demo { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  .tier-opt-demo {
    background: #fff;
    border: 1px solid var(--c-line);
    padding: 16px;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
    transition: all 160ms;
  }
  .tier-opt-demo:hover { border-color: var(--c-ink); }
  .tier-opt-demo.selected { border-color: var(--c-gold); background: #FFFAEC; }
  .tier-opt-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .tier-opt-head strong { font-family: var(--f-serif); font-size: 17px; color: var(--c-ink); }
  .tier-opt-extra { font-family: var(--f-mono); font-size: 11px; color: var(--c-gold); }

  .counter {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 18px;
    background: var(--c-cream);
    border: 1px solid var(--c-line-soft);
    margin-bottom: 16px;
  }
  .counter-label { font-size: 13px; color: var(--c-text-muted); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }
  .counter-controls { display: flex; align-items: center; gap: 16px; }
  .counter-controls button {
    width: 36px; height: 36px;
    border: 1px solid var(--c-line);
    background: #fff;
    cursor: pointer;
    font-size: 18px;
    color: var(--c-ink);
    display: grid; place-items: center;
  }
  .counter-controls button:hover { border-color: var(--c-ink); }
  .counter-value { font-family: var(--f-serif); font-size: 22px; min-width: 24px; text-align: center; color: var(--c-ink); }

  .traveler-card {
    padding: 16px 18px;
    background: var(--c-paper);
    border: 1px solid var(--c-line-soft);
    border-left: 3px solid var(--c-gold);
    margin-bottom: 24px;
  }

  /* Granska */
  .rev-grid-demo { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 32px; padding: 20px 22px; background: var(--c-cream); border: 1px solid var(--c-line); margin-bottom: 18px; }
  .rev-grid-demo p { font-family: var(--f-serif); font-size: 17px; margin: 4px 0 0; color: var(--c-ink); }
  .rev-total-demo { padding: 22px; background: var(--c-ink); color: #fff; margin-bottom: 24px; }
  .rev-total-demo .eyebrow { color: var(--c-gold); }
  .rev-total-demo .big { font-size: 32px; margin: 6px 0 4px; }
  .rev-total-demo p { color: #fff; }
  .rev-total-demo p.dim { color: #C3CCD8; }
  .accept-block { display: grid; gap: 12px; margin-bottom: 24px; padding: 16px 18px; border: 1px solid var(--c-line-soft); }
  .accept-block label { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; line-height: 1.5; cursor: pointer; }
  .accept-block input[type="checkbox"] { margin-top: 3px; flex-shrink: 0; }
  .accept-block .btn-link { color: var(--c-gold); cursor: pointer; }

  /* Betala */
  .pay-list-demo { display: grid; gap: 8px; margin-bottom: 24px; }
  .pay-opt-demo {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    gap: 14px;
    align-items: center;
    padding: 14px 18px;
    background: #fff;
    border: 1px solid var(--c-line);
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition: all 160ms;
  }
  .pay-opt-demo:hover { border-color: var(--c-ink); }
  .pay-opt-demo.selected { border-color: var(--c-gold); background: #FFFAEC; }
  .pay-icon { width: 44px; height: 44px; background: var(--c-cream); display: grid; place-items: center; font-size: 20px; font-family: var(--f-serif); color: var(--c-ink); }
  .pay-text { display: flex; flex-direction: column; gap: 2px; }
  .pay-text strong { font-family: var(--f-serif); font-size: 16px; color: var(--c-ink); }
  .pay-arrow { font-size: 18px; color: var(--c-gold); }

  /* Processing */
  .processing {
    min-height: 320px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }
  .processing-label { font-family: var(--f-serif); font-size: 22px; color: var(--c-ink); margin: 8px 0 0; }

  /* Done */
  .done {
    padding: 8px 0;
    text-align: center;
  }
  .done-check {
    width: 80px; height: 80px;
    border-radius: 50%;
    background: var(--c-green-soft);
    color: #fff;
    font-size: 40px;
    display: grid;
    place-items: center;
    margin: 0 auto 20px;
    animation: doneCheck 600ms ease-out;
  }
  @keyframes doneCheck {
    0% { transform: scale(0.5); opacity: 0; }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  .done-summary {
    display: grid; grid-template-columns: 1fr 1fr; gap: 18px 32px;
    padding: 22px 24px;
    background: var(--c-cream);
    border: 1px solid var(--c-line);
    text-align: left;
    margin-bottom: 24px;
  }
  .done-summary p { font-family: var(--f-serif); font-size: 16px; margin: 4px 0 0; color: var(--c-ink); }
  .next-steps {
    list-style: none; padding: 0; margin: 0 0 28px;
    text-align: left;
    display: grid; gap: 10px;
  }
  .next-steps li {
    display: grid;
    grid-template-columns: 38px 1fr;
    gap: 12px;
    padding: 12px 14px;
    background: #fff;
    border: 1px solid var(--c-line-soft);
    align-items: center;
    font-size: 14px;
  }
  .next-steps .step-n {
    font-family: var(--f-mono); font-size: 11px; color: var(--c-gold);
    letter-spacing: 0.14em;
  }
  .done-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  /* Gemensamt */
  .footer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 28px;
    padding-top: 24px;
    border-top: 1px solid var(--c-line-soft);
    flex-wrap: wrap;
  }
  .small { font-size: 12px; }

  /* Mobil */
  @media (max-width: 720px) {
    .demo-card { padding: 24px 18px; }
    .pkg-cards { grid-template-columns: 1fr; }
    .pkg-card-img { height: 90px; }
    .tier-grid-demo { grid-template-columns: 1fr; }
    .rev-grid-demo { grid-template-columns: 1fr; gap: 14px; padding: 16px 18px; }
    .done-summary { grid-template-columns: 1fr; gap: 14px; padding: 18px; }
    .strip { gap: 4px; }
    .strip-step { flex: 0 0 64px; }
    .strip-name { font-size: 10px; }
    .footer-row { flex-direction: column-reverse; align-items: stretch; }
    .footer-row .btn { width: 100%; justify-content: center; }
    .done-actions .btn { width: 100%; justify-content: center; }
    .bankid-box { padding: 24px 20px; }
    .rev-total-demo .big { font-size: 26px; }
  }
  @media (max-width: 480px) {
    .demo-card { padding: 20px 16px; }
    .pay-opt-demo { grid-template-columns: 36px 1fr auto; padding: 12px 14px; }
    .pay-icon { width: 36px; height: 36px; font-size: 16px; }
  }
`;
