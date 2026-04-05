# OptionsRanker — Agent Instructions

## Project Overview
- **Domain**: optionsranker.io
- **Type**: Options strategy ranking platform -- enter a ticker, get 14 strategies scored and ranked
- **Stack**: DUAL PLATFORM
  - **Lite SPA**: Cloudflare Pages + Edge Functions, D1, vanilla JS single-page app (`lite/`)
  - **Full Platform**: React 19, Vite 6, TypeScript, Express 5, SQLite, Vercel (`client/` + `server/`)
- **CF Project Name**: `options-ranker` (lite SPA on CF Pages)
- **Vercel Project**: `optionsranker` (full platform)
- **GitHub**: https://github.com/dball1126/optionsranker
- **Workspace**: `/Users/Ball/.openclaw/workspace/optionsranker/`
- **AdSense**: No
- **Payments**: Stripe (raw fetch in lite, SDK in full)
- **Auth**: Google OAuth (One Tap) + guest mode (lite); JWT with refresh rotation (full)
- **Market Data**: Yahoo Finance APIs (options chain with crumb auth, chart data)
- **Pricing**: $10/mo (lite), $29/mo (full platform)

## Architecture

### Lite SPA (`lite/`)
```
lite/
├── index.html              # Single-page app (~2,200 lines, all CSS/JS/HTML)
├── server.js               # Local dev server (port 8789)
├── wrangler.toml           # CF Pages config + D1 binding
├── schema.sql              # D1 schema (users, iv_history, saved_strategies)
└── functions/api/
    ├── options/[[path]].js  # Yahoo options proxy (crumb auth)
    ├── chart/[[path]].js    # Yahoo chart proxy (price data)
    ├── options-data.js      # IV history + saved strategies (D1)
    ├── market-pulse.js      # Market pulse dashboard data
    ├── config.js            # Client config
    ├── subscription.js      # Read subscription status
    ├── create-checkout.js   # Stripe Checkout Session
    ├── stripe-webhook.js    # Stripe webhook (HMAC-SHA256 verified)
    ├── customer-portal.js   # Stripe billing portal
    └── user-data.js         # User sync on sign-in
```

### Full Platform (root)
```
optionsranker/
├── client/                  # React 19 + Vite 6 + TypeScript + Tailwind + Zustand + Recharts
├── server/                  # Express 5 + better-sqlite3 + bcrypt + JWT
├── shared/                  # Shared types/utilities
├── data/                    # SQLite database files
├── docs/                    # Documentation
├── scripts/
│   └── performance-test.js  # Production perf tests
├── deploy.sh                # Vercel deploy script
├── vercel.json              # Vercel config
├── docker-compose.yml       # Docker setup
├── Dockerfile               # Container build
├── vitest.config.ts         # Test config
└── tsconfig.base.json       # TypeScript base config
```

### Core Features (Lite)
- **14 Strategy Types**: Long Call/Put, Covered Call, Cash-Secured Put, Bull/Bear Call/Put Spreads, Iron Condor, Straddle, Strangle, Butterfly, Calendar Spread, Diagonal Spread
- **Black-Scholes Scoring**: Probability of profit, risk/reward, expected value, IV alignment, liquidity, bid-ask tightness
- **IV Rank**: Computed from D1 history with HV-based fallback
- **Payoff Diagrams**: Canvas-based P&L visualization per strategy
- **Market Pulse Dashboard**: SPY vs 200-day MA, broad market participation (RSP vs SPY), VIX trend
- **Subscription Gating**: Free = top 2 strategies; Paid = all 14 + payoff diagrams + save

### Additional Features (Full Platform)
- Interactive learning modules with quizzes
- Paper trading ($100k virtual capital)
- Portfolio tracker with trade history
- Watchlists
- Signal generation
- JWT auth with refresh token rotation

## Deploy Process
```bash
# Lite (Cloudflare Pages)
bash scripts/deploy.sh    # Primary (if exists)
# Manual:
cd lite && npx wrangler pages deploy ./ --project-name options-ranker --commit-dirty=true

# Full Platform (Vercel)
./deploy.sh               # Or: vercel --prod
```

