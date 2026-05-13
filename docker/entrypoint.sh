#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "[entrypoint] Running seed..."
  node node_modules/prisma/build/index.js db seed || echo "[entrypoint] Seed failed (continuing)"
fi

echo "[entrypoint] Starting app: $*"
exec "$@"
