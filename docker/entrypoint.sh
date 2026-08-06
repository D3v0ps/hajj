#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Running database migrations..."
prisma migrate deploy

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "[entrypoint] Running seed..."
  node prisma/seed.mjs || echo "[entrypoint] Seed failed (continuing)"
fi

echo "[entrypoint] Starting app: $*"
exec "$@"
