# Granskningsrapport — 10-agentaudit 2026-05

Sammanställning av alla fynd från de 10 parallella granskningsagenterna.
Status: ✅ = fixat och pushat · 🔧 = att fixa · 📋 = dokumenterat för framtida pass.

---

## 1. Det specifika klagomålet ("översättningen är fel, kan inte gå tillbaka till svenska")

| ID | Fynd | Status |
|---|---|---|
| 1.1 | Cookie-prioritet i `getLocale()` låste användaren i engelska | ✅ |
| 1.2 | AR `siteName` translit:erade firmanamnet → latinskt | ✅ |
| 1.3 | AR `trustOffices`/`trustLanguages` översatt till språknamn → samma kod-form som SV/EN | ✅ |
| 1.4 | AR `whatsapp` translit:erat → behåll varumärket "WhatsApp" | ✅ |
| 1.5 | AR hero-titel: `ال`-artikel hamnade fel i `<em>` → splittat så `الثقة` är markerad | ✅ |
| 1.6 | EN "Göteborg" → "Gothenburg" | ✅ |
| 1.7 | EN "homecoming" → "return" (brittisk) + "About us" → "About" konsekvens | ✅ |
| 1.8 | SV/EN/AR "Hajj/Hadj"-inkonsekvens i `tagline` | ✅ |
| 1.9 | LeadQuoteForm + FloatingContact + CookieBanner hade `lead.*`/`floating.*`/`cookies.*`-nycklar i sv.json men använde dem aldrig (spöknycklar) | ✅ aktiverade LeadQuoteForm + FloatingContact |
| 1.10 | `localeHref` icke-idempotent vid `localeHref("/en/omra", "sv")` | ✅ |
| 1.11 | Hemsidans paket-sektion ("Aktuella paket", "Boka direkt") hårdkodad SV | ✅ |
| 1.12 | Datumformat hårdkodat `"sv-SE"` på hemsidan | ✅ lokaliserat (sv-SE/en-GB/ar-SA) |
| 1.13 | CookieBanner-strängar aktiveras inte än | 🔧 nycklarna finns, komponenten ska byggas om till att ta in strängar |
| 1.14 | 12 publika sidor (omra, hajj-2027, visum, hadj-badal, forbered, om-oss, kontakt, paket/[slug], demo, villkor, integritet, cookies, tillganglighet) använder **inga** `t()`-anrop | 📋 stor uppgift — kräver per-sida-översättningsnycklar + översättningsarbete |
| 1.15 | `Package.title/description` lagras som rena strängar i DB → engelsk besökare ser svensk paketstitel | 📋 behöver schema-tillägg `titleEn/Ar` etc. |
| 1.16 | Global `canonical: "/"` i root metadata → Google ignorerar alla undersidor som dubbletter | 🔧 behöver flytta canonical till per-sida-metadata |
| 1.17 | `/sv/omra` rewrite:as som `/omra` utan redirect → dubbelinnehåll | 🔧 middleware ska redirecta `/sv/X` → `/X` |
| 1.18 | LocaleSwitcher tappar query-string vid språkbyte | 📋 |

---

## 2. Säkerhet (KRITISKA)

