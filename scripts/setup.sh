#!/usr/bin/env bash
# Sinkroo — one-shot VPS setup (Ubuntu 24.04).
# Usage: run as root on a fresh droplet. Installs Docker, clones repo, boots stack.
set -euo pipefail

REPO="https://github.com/mauricioassetium-sketch/sinkroo.git"
APP_DIR="/opt/sinkroo"

echo "==> [1/6] Updating packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -q

echo "==> [2/6] Installing Docker..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> [3/6] Cloning repository..."
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
else
  echo "    repo already present at $APP_DIR"
fi
cd "$APP_DIR"
git pull --ff-only origin main 2>/dev/null || true

echo "==> [4/6] Writing .env (placeholders — fill in your provider key) ..."
if [ ! -f .env ]; then
  cat > .env << 'ENV'
# AI provider (Gemini via OpenAI-compatible endpoint). Leave empty to use local fallback.
PROVIDER_BASE_URL=
PROVIDER_API_KEY=
PROVIDER_MODEL=gemini-3.6-flash
ENV
  echo "    created .env (fill PROVIDER_API_KEY later for real AI)"
fi

echo "==> [5/6] Building and starting stack..."
docker compose up -d --build

echo "==> [6/6] Verifying..."
sleep 5
docker compose ps
echo ""
echo "--- health checks ---"
curl -s http://localhost:3000/healthz || echo "(api not up yet)"
echo ""
curl -s http://localhost:3100/healthz || echo "(broker not up yet)"
echo ""
echo ""
echo "Done. Sinkroo is running."
echo "  API:        http://$(hostname -I | awk '{print $1}'):3000"
echo "  Broker:     http://$(hostname -I | awk '{print $1}'):3100"
echo "  DB tables:  docker compose exec db psql -U sinkroo -c '\\dt'"
