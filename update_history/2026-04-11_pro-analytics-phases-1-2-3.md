# 2026-04-11 — Pro Analytics: All Three Phases (Goldman-Trader Plan)

**Timestamp:** 2026-04-11 ~afternoon ET

## Why
A real options trader looking at OptionsRanker would not use it as-is. The scoring engine had structural blind spots: no IV skew, no VRP, no GEX, no skew-adjusted POP, no position sizing, no liquidity floor. This update ships all three phases of the trader-grade improvement plan in a single session.

## What — Phase 1: Fix what's structurally broken

### 1.1 IV history calibration
`daily-routine.js getTopStrategy()` now upserts to `iv_history` after computing `chainAvgIV`. Each daily cron run seeds the table; after ~30 runs IV Rank is fully calibrated. The `iv_history` D1 table didn't exist in prod (declared in schema.sql but never created) — created via wrangler. End-to-end verified: all 10 tracked tickers now have their first row (SPY 19.8%, TSLA 47.9%, AMD 56.8%, etc.).

### 1.2 IV skew computation + skew-aware scoring
New `computeSkew(calls, puts, S, T)` in `lite/options-analytics.js`. Finds 25-delta put/call IVs and computes `(iv25dPut − iv25dCall) / ivAtm`. Stamped on every result and exposed via a new badge in the IV banner. Scoring loop applies +5 to credit-put strategies when skew > 0.05, +5 to credit-call strategies when skew < −0.03, with smaller adjustments to long premium on the opposite side.

### 1.3 VRP regime indicator
`computeRealizedVol(closes)` and `computeVRP(vix, rv)` in the analytics library. `loadMarketPulse()` fetches SPY 1mo chart, computes 20-day RV, divides VIX/100 by RV. Cached on `window._lastMarketPulse.vrp`. Scoring adds +3 to net sellers when VRP > 1.3, +3 to net buyers when VRP < 0.9. New badge in the IV banner labeled "Sellers favored" / "Buyers favored" / "Neutral".

### 1.4 Skew-adjusted POP
`skewAdjustedProb(spot, breakeven, T, atmIV, skew, direction)` recomputes the lognormal CDF with IV inflated/deflated based on the skew direction. Wired into the scoring loop as a post-hoc correction (less invasive than modifying all 14 buildStrategies sites). Original lognormal prob preserved as `s.probLognormal` for debugging.

### 1.5 Bid-ask disqualifier
Strategies with `(bidAskSpread / legs.length) / avgLegPrice > 5%` are flagged `disqualified=true` and filtered before scoring. Banner shows the count of filtered untradeable strategies. This alone removed the bizarre Bull Call Spread fills that were skewing the backtester (entries at $0.02 with $1+ wide spreads).

## Phase 2: Competitive features

### 2.1 GEX gauge for SPY/QQQ
`computeGEX(chain, spot)` sums per-strike gamma exposure (sign-flipped for puts) and finds the gamma flip strike via cumulative sign change. `loadMarketPulse()` runs it on SPY's nearest 20-60 DTE chain and caches on `window._lastMarketPulse.gex`. Scoring adds +3 to mean-reverting strategies (Iron Condors, credit spreads) when above the flip and dealers are long gamma; +5 to long directional (Long Call/Put) when below the flip and dealers are short gamma. New badge in the IV banner.

### 2.2 Earnings IV crush model
`computeEarningsCrushEdge(spot, atmStraddleMid, historicalMoves)`. The analyzer extracts ~4 historical earnings-like spikes from a 1-year chart history (largest absolute % moves separated by ≥50 days as a proxy for quarterly earnings), computes their median, compares to the current implied move (ATM straddle × 0.85), and emits a `sell_premium` / `buy_premium` / `neutral` recommendation. Scoring adds +5 to short premium when overpriced, +5 to long premium when underpriced. New badge.

