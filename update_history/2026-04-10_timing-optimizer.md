# 2026-04-10 — Trade Timing Optimizer

**Timestamp:** 2026-04-10 ~12:55 PM ET

## Why
We just shipped the dynamic exit plan that gives every user the SAME default rules (50% profit / 2x credit stop / 21 DTE etc.). The next question is: *for THIS specific strategy on THIS specific day, is the default the best plan, or would a different timing combo lock in more profit?* The Timing Optimizer answers that with a Monte Carlo simulation across 7 alternative entry/exit candidates ranked by expected profit. Same engine in the SPA (paid users) and the backtester (records both rows for A/B comparison).

## What

### New shared library — `lite/timing-optimizer.js`
- **`valueStrategyAtPrice(strategy, spotPrice, daysRemaining, iv)`** — closed-form payoff at any spot/time using Black-Scholes for live legs and intrinsic at expiry. Extracted from `drawPayoffDiagram` and parameterized on `daysRemaining`. The single source of truth for "what is this position worth right now."
- **`blackScholesValue(type, S, K, T, sigma, r)`** — clean BS pricing function (extracted from inline math).
- **`mulberry32` + `hashSeed` + `sampleGaussian`** — seedable PRNG infrastructure. Same trade on the same day always produces the same ranking (users would flag non-determinism as a bug).
- **`simulateGBMPath(spot, iv, days, rng)`** — daily-step Geometric Brownian Motion. Risk-neutral drift `(r - 0.5σ²)*dt`, diffusion `σ*√dt`.
- **`generateCandidates(strategy, marketState)`** — produces 6-7 timing candidates:
  1. **baseline** (default exit plan from `computeExitPlan`)
  2. **aggressive_pt** (50% of baseline profit target — take winners faster)
  3. **patient_pt** (150% of baseline — squeeze more out)
  4. **hold_expiry** (no early exits at all)
  5. **time_50pct** (exit at half-time decay)
  6. **iv_flip** (exit when realized vol reverts via rolling 10-day proxy)
  7. **earnings_minus_1** (only if earnings is in range — exit day before announcement)
