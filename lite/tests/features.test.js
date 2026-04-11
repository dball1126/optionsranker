#!/usr/bin/env node
/**
 * OptionsRanker Lite — feature regression tests
 *
 * Lightweight Node tests that verify the single-page app contains
 * the expected functions, markup and logic for recently-added features.
 *
 * Run: node tests/features.test.js   (from lite/)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const tests = [];
function t(name, fn) { tests.push({ name, fn }); }

// ─────────────────────────────────────────────────────────────
// Watchlist feature (add-feature — 2026-04-10)
// ─────────────────────────────────────────────────────────────
t('Watchlist: markup panel exists on landing page', () => {
  assert.ok(HTML.includes('id="watchlist"'), 'watchlist container missing');
  assert.ok(HTML.includes('id="watchlist-items"'), 'watchlist-items list missing');
  assert.ok(HTML.includes('id="watchlist-clear"'), 'clear button missing');
});

t('Watchlist: star toggle button injected into results header', () => {
  assert.ok(HTML.includes('results-star-toggle'), 'star toggle id missing');
  assert.ok(HTML.includes('class="star-toggle"') || HTML.includes("class = 'star-toggle'") || HTML.includes("'star-toggle'"), 'star-toggle class missing');
});

t('Watchlist: core JS functions defined', () => {
  const required = [
    'function getWatchlist',
    'function saveWatchlist',
    'function isInWatchlist',
    'function addToWatchlist',
    'function removeFromWatchlist',
    'function toggleWatchlist',
    'function renderWatchlist',
    'function updateStarToggle',
  ];
  required.forEach(sig => assert.ok(HTML.includes(sig), `${sig} missing`));
});

t('Watchlist: uses localStorage with stable key', () => {
  assert.ok(HTML.includes("WATCHLIST_KEY = 'optionsranker_watchlist'"), 'WATCHLIST_KEY missing');
  assert.ok(HTML.includes('localStorage.getItem(WATCHLIST_KEY)'), 'getItem missing');
  assert.ok(HTML.includes('localStorage.setItem(WATCHLIST_KEY'), 'setItem missing');
});

t('Watchlist: capped at a max count to prevent bloat', () => {
  assert.ok(/WATCHLIST_MAX\s*=\s*\d+/.test(HTML), 'WATCHLIST_MAX constant missing');
  assert.ok(HTML.includes('slice(0, WATCHLIST_MAX)'), 'list is not sliced to max');
});

t('Watchlist: validates ticker format on add', () => {
  // should reject garbage input via regex
  assert.ok(/\/\^\[A-Z0-9\.\\-\]\{1,8\}\$\//.test(HTML), 'ticker regex validator missing');
});

t('Watchlist: renderWatchlist invoked on load', () => {
  // must be called at script initialization (bottom of watchlist block)
  assert.ok(/renderWatchlist\(\);\s*$/m.test(HTML) || HTML.match(/renderWatchlist\(\);/g)?.length >= 2,
    'renderWatchlist() not invoked at bottom of watchlist block');
});

// ─────────────────────────────────────────────────────────────
// Implied Move feature (update-feature — 2026-04-10)
// ─────────────────────────────────────────────────────────────
t('ImpliedMove: computeImpliedMove function defined', () => {
  assert.ok(HTML.includes('function computeImpliedMove'), 'computeImpliedMove missing');
});

t('ImpliedMove: result object includes impliedMove field', () => {
  assert.ok(HTML.includes('impliedMove'), 'impliedMove field missing in result');
  assert.ok(HTML.includes('impliedMove,') || HTML.includes('impliedMove }'), 'impliedMove not destructured in renderResults');
});

t('ImpliedMove: displayed in IV banner with testid', () => {
  assert.ok(HTML.includes('data-testid="implied-move"'), 'implied-move testid missing');
  assert.ok(HTML.includes('Implied Move'), 'Implied Move label missing');
  assert.ok(HTML.includes('Expected range by'), 'expected range label missing');
});

t('ImpliedMove: CSS styles defined', () => {
  ['iv-implied-move', 'im-row', 'im-label', 'im-value', 'im-range'].forEach(cls => {
    assert.ok(HTML.includes('.' + cls), `CSS class .${cls} missing`);
  });
});

t('ImpliedMove: math — ATM straddle * 0.85 approximates 1-SD move', () => {
  // Port the formula locally and verify it behaves correctly.
  // With S=$100, DTE=30, avgIV=30%:
  //   1-SD move via IV method ≈ 100 * 0.3 * sqrt(30/365) ≈ $8.60
  const S = 100, avgIV = 0.3, dte = 30;
  const expected = S * avgIV * Math.sqrt(dte / 365);
  assert.ok(Math.abs(expected - 8.60) < 0.15, `IV-derived move off: ${expected}`);

  // Straddle method: if ATM call mid = 4.50 and ATM put mid = 4.50
  //   straddle * 0.85 = 9 * 0.85 = 7.65
  const straddleMove = (4.50 + 4.50) * 0.85;
  assert.ok(Math.abs(straddleMove - 7.65) < 1e-9, `straddleMove off: ${straddleMove}`);

  // Confirm the HTML contains the 0.85 calibration factor
  assert.ok(HTML.includes('0.85'), 'straddle calibration factor missing');
});

t('ImpliedMove: falls back to IV estimate when straddle unavailable', () => {
  // Simulated implementation check — the function should set source='iv'
  // when the straddle branch fails.
  assert.ok(HTML.includes("source = 'iv'"), 'iv source fallback missing');
  assert.ok(HTML.includes("source = 'straddle'"), 'straddle source marker missing');
});

// ─────────────────────────────────────────────────────────────
// Exit Plan feature (update-feature — 2026-04-10)
// ─────────────────────────────────────────────────────────────
t('ExitPlan: exit-plan.js script loaded', () => {
  assert.ok(HTML.includes('<script src="exit-plan.js">'), 'exit-plan.js script tag missing');
});

t('ExitPlan: card-exit-row injected with testid', () => {
  assert.ok(HTML.includes('class="card-exit-row"'), 'card-exit-row class missing');
  assert.ok(HTML.includes('data-testid="card-exit-plan"'), 'card-exit-plan testid missing');
  assert.ok(HTML.includes('s.exitPlan.holdDays'), 'holdDays template missing');
  assert.ok(HTML.includes('s.exitPlan.profitTarget'), 'profitTarget template missing');
});

t('ExitPlan: modal exit-plan-section injected with testid', () => {
  assert.ok(HTML.includes('data-testid="exit-plan-section"'), 'exit-plan-section testid missing');
  assert.ok(HTML.includes('class="modal-section exit-plan-section"'), 'exit-plan-section class missing');
  ['Profit Target', 'Stop Loss', 'Time Stop'].forEach(label => {
    assert.ok(HTML.includes(label), `${label} label missing in modal`);
  });
});

t('ExitPlan: scoring loop attaches s.exitPlan via window.computeExitPlan', () => {
  assert.ok(HTML.includes('window.computeExitPlan'), 'window.computeExitPlan reference missing');
  assert.ok(HTML.includes('s.exitPlan = '), 's.exitPlan assignment missing');
});

t('ExitPlan: market pulse cache exposed for engine', () => {
  assert.ok(HTML.includes('window._lastMarketPulse = '), '_lastMarketPulse cache missing');
});

t('ExitPlan: saveStrategy round-trips exit_rules + target_exit_date', () => {
  assert.ok(HTML.includes('exit_rules:'), 'saveStrategy missing exit_rules field');
  assert.ok(HTML.includes('target_exit_date:'), 'saveStrategy missing target_exit_date field');
  assert.ok(HTML.includes('exit_explanation:'), 'saveStrategy missing exit_explanation field');
});

t('ExitPlan: CSS classes defined for card row and modal triggers', () => {
  ['.card-exit-row', '.card-exit-badge', '.exit-plan-section', '.exit-trigger.profit', '.exit-trigger.stop', '.exit-trigger.time', '.exit-factors'].forEach(sel => {
    assert.ok(HTML.includes(sel), `CSS selector ${sel} missing`);
  });
});

// ─────────────────────────────────────────────────────────────
// Timing Optimizer feature (update-feature — 2026-04-10)
// ─────────────────────────────────────────────────────────────
t('TimingOptimizer: timing-optimizer.js script loaded', () => {
  assert.ok(HTML.includes('<script src="timing-optimizer.js">'), 'timing-optimizer.js script tag missing');
});

t('TimingOptimizer: Optimize Timing button + section placeholder', () => {
  assert.ok(HTML.includes('id="optimize-btn"'), 'optimize-btn id missing');
  assert.ok(HTML.includes('openTimingOptimizer(window._modalStrategy)'), 'openTimingOptimizer call missing');
  assert.ok(HTML.includes('id="timing-optimizer-section"'), 'timing-optimizer-section placeholder missing');
});

t('TimingOptimizer: core SPA functions defined', () => {
  ['function openTimingOptimizer', 'function closeTimingOptimizer', 'function renderTimingOptimizerCards', 'function renderTimingCard', 'async function saveOptimizedPlan'].forEach(sig => {
    assert.ok(HTML.includes(sig), `${sig} missing`);
  });
});

t('TimingOptimizer: window.optimizeTimings reference', () => {
  assert.ok(HTML.includes('window.optimizeTimings'), 'window.optimizeTimings not called');
});

t('TimingOptimizer: panel and card data-testids present', () => {
  assert.ok(HTML.includes('data-testid="timing-optimizer-panel"'), 'panel testid missing');
  assert.ok(HTML.includes('data-testid="timing-card-rank-'), 'card testid missing');
});

t('TimingOptimizer: CSS classes defined', () => {
  ['.timing-optimizer-panel', '.timing-card', '.tc-rank-badge', '.tc-stats', '.tc-delta', '.top-card', '.tc-save-btn'].forEach(sel => {
    assert.ok(HTML.includes(sel), `CSS selector ${sel} missing`);
  });
});

t('TimingOptimizer: button rendered inside paid-user branch (sibling to save-btn)', () => {
  // Both buttons must appear in the same div block, gated by userSubscription.active
  const savePos = HTML.indexOf('id="save-btn"');
  const optPos = HTML.indexOf('id="optimize-btn"');
  assert.ok(savePos > 0 && optPos > 0, 'both buttons must exist');
  // The optimize button should appear within ~2KB of the save button (same div block)
  assert.ok(Math.abs(savePos - optPos) < 2000, 'optimize-btn not adjacent to save-btn');
});

t('TimingOptimizer: saveOptimizedPlan reuses saveStrategy pipeline', () => {
  // saveOptimizedPlan should mutate exitPlan and call saveStrategy
  assert.ok(HTML.includes('saveOptimizedPlan'), 'saveOptimizedPlan missing');
  assert.ok(HTML.includes('await saveStrategy(s)') || HTML.includes('saveStrategy(s)'), 'saveStrategy call missing in saveOptimizedPlan');
});

// ─────────────────────────────────────────────────────────────
// Pro Analytics — Phase 1 + 2 + 3 (2026-04-11)
// ─────────────────────────────────────────────────────────────
t('ProAnalytics: options-analytics.js script tag present', () => {
  assert.ok(HTML.includes('<script src="options-analytics.js">'), 'options-analytics.js script missing');
});

t('ProAnalytics: skew computation and badge', () => {
  assert.ok(HTML.includes('window.computeSkew'), 'computeSkew not referenced');
  assert.ok(HTML.includes('data-testid="badge-skew"'), 'skew badge testid missing');
  assert.ok(HTML.includes('skewInfo'), 'skewInfo variable missing');
});

t('ProAnalytics: skew-aware scoring boost', () => {
  assert.ok(HTML.includes('isCreditPut') || HTML.includes('isCreditCall'), 'skew-aware scoring branches missing');
});

t('ProAnalytics: VRP computation in market pulse', () => {
  assert.ok(HTML.includes('window.computeVRP'), 'computeVRP not referenced');
  assert.ok(HTML.includes('window.computeRealizedVol'), 'computeRealizedVol not referenced');
  assert.ok(HTML.includes('data-testid="badge-vrp"'), 'VRP badge testid missing');
  assert.ok(HTML.includes('vrp,') || HTML.includes('vrp:'), 'vrp field in cache missing');
});

t('ProAnalytics: GEX computation for SPY/QQQ', () => {
  assert.ok(HTML.includes('window.computeGEX'), 'computeGEX not referenced');
  assert.ok(HTML.includes('data-testid="badge-gex"'), 'GEX badge testid missing');
});

t('ProAnalytics: skew-adjusted POP wired into scoring loop', () => {
  assert.ok(HTML.includes('window.skewAdjustedProb'), 'skewAdjustedProb not referenced');
  assert.ok(HTML.includes('probLognormal'), 'lognormal prob preservation missing');
});

t('ProAnalytics: bid-ask disqualifier filters strategies', () => {
  assert.ok(HTML.includes('disqualified = true') || HTML.includes('disqualified=true'), 'disqualified flag missing');
  assert.ok(HTML.includes('data-testid="dq-note"'), 'dq-note testid missing');
});

t('ProAnalytics: earnings crush model wired', () => {
  assert.ok(HTML.includes('window.computeEarningsCrushEdge'), 'earnings crush helper not referenced');
  assert.ok(HTML.includes('data-testid="badge-earnings-crush"'), 'earnings crush badge missing');
});

t('ProAnalytics: position sizing card', () => {
  assert.ok(HTML.includes('window.computeKellySize'), 'computeKellySize not referenced');
  assert.ok(HTML.includes('function renderSizingCard'), 'renderSizingCard missing');
  assert.ok(HTML.includes('data-testid="sizing-card"'), 'sizing-card testid missing');
  assert.ok(HTML.includes('data-testid="settings-row"'), 'settings-row testid missing');
  assert.ok(HTML.includes('ACCOUNT_SIZE_KEY'), 'account size storage key missing');
});

t('ProAnalytics: scenario heatmap toggle and renderer', () => {
  assert.ok(HTML.includes('function drawScenarioHeatmap'), 'drawScenarioHeatmap missing');
  assert.ok(HTML.includes('setPayoffMode'), 'setPayoffMode toggle missing');
  assert.ok(HTML.includes('data-testid="heatmap-toggle"'), 'heatmap-toggle testid missing');
  assert.ok(HTML.includes('valueStrategyAtPrice'), 'heatmap should reuse valueStrategyAtPrice');
});

t('ProAnalytics: similar trades pattern matcher in modal', () => {
  assert.ok(HTML.includes('data-testid="similar-trades-section"'), 'similar-trades-section testid missing');
  assert.ok(HTML.includes('async function loadSimilarTrades'), 'loadSimilarTrades function missing');
  assert.ok(HTML.includes('/api/similar-trades'), 'similar-trades API call missing');
});

t('ProAnalytics: portfolio greeks aggregation', () => {
  assert.ok(HTML.includes('data-testid="portfolio-greeks"'), 'portfolio-greeks testid missing');
  assert.ok(HTML.includes('netDelta'), 'netDelta aggregation missing');
});

t('ProAnalytics: roll suggestions section', () => {
  assert.ok(HTML.includes('data-testid="roll-suggestions"'), 'roll-suggestions testid missing');
  assert.ok(HTML.includes('Time Stop Approaching') || HTML.includes('Manage Position'), 'roll suggestions header missing');
});

t('ProAnalytics: wheel tracker MVP', () => {
  assert.ok(HTML.includes('data-testid="wheel-tracker"'), 'wheel-tracker testid missing');
  assert.ok(HTML.includes('function renderWheels'), 'renderWheels missing');
  assert.ok(HTML.includes('function addWheel'), 'addWheel missing');
  assert.ok(HTML.includes('WHEEL_KEY'), 'WHEEL_KEY storage missing');
});

t('ProAnalytics: analytics-row container in IV banner', () => {
  assert.ok(HTML.includes('data-testid="analytics-row"'), 'analytics-row testid missing');
});

t('ProAnalytics: CSS classes for new features', () => {
  ['.analytics-row', '.analytics-badge', '.sizing-card', '.portfolio-greeks', '.similar-trades', '.heatmap-toggle', '.wheel-card', '.dq-note'].forEach(sel => {
    assert.ok(HTML.includes(sel), `CSS selector ${sel} missing`);
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 4 + 5.1 (2026-04-11)
// ─────────────────────────────────────────────────────────────
t('Phase 4.1: comparison drawer + Compare button + functions', () => {
  assert.ok(HTML.includes('data-testid="compare-drawer"'), 'compare-drawer testid missing');
  assert.ok(HTML.includes('id="compare-btn"'), 'compare-btn id missing');
  assert.ok(HTML.includes('function toggleCompare'), 'toggleCompare missing');
  assert.ok(HTML.includes('function renderCompareDrawer'), 'renderCompareDrawer missing');
  assert.ok(HTML.includes('function isInCompare'), 'isInCompare missing');
  assert.ok(HTML.includes('.compare-card'), 'compare-card CSS missing');
});

t('Phase 4.2: term structure + volatility cone', () => {
  assert.ok(HTML.includes('data-testid="term-structure"'), 'term-structure testid missing');
  assert.ok(HTML.includes('data-testid="volatility-cone"'), 'volatility-cone testid missing');
  assert.ok(HTML.includes('termStructure'), 'termStructure variable missing');
  assert.ok(HTML.includes('volCone'), 'volCone variable missing');
  assert.ok(HTML.includes('.term-row') && HTML.includes('.cone-row'), 'term/cone CSS missing');
});

t('Phase 4.3: scenario panel + sliders + functions', () => {
  assert.ok(HTML.includes('data-testid="scenario-panel"'), 'scenario-panel testid missing');
  assert.ok(HTML.includes('function renderScenarioPanel'), 'renderScenarioPanel missing');
  assert.ok(HTML.includes('function updateScenario'), 'updateScenario missing');
  assert.ok(HTML.includes('_scenarioState'), 'scenario state missing');
  assert.ok(HTML.includes('.scenario-controls'), 'scenario CSS missing');
});

t('Phase 4.4: roll optimizer wiring', () => {
  assert.ok(HTML.includes('async function loadRollCandidates'), 'loadRollCandidates missing');
  assert.ok(HTML.includes('window.computeRollCandidates'), 'computeRollCandidates not referenced');
  assert.ok(HTML.includes('id="roll-suggestions-content"'), 'roll-suggestions-content placeholder missing');
  assert.ok(HTML.includes('.roll-card'), 'roll-card CSS missing');
});

t('Phase 4.5: margin requirement in sizing card', () => {
  assert.ok(HTML.includes('window.computeMarginRequirement'), 'computeMarginRequirement not referenced');
  assert.ok(HTML.includes('sc-margin'), 'sc-margin CSS class missing');
});

t('Phase 5.1: alerts UI + functions + button', () => {
  assert.ok(HTML.includes('data-testid="alerts-section"'), 'alerts-section testid missing');
  assert.ok(HTML.includes('id="alert-btn"'), 'alert-btn id missing');
  assert.ok(HTML.includes('async function loadAlerts'), 'loadAlerts missing');
  assert.ok(HTML.includes('async function createAlertForStrategy'), 'createAlertForStrategy missing');
  assert.ok(HTML.includes('async function renderAlertsSection'), 'renderAlertsSection missing');
  assert.ok(HTML.includes('async function deleteAlert'), 'deleteAlert missing');
  assert.ok(HTML.includes('/api/alerts'), '/api/alerts endpoint reference missing');
  assert.ok(HTML.includes('.alert-card'), 'alert-card CSS missing');
});

t('Phase 4+5: render hooks called from results page', () => {
  assert.ok(HTML.includes('renderCompareDrawer()'), 'renderCompareDrawer not invoked');
  assert.ok(HTML.includes('renderScenarioPanel()'), 'renderScenarioPanel not invoked');
  assert.ok(HTML.includes('renderAlertsSection()'), 'renderAlertsSection not invoked');
});

// ─────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────
(async () => {
  let passed = 0, failed = 0;
  const failures = [];
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('  \x1b[32m✓\x1b[0m ' + name);
      passed++;
    } catch (e) {
      console.log('  \x1b[31m✗\x1b[0m ' + name);
      console.log('      ' + e.message);
      failures.push({ name, message: e.message });
      failed++;
    }
  }
  console.log(`\n  ${passed}/${tests.length} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
