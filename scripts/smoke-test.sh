#!/bin/bash
set -e
DOMAIN="https://optionsranker.io"
echo "=== Smoke Test: OptionsRanker ==="

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN")
if [ "$STATUS" != "200" ]; then echo "FAIL: $DOMAIN returned $STATUS"; exit 1; fi

echo "PASS: $DOMAIN is healthy"