- **`simulateProposal(strategy, candidate, marketState, nPaths, rng)`** — runs N GBM paths, walks each day-by-day. Trigger priority: earnings → profit → stop → time → iv_flip. Returns `{ meanPnl, winRate, expectedHoldDays, percentile5, percentile95 }`.
- **`optimizeTimings(strategy, marketState, opts)`** — orchestrator. Generates candidates, simulates each with its own seeded RNG offset (so candidate order doesn't bias results), computes `deltaVsDefault`, sorts by `meanPnl` descending, returns top N (default 5) with baseline always present.

### `lite/index.html` SPA wiring
- Inline-includes `<script src="timing-optimizer.js">` after exit-plan.js
- New "⚡ Optimize Timing" button next to Save Strategy in the detail modal (paid users only)
- New `<div id="timing-optimizer-section">` placeholder for the panel
- New functions: `openTimingOptimizer`, `closeTimingOptimizer`, `renderTimingOptimizerCards`, `renderTimingCard`, `saveOptimizedPlan`
- `openTimingOptimizer` defers via `setTimeout(20)` so the loading state paints before the simulation blocks the main thread (~500ms wall-clock for 1000 paths × 6 candidates)
- Each ranked card shows: rank badge, candidate name, entry/exit conditions, 4-stat grid (expected P&L / win rate / expected hold / 5–95% range), and a `delta vs default plan` badge
- Top card has a "Save This Plan" button that mutates `strategy.exitPlan` with the chosen candidate's params and calls the existing `saveStrategy()` — no API change needed beyond the JSON payload
- New CSS: `.timing-optimizer-panel`, `.to-header`, `.to-loading`, `.timing-card`, `.tc-rank-badge`, `.tc-stats`, `.tc-delta`, `.tc-save-btn`, etc.

### `agents/agents/optionsranker/backtester/daily-routine.js` (separate repo)
- Imports `optimizeTimings` and `valueStrategyAtPrice` from the shared library
- `getTopStrategy` returns `_strategy` and `_exitPlan` as hidden fields the optimizer consumes
- After each `insertTrade(top)`, runs `optimizeTimings` and writes a SECOND row tagged `notes='timing_optimized:<id>:meanPnl=X:winRate=Y'` if a non-baseline candidate wins
- `insertTrade` honors `_notesOverride` (defaults to the existing string)
- Friday report adds a new "Default vs Timing-Optimized" comparison block with side-by-side win rate and total/avg P&L
- `module.exports` adds `optimizeTimings, valueStrategyAtPrice`

## Tests
- `lite/tests/timing-optimizer.test.js` — 14 unit tests:
  - `valueStrategyAtPrice` — Long Call ITM/OTM at expiry, mid-life time value, Bull Call Spread bounds, Iron Condor inside-wings
  - `simulateGBMPath` — mean of 5000 paths converges to risk-neutral drift; `iv=0` produces deterministic drift-only path
  - `mulberry32` determinism
  - `generateCandidates` — count (6 without earnings, 7 with), baseline always at index 0
  - `simulateProposal` — return shape, deep OTM Long Call held to expiry has negative mean and low win rate
  - `optimizeTimings` — ranked output with baseline always present, deterministic across calls with same seed
- `lite/tests/features.test.js` — 8 new SPA wiring assertions
- `agents/agents/optionsranker/backtester/tests/timing-optimizer-integration.test.js` — 5 integration tests against the daily-routine module exports

**All 70 tests pass:** features (28) + exit-plan (11) + timing-optimizer (14) + exit-triggers (12) + backtester integration (5).

## Decisions
- **1000 paths client-side** — ~500ms wall-clock budget. 500 paths in the backtester for speed.
- **Seeded by `hash(symbol|strategyName|expirationDate|entryDate)`** — same trade same day same ranking.
- **Each candidate gets its own RNG offset** (seed + i) — prevents the order of generation from biasing results.
- **Baseline always in the ranked list** — even if it's outside the top N, the whole UX is "compare alternatives to your default."
- **Expandable section, NOT a sub-modal** — the SPA's three modals (#detail/#upgrade/#signin) are mutually exclusive.
- **Save target is `saved_strategies` via existing API** — no schema or API changes needed; the optimizer mutates `strategy.exitPlan` in memory before calling `saveStrategy()`.
- **Backtester records both rows** — default and optimized as parallel paper trades, distinguished by the `notes` field. Over weeks of trades the Friday report shows whether the optimizer beats baseline in real markets without committing to a behavior change.
- **Bug fixed during testing**: `const sigma = iv || 0.3` in `simulateGBMPath` was a falsy fallback that turned `iv=0` into `iv=0.3`. Changed to `iv != null ? iv : 0.3` so the deterministic-path test (and any future zero-IV calls) work correctly.

## Deploy
- Live: `https://2ebc0969.optionsranker.pages.dev` — verified `timing-optimizer.js` returns 200

## Backtester end-to-end against D1 prod
- 30 legacy trades marked-to-market (no behavior change)
- 10 new default trades entered (IDs 31, 33, 35, 37, 39, 41, 43, 45, 47, 49)
- 10 timing-optimized second rows entered (IDs 32, 34, 36, 38, 40, 42, 44, 46, 48, 50)
- Winners: 5× `hold_expiry` (TSLA, SPY, QQQ, META, MSFT), 2× `time_50pct` (NVDA, AMD), 2× `iv_flip` (AMZN, GOOGL), 1× `patient_pt` (AAPL)
- The "hold_expiry" bias reflects the IV cold-start issue from earlier — with `iv_rank=0`, the simulator favors patience for debit spreads. Once the iv_history table populates, candidate diversity will increase

## Next steps unlocked
- After ~2 weeks of trades settling, the Friday report's "Default vs Timing-Optimized" table will have real comparison data
- If the optimizer consistently beats baseline by >$X per trade, we can promote it from "info" to "auto" — i.e. backtester switches to using the optimized plan as default
