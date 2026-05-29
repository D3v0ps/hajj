# Hadj Omra Resor — Projektkontext & handoff

> Levande handoff-dokument. Läs detta först i en ny chatt för full kontext.
> **Senast uppdaterad:** 2026-05 efter Wave 0 + 12 parallella agent-leveranser (Fas 1-push).
> **Branch:** `claude/hippo-memory-init-BxqGB` · **Live:** https://hajj.karimkhalil.se
>
> 📍 **Roadmap:** `ROADMAP.md` (prioriterad gap-analys).
> Beslut: BankID **nej**, flerspråk **ja**, Swish **avvaktar**, Fortnox **ja (CSV/SIE)**,
> WhatsApp **manuell wa.me**, bilder **senare**.
> 📄 **`FUNKTIONSOVERSIKT.md`** = presentationsklar funktionslista.
>
> ## Stora tillägg 2026-05 (Fas 1 — 12 parallella agenter + cross-cutting work)
>
> **Foundations:** Migration 0009 (PasswordResetToken, EmailVerificationToken, Review,
> AuditLog, Booking.terms*/refund*, RefundStatus enum, EmailSend.providerRef/kind/SENDING).
> `lib/email.ts` (Resend HTTP + drainQueue), `lib/audit.ts`, `lib/rate-limit.ts`.
> Docker-compose worker-sidecar: tömmer mejlkön var 60:e sek + nattlig pg_dump 02:30
> (14d rotation, `db-backups`-volym) + dagligt reminders-cron 04:00.
>
> **Nya funktioner integrerade:**
> - **E-postmotor + transaktionsmejl** (bekräftelse, kvitto, dokumentgranskning, slut­betalnings­påminnelse, pre-departure). Aktiveras med `RESEND_API_KEY` + `WORKER_TOKEN` GitHub-secrets.
> - **Lösenordsåterställning** (`/glomt-losen`, `/aterstall-losen/[token]`) + **e-postverifiering** (`/verifiera-epost/[token]`).
> - **Slutbetalning online** (`/min-sida/bokningar/[id]/slutbetalning`) via Stripe; webhook sätter PAID_FULL dynamiskt.
> - **GDPR cookie-banner** med 3 kategorier; `cookieConsent`-cookie 12 mån.
> - **Tvåvägs-meddelanden** kund↔kontor + readAt-spårning.
> - **Kundens egen dokumentuppladdning** (`/min-sida/dokument`) + rollskyddad serve-route.
> - **Profil/kontoinställningar** (namn, telefon, lösenord, e-postbyte med verifiering).
> - **Omdömen efter resa** + admin-moderering (`/admin/recensioner`).
> - **Avbokning/återbetalning** (`/min-sida/bokningar/[id]/avboka`) + admin-status hantering.
> - **Bokföringsexport** (CSV/SIE4) `/admin/bokforing` för revisor (VMB-not).
> - **Visumgrupp + rooming CSV-export** + **auditlogg-vy** (`/admin/audit`).
> - **Publik sajt-polish:** flytande WhatsApp/tel-knapp, OG-bild, Product/Offer + BreadcrumbList + FAQPage JSON-LD, klickbara trust-signaler.
> - **Härdning:** rate-limit på login (10/IP+5/email) + register (5/IP), Caddyfile-CSP, CI-grind (typecheck+eslint), `lib/observability.ts` (Sentry-stub), pass-utgångsvalidering (6 mån efter resa), villkors­acceptans registreras med versionsstämpel, audit-logg på key actions.
> - Demo (`/demo`) omarbetat: BankID-steg → kontoskapande med e-post.
>
> **Konfig som krävs för full drift:** `RESEND_API_KEY`, `SITE_EMAIL_FROM`, `WORKER_TOKEN` (GitHub Actions secrets → docker-compose env). Saknas Resend = mejl köas men skickas inte.

