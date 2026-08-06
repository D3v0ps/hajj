#!/usr/bin/env bash
# Hadj Omra Resor — gör en NYSKAPAD Ubuntu 24.04-server deploy-redo.
# Körs SOM ROOT på servern, en enda gång:
#
#   curl -fsSL https://raw.githubusercontent.com/D3v0ps/hajj/claude/hippo-memory-init-BxqGB/infra/setup-server.sh | bash -s -- "<publik deploy-nyckel>"
#
# Alternativt utan argument — då hämtas nyckeln från infra/deploy_authorized_keys i repot.
# Skriptet är idempotent: kan köras om utan skada.
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/D3v0ps/hajj/claude/hippo-memory-init-BxqGB"

PUBKEY="${1:-}"
if [ -z "$PUBKEY" ]; then
  PUBKEY="$(curl -fsSL "$REPO_RAW/infra/deploy_authorized_keys" | grep -m1 '^ssh-' || true)"
fi
if [ -z "$PUBKEY" ]; then
  echo "FEL: ingen publik deploy-nyckel. Ange den som argument efter 'bash -s --',"
  echo "eller lägg den i infra/deploy_authorized_keys i repot först."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/5] Installerar Docker m.m. ..."
apt-get update -y -qq
apt-get install -y -qq docker.io docker-compose-v2 ufw ca-certificates curl
systemctl enable --now docker

echo "[2/5] Skapar deploy-användaren ..."
id -u deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
usermod -aG docker deploy

echo "[3/5] Installerar SSH-nyckeln ..."
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

echo "[4/5] App-katalog ..."
install -d -o deploy -g deploy /home/deploy/app

echo "[5/5] Brandvägg (SSH + HTTP/HTTPS) ..."
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "=================================================="
echo " KLART — servern är deploy-redo."
echo ""
echo " Serverns IP:  $IP"
echo ""
echo " Nästa steg (GitHub → Settings → Secrets → Actions):"
echo "   DEPLOY_HOST    = $IP"
echo "   DEPLOY_USER    = deploy"
echo "   DEPLOY_SSH_KEY = innehållet i privata nyckelfilen"
echo ""
echo " Peka DNS: hajj.karimkhalil.se → $IP"
echo " Kör sedan 'Build and deploy' i GitHub Actions."
echo "=================================================="
