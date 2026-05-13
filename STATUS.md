# Hadj Omra Resor — Projektstatus

Levande dokument. Uppdateras vid varje större milstolpe så att arbetet kan plockas upp där det stannade.

**Senast uppdaterad:** 2026-05-13 — Fas 1 färdig, redo för första deploy.
**Aktuell branch:** `claude/hippo-memory-init-BxqGB`
**Aktuell fas:** Fas 1 — Foundation klar, väntar på första deploy + verifiering.

---

## Beslutade val

| Område | Val | Motivering |
|---|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) + TypeScript | Fullstack, SSR + API i samma projekt, stort ekosystem |
| Databas | PostgreSQL 16 (i Docker på VPS) | Transaktionell, JSON-stöd, körs på samma maskin som appen |
| ORM | Prisma 6.19.3 | Type-safe, migrations, schema-first |
| Styling | Tailwind v4 + custom CSS för design tokens | Bevarar editorial-känslan från Claude Design |
| Auth | Auth.js v5 (NextAuth beta) — credentials nu, BankID via OIDC senare | Email/lösen MVP, BankID som tillägg |
| Reverse proxy | Caddy 2 | Auto Let's Encrypt för `hajj.karimkhalil.se` |
| Hosting | Hetzner CX23 (`hajj-prod`, IPv4 62.238.37.54, hel1-dc2) | Befintlig server, Docker + deploy-user via cloud-init |
| CI/CD | GitHub Actions, deploy via SSH, image i GHCR | Push till branch → bygg → SSH → `docker compose up -d` |
| DNS | one.com — `hajj.karimkhalil.se` A → 62.238.37.54, AAAA → 2a01:4f9:c015:7965::1 | Lagt av användaren |
| Filer/uploads | Lokal volym på server (`/home/deploy/app`) | Migrera till objektslagring senare |

## Ej använt (medvetet)
- one.com MariaDB — endast intern hostname (`c1ticiyy7.mysql.service.one.com` resolverar inte publikt). Inte åtkomlig från Hetzner.

---

## GitHub Secrets (verifierade på plats)
- `DEPLOY_SSH_KEY` — privat ed25519
- `DEPLOY_HOST` — `62.238.37.54`
- `DEPLOY_USER` — `deploy`
- `POSTGRES_PASSWORD`
- `AUTH_SECRET`

**Backlog för secrets:** `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` rekommenderas så vi får en initial admin-användare automatiskt vid första deploy. Lägg gärna till dem.

---

## Server-state

**Hetzner CX23, ID 129247255, Ubuntu 24.04**, ombyggd 2026-05-13 00:05 UTC via API + cloud-init. Cloud-init lade:
- Användare `deploy` (medlem i `docker`, ingen sudo)
- Docker CE + compose plugin
- ufw (deny incoming, tillåt 22/80/443)
- fail2ban
- unattended-upgrades
- root SSH med två nycklar: temporär setup-nyckel + användarens personliga (`karim@karimkhalil.se`)
- deploy SSH med GitHub Actions-nyckel (motsvarar `DEPLOY_SSH_KEY` i Secrets)

**Verifiering pågår:** sandlådan kan inte SSH:a outbound (port 22 blockerad). Första GitHub Actions-deploy bekräftar att cloud-init lyckades.

**Påminnelse:** revoka Hetzner API-tokenet efter att första deploy fungerar.

---

## Datamodell

Implementerat i `prisma/schema.prisma` (initial migration genererad i `prisma/migrations/0001_init/`):

- `User` (med roll `CUSTOMER | STAFF | ADMIN`), `Account`, `Session`, `VerificationToken` (Auth.js)
- `Package` + `PackageTier` (paket per typ HAJJ/OMRA/HADJ_BADAL/VISUM, tier per rumstyp DOUBLE/TRIPLE/QUAD/QUINTUPLE/FAMILY)
- `Booking` (reference, status, step 1–5, totalAmount, depositAmount)
- `Traveler` (passuppgifter, mahram, assist)
- `Document` (PASSPORT/PASSPORT_PHOTO/RESIDENCE_PERMIT/VACCINATION + status PENDING/APPROVED/REJECTED/NEEDS_INFO)
- `Payment` (SWISH/KLARNA/CARD/BANKGIRO/INVOICE)
- `Message` (kund ↔ kontor, kopplad till booking)
- `Lead` (quote-form från publika sajten)

---

## Implementerade routes

### Publika sidor (server-rendrade, fast layout)
- `/` — Hem med hero, quote-form (riktig persistens till `Lead`), trust-bar, featured packages från DB, värderingar, process
- `/omra` — Omra-paket-lista från DB
- `/hajj-2027` — Hajj-info + tidslinje + quote-form
- `/visum` — Visumtyper + dokument-checklista
- `/hadj-badal` — Hadj Badal-info
- `/forbered` — dokument, packlista, ritualguide, FAQ
- `/om-oss` — Företagshistorik + värderingar
- `/paket/[slug]` — Paketdetalj med tiers, hotellinfo, "Påbörja bokning"
- `/kontakt` — Kontaktuppgifter + quote-form
- `/villkor`, `/integritet`, `/cookies`, `/tillganglighet` — juridik

### Auth
- `/logga-in` — credentials-login (email/lösen)
- `/skapa-konto` — registrering, scrypt-hash, auto-login
- `/api/auth/[...nextauth]` — NextAuth-handlers
- Server actions i `app/actions/auth.ts`: `loginUser`, `registerUser`

