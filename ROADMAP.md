# Hadj Omra Resor — Gap-analys & roadmap till helhetslösning

> **Syfte:** Djup research-audit av vad som återstår för att göra plattformen till en
> *fullt klar helhetslösning*. Resultat av 10 parallella granskningar (drift, betalning,
> dokument/visum, juridik, kommunikation, kundportal, ops-automation, SEO/innehåll,
> ej-byggda skärmar, kravspec) mot kodbasen, designfilerna och produktspecen.
>
> **Skapad:** 2026-05 · **Branch:** `claude/hippo-memory-init-BxqGB`
> **Läs `CONTEXT.md` först** för stack/arkitektur. Detta dokument = vad som ska *läggas till*.

---

## 0. Så här läser du roadmapen

- **Status:** ❌ saknas helt · 🟡 delvis byggt · ✅ klart (ej listat här).
- **Effort:** **S** ≈ ½–1 dag · **M** ≈ 2–5 dagar · **L** ≈ 1–3 veckor (en utvecklare).
- **Fas:** 1 = driftklart & lagligt (måste finnas innan riktiga kunder/pengar/PII) ·
  2 = helhetsupplevelsen (kundportal + backoffice enligt vision) · 3 = tillväxt & härdning.
- Varje punkt har ett **ID** (`F1-3` etc.) så vi kan referera till den i kommande chattar.

### Den enda meningen som sammanfattar allt
Plattformen är en **vacker, säker skal-produkt med korrekt datamodell** — men tre saker
gör att den ännu inte kan *driva verksamheten på riktigt*: **(1) inga mejl skickas faktiskt**,
**(2) ingen slutbetalning/dokumentuppladdning fungerar**, och **(3) sajten lovar saker den
inte gör** (BankID, "SV·EN·AR", dokumentuppladdning, cookie-samtycke). Fas 1 stänger det gapet.

---

## 1. Genomgående teman (det här återkom i flera granskningar)

| Tema | Vad det betyder | Var det syns |
|---|---|---|
| **"Utlovat men saknas"** | Sajten marknadsför BankID, flerspråkighet (SV·EN·AR), dokumentuppladdning och cookie-val — inget av detta finns. Trovärdighets- & lagrisk. | Hero/trust-bar, `/cookies`, portal |
| **"Köas men skickas aldrig"** | Hela mejlmotorn skapar `EmailSend(QUEUED)` men ingen worker/leverantör skickar. Ingen transaktionsmejl (bekräftelse, kvitto, påminnelse) går ut automatiskt. | `mejl/skicka`, Stripe-webhook |
| **"UI utan write-path"** | Dokument, meddelanden (kund→kontor), resenärsprofiler: vyer finns men det går inte att faktiskt *göra* något. | portal `dokument`, `meddelanden` |
| **"Funkar nu, inte vid skala/haveri"** | Inga DB-backuper, ingen felövervakning, ingen rate-limiting, ingen objektlagring. | infra/ops |
| **Enablers som låser upp mycket** | E-postworker, objektlagring (S3), i18n-ramverk, CMS, schemaläggning (cron). Bygg dessa → många funktioner blir billiga. | tvärs över |

---

## 2. Enablers — bygg dessa först (de låser upp resten)

Dessa är inte "features" i sig men varje fas-2/3-punkt hänger på dem. Prioritera.

