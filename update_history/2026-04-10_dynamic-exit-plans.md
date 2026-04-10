# 2026-04-10 — Dynamic Exit Plans (Buy & Sell Timing)

**Timestamp:** 2026-04-10 ~12:15 PM ET

## Why
OptionsRanker told users WHAT to trade but never WHEN to close. The backtester reflected this — 20 paper trades, 0 closed, all just held to expiration. That corrupted the feedback loop: Bull Call Spreads showed 6W/0L on day 2 partly because nothing took profits early. Without exit timing, the scoring engine can't learn from realistic trade outcomes, and users were left to wing it on the part most retail options traders are worst at.

## What

### New shared exit-plan library — `lite/exit-plan.js`
- `exitRules` — 17 strategies × {profit target / stop loss / time stop DTE} per industry standards (tastytrade/OptionAlpha)
- `exitStrategyExplanations` — 1-2 sentence narrative per strategy
- `computeExitPlan(s, ivRank, marketPulse, earningsDays, nowDate)` — multi-factor exit calculator
- `evaluateExitTriggers(row, pnlPerContract, todayStr)` — backtester trigger evaluator
- Dual export: CommonJS for tests + backtester, `window.*` globals for browser SPA

### Dynamic factors (what makes it dynamic)
1. **Multi-trigger** — profit, loss, or time, whichever first
2. **IV-aware** — `ivRank > 50` halves credit profit targets; `ivRank < 30` extends debit time stops 50%
3. **Earnings-aware** — short premium snaps target to day-before-earnings; long premium holds through
4. **Market-Pulse-aware** — info-only soft signal when bullishCount conflicts with strategy sentiment

### `lite/index.html` (SPA wiring)
- Inline-includes `<script src="exit-plan.js">`
- Caches `window._lastMarketPulse = { bullishCount, computedAt }` in `loadMarketPulse()`
- Attaches `s.exitPlan` in the scoring `forEach` loop before sort/dedup
- New `.card-exit-row` rendered after `.card-greeks` showing `Hold ~Xd · Target +$Y · Stop $Z · By YYYY-MM-DD`
- New `.modal-section.exit-plan-section` with 3-cell date grid + 3-cell trigger grid + explanation + dynamic factors list
- New CSS for `.card-exit-row`, `.card-exit-badge`, `.exit-plan-section`, `.exit-trigger.profit/stop/time`, `.exit-factors`

### `lite/functions/api/options-data.js` (saved-strategy round-trip)
- `GET ?action=saved` returns `exit_rules` (parsed JSON), `target_exit_date`, `exit_explanation`
- `POST ?action=save` accepts and stores all three
- SPA `saveStrategy()` posts the new fields; `renderSavedSection()` displays a compact `Hold ~Xd · Target $Y · Stop $Z` line under each saved card

### `lite/schema.sql`
- Added the missing `paper_trades` table CREATE (was created ad-hoc in prod, never in source)
- Added `exit_rules`, `target_exit_date`, `exit_explanation` columns to `saved_strategies`
- Added `idx_pt_status`, `idx_pt_expiry` indexes

### D1 prod migration (run via wrangler)
- `paper_trades`: ADD `exit_reason`, `target_exit_date`, `profit_target`, `stop_loss`
- `saved_strategies`: CREATE TABLE (table did not exist in prod despite being declared in schema.sql)

## Tests
- `lite/tests/exit-plan.test.js` — 11 unit tests for `computeExitPlan` (every strategy returns valid plan, IV adjustments, earnings snap, market pulse signals, null stop_loss for cash-secured puts, etc.)
- `lite/tests/features.test.js` — 7 new HTML.includes assertions for SPA wiring (script tag, card row testid, modal section testid, scoring loop hook, market pulse cache, saveStrategy round-trip, CSS selectors)
- All 20 features.test.js tests pass + 11 new exit-plan tests pass

## Decisions
- **Existing 20 trades NOT backfilled.** They ride to natural expiration with `target_exit_date=NULL`. `evaluateExitTriggers` treats NULL as "no check" and falls through. Zero risk of surprise closes; full migration completes naturally as legacy trades expire by mid-May.
- **Time stop uses strict greater-than** (`todayStr > target_exit_date`) — gives a 1-day grace.
- **Profit target beats stop loss** when both could fire on a gap day.
- **Market Pulse is info-only**, not an auto-close trigger.
- **Calendar/Diagonal time stop** is measured against the FAR expiration (same as every other strategy).

## Deploy
- `https://fcbea6ad.optionsranker.pages.dev` — verified `exit-plan.js` returns 200 + 5 occurrences of new markup in served HTML

## Backtester end-to-end verification
- Ran `daily-routine.js` against D1 prod after migration
- 20 legacy trades (IDs 1-20) marked-to-market, all still `status='open'` with `target_exit_date IS NULL`
- 10 new trades (IDs 21-30) entered with full exit plans:
  - Each row has `target_exit_date`, `profit_target`, `stop_loss` populated
  - Friday report regenerated with new `exit_reason` GROUP BY breakdown