| ID | Fynd | Status |
|---|---|---|
| 2.1 | `sendVerificationEmail` var `"use server"` utan auth → anonyma kunde maila godtyckliga userIds (e-postbomb-vektor) | ✅ flyttat till intern util `lib/email-verification.ts` |
| 2.2 | Open redirect i `actions/locale.ts` (fail-branch validerade inte `next`-param) | ✅ filen raderad (var död kod) |
| 2.3 | `verifyEmail`/`confirmEmailChange` triggades vid GET → Gmail/Outlook prefetch konsumerade token innan användarens klick | ✅ byggt om till POST efter bekräftelseknapp + robots: noindex |
| 2.4 | Plaintext tokens i DB (PasswordResetToken, EmailVerificationToken) — vid DB-läckage = omedelbar kontotakeover | 📋 kräver schema-ändring (token-kolumn → token-hash + ny migration) |
| 2.5 | Plaintext Fortnox refresh-token i DB | 📋 kräver krypto-vid-rast med AUTH_SECRET-derived key |
| 2.6 | Fortnox OAuth-callback saknar state-validering (CSRF) | 📋 behöver cookie-baserad state-lagring |
| 2.7 | `resetPassword` race — två fönster kan båda skriva olika passwordHash | 📋 |
| 2.8 | `requestEmailChange` saknade rate-limit → phishing-relay via byråns avsändar-domän | ✅ 3 byten/10 min/user |
| 2.9 | WORKER_TOKEN-jämförelse använde `!==` (inte konstant-tid) | ✅ `crypto.timingSafeEqual` via `lib/timing.ts` |
| 2.10 | CSV formula injection: alla CSV-exports godkände `=`/`+`/`-`/`@` som prefix | ✅ escapas i visa, rooming, bookkeeping |
| 2.11 | `setup/page.tsx` visade formuläret även när `SETUP_MODE!=1` | ✅ `notFound()` om inte aktivt |
| 2.12 | Mime-validering på uploads litar bara på client-uppgivet `file.type` (ingen magic-byte-kontroll) | 📋 |
| 2.13 | Inga rate-limits på `leads.submit`, `portal-documents.upload` | 📋 |
| 2.14 | GDPR Art. 30 + personnummer/pass okrypterat i DB | 📋 långsiktig — col-level encryption eller pseudonymisering |
| 2.15 | `/en/min-sida` kringgår middleware-auth-redirect (portal-layout fångar dock så ingen läcka) | 📋 |
| 2.16 | Login `?next=` param ignoreras → man landar alltid på `/min-sida` | 📋 |

---

## 3. Pengar-buggar (KRITISKA)

| ID | Fynd | Status |
|---|---|---|
| 3.1 | `acceptAndAdvance` dubbel-klick → 2× bekräftelse­mejl + 2× intern notis + 2× audit | ✅ atomisk `updateMany` med `status:'DRAFT'`-villkor |
| 3.2 | `recordDepositIntent` + `createFinalPaymentCheckout` race → 2× Stripe-sessions | 📋 kräver unique-constraint på `(bookingId, kind, status=PENDING)` |
| 3.3 | `verifyPayment` (admin) — auto-push race-fönster | ✅ auto-push + audit bara om CAS-claim vann |
| 3.4 | `advanceToReview` saknar step-guard | 📋 |
| 3.5 | DRAFT-bokningar har ingen auto-cleanup → DB växer obegränsat | 📋 kräver cron + TTL-policy |
| 3.6 | Pass-utgångsvalidering hoppas över om `passportExp` är tomt → resenär utan pass kan passera till granskning | 📋 |
| 3.7 | `StepDone` använder `payments[length-1]` osorterad → kan visa FAILED-metod | 📋 |
| 3.8 | `session.expired` rensar bara CARD providerRef — manuella PENDING blockerar | 📋 |
| 3.9 | Slutbetalning + `refundStatus !== "NONE"` visades samtidigt | ✅ `canPayFinal` kollar `refundStatus === "NONE"` |
| 3.10 | Slutbetalning PENDING blockerar 24h om kund avbryter i Stripe | 📋 lägg "Avbryt pågående"-knapp |

---

## 4. Admin / backoffice

| ID | Fynd | Status |
|---|---|---|
| 4.1 | `setReviewPublic` ingen audit-logg → staff kan tysta omdömen utan spår | ✅ |
| 4.2 | `updateStatus`/`removeTravelerAdmin`/`sendMessage` saknar audit | ✅ alla loggar nu |
| 4.3 | `sendMessage` med isInternal=true sätter `direction:INBOUND` — logiskt fel | ✅ admin alltid OUTBOUND, isInternal styr synlighet |
| 4.4 | `addTravelerAdmin` saknar zod-validering (admin kan lägga 50 resenärer i en bokning för 5, hoppa över pass-validering, mata in skräpdatum) | 📋 |
| 4.5 | `sendBulk` blockerar response >30s vid stora kampanjer → timeout → admin retry → dubbla utskick | 📋 batch:a + `createMany` |
| 4.6 | `/admin/mejl/[id]` route saknas men admin har "Redigera mall"-länk → 404 | 📋 antingen bygga eller ta bort länken |
| 4.7 | Dashboard räknar CANCELLED/DRAFT i "X aktiva" men visar dem inte | 📋 |
| 4.8 | `resegrupper` laddar alla bokningar oavsett vald resa (extrem N+1) | 📋 |
| 4.9 | XLSX-import saknar bomb-skydd (sheetRows, maxRows) | 📋 |
| 4.10 | `betalningar`-vyn fan-out queries (bekräftad i CONTEXT) | 📋 |
| 4.11 | Bokföring CSV/SIE saknar audit (visumlistan har) | 📋 |
| 4.12 | Audit-vyn `take:200` utan paginering | 📋 |
| 4.13 | Recensioner-vyn `take:500` ingen sökning/filter | 📋 |
| 4.14 | Resenarer-vyn `take:300` ingen paginering | 📋 |
| 4.15 | Fortnox "Push:a"-knappen saknar disable-state vid dubbel-klick — race | 📋 |
| 4.16 | Adminflikar är `<a>` istället för `<Link>` → reload mellan flikar | 📋 |
| 4.17 | STATUSES-konstanter duplicerade på 4 ställen | 📋 extrahera till `lib/statuses.ts` |
| 4.18 | `?error=`-konvention osynkad mellan admin-sidor | 📋 |

