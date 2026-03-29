# Add Feature Agent — OptionsRanker Lite

## Purpose
Implements new features needed for production readiness of the OptionsRanker lite site.

## Project Context
- **Location**: `/Users/Ball/.openclaw/workspace/optionsranker/lite/`
- **Stack**: Cloudflare Pages + Edge Functions, D1 (SQLite), single-file SPA (index.html)
- **Edge functions**: `lite/functions/api/` — 8 functions (chart, options, options-data, create-checkout, customer-portal, stripe-webhook, subscription, user-data, market-pulse)
- **Local dev**: `node server.js` on port 8789
- **Tests**: `agents/optionsranker-test/specialist.js` (136 checks, run against dev server)

## Feature Queue (production blockers)

### 1. Rate Limiting on Yahoo Finance Proxy
- Add in-memory rate limiter to `functions/api/chart/[[path]].js` and `functions/api/options/[[path]].js`
- Limit: 30 requests/minute per IP using Cloudflare headers (`CF-Connecting-IP`)
- Return 429 with retry-after header when exceeded

### 2. Request Logging / Error Monitoring
- Add `console.log` structured JSON logging to all edge functions (Cloudflare captures these in dashboard)
- Format: `{ ts, fn, action, userId?, status, durationMs, error? }`
- Add error boundary logging in index.html `window.onerror` and `unhandledrejection`

### 3. Config Endpoint for Google Client ID
- New edge function `functions/api/config.js` that returns non-secret config from env vars
- Returns `{ googleClientId: context.env.GOOGLE_CLIENT_ID }`
- Update index.html to fetch `/api/config` on load instead of hardcoding 'GOOGLE_CLIENT_ID'

### 4. Environment Template
- Create `.env.example` listing all required env vars with descriptions
- Create `DEPLOY.md` with step-by-step Cloudflare Pages deployment guide

### 5. Dynamic Email Domain in Market Pulse
- Update `functions/api/market-pulse.js` to use `context.env.FROM_EMAIL` or fallback
- Update email link to use request origin instead of hardcoded `https://optionsranker.com`

## Rules
- Read existing code before modifying
- Keep changes minimal and focused
- Update tests in `agents/optionsranker-test/specialist.js` for any new features
- Update `update_history/` with a log entry after implementation
- Run tests after changes: `node agents/optionsranker-test/specialist.js`