## Deploy Safety Protocol
1. Before deploying: `git tag pre-deploy-$(date +%s)`
2. Deploy using the appropriate command above (lite vs full)
3. Run `bash scripts/smoke-test.sh` (if exists; otherwise manually verify optionsranker.io loads)
4. If smoke test FAILS: `git revert HEAD --no-edit && git push`, re-deploy, log "Reverted"
5. If smoke test PASSES: log "Success"

## Test Commands
```bash
# Lite -- local dev
cd lite && node server.js                              # Port 8789

# Full Platform -- local dev
npm run dev                                            # Client:5173, Server:3001

# Full Platform -- build
npm run build                                          # Production build

# Full Platform -- database
npm run db:setup && npm run db:seed                    # Init + seed database

# Performance tests
npm run test:performance                               # Local perf test
npm run test:production                                # Production perf test (hits optionsranker.vercel.app)

# After code changes -- delegate to test agent
cd /Users/Ball/.openclaw/workspace/agents
node agents/optionsranker-test/                        # Full test suite
node agents/optionsranker-test/ --quick                # Quick validation
```

## Feature Backlog

### High Priority (Lite)
1. **More strategies** -- Ratio spreads, jade lizard, collar
2. **Earnings play mode** -- Pre-earnings strategy recommendations based on historical IV crush
3. **Options chain explorer** -- Browse full chain with Greeks, OI, volume
4. **Alert system** -- Email when IV rank crosses thresholds

### High Priority (Full Platform)
5. **Complete learning modules** -- Fill out all quiz content
6. **Paper trading UX polish** -- Order history, P&L tracking, unrealized gains
7. **Signal quality scoring** -- Backtest signals against historical data

### Medium Priority
8. **Watchlist sync** -- Share watchlists between lite and full
9. **Social proof** -- Show popular strategies, most-analyzed tickers
10. **Mobile app wrapper** -- Capacitor or PWA for mobile

## Known Issues & Lessons Learned
- Yahoo Finance API requires crumb/cookie auth -- the `functions/api/options/[[path]].js` proxy handles this
- D1 database ID in `lite/wrangler.toml` is placeholder (`PLACEHOLDER`) -- needs real ID set via dashboard
- Lite is a single ~2,200-line HTML file -- changes require careful editing to avoid breaking inline JS/CSS
- The lite and full platform share the same domain but different deployment targets
- Stripe secrets must be set via Cloudflare dashboard or `wrangler secret put` (never in source)
- Required CF secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET, GOOGLE_CLIENT_ID

## Integrity Agent
```bash
cd /Users/Ball/.openclaw/workspace/agents
node scripts/run-integrity.js --site=optionsranker.io
```

## Stateful Memory Rules

### Pre-Flight (before ANY task)
1. Read `.agent_history/current_summary.md` for platform state and lessons learned
2. Read the last 10 lines of `.agent_history/active_ledger.jsonl` for recent changes
3. **CONSTRAINT**: If a proposed change matches a "Failure" or "Reverted" outcome in the history, HALT and propose an alternative

### Post-Action (after EVERY successful commit)
1. Append an entry to `.agent_history/active_ledger.jsonl`:
```json
{"timestamp":"ISO-8601","component":"file(s) changed","action":"Refactor|Fix|Feature|Experiment","change_description":"what was done","metric_impact":"measurable result","outcome":"Success|Failure|Reverted"}
```
2. When `active_ledger.jsonl` hits 50 entries, run: `python3 scripts/compact-agent-history.py`

### Memory Structure
```
.agent_history/
  current_summary.md    -- High-level state, architecture decisions, lessons learned
  active_ledger.jsonl   -- Last 50 changes (detailed, one JSON per line)
  archive/              -- Rotated ledger files (older than 50 entries)
```

## COMMIT POLICY
**MANDATORY**: Every commit must include:
1. Standard git commit message
2. Entry in `.agent_history/active_ledger.jsonl` (JSON log entry)

## Central Memory Reporting

**MANDATORY**: After completing any daily check, maintenance run, or significant change:

1. Ensure your `.agent_history/active_ledger.jsonl` entry includes a `health_score` or `change_description` that the memory bridge can parse.
2. The central memory bridge (`lib/memory-bridge.js`) aggregates your status into `fleet-state.json` at the workspace root.
3. Before starting work, check the fleet state: `node lib/memory-bridge.js --query optionsranker` to see if work was already done in the last 24 hours.
4. Do NOT repeat work that the fleet state shows as successfully completed within the last 24 hours.
