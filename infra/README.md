# Återuppbyggnad av driften (disaster recovery)

Hela plattformen återskapas från detta repo + GitHub Secrets. Det enda som
INTE kan återskapas härifrån är databasinnehållet och uppladdade filer —
därför: se till att off-site-backupen är aktiv så fort driften är uppe.

## 1. Skapa deploy-nyckel (på din egen dator)

```bash
ssh-keygen -t ed25519 -f hajj-deploy -N "" -C "hajj-deploy"
```

Ger två filer: `hajj-deploy` (privat — till GitHub Secrets) och
`hajj-deploy.pub` (publik — in i cloud-init).

## 2. Skapa servern (Hetzner Console)

- Ubuntu 24.04, minst 4 GB RAM (CX22 räcker), datacenter valfritt (hel1/fsn1)
- Välj/lägg till din egen SSH-nyckel för root-inloggning
- Klistra in `infra/cloud-init.yml` i **Cloud config**-rutan — byt först ut
  placeholder-raden mot innehållet i `hajj-deploy.pub`
- Skapa servern och anteckna IPv4-adressen

## 3. Uppdatera GitHub Secrets (repo → Settings → Secrets → Actions)

| Secret | Värde |
|---|---|
| `DEPLOY_HOST` | nya serverns IPv4 |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | hela innehållet i privata `hajj-deploy`-filen |

Övriga secrets (`POSTGRES_PASSWORD`, `AUTH_SECRET`, `SEED_ADMIN_EMAIL`,
`SEED_ADMIN_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`SITE_ORG_NR`) ligger kvar i GitHub och behöver inte röras.

## 4. Peka DNS

A-record för `hajj.karimkhalil.se` → nya IPv4-adressen. (Vid Cloudflare:
grå moln/DNS only — Caddy sköter TLS-certifikaten själv via Let's Encrypt.)

## 5. Deploya

GitHub → Actions → **Build and deploy** → *Run workflow* på aktuell gren.
Körningen bygger imagen, skriver `.env` på servern, startar alla containrar
(migrationer körs automatiskt av entrypoint), och hälsokollar sajten.
Admin-kontot seedas från `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.

## 6. Återställ data

- Finns en dump: `pg_restore` mot postgres-containern.
- Annars: logga in i admin → Import → läs in Excel-filerna på nytt.

## 7. Aktivera off-site-backup (obligatoriskt sista steg)

Nattliga `pg_dump`-backuper skrivs till volymen `db-backups` PÅ servern —
de ska därutöver synkas till extern lagring (t.ex. Hetzner Storage Box
eller Cloudflare R2) så att ett raderat konto aldrig mer innebär dataförlust.