---

## 5. Trasiga länkar & routing

| ID | Fynd | Status |
|---|---|---|
| 5.1 | `omra/page.tsx` länkar till `/#kontakt` men ankaret heter `#offert` | ✅ |
| 5.2 | Hårdkodade `/paket/...`-länkar utan `localeHref()` (hemsidan + omra) | ✅ hemsidan; omra kvar |
| 5.3 | `paket/[slug]:138` hårdkodad path tillbaka | 🔧 |
| 5.4 | Refund-mejl: admin-länk var relativ (`/admin/...`) | ✅ |
| 5.5 | `lib/email.ts:84` mejlfooter hårdkodar domän | 🔧 ska läsa `env.APP_URL` |
| 5.6 | `paket/[slug]` saknar canonical + `alternates.languages` | 🔧 |
| 5.7 | `not-found.tsx` är inte locale-aware (hårdkodade SV-länkar) | 🔧 |
| 5.8 | `/admin/resor`-länkar (gammal redirect) i dashboard + import | 🔧 byt mot `/admin/paket` direkt |
| 5.9 | Demo-sidan har kvarvarande BankID-CSS-klassnamn | 📋 kosmetisk skuld |
| 5.10 | `forbered`-sidan hash-ankare `#packlista`/`#ritual`/`#faq` är döda mål | 📋 |
| 5.11 | OG `alternateLocale: ["en_US", "ar"]` — ar borde vara `ar_SA` | 📋 |

---

## 6. Bokningsflöde / portal / auth

| ID | Fynd | Status |
|---|---|---|
| 6.1 | `emailVerified` används aldrig som gate — endast kosmetisk | 📋 ska minst gata `submitReview` + `requestEmailChange` |
| 6.2 | `isSelf` kan vara `true` på flera profiler — datakvalitet | 📋 lägg DB-unique på `(userId, isSelf=true)` via partial index |
| 6.3 | Portal saknar `error.tsx` segment-boundary | 📋 |
| 6.4 | Portal saknar `not-found.tsx` segment-boundary | 📋 |
| 6.5 | Login form skickar inte `next`-param vidare till signIn | 📋 |
| 6.6 | Recension är låst efter submit — kan inte korrigera typo | 📋 designbeslut |
| 6.7 | `/min-sida/dokument` orphan-dokument: kund kan inte koppla om | 📋 |
| 6.8 | `addTravelerFromProfile` saknar pass-utgångsvalidering | ❌ FELAKTIG — det FINNS i koden (`bookings.ts` rad 269+). Falskt larm av agenten |
| 6.9 | Stale `session.user.email` i header efter e-postbyte | 📋 JWT-uppdatering kräver re-login |
| 6.10 | `mejl till kontor` faller tyst om `SITE_EMAIL`/`SITE.email` saknas | 📋 lägg console.warn |

---

## 7. Mobil-responsivt

| ID | Fynd | Status |
|---|---|---|
| 7.1 | Resegrupper-tabell `min-width:1100px` obrukbar på telefon | 📋 omforma till kort-vy |
| 7.2 | Telefon dolt <380px — affärskritiskt för 50+ | 📋 finns kvar i mobilmenyn (gjordes redan), men logon på header-bar kan göra mer plats |
| 7.3 | CookieBanner kan täcka FloatingContact | 📋 offset FloatingContact när banner synlig |
| 7.4 | Admin sidofält blir 5-6 rader nav-wrap utan toggle på mobil | 📋 behövs drawer/hamburger på mobil |
| 7.5 | Dashboard pipeline 6 kort × 400px höjd = 2400px scroll på mobil | 📋 |
| 7.6 | Hero CTA `min-width:200px` kan trycka horisontellt på 320px | 📋 |
| 7.7 | `.fact-row` 6 kolumner kollapsar inte tillräckligt på mobil | 📋 |

