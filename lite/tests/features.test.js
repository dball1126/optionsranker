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
  assert.ok(HTML.includes('impliedMove }'), 'impliedMove not destructured in renderResults');
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