### Bokningsflöde
- `/boka/start/[packageId]` — server-action skapar `Booking` (DRAFT) och redirectar
- `/boka/[bookingId]` — visar aktuellt steg, persisterar mellan dem
  - **Steg 2:** välj rumstyp + antal resenärer
  - **Steg 3:** lägg till resenärer (riktiga DB-rader)
  - **Steg 4:** granska + godkänn villkor
  - **Steg 5:** välj betalsätt (registrerar `Payment` som PENDING)
  - **Steg 6 (klar):** referensnummer + nästa steg
- Server actions: `createBooking`, `saveRoomChoice`, `addTraveler`, `removeTraveler`, `advanceToReview`, `acceptAndAdvance`, `recordDepositIntent`

### Min sida (auth-gated)
- `/min-sida` — översikt med KPI-kort + lista över aktiva bokningar
- `/min-sida/bokningar` + `/min-sida/bokningar/[id]` — bokningsdetaljer
- `/min-sida/dokument` — lista av användarens dokument
- `/min-sida/meddelanden` — konversationstråd

### Admin (auth + role-check)
- `/admin` — KPI-översikt + senaste leads/bokningar
- `/admin/paket` — lista
- `/admin/paket/ny` — skapa nytt paket (CRUD)
- `/admin/paket/[id]` — redigera paket + tier-CRUD
- `/admin/bokningar` — lista alla bokningar
- `/admin/bokningar/[id]` — detalj + statusändring + skicka meddelande till kund
- `/admin/leads` — lead-inbox + statusändring
- `/admin/resenarer` — alla resenärer

### API
- `/api/health` — health-check för Caddy/övervakning

---

## Infra som finns i repot
- `Dockerfile` — multi-stage build (deps → builder → runner) med Prisma-engine + entrypoint för auto-migrate
- `docker/entrypoint.sh` — kör `prisma migrate deploy`, optional seed, sen startar appen
- `docker-compose.yml` — `app` + `postgres` + `caddy` med volymer + nätverk
- `Caddyfile` — auto Let's Encrypt + säkerhetsheaders + statisk-cache
- `.github/workflows/deploy.yml` — bygger Docker-image i GHCR, SSH:ar in på VPS, pullar och startar om
- `.env.example` — alla env-vars dokumenterade

## Build-status
- `pnpm build` → ✓ kompilerade utan fel, 33 routes byggda
- TypeScript strict ✓
- ESLint installerat (default config)

---

## Att-göra — Fas 2 (efter att första deploy är live)

### Måste fixas direkt om något havererar
- Om Prisma-migration inte plockas upp av Docker-runner: kör `docker compose run --rm app node node_modules/prisma/build/index.js migrate deploy` på servern
- Om Caddy inte får cert: kolla att DNS A/AAAA propagerats (kan ta upp till några timmar)
- Om GitHub Actions inte når servern: kontrollera att `DEPLOY_SSH_KEY` är komplett (med BEGIN/END-rader)

### Funktionalitet
- BankID-integration (Auth.js OIDC eller separat redirect-flow via t.ex. Criipto/BankID-provider)
- Stripe (testmode först, sen real för Swish/Klarna)
- E-postutskick (Resend) — bekräftelse, slutbetalning, info
- Dokumentupload-pipeline (storage abstraction → Hetzner Object Storage / S3-kompatibelt)
- Riktig CMS för paket-bilder (just nu placeholder)
- Trustpilot/Google Reviews-widget
- Resegrupper, Reseledarvyn (admin-fliken är tom)
- Översättning sv → en/ar
- Cookiebanner-popup (juridik-sidan finns men bannern saknas)
- Migrera `middleware.ts` → `proxy.ts` (Next 16 deprecation)

### Designgenomgång
- Hero-bilder (just nu placeholder-ytor)
- Paket-kortbilder
- Reseledar-bios med foton
- Trust-block med riktiga badges (Kammarkollegiet-länk, SRF, IATA)
- Footer-länkar — verifiera att alla pekar rätt
- 09c-travel-pack.html, 09d-resenarprofiler.html, 09e-dokument.html (Min sida-undersidor) — finns som design men ej fullt migrerade — endast skelett

### Vissa pages från Claude Design ej fullt migrerade
- 09c Travel pack
- 09d Resenärprofiler-detalj  
- 09e Dokumentupload UI
- 09f Betalningar-historik
- 10c Dokumentgranskning (admin)
- 10e Paketadmin (avancerad CMS — vi har enkel CRUD)
- 10f Resegrupper
- 10g Admin-betalningar
- 10h Reseledarvy

Designens HTML finns som referens i `/tmp/hajj-design/` på sandlådan men är inte committad.

---

## Designprinciper (från handover-dokumentet)
- Editorial, svensk, varm, andlig — inte AI-genererad eller generisk
- Färger: navy `#0C1E3E`, guld `#B5894B`, cream `#EFE9DD`, paper `#FBFAF6`
- Typsnitt: Newsreader (serif), Manrope (sans), JetBrains Mono (kod/eyebrow)
- Container 1280px / narrow 920px
- Inga toaster för funktioner som inte finns — markera tydligt vad som är på roadmap
- Trust-signaler synliga: Kammarkollegiet, 40+ år, antal pilgrimer, betyg
- Mobilfirst, tillgänglighet enligt EAA

## Kontaktytor som ska finnas
- WhatsApp + telefon i header
- Quote-form i hjälten på Hem
- Kontor: Stockholm (Kapellgränd 10) + Göteborg