| ID | Enabler | Varför | Effort | Rekommendation |
|---|---|---|---|---|
| **E1** | **E-postleverantör + send-worker** | Upplåser lathund-steg 2/5/9, alla transaktionsmejl, notiser, lösenordsåterställning, e-postverifiering. Idag skickas **noll** mejl. | **M** | **Resend** + React Email (HTML/branding). Dedikerad liten `worker`-container i compose som tömmer `EmailSend(QUEUED)`. |
| **E2** | **Schemaläggning (cron)** | Påminnelser X dagar före, info-mötesutskick, T-2-dygn-trigger, backup-jobb. Finns ingen scheduler alls. | **S–M** | Cron i `worker`-containern (node-cron) eller host-crontab → `docker compose exec`. |
| **E3** | **Objektlagring (S3-kompatibel)** | Pass/dokument/foton kan inte lagras säkert på en container-volym (förloras vid host-haveri, ej backat, skalar ej, PII). | **M** | Hetzner Object Storage / Cloudflare R2 / Backblaze B2 + krypterat, åtkomststyrt. |
| **E4** | **i18n-ramverk (sv/en/ar)** | Hero lovar "SV·EN·AR". Allt är hårdkodat `lang="sv"`. Arabiska kräver RTL. | **L** | `next-intl`, locale-routing `/[locale]/`, RTL-stöd, språkväljare. |
| **E5** | **CMS för innehåll** | Paket-CRUD finns, men landningssidor/guider/blogg/FAQ är hårdkodade. Tillväxt (Fas 3) kräver att kontoret kan publicera själv. | **L** | Lättviktigt: DB-modell `ContentPage` + admin-editor, eller headless (Sanity/Payload). |

---

## 3. Fas 1 — Driftklart & lagligt (MVP-blockers)

> Utan dessa kan byrån inte ta riktiga betalningar, hantera PII eller marknadsföra sajten
> sanningsenligt. **Detta är "fullt klart"-minimum.**

### 3a. Betalning & pengar in
| ID | Gap | Status | Effort | Not |
|---|---|---|---|---|
| **F1-1** | **Slutbetalningsflöde** (resterande ~95 % av priset) | ❌ | **M** | Idag kan bara 5 000 kr-depositionen betalas. Kunden kan aldrig slutbetala online. Bygg "betala slutbelopp" i portal + Stripe. |
| **F1-2** | **Återbetalning / avbokning** | ❌ | **M** | Ingen refund-väg; `CANCELLED` är admin-status utan ekonomisk hantering. Krävs av paketreselagen. |
| **F1-3** | **Riktig betalreferens-avstämning** | 🟡 | **M** | Bankgiro/Swish stäms av helt manuellt ("markera betald"). Minst: strukturerad referens + admin-vy. (Auto-import camt = Fas 2.) |

### 3b. Kommunikation (se E1)
| ID | Gap | Status | Effort | Not |
|---|---|---|---|---|
| **F1-4** | **Faktisk mejlsändning** | ❌ | **M** | Bygg E1. Annars: bokningar bekräftas aldrig, inga kvitton, allt manuellt. |
| **F1-5** | **Transaktionsmejl vid statusändring** | ❌ | **M** | Bekräftelse vid SUBMITTED, kvitto vid betalning, etc. Koppla `queueEmail()` i `bookings.ts` + Stripe-webhook. Seeda mallarna. |
| **F1-6** | **Kund kan svara kontoret** | ❌ | **S** | Portalens `meddelanden` är skrivskyddad. Lägg `sendMessage`-action (INBOUND, `isInternal:false`) + sätt `readAt`. |

### 3c. Juridik & GDPR (svensk paketreselag + dataskydd)
| ID | Gap | Status | Effort | Not |
|---|---|---|---|---|
| **F1-7** | **Cookie-samtyckesbanner** (acceptera/avvisa/anpassa) | ❌ | **M** | `/cookies` är bara text. Krävs innan analytics får laddas. Samtyckes-gate. |
| **F1-8** | **Registrera villkorsgodkännande** | ❌ | **S** | Kund kryssar villkor i steg 4 men det sparas inte (vem/när/version). Bevisbörda. |
| **F1-9** | **Paketreselagens föravtalsinfo + standardformulär** | ❌ | **M** | Lagstadgad info innan köp + ångerrätts-undantagsnotis. |
| **F1-10** | **Riktigt org.nr + verksamhetsuppgifter** | 🟡 | **S** | Platshållare på juridiksidor. Sätt `SITE_ORG_NR`. |
| **F1-11** | **Datalagringspolicy + radering av pass** | ❌ | **M** | Ingen retention enforced; passdata måste raderas efter resa. Cron (E2) + policy. |
| **F1-12** | **Art.30-register + PUB-avtal (DPA)** | ❌ | **S** | Internt dokument; lista underbiträden (Resend, Stripe, S3…). |