---

## 8. Tillgänglighet (WCAG)

| ID | Fynd | Status |
|---|---|---|
| 8.1 | Brand-mark i portal saknade `lang="ar"` + `aria-hidden` (header/footer hade) | ✅ |
| 8.2 | TravelerForm: 18 fält utan `htmlFor` → SR läser ej upp labels | 📋 KRITISKT — hela bokningssteg 3 |
| 8.3 | TravelerProfileForm + admin "Lägg till resenär": samma label-bugg | 📋 |
| 8.4 | `*` markerar required-fält dekorativt (inte programmatiskt) | 🔧 lägg `aria-required` + `<abbr title="obligatoriskt">` |
| 8.5 | `aria-current="page"` saknas på huvudnav, portal-nav, admin-sidebar | 🔧 |
| 8.6 | Aktiv navlänk har ingen visuell markör (bara hover) | 📋 |
| 8.7 | LeadQuoteForm aria-required + autocomplete | ✅ |
| 8.8 | Modaler (CookieBanner/FloatingContact/MobileMenu) saknar focus-trap | 📋 |
| 8.9 | Bokningsflödet har ingen `<h1>` per steg | 📋 |
| 8.10 | `<nav>`-element saknar aria-label | 📋 |
| 8.11 | Knappar saknar pending-state (`useFormStatus`) på de flesta sidor | 📋 |
| 8.12 | Skip-länk finns bara i publika layouten — portal/admin saknar | 📋 |
| 8.13 | Kontrast guld `#B5894B` <4.5:1 vid 12px-text | 📋 designsystem-fråga |
| 8.14 | ProgressBar i StepTravelers utan `role="progressbar"` / aria-value | 📋 |
| 8.15 | `<a>` utan `href` i DemoFlow (klassiska "fake-link"-buggar) | 📋 |

---

## Sammanfattning per fas

| Fas | Fixat | Återstår |
|---|---|---|
| **Direkt klagomål (i18n)** | 12 av 18 | 6 (CookieBanner-aktivering, 12 sidors översättning, DB-paket, canonical, /sv-redirect, query-string) |
| **Säkerhet kritisk** | 7 av 16 | 9 (token-hash, Fortnox-state, OAuth-token-kryptering, etc.) |
| **Pengar kritisk** | 3 av 10 | 7 (Stripe-race, DRAFT-cleanup, pass-validering ej satt, etc.) |
| **Admin** | 4 av 18 | 14 (sendBulk-batchning, paginering, XLSX-bomb, etc.) |
| **Trasiga länkar** | 4 av 11 | 7 (canonical, not-found locale-aware, etc.) |
| **Portal/auth** | 0 av 10 | 10 (utöver de redan fixade i Batch 2: emailVerified-gate, isSelf-unique, error.tsx, etc.) |
| **Mobil** | 0 av 7 | 7 (alla — kräver UI-arbete) |
| **A11y WCAG** | 2 av 15 | 13 (KRITISKT: htmlFor på TravelerForm) |

**Totalt: 32 av 105 fynd åtgärdade i denna omgång (Batch 1–3).**

---

## Vad jag rekommenderar härnäst (prio-ordning)

1. **A11y-K1 — htmlFor på alla formulärlabels** (TravelerForm, TravelerProfileForm, admin "Lägg till resenär"). Bokningsflödet är obrukbart för skärmläsare just nu.
2. **Stripe-race-skydd** med unique-constraint via partial index (3.2).
3. **`addTravelerAdmin` zod-validering** (4.4 — admin kan idag bryta affärsregler kunden inte kan).
4. **Token-hashning i DB** (2.4) — kräver schema-migration men hög ROI vid läckage.
5. **`sendBulk` batchning** (4.5) — annars dubbla utskick vid stor kampanj.
6. **`paket/[slug]` canonical + alternates** (1.16, 5.6).
7. **`/sv/X` redirect** (1.17) för att fixa dubbelinnehåll-buggen.
8. **Översätt resterande 12 publika sidor** (1.14) — stor men nödvändig för riktigt mångspråkigt.

Säg vilken/vilka du vill att jag tar härnäst, så fortsätter jag.