### 2.3 Scenario heatmap
New `drawScenarioHeatmap()` renders a 2D `spot × days_remaining` canvas heatmap using the existing `valueStrategyAtPrice` from `timing-optimizer.js` — the single source of truth for payoff math. Color gradient red→white→green with current spot overlaid as a yellow vertical line. New 1D/2D toggle in the modal's payoff section. Pros think in 2D; the gap is the whole product.

### 2.4 Position sizing card
`computeKellySize(maxProfit, maxLoss, prob, accountSize)` returns half-Kelly capped at 2% of account (the standard "responsible Kelly" defaults). New settings row at the top of the results page lets the user set their account size (localStorage). Each strategy card shows a "Suggested size: N contracts ($X risk, Y% of $Z)" line. Negative-edge trades show "0 contracts — Negative edge — skip".

## Phase 3: Retention features

### 3.1 "Trades like this" pattern matcher
New API endpoint `lite/functions/api/similar-trades.js` queries `paper_trades` by `strategy = ? AND iv_rank BETWEEN ?-10 AND ?+10 AND dte BETWEEN ?-5 AND ?+5 AND status='closed'`. Returns aggregate win rate, total P&L, avg P&L, sample. New "Similar Trades" section in the strategy modal calls it on open. As the backtester accumulates closed trades over weeks, this becomes more valuable on every visit.