### 3d. "Utlovat men saknas" — bygg eller sluta lova (BESLUT, se §6)
| ID | Gap | Status | Effort | Not |
|---|---|---|---|---|
| **F1-13** | **Dokumentuppladdning (kund)** | ❌ | **M** | UI ber kunden mejla pass istället. `Document`-modell finns men har **noll** write-path. Kräver E3. |
| **F1-14** | **Lösenordsåterställning** | ❌ | **M** | Utelåsta kunder har ingen väg tillbaka. Kräver E1. |
| **F1-15** | **E-postverifiering vid registrering** | ❌ | **M** | `emailVerified` + `VerificationToken` finns oanvänt. Kräver E1. |

### 3e. Drift-säkerhet (kan inte tappa data)
| ID | Gap | Status | Effort | Not |
|---|---|---|---|---|
| **F1-16** | **DB-backuper (pg_dump → offsite + retention)** | ❌ | **S** | **Högsta enskilda risken.** Disk-/migrationshaveri = alla bokningar/PII borta. Nattligt jobb (E2) → Storage Box/S3. |
| **F1-17** | **Rate-limiting på login/register** | ❌ | **S–M** | scrypt-login är CPU-DoS-vektor; credential stuffing obromsat. Caddy `rate_limit` eller app-lager. |
| **F1-18** | **Felövervakning + uptime** | ❌ | **M** | Inga loggar/larm; fel är osynliga. Sentry + UptimeRobot/Betterstack på `/api/health`. |

---

## 4. Fas 2 — Helhetsupplevelsen (kundportal + backoffice enligt vision)

> Här byggs den *produkt* spec/design beskriver: Nusuk-liknande självservice för kunden
> och en backoffice som automatiserar hela "lathunden".

### 4a. Kundportal "Min sida" (designerna 09c–09g)
| ID | Gap | Status | Effort | Designfil |
|---|---|---|---|---|
| **F2-1** | **Digital resväska / itinerary** (flyg, hotell, transfer, dagsprogram, kontakter, e-biljetter) | ❌ | **L** | 09c |
| **F2-2** | **Återanvändbara resenärsprofiler / familjegrupper** | ❌ | **L** | 09d — slipp mata in samma person varje bokning; mahram/relation. |
| **F2-3** | **Visumstatus synlig för kund** (inskickat/behandlas/godkänt) | ❌ | **M** | 09e-nav |
| **F2-4** | **Betalningsvy: plan/delbetalning/kvitton/slutbetala** | 🟡 | **M** | 09f — idag råa Payment-rader utan etiketter. |
| **F2-5** | **Checklista / förberedelsespårare per resa** | ❌ | **M** | 09-design |
| **F2-6** | **Redigera egen profil / kontoinställningar** | ❌ | **M** | Finns ingen profilsida alls. |
| **F2-7** | **Omdöme/betyg efter resa** | ❌ | **M** | Lovas på hemsidan + spec. |
| **F2-8** | **Begära ändring/avbokning** | ❌ | **M** | Kopplas till F1-2. |

