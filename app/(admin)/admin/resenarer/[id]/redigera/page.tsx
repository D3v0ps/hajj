import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { COUNTRY_OPTIONS, CIVIL_STATUS_OPTIONS } from "@/lib/countries";
import { editTravelerAdmin, deleteTravelerAdmin } from "@/app/actions/admin-travelers";

// Synkat med PAYMENT_METHODS i app/actions/admin-travelers.ts (kan ej importeras
// därifrån eftersom 'use server'-filer bara får exportera async-funktioner).
const PAYMENT_METHOD_OPTIONS = ["Kontant", "Swish", "Bankgiro", "Klarna", "Kort", "Faktura", "Annat"] as const;

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ ok?: string; error?: string; from?: string }>;

const OK_MSG: Record<string, string> = {
  sparat: "✓ Ändringarna sparades.",
};

const toDateValue = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default async function EditTravelerPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logga-in");
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") redirect("/min-sida");

  const { id } = await params;
  const { ok, error, from } = await searchParams;

  const t = await prisma.traveler.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          package: { select: { id: true, title: true } },
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!t) notFound();

  // Var ska "Tillbaka"-knappen peka? Tas från ?from-param (säkrad till intern path).
  const backHref = from && from.startsWith("/") && !from.startsWith("//") ? from : "/admin/resenarer";

  return (
    <div className="adm-pageframe">
      <div className="adm-pagehead">
        <div>
          <p className="adm-crumb">
            admin / <Link href="/admin/resenarer">resenärer</Link> / redigera
          </p>
          <h1 style={{ fontFamily: "var(--f-serif)", fontSize: 28, color: "var(--c-ink)", margin: 0 }}>
            {t.firstName} {t.lastName}
          </h1>
          <p className="dim" style={{ fontSize: 14, marginTop: 4 }}>
            {t.booking?.package?.title ?? "—"}
            {t.booking && (
              <>
                {" · "}
                <Link href={`/admin/bokningar/${t.booking.id}`} className="btn-link" style={{ fontSize: 13 }}>
                  Öppna bokningen →
                </Link>
              </>
            )}
          </p>
        </div>
        <Link href={backHref} className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 12 }}>
          ← Tillbaka
        </Link>
      </div>

      {ok && OK_MSG[ok] && (
        <div role="status" className="et-flash ok">{OK_MSG[ok]}</div>
      )}
      {error && (
        <div role="alert" className="et-flash err">{error}</div>
      )}

      <form action={editTravelerAdmin.bind(null, t.id)} className="et-form">
        <fieldset>
          <legend>Identitet</legend>
          <div className="grid3">
            <div className="field">
              <label htmlFor="firstName">Förnamn *</label>
              <input id="firstName" name="firstName" required defaultValue={t.firstName} />
            </div>
            <div className="field">
              <label htmlFor="lastName">Efternamn *</label>
              <input id="lastName" name="lastName" required defaultValue={t.lastName} />
            </div>
            <div className="field">
              <label htmlFor="ageCategory">Ålderskategori</label>
              <select id="ageCategory" name="ageCategory" defaultValue={t.ageCategory}>
                <option value="ADULT">Vuxen (12+)</option>
                <option value="CHILD">Barn (2–11)</option>
                <option value="INFANT">Spädbarn (0–1)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="gender">Kön</label>
              <select id="gender" name="gender" defaultValue={t.gender ?? ""}>
                <option value="">—</option>
                <option value="M">Man</option>
                <option value="F">Kvinna</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="birthDate">Födelsedatum</label>
              <input id="birthDate" name="birthDate" type="date" defaultValue={toDateValue(t.birthDate)} />
            </div>
            <div className="field">
              <label htmlFor="personnummer">Personnummer</label>
              <input id="personnummer" name="personnummer" inputMode="numeric" placeholder="ÅÅÅÅMMDD-XXXX" defaultValue={t.personnummer ?? ""} />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Kontakt</legend>
          <div className="grid2">
            <div className="field">
              <label htmlFor="email">E-post</label>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={t.email ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="phone">Mobilnummer</label>
              <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={t.phone ?? ""} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="address">Adress</label>
            <input id="address" name="address" placeholder="Gata, postnummer, ort" defaultValue={t.address ?? ""} />
          </div>
        </fieldset>

        <fieldset>
          <legend>Pass</legend>
          <div className="grid3">
            <div className="field">
              <label htmlFor="passportNo">Passnummer</label>
              <input id="passportNo" name="passportNo" defaultValue={t.passportNo ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="passIssueDate">Pass utfärdat</label>
              <input id="passIssueDate" name="passIssueDate" type="date" defaultValue={toDateValue(t.passIssueDate)} />
            </div>
            <div className="field">
              <label htmlFor="passportExp">Pass giltigt t.o.m.</label>
              <input id="passportExp" name="passportExp" type="date" defaultValue={toDateValue(t.passportExp)} />
            </div>
            <div className="field">
              <label htmlFor="passIssuePlace">Utfärdandeort</label>
              <input id="passIssuePlace" name="passIssuePlace" defaultValue={t.passIssuePlace ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="nationality">Nationalitet</label>
              <select id="nationality" name="nationality" defaultValue={t.nationality ?? ""}>
                <option value="">Välj land…</option>
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="civilStatus">Civilstånd</label>
              <select id="civilStatus" name="civilStatus" defaultValue={t.civilStatus ?? ""}>
                <option value="">—</option>
                {CIVIL_STATUS_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Födelse, yrke, övrigt</legend>
          <div className="grid3">
            <div className="field">
              <label htmlFor="birthCountry">Födelseland</label>
              <select id="birthCountry" name="birthCountry" defaultValue={t.birthCountry ?? ""}>
                <option value="">Välj land…</option>
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="birthCity">Födelseort</label>
              <input id="birthCity" name="birthCity" defaultValue={t.birthCity ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="occupation">Yrke</label>
              <input id="occupation" name="occupation" defaultValue={t.occupation ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="roomAssignment">Rum</label>
              <input id="roomAssignment" name="roomAssignment" defaultValue={t.roomAssignment ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="flightOut">Flyg ut</label>
              <input id="flightOut" name="flightOut" defaultValue={t.flightOut ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="flightReturn">Flyg hem</label>
              <input id="flightReturn" name="flightReturn" defaultValue={t.flightReturn ?? ""} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="notes">Övrig viktig information</label>
            <textarea id="notes" name="notes" rows={3} defaultValue={t.notes ?? ""} placeholder="Allergier, särskilda behov, mediciner …" />
          </div>
        </fieldset>

        <fieldset className="et-payment">
          <legend>Betalning</legend>
          <p className="dim" style={{ fontSize: 13, marginBottom: 14 }}>
            Ange totalt belopp som denna resenär har betalat. Lägg in nytt belopp = nuvarande summa
            (vid t.ex. kontantbetalning: skriv den nya totalsumman, inte delbeloppet).
          </p>
          <div className="grid3">
            <div className="field">
              <label htmlFor="amountPaid">Betalt totalt (kr)</label>
              <input
                id="amountPaid"
                name="amountPaid"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                defaultValue={t.amountPaid}
                style={{ fontSize: 18, fontFamily: "var(--f-serif)" }}
              />
            </div>
            <div className="field">
              <label htmlFor="paymentMethod">Betalsätt (senaste)</label>
              <select id="paymentMethod" name="paymentMethod" defaultValue={t.paymentMethod ?? ""}>
                <option value="">—</option>
                {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="paymentDate">Betalningsdatum</label>
              <input id="paymentDate" name="paymentDate" type="date" defaultValue={toDateValue(t.paymentDate)} />
            </div>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="paymentNote">Anteckning om betalning</label>
            <input
              id="paymentNote"
              name="paymentNote"
              defaultValue={t.paymentNote ?? ""}
              placeholder="t.ex. 'Kontant vid info-mötet 2026-03-15' eller 'Faktura skickad till företaget'"
            />
          </div>
        </fieldset>

        <div className="et-actions">
          <button type="submit" className="btn btn-primary">Spara ändringar</button>
        </div>
      </form>

      <details className="et-danger">
        <summary>Ta bort resenären</summary>
        <p className="dim" style={{ fontSize: 13, margin: "12px 0" }}>
          Permanent radering. Bokningens resenärs-antal uppdateras inte automatiskt
          — justera i bokningsvyn om det behövs.
        </p>
        <form action={deleteTravelerAdmin.bind(null, t.id)}>
          <input type="hidden" name="returnTo" value={backHref} />
          <button type="submit" className="btn et-delete">Ta bort permanent</button>
        </form>
      </details>

      <style>{`
        .et-flash { padding: 10px 14px; margin-bottom: 16px; font-size: 14px; border: 1px solid; }
        .et-flash.ok { background: #E6F1EA; border-color: var(--c-green-soft); color: var(--c-green); }
        .et-flash.err { background: #FBE9E2; border-color: var(--c-warn); color: var(--c-warn); }

        .et-form fieldset { border: 1px solid var(--c-line); padding: 24px; margin: 0 0 18px; background: #fff; }
        .et-form legend { padding: 0 10px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; color: var(--c-gold); }
        .et-form .field { display: flex; flex-direction: column; gap: 6px; }
        .et-form .field label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; color: var(--c-text-muted); }
        .et-form input, .et-form select, .et-form textarea {
          padding: 10px 12px; border: 1px solid var(--c-line); background: #fff;
          font: inherit;
        }
        .et-form input:focus, .et-form select:focus, .et-form textarea:focus {
          outline: 2px solid var(--c-gold); outline-offset: -1px;
        }
        .et-form .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .et-form .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .et-payment { background: var(--c-cream) !important; border-color: var(--c-gold-soft) !important; }
        .et-actions { display: flex; justify-content: flex-end; padding-top: 8px; }
        .et-danger {
          margin-top: 32px; padding: 16px; background: #fff;
          border: 1px solid var(--c-line-soft);
        }
        .et-danger summary { cursor: pointer; font-size: 13px; color: var(--c-warn); font-weight: 600; }
        .et-delete { background: var(--c-warn); color: #fff; padding: 10px 18px; font-size: 13px; }
        .et-delete:hover { background: #7a3520; }
        @media (max-width: 900px) {
          .et-form .grid3 { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .et-form fieldset { padding: 18px 16px; }
          .et-form .grid2, .et-form .grid3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