### 3.2 Portfolio-level Greeks aggregation
`renderSavedSection()` now aggregates net δ/γ/θ/ν across all saved strategies (using a sentiment-weighted heuristic since saved strategies don't carry full greek state). New 4-cell grid above the saved cards.

### 3.3 Roll suggestions at 21 DTE
When a strategy approaches its time stop (within `timeStopDTE + 7` days), the modal shows a "Manage Position" / "Time Stop Approaching" section with three options: Close Now (P&L: $X) / Roll Out (+30 DTE) / Hold (Risk).

### 3.4 Backtester learning loop
New `agents/agents/optionsranker/backtester/calibrate-scoring.js` — hand-coded logistic regression with batch gradient descent (no external ML library). Fits 5 features (normalized score, normalized IV rank, normalized DTE, profit_target indicator, time_stop indicator) to win/loss labels from closed paper_trades. Writes `scoring-weights.json` with fitted coefficients + bias + accuracy. Short-circuits with default weights when fewer than 30 closed trades. Wired into `daily-routine.js` to run on Fridays after the report.

### 3.5 Wheel tracker MVP
New section in the SPA (localStorage-only, no D1) that tracks CSP → assignment → CC → assignment cycles. State machine: `csp_open` → `cc_open` → `csp_open`. Each transition prompts for the new premium received and updates the cycle profit. Manual entry, button-driven UX. Will graduate to D1-backed in a follow-up if usage warrants.

## Tests — 107/107 passing
- `lite/tests/options-analytics.test.js` — **17 new** unit tests covering computeSkew, computeRealizedVol, computeVRP, vrpRegime, computeGEX, skewAdjustedProb (lognormal reproduction + tail fattening), computeKellySize (positive/negative edge, default account), computeEarningsCrushEdge (overpriced/underpriced/insufficient_data)
- `lite/tests/features.test.js` — **16 new** SPA wiring assertions
- `agents/agents/optionsranker/backtester/tests/calibrate-scoring.test.js` — **4 new** unit tests for the logistic regression fitter
- All regression suites still pass: features (44), exit-plan (11), exit-triggers (12), timing-optimizer (14), timing-optimizer-integration (5)

## Deploy
- Live: `https://ed9ca22c.optionsranker.pages.dev` — verified `options-analytics.js` returns 200 + 15 occurrences of new markup in served HTML
- API endpoint live: `https://optionsranker.pages.dev/api/similar-trades` returns proper JSON
- D1: `iv_history` table created in prod; first 10 rows seeded by today's backtester run

## Backtester end-to-end against D1 prod
- 50 legacy trades marked-to-market; many closed via `profit_target` (the bid-ask filter and exit triggers working in concert)
- 10 new entries — strategy diversity exploded vs yesterday:
  - Yesterday: 6× Bull Call Spread, 4× Long Put (cold-start bias)
  - Today: Long Puts, Iron Condors, Bear Call Spreads, mixed
- IV ranks now realistic: 28-74 across the 10 tickers (yesterday all 0)
- 10 timing-optimized second rows entered alongside the defaults
- The new analytics row in the IV banner (skew/VRP/GEX/earnings) is wired and will populate as soon as the SPA renders

## Files added
- `lite/options-analytics.js` (new — 220 lines)
- `lite/functions/api/similar-trades.js` (new)
- `lite/tests/options-analytics.test.js` (new — 17 tests)
- `agents/agents/optionsranker/backtester/calibrate-scoring.js` (new — 150 lines)
- `agents/agents/optionsranker/backtester/tests/calibrate-scoring.test.js` (new)

## Files modified
- `lite/index.html` — script tag, IV banner analytics row, scoring loop additions, sizing card, scenario heatmap renderer, similar-trades section, roll suggestions section, wheel tracker section, account-size settings, CSS for ~10 new components
- `lite/tests/features.test.js` — 16 new assertions
- `agents/agents/optionsranker/backtester/daily-routine.js` — Phase 1.1 iv_history upsert, Friday calibration call

## D1 schema
- New table: `iv_history` (was declared in schema.sql but never created in prod — created via wrangler)
- No migrations needed for `paper_trades` or `saved_strategies`

## Decisions
- **Skew-adjusted POP applied as post-hoc correction**, not by rewriting all 14 buildStrategies prob calculations. Less invasive, easier to test, easier to disable if it backfires.
- **Bid-ask disqualifier set at 5% of mid** — the industry-standard floor. Anything wider isn't tradeable for retail.
- **GEX scoring boost gated to SPY/QQQ/IWM/DIA** — single-name GEX is noisy and not predictive.
- **Earnings crush model uses heuristic earnings detection** (largest 4 absolute % moves separated by ≥50 days) since we don't have a proper earnings calendar feed yet. Acceptable for MVP.
- **Wheel tracker is localStorage-only** — promote to D1 if users actually use it.
- **Calibration script writes default weights when sample < 30** so the system doesn't error on day-1 — graceful degradation.
- **Half-Kelly capped at 2%** is the responsible default; users can't override the cap from the UI in this version.

## Known caveats / future work
- The portfolio greeks aggregation uses a coarse sentiment heuristic; a real implementation would re-fetch the chain for each saved strategy and compute exact greeks. Acceptable for a "feel" indicator.
- The roll suggestion shows "+30 DTE" as a placeholder — wiring up a real chain fetch for the next expiration is a follow-up.
- Backtester does not yet read `scoring-weights.json` — calibrate-scoring.js writes the file but daily-routine.js doesn't yet apply the fitted coefficients. Next sprint will close that loop.
- Earnings detection is heuristic; real calendar feed would improve accuracy.
- The `iv_history` table needs ~30 daily runs to fully calibrate IV Rank for each ticker. Today is day 1.

## What this unlocks
After today's run, the OptionsRanker scoring engine has:
- ✅ Real IV Rank (calibrating, currently HV-fallback)
- ✅ IV skew awareness
- ✅ VRP regime filter
- ✅ GEX dealer positioning (SPY/QQQ)
- ✅ Skew-adjusted POP
- ✅ Earnings crush edge
- ✅ Bid-ask liquidity floor
- ✅ Position sizing recommendations
- ✅ 2D scenario analysis
- ✅ Pattern matching against backtester history
- ✅ Portfolio greeks
- ✅ Roll suggestions
- ✅ Wheel cycle tracking
- ✅ Self-calibrating scoring weights (infrastructure in place)

This is the version of OptionsRanker I'd actually put in front of a Goldman desk friend.