### 4b. Backoffice & lathund-automation (operativ helhet)
| ID | Gap | Status | Effort | Lathund-steg |
|---|---|---|---|---|
| **F2-9** | **Per-stage mejltriggers + seedade mallar** | 🟡 | **M** | Steg 2/5/9 — bygger på E1. |
| **F2-10** | **Visum-gruppworkflow + export av konsulatlista** | ❌ | **L** | Steg 7 — passdata finns men kan ej kompileras till inlämningsbar grupplista; per-resenär visumstatus. |
| **F2-11** | **Infomötesmodul** (datum, fjärrlänk, OSA, påminnelse) | ❌ | **M** | Steg 8 — ingen modul alls. |
| **F2-12** | **WhatsApp/SMS-utskick** (samlingstid, flygplatsmötespunkt) | ❌ | **M** | Steg 10 — SMS via **46elks** (svenskt). WhatsApp: behåll manuell `wa.me`-länk eller Business API (beslut §6). |
| **F2-13** | **Admin dokumentgranskning** | ❌ | **M** | Design 10c — godkänn/avslå uppladdade dokument (kräver F1-13). |
| **F2-14** | **Reseledarvy** | ❌ | **M** | Design 10h — gruppöversikt för ledaren på plats. |
| **F2-15** | **Resegrupper: flyg/buss/hälsa/seminarie-flikar + PDF-manifest** | 🟡 | **M** | Design 10f — närmast klar, saknar flikar + export. |
| **F2-16** | **Schemalagda påminnelser** (slutbetalning, möte, T-2 dygn) | ❌ | **M** | Bygger på E2. |

### 4c. Dokument & visum (djup)
| ID | Gap | Status | Effort | Not |
|---|---|---|---|---|
| **F2-17** | **Säker dokumentlagring + virusskanning** | ❌ | **M** | Kräver E3 + AV-steg. |
| **F2-18** | **Pass-giltighetsvalidering** (utgång > 6 mån efter resa) | ❌ | **S** | Datafält finns; lägg validering. |
| **F2-19** | **E-signering av reseavtal** (BankID-signering enligt design) | ❌ | **L** | Kopplas till BankID-beslut (§6). |

### 4d. Bokföring & ekonomi
| ID | Gap | Status | Effort | Not |
|---|---|---|---|---|
| **F2-20** | **Fortnox-/bokföringsintegration (VMB-marginalmoms)** | ❌ | **L** | Resebyråer använder vinstmarginalbeskattning; manuell bokföring annars. |
| **F2-21** | **Kvitto-/fakturagenerering (PDF)** | ❌ | **M** | Formellt kvitto vid betalning. |

---

## 5. Fas 3 — Tillväxt, SEO/konvertering & härdning

### 5a. Innehåll & SEO (share-of-search mot UK/CA-byråer) — kräver E5
| ID | Gap | Status | SEO/konv-värde | Effort |
|---|---|---|---|---|
| **F3-1** | **Stadssidor** (Umrah/Hajj från Stockholm/Göteborg/Malmö/Uppsala/Västerås/Örebro) | ❌ | Hög | M |
| **F3-2** | **Säsongssidor** (Ramadan/påsk/sommar/december) | ❌ | Hög | M |
| **F3-3** | **Kunskapscenter** (guider, video, ritualguide, packlista, FAQ) | 🟡 | Hög | M |
| **F3-4** | **Recensionsintegration** (Trustpilot/Google/Reco live) | ❌ | Hög | M |
| **F3-5** | **Trust-signaler above the fold** (klickbar Kammarkollegiet-verifiering, betyg, pilgrimsantal) | 🟡 | Hög | S |
| **F3-6** | **Reseledare/lärda-bios med foto** | ❌ | Medel | M |
| **F3-7** | **Riktiga bilder + bildpipeline** (`next/image`, allt är platshållare nu) | ❌ | Hög | L |
| **F3-8** | **Blogg/nyheter** | ❌ | Medel | L |
| **F3-9** | **Flytande WhatsApp/telefon + offertformulär på alla sidor** | 🟡 | Hög | S |
| **F3-10** | **Paketjämförelse** (datum/stad/pris/hotell) | ❌ | Medel | M |
| **F3-11** | **Strukturerad data** (Product/Offer, FAQPage, Review/AggregateRating, BreadcrumbList) | ❌ | Hög | S |
| **F3-12** | **OG-bilder + hreflang (sv/en/ar)** | ❌ | Medel | M |
| **F3-13** | **Analytics (GA4/Plausible), samtyckes-gated** | ❌ | Hög | M |
| **F3-14** | **"Beat my quote"/prismatchning** | ❌ | Medel | S |

