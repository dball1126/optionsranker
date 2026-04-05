#!/bin/bash
set -e
SITE_NAME="optionsranker"
CF_PROJECT="optionsranker"
DOMAIN="https://optionsranker.io"

echo "=== Deploying $SITE_NAME ==="

# Build (if applicable)
npm run build 2>/dev/null || true

# Deploy to Cloudflare Pages
npx wrangler pages deploy ./ --project-name "$CF_PROJECT" --commit-dirty=true

# Wait for deploy to propagate
echo "Waiting for deploy to propagate..."
sleep 10

# Smoke test
bash scripts/smoke-test.sh
