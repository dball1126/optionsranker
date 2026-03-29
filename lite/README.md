# OptionsRanker

Standalone options strategy ranking site. Enter any ticker, get 14 strategies scored and ranked instantly.

## Features

- **14 Strategy Types** — Long Call/Put, Covered Call, Cash-Secured Put, Bull/Bear Call/Put Spreads, Iron Condor, Straddle, Strangle, Butterfly, Calendar Spread, Diagonal Spread
- **Black-Scholes Scoring** — Each strategy scored on probability of profit, risk/reward, expected value, IV alignment, liquidity, and bid-ask tightness
- **IV Rank** — Computed from historical IV data (D1) with HV-based fallback
- **Payoff Diagrams** — Canvas-based P&L visualization per strategy
- **Options Chain Viewer** — Full chain with calls/puts side-by-side, ITM highlighting
- **Market Pulse** — Landing page dashboard with 3 re-entry signals:
  - S&P 500 vs 200-day moving average
  - Broad market participation (RSP vs SPY)
  - VIX volatility trend (falling after spike detection)
- **Subscription Gating** — Free users see top 2 strategies; $10/mo unlocks all 14
- **Stripe Integration** — Checkout, webhook handling (HMAC-verified), billing portal
- **Google OAuth** — Sign in with Google or continue as guest
- **Save Strategies** — Paid users can bookmark strategies with entry IV tracking

## Tech Stack

- **Frontend**: Single-page HTML app (~2,200 lines)
- **Backend**: Cloudflare Pages + Edge Functions
- **Database**: Cloudflare D1 (SQLite)
- **Data**: Yahoo Finance APIs (options chain with crumb auth, chart data)
- **Payments**: Stripe (raw `fetch()` calls, no SDK)
- **Auth**: Google OAuth (One Tap)

## Project Structure

```
options-site/
├── index.html              # Single-page app
├── server.js               # Local dev server (port 8789)
├── wrangler.toml            # Cloudflare Pages + D1 binding
├── schema.sql               # D1 schema (users, iv_history, saved_strategies)
└── functions/api/
    ├── options/[[path]].js  # Yahoo options proxy (crumb auth)
    ├── chart/[[path]].js    # Yahoo chart proxy (price data)
    ├── options-data.js      # IV history + saved strategies (D1)
    ├── subscription.js      # Read subscription status
    ├── create-checkout.js   # Stripe Checkout Session
    ├── stripe-webhook.js    # Stripe webhook (HMAC-SHA256 verified)
    ├── customer-portal.js   # Stripe billing portal
    └── user-data.js         # User sync on sign-in
```

## Local Development

```bash
node server.js
# Open http://localhost:8789
```

Stripe and Google OAuth are simulated locally — checkout redirects back with a test session ID, subscription defaults to free.

## Deployment

1. Create a Cloudflare Pages project
2. Create a D1 database and run `schema.sql`
3. Update `database_id` in `wrangler.toml`
4. Set environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID`
5. Replace `GOOGLE_CLIENT_ID` in `index.html`
6. Deploy:

```bash
npx wrangler pages deploy ./
```