### 5b. Produktionshärdning vid skala
| ID | Gap | Status | Risk | Effort |
|---|---|---|---|---|
| **F3-15** | **CI-kvalitetsgrind** (tsc --noEmit + eslint + smoke-test innan deploy) | ❌ | Medel | S |
| **F3-16** | **Staging-miljö** | ❌ | Medel | S |
| **F3-17** | **CSP + bot/WAF-skydd** (Caddy har HSTS men ingen CSP) | 🟡 | Medel | S |
| **F3-18** | **Bildoptimering/CDN** | 🟡 | Medel | M |
| **F3-19** | **Paginering + fixa N+1** (`betalningar`/`resegrupper`/`resenarer`) | 🟡 | Medel | M |
| **F3-20** | **Cachning/ISR** för publika sidor (21 routes `force-dynamic`) | 🟡 | Låg | M |
| **F3-21** | **Audit-logg** (vem ändrade vad i admin) | ❌ | Medel | M |
| **F3-22** | **Kryptering-at-rest för PII** (personnr/pass) | ❌ | Medel | M |
| **F3-23** | **DR-runbook** (restore/rebuild/rotation) | ❌ | Medel | S |
| **F3-24** | **Single-VPS-resiliens** (DB samlokaliserad, ~4 GB-tak, ingen failover) | 🟡 | Hög vid tillväxt | L |
| **F3-25** | **Droppa deprecerade kolumner** efter backfill | 🟡 | Låg | S |

---

## 6. Beslutspunkter (kräver ditt svar innan vi bygger)

Dessa är inte tekniska val utan affärs-/budgetval — jag vill ha din riktning:

1. **BankID** — bygga riktig inloggning/signering (Criipto/ZignSec, ~L + löpande kostnad)
   eller ta bort löftet från hero/process tills vidare? *Påverkar F2-19, F1-13.*
2. **Flerspråkighet** — bygga sv/en/ar nu (E4, L + RTL + översättningar) eller börja
   med bara svenska och ta bort "SV·EN·AR" från trust-baren?
3. **Swish som betalmetod** — riktig Swish (kräver aggregator: Billmate/Svea/Brite,
   eller Swish Handel direkt) eller fortsatt manuell bankgiro/Swish-avstämning?
4. **Bokföring** — Fortnox-integration (L) eller exportfil som revisorn matar in manuellt?
5. **WhatsApp** — manuell `wa.me`-länk (S, räcker länge) eller WhatsApp Business API (L)?
6. **Bilder** — har byrån egen bildbank (Mecka/Medina/grupper) eller ska vi licensiera?

---

## 7. Effort-sammanfattning & föreslagen ordning

**Snabb prioritering (om jag fick välja ordning):**

1. **Enablers E1 (mejlworker) + E3 (S3) + E2 (cron)** — låser upp ~15 punkter.
2. **Fas 1 ekonomi/juridik/drift** — F1-16 (backup) → F1-1 (slutbetalning) →
   F1-4/5 (mejl) → F1-7/8/9 (juridik) → F1-13 (dokument) → F1-17/18 (rate-limit/Sentry).
3. **Beslutspunkter §6** (BankID, i18n, Swish) — avgör Fas 2-omfattning.
4. **Fas 2** kundportal + lathund-automation.
5. **Fas 3** SEO/innehåll + härdning, löpande.

| Fas | Punkter | Grov effort |
|---|---|---|
| Enablers | 5 | ~3–5 veckor |
| Fas 1 (MVP-blockers) | 18 | ~4–6 veckor |
| Fas 2 (helhet) | 21 | ~10–14 veckor |
| Fas 3 (tillväxt+härdning) | 25 | löpande, ~8–12 veckor |

> **Obs:** ingen kod har ändrats i detta pass — detta är en ren analys-/planeringsleverans.
> Säg vilken fas/punkter du vill att jag börjar bygga, så kör vi.
