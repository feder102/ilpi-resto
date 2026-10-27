#!/usr/bin/env bash
# Build the admin-only documentation site (/docum) and publish it to the VPS.
#
# Clones template-documentacion into a temp dir (never touches a local checkout),
# drops in docs/architecture/site/{types,data}.ts, builds with base /docum/ and
# rsyncs dist/ to the docum-dist directory that the Coolify gateway mounts.
# No redeploy needed: Caddy serves the mounted files directly.
#
# Usage: scripts/build-docum.sh [--no-upload]
set -euo pipefail

TEMPLATE_REPO="${TEMPLATE_REPO:-https://github.com/feder102/template-documentacion.git}"
TEMPLATE_REF="${TEMPLATE_REF:-main}"
VPS="${VPS:-root@62.238.61.134}"
APP_UUID="${APP_UUID:-9poetcpgivmo9yhrf4ldd765}"
REMOTE_DIR="/data/coolify/applications/${APP_UUID}/docum-dist/"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "[build-docum] Cloning ${TEMPLATE_REPO}@${TEMPLATE_REF}..."
git clone --quiet --depth 1 --branch "$TEMPLATE_REF" "$TEMPLATE_REPO" "$WORK/site"

cp "$ROOT/docs/architecture/site/types.ts" "$WORK/site/src/types.ts"
cp "$ROOT/docs/architecture/site/data.ts" "$WORK/site/src/data.ts"

echo "[build-docum] Installing and building (base /docum/)..."
# The template repo does not commit a lockfile; fall back to npm install.
(
  cd "$WORK/site"
  if [[ -f package-lock.json ]]; then npm ci --no-audit --no-fund --loglevel=error
  else npm install --no-audit --no-fund --loglevel=error; fi
  npx vite build --base=/docum/
)

if [[ "${1:-}" == "--no-upload" ]]; then
  rm -rf "$ROOT/docum-dist"
  cp -R "$WORK/site/dist" "$ROOT/docum-dist"
  echo "[build-docum] Build copied to ./docum-dist (not uploaded)."
  exit 0
fi

echo "[build-docum] Uploading to ${VPS}:${REMOTE_DIR}..."
rsync -az --delete "$WORK/site/dist/" "${VPS}:${REMOTE_DIR}"
echo "[build-docum] Done: https://ilpi.vila.ar/docum (Admin only)."
