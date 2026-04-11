#!/usr/bin/env node
/**
 * OptionsRanker Lite — pro analytics unit tests
 *
 * Run: node tests/options-analytics.test.js   (from lite/)
 */

const path = require('path');
const assert = require('assert');
const {
  computeSkew,
  computeRealizedVol,
  computeVRP,
  vrpRegime,
  computeGEX,
  skewAdjustedProb,
  computeKellySize,
  computeEarningsCrushEdge,
} = require(path.join(__dirname, '..', 'options-analytics.js'));

const tests = [];
function t(name, fn) { tests.push({ name, fn }); }

// ─────────────────────────────────────────────────────────────
// computeSkew
// ─────────────────────────────────────────────────────────────
t('computeSkew: returns 0 / unavailable when no contracts', () => {
  const result = computeSkew([], [], 100, 30 / 365);
  assert.strictEqual(result.skew, 0);
  assert.strictEqual(result.available, false);
});

t('computeSkew: positive skew when puts more expensive than calls', () => {
  // Build a simple chain: 25-delta put has IV 0.40, 25-delta call has IV 0.25, ATM = 0.30
  // Spot 100, 30 DTE
  const T = 30 / 365;
  const calls = [
    { strike: 95, impliedVolatility: 0.32 },
    { strike: 100, impliedVolatility: 0.30 },
    { strike: 105, impliedVolatility: 0.27 },
    { strike: 110, impliedVolatility: 0.25 },
    { strike: 115, impliedVolatility: 0.24 },
  ];
  const puts = [
    { strike: 85, impliedVolatility: 0.42 },
    { strike: 90, impliedVolatility: 0.40 },
    { strike: 95, impliedVolatility: 0.35 },
    { strike: 100, impliedVolatility: 0.30 },
    { strike: 105, impliedVolatility: 0.28 },
  ];
  const result = computeSkew(calls, puts, 100, T);
  assert.ok(result.available);
  assert.ok(result.skew > 0, `expected positive skew, got ${result.skew}`);
  assert.ok(result.iv25dPut > result.iv25dCall);
});

t('computeSkew: negative skew when calls more expensive than puts', () => {
  const T = 30 / 365;
  const calls = [
    { strike: 95, impliedVolatility: 0.40 },
    { strike: 100, impliedVolatility: 0.35 },
    { strike: 105, impliedVolatility: 0.42 },
    { strike: 110, impliedVolatility: 0.45 },
  ];
  const puts = [
    { strike: 90, impliedVolatility: 0.28 },
    { strike: 95, impliedVolatility: 0.30 },
    { strike: 100, impliedVolatility: 0.32 },
  ];
  const result = computeSkew(calls, puts, 100, T);
  assert.ok(result.available);
  assert.ok(result.skew < 0, `expected negative skew, got ${result.skew}`);
});

// ─────────────────────────────────────────────────────────────
// computeRealizedVol
// ─────────────────────────────────────────────────────────────
t('computeRealizedVol: returns null for too few prices', () => {
  assert.strictEqual(computeRealizedVol([100]), null);
  assert.strictEqual(computeRealizedVol(null), null);
});

t('computeRealizedVol: zero for flat prices', () => {
  const rv = computeRealizedVol([100, 100, 100, 100, 100, 100]);
  assert.ok(rv != null && rv < 0.001);
});

t('computeRealizedVol: positive for volatile prices', () => {
  const rv = computeRealizedVol([100, 102, 99, 103, 98, 101, 97]);
  assert.ok(rv > 0.1, `expected non-trivial RV, got ${rv}`);
});

// ─────────────────────────────────────────────────────────────
// VRP
// ─────────────────────────────────────────────────────────────
t('computeVRP: vix in % points / RV in decimal', () => {
  // VIX = 20 → 0.20 decimal; RV = 0.15 → VRP = 0.20/0.15 = 1.33
  const vrp = computeVRP(20, 0.15);
  assert.ok(Math.abs(vrp - 1.333) < 0.01, `got ${vrp}`);
});

t('vrpRegime: classification', () => {
  assert.strictEqual(vrpRegime(1.5), 'seller');
  assert.strictEqual(vrpRegime(0.8), 'buyer');
  assert.strictEqual(vrpRegime(1.0), 'neutral');
  assert.strictEqual(vrpRegime(null), 'unknown');
});