En komplett Hajj/Omra-bokningsplattform för den svenska resebyrån **Hadj Omra Resor**
(ersätter gamla hajj.se). Publik sajt + kundportal + fullt backoffice/admin.

---

## 1. Teknisk stack

| Lager | Val |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| DB | PostgreSQL 16 (Docker på VPS) |
| ORM | Prisma 6.19 (manuellt skrivna migrationer 0001–0008) |
| Auth | Auth.js v5 (NextAuth beta), credentials + scrypt (N=2^17) |
| Betalning | Stripe (Checkout + webhook), aktiveras via `STRIPE_SECRET_KEY` |
| OCR | Tesseract.js (klient-side pass-MRZ-skanning) |
| Excel | SheetJS (`xlsx`) för import |
| Styling | Tailwind v4 + design tokens i `app/globals.css` |
| Proxy | Caddy 2 (auto-HTTPS via Let's Encrypt) |
| Hosting | Hetzner CX23 `hajj-prod`, IPv4 62.238.37.54, hel1-dc2 |
| CI/CD | GitHub Actions → bygg image till GHCR → SSH-deploy → `docker compose up` |
| DNS | one.com: `hajj.karimkhalil.se` A → 62.238.37.54 |

**Designsystem:** navy `#0C1E3E`, guld `#B5894B`, cream `#EFE9DD`, paper `#FBFAF6`.
Typsnitt: Newsreader (serif), Manrope (sans), JetBrains Mono. Editorial, svensk, varm.

---

## 2. Datamodell (prisma/schema.prisma)

- **User** (roll CUSTOMER/ADMIN/STAFF), Account, Session (Auth.js)
- **Package** + **PackageTier** — paket per typ (HAJJ/OMRA/HADJ_BADAL/VISUM).
  Tier = rumstyp × ageCategory (ADULT/CHILD/INFANT) med eget pris.
  Package har `departCities[]`, `nightsMakkah`, `nightsMadinah`.
- **Booking** — status-pipeline (DRAFT→SUBMITTED→REVIEW→CONFIRMED→PAID_DEPOSIT→
  PAID_FULL→COMPLETED→CANCELLED), `step` 1–6, `tierQuantities` (Json),
  `adultCount/childCount/infantCount`, `departureCity`.
- **Traveler** — fullt personregister: namn, e-post, telefon, adress, personnr,
  pass (nr/utfärdandedatum/utgång/utfärdandeort), födelsedatum/-land/-ort,
  nationalitet, civilstånd, yrke, ageCategory, rum, flyg.
- **Payment** (SWISH/KLARNA/CARD/BANKGIRO/INVOICE), `providerRef` unik (Stripe).
- **Message** (kund↔kontor, `isInternal` för interna anteckningar)
- **Document**, **Lead** (intresseanmälan), **EmailTemplate** + **EmailSend**

**Deprecerade kolumner** (kvar i DB med data, oanvända i UI — droppa senare efter
backfill): `Traveler.isMahram`, `Traveler.needsAssist`, `Traveler.countryOfOrigin`
(ersatt av birthCountry), `Package.groupSize`.

---

## 3. Routes (alla byggda)

**Publikt** (`app/(public)/`): `/` (Hem+offertform), `/omra`, `/hajj-2027`, `/visum`,
`/hadj-badal`, `/forbered`, `/om-oss`, `/kontakt`, `/paket/[slug]`, `/demo`
(interaktiv flödesdemo), `/villkor`, `/integritet`, `/cookies`, `/tillganglighet`.

**Auth** (`app/(auth)/`): `/logga-in`, `/skapa-konto`. `/setup` (engångs-admin-bootstrap).

**Bokningsflöde** (`app/(booking)/boka/`): `/start/[packageId]` → `/[bookingId]`
med 5 steg: (2) antal per priskombination + avreseort, (3) resenäruppgifter med
pass-OCR + progress-tracker, (4) granska + villkor, (5) betala (Stripe-kort om
aktiverat, annars Swish/Klarna/bankgiro/faktura), (6) klar.

**Portal** (`app/(portal)/min-sida/`): översikt, bokningar (+detalj), dokument, meddelanden.

**Admin** (`app/(admin)/admin/`):
- `/` Dashboard (kanban-pipeline + KPI)
- `/bokningar` (+`/[id]` case-mgmt: tabbar översikt/resenärer/betalningar/chatt+interna anteckningar, statuspipeline, "markera betald")
- `/leads` ("Hajj intresseanmälan")
- `/paket` ("Resor & paket" — sammanslagen lista+filter; `/ny`, `/[id]` CRUD + tiers)
- `/resor` → redirect till `/paket`
- `/resegrupper` (operativ vy per resa: resenärer, rooming, betalning)
- `/resenarer` (sökbar/filtrerbar global resenärslista)
- `/betalningar` (statistik, grafer, jämförelse mellan resor + år-mot-år)
- `/mejl` (mallar) + `/mejl/skicka` (bulkutskick, köar EmailSend)
- `/import` (Excel-import med auto-kolumnmappning)

**API**: `/api/auth/[...nextauth]`, `/api/health` (DB-ping), `/api/setup-admin`,
`/api/import/parse` + `/execute`, `/api/stripe/checkout` + `/webhook`,
`/api/documents/[id]` (rollskyddad nedladdning av uppladdade resedokument).

---

## 4. 20-agents audit (genomförd) — vad som fixades

### 🔴 Säkerhet (åtgärdat)
- **E-postadmin-actions saknade authz**: `deleteTemplate` hade ingen auth alls;
  `createTemplate`/`sendBulk` bara login. → alla kräver nu ADMIN/STAFF (`requireAdmin`).
- **Interna anteckningar läckte till kund**: `/min-sida/meddelanden` filtrerar nu
  `isInternal: false`. Dashboard olästa-räkning likaså.
- **`/setup` admin-skapelse öppen i prod**: endpointen vägrar nu om en admin redan
  finns (bootstrap-only), skapar bara helt nya konton (ingen kapning via upsert).
  `SETUP_MODE` default `0` i compose + deploy. Default-creds borttagna från formuläret.
  Lösenkrav höjt till 8 tecken.

### 🔴 Bokningsintegritet (åtgärdat)
- **Steg-guards**: addTraveler/removeTraveler/acceptAndAdvance/recordDepositIntent
  validerar nu `booking.step` — går ej att hoppa över steg via direkt-POST.
- **Dubbelbetalning**: recordDepositIntent + Stripe-checkout blockerar om aktiv
  (PENDING/COMPLETED) betalning finns; idempotent.
- **Över-/felregistrering**: addTraveler avvisar fler resenärer än bokat och fler
  per ålderskategori än betalt i steg 2.
- **primaryTierId**: pekar på första valda tier (ej godtycklig tiers[0]).

### 🔴 Data/infra (åtgärdat)
- **Booking.user onDelete: Cascade → Restrict** (skyddar finansiell historik).
- **Index tillagda**: Traveler.ageCategory, Package(status,type,startDate), Lead(status,createdAt).
- **Payment.providerRef unik** (Stripe-idempotens).
- **Stripe i deploy**: STRIPE_SECRET_KEY/WEBHOOK_SECRET + SITE_ORG_NR trådas nu via
  GitHub secrets → compose env. Webhook hanterar `session.expired`. Belopp beräknas
  server-side (klient kan ej manipulera).
- **docker-compose**: resource limits (app 1.5G, db 1G) + app-healthcheck +
  caddy väntar på `service_healthy`. `lib/env.ts` validerar STRIPE_*-vars.

### 🟡 Korrekthet/UX (åtgärdat)
- Excel: ageCategory infereras från födelsedatum; gender→null vid okänt; personnummer
  (10/12-siffer) → birthDate; filstorleksgräns 15 MB + typkontroll.
- Betalningar: "fakturerat" exkluderar DRAFT/CANCELLED.
- verifyPayment idempotent (bara PENDING→COMPLETED).
- Dashboard dokumenträkning använder `count` (inte `take:5`-längd).
- SEO: homepage-metadata, Organization JSON-LD, canonical, `/demo` i sitemap.
- a11y: footer arabiska `aria-hidden`, LeadQuoteForm `role=status/alert`.
- Mobil: booking-detalj negativ-margin-overflow fixad; resegrupper-tabell min-width;
  dashboard-pipeline 1-kol på <480px.
- Svensk copy: "ledande"→"äldsta", "tbd"→"ej fastställt", "quote-form"→"offertformulär",
  "dokumentupload"→"dokumentuppladdning", "e-Visa"→"e-visum".
- Auth: dubbel hashning i register borttagen.
- Död kod: oanvända imports/konstanter rensade.

### Återstår (medvetet ej gjort — uppföljning)
- **Perf vid skala**: `/admin/betalningar` + `/admin/resegrupper` laddar mycket nästlat
  i minnet; Excel-import gör en INSERT/rad. Funkar nu, men bör bytas till `groupBy`/
  `createMany` när data växer till tusentals.
- **Stripe `session.expired`** kräver att den webhook-händelsen är aktiverad i Stripe.
- **Rate limiting** på login/register (rekommenderas: Upstash/proxy-lager).
- **Droppa deprecerade kolumner** efter datamigrering.
- **OG-bild** (`opengraph-image.tsx`) saknas.
- **E-post skickas inte faktiskt** — EmailSend köas (QUEUED); koppla Resend/SMTP-worker.
- **Segment-error-boundaries** (`app/(admin)/error.tsx` etc.) ej tillagda.
- ~~**Pass-OCR**: ISO-3→svensk nationalitetsmappning täcker bara ~9 länder.~~ ✅ Fixat
  2026-05: full världsmappning + OCR-felkorrigering + utländska pass.
- **Dashboard** medvetet enkel (per kundens önskemål "avvakta").

---

## 5. Drift & hemligheter

**GitHub Secrets (krävs):** `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`,
`POSTGRES_PASSWORD`, `AUTH_SECRET`.
**Valfria:** `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` (auto-admin vid seed),
`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (aktiverar kortbetalning),
`SITE_ORG_NR` (riktigt org.nr på juridiksidor).
**GitHub Variable:** `SETUP_MODE` (sätt `1` tillfälligt för att bootstrappa första admin via `/setup`, annars `0`).

**Migrationer** körs automatiskt vid container-start (`docker/entrypoint.sh` →
`prisma migrate deploy`). Senaste: `0008_audit_hardening`.

**Skapa admin:** sätt GitHub Variable `SETUP_MODE=1`, deploya, gå till `/setup`,
skapa kontot (kräver att ingen admin finns), sätt sedan `SETUP_MODE=0` + deploya.
Alternativt: sätt `SEED_ADMIN_EMAIL/PASSWORD` secrets.

**Stripe webhook:** peka Stripe → `https://hajj.karimkhalil.se/api/stripe/webhook`,
aktivera `checkout.session.completed` + `checkout.session.expired`.

---

## 6. Arbetssätt i detta projekt

- Commits/PR som `D3v0ps <Karim.khalil002@gmail.com>` — **ingen** Claude-attribution.
- Verifiera alltid `pnpm build` lokalt (sätt dummy-env eller förlita på NEXT_PHASE-
  detektionen i `lib/env.ts`) innan push.
- Inga toaster/fejk-success — funktioner som inte är klara markeras tydligt.
- Mahram/assistans borttaget ur UI per kundkrav (kolumner kvar i DB).
- Sandlådan kan inte SSH:a ut — deploy verifieras via GitHub Actions-loggen.
