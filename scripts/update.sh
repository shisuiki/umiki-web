#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/shisui/laplace/umiki-web"
LOG_TAG="umiki-web-updater"

cd "$PROJECT_DIR"

# fetch remote changes
git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "[$LOG_TAG] No changes detected, skipping."
    exit 0
fi

echo "[$LOG_TAG] Changes detected: $LOCAL -> $REMOTE"
echo "[$LOG_TAG] Pulling..."
git pull origin main --ff-only

echo "[$LOG_TAG] Installing dependencies..."
npm ci --silent

echo "[$LOG_TAG] Building..."
npm run build

echo "[$LOG_TAG] Restarting web server..."
systemctl --user restart umiki-web.service

echo "[$LOG_TAG] Update complete."