// ─────────────────────────────────────────────────────────────
// computeGEX
// ─────────────────────────────────────────────────────────────
t('computeGEX: returns shape', () => {
  const chain = {
    calls: [
      { strike: 100, impliedVolatility: 0.2, openInterest: 1000 },
      { strike: 105, impliedVolatility: 0.2, openInterest: 500 },
    ],
    puts: [
      { strike: 95, impliedVolatility: 0.25, openInterest: 800 },
      { strike: 100, impliedVolatility: 0.2, openInterest: 600 },
    ],
    _T: 30 / 365,
    _avgIV: 0.2,
  };
  const gex = computeGEX(chain, 100);
  assert.ok(gex.available);
  assert.ok(typeof gex.totalGex === 'number');
  assert.ok(typeof gex.gammaFlipStrike === 'number');
  assert.ok(['mean_reverting', 'trending', 'unknown'].includes(gex.regime));
});

// ─────────────────────────────────────────────────────────────
// skewAdjustedProb
// ─────────────────────────────────────────────────────────────
t('skewAdjustedProb: skew=0 reproduces lognormal', () => {
  const noSkew = skewAdjustedProb(100, 95, 30 / 365, 0.30, 0, 'below');
  // Manually compute lognormal P(S_T < 95)
  const T = 30 / 365;
  const sigma = 0.30;
  const r = 0.05;
  const x = (Math.log(95 / 100) + (r - 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  function ncdf(z) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    return 0.5 * (1.0 + sign * y);
  }
  const expected = ncdf(x);
  assert.ok(Math.abs(noSkew - expected) < 0.001, `got ${noSkew}, expected ${expected}`);
});

t('skewAdjustedProb: positive skew increases downside prob (fatter left tail)', () => {
  const noSkew = skewAdjustedProb(100, 95, 30 / 365, 0.30, 0, 'below');
  const withSkew = skewAdjustedProb(100, 95, 30 / 365, 0.30, 0.10, 'below');
  assert.ok(withSkew > noSkew, `skew should fatten downside: ${withSkew} vs ${noSkew}`);
});

// ─────────────────────────────────────────────────────────────
// Kelly sizing
// ─────────────────────────────────────────────────────────────
t('computeKellySize: positive edge sizes positive contracts', () => {
  // R/R = 2:1, prob = 0.6 → Kelly = (2*0.6 - 0.4)/2 = 0.4 → half-Kelly = 0.2 → capped at 0.02
  // $10K account, $200 max loss → $200 risk → 1 contract
  const sizing = computeKellySize(400, 200, 0.6, 10000);
  assert.ok(sizing.contracts >= 1);
  assert.ok(sizing.fraction === 0.02, `expected capped at 2%, got ${sizing.fraction}`);
  assert.ok(sizing.kellyFraction > 0.02);
});

t('computeKellySize: negative edge returns zero contracts', () => {
  // R/R = 1:2 (bad), prob = 0.3 → Kelly negative → 0
  const sizing = computeKellySize(100, 200, 0.3, 10000);
  assert.strictEqual(sizing.contracts, 0);
  assert.strictEqual(sizing.fraction, 0);
});

t('computeKellySize: zero account size defaults to $10K', () => {
  const sizing = computeKellySize(400, 200, 0.6, 0);
  assert.ok(sizing.contracts > 0);
});

// ─────────────────────────────────────────────────────────────
// Earnings crush edge
// ─────────────────────────────────────────────────────────────
t('computeEarningsCrushEdge: overpriced -> sell_premium', () => {
  // Implied move 5*0.85 = 4.25, historical median = 3 → edge = 41% → sell_premium
  const result = computeEarningsCrushEdge(100, 5, [3, 2.8, 3.2, 3.1]);
  assert.strictEqual(result.recommendation, 'sell_premium');
  assert.ok(result.edgePct > 15);
});

t('computeEarningsCrushEdge: underpriced -> buy_premium', () => {
  // Implied move 2*0.85 = 1.7, historical median = 4 → edge = -57% → buy_premium
  const result = computeEarningsCrushEdge(100, 2, [4, 4.2, 3.8, 4.1]);
  assert.strictEqual(result.recommendation, 'buy_premium');
  assert.ok(result.edgePct < -15);
});

t('computeEarningsCrushEdge: insufficient_data without history', () => {
  const result = computeEarningsCrushEdge(100, 5, []);
  assert.strictEqual(result.recommendation, 'insufficient_data');
});

// ─────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────
(async () => {
  let passed = 0, failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('  \x1b[32m\u2713\x1b[0m ' + name);
      passed++;
    } catch (e) {
      console.log('  \x1b[31m\u2717\x1b[0m ' + name);
      console.log('      ' + e.message);
      failed++;
    }
  }
  console.log(`\n  ${passed}/${tests.length} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
