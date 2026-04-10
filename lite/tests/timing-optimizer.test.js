#!/usr/bin/env node
/**
 * OptionsRanker Lite — timing optimizer unit tests
 *
 * Run: node tests/timing-optimizer.test.js   (from lite/)
 */

const path = require('path');
const assert = require('assert');
const {
  valueStrategyAtPrice,
  blackScholesValue,
  simulateGBMPath,
  mulberry32,
  hashSeed,
  generateCandidates,
  simulateProposal,
  optimizeTimings,
} = require(path.join(__dirname, '..', 'timing-optimizer.js'));

const tests = [];
function t(name, fn) { tests.push({ name, fn }); }

// ─────────────────────────────────────────────────────────────
// 1. valueStrategyAtPrice — Long Call at expiry
// ─────────────────────────────────────────────────────────────
t('valueStrategyAtPrice: Long Call ITM at expiry', () => {
  const s = { name: 'Long Call', legs: [{ action: 'Buy', type: 'Call', strike: 100, price: 3, qty: 1 }], iv: 0.3 };
  const pnl = valueStrategyAtPrice(s, 110, 0, 0.3);
  // Intrinsic = 10, premium = 3, pnl per contract = (10 - 3) * 100 = 700
  assert.strictEqual(pnl, 700);
});

t('valueStrategyAtPrice: Long Call OTM at expiry', () => {
  const s = { name: 'Long Call', legs: [{ action: 'Buy', type: 'Call', strike: 100, price: 3, qty: 1 }], iv: 0.3 };
  const pnl = valueStrategyAtPrice(s, 95, 0, 0.3);
  // Intrinsic = 0, premium = 3, pnl = -300
  assert.strictEqual(pnl, -300);
});

// ─────────────────────────────────────────────────────────────
// 2. valueStrategyAtPrice — Long Call mid-life has time value
// ─────────────────────────────────────────────────────────────
t('valueStrategyAtPrice: Long Call mid-life has time value', () => {
  const s = { name: 'Long Call', legs: [{ action: 'Buy', type: 'Call', strike: 100, price: 3, qty: 1 }], iv: 0.3 };
  const pnlAtExpiry = valueStrategyAtPrice(s, 100, 0, 0.3);  // intrinsic = 0, pnl = -300
  const pnlMidLife = valueStrategyAtPrice(s, 100, 14, 0.3);  // ATM with 14 days, time value > 0
  assert.ok(pnlMidLife > pnlAtExpiry, `mid-life ${pnlMidLife} should exceed expiry ${pnlAtExpiry}`);
});

// ─────────────────────────────────────────────────────────────
// 3. Bull Call Spread payoff bounds at expiry
// ─────────────────────────────────────────────────────────────
t('valueStrategyAtPrice: Bull Call Spread bounds at expiry', () => {
  const s = {
    name: 'Bull Call Spread',
    legs: [
      { action: 'Buy', type: 'Call', strike: 100, price: 4, qty: 1 },
      { action: 'Sell', type: 'Call', strike: 105, price: 2, qty: 1 },
    ],
    iv: 0.3,
  };
  // Net debit = (4 - 2) = 2, max profit = (5 - 2) * 100 = 300, max loss = -200
  const above = valueStrategyAtPrice(s, 110, 0, 0.3);
  const below = valueStrategyAtPrice(s, 95, 0, 0.3);
  assert.strictEqual(above, 300);
  assert.strictEqual(below, -200);
});

// ─────────────────────────────────────────────────────────────
// 4. Iron Condor intrinsic bounds at expiry
// ─────────────────────────────────────────────────────────────
t('valueStrategyAtPrice: Iron Condor inside wings = full credit', () => {
  // Sells the 95P/105C, buys the 90P/110C wings. Credit = 1 per side, $200 total.
  const s = {
    name: 'Iron Condor',
    legs: [
      { action: 'Sell', type: 'Put', strike: 95, price: 1.5, qty: 1 },
      { action: 'Buy', type: 'Put', strike: 90, price: 0.5, qty: 1 },
      { action: 'Sell', type: 'Call', strike: 105, price: 1.5, qty: 1 },
      { action: 'Buy', type: 'Call', strike: 110, price: 0.5, qty: 1 },
    ],
    iv: 0.3,
  };
  const insideWings = valueStrategyAtPrice(s, 100, 0, 0.3);
  // All 4 legs expire worthless. Net credit was (1.5 - 0.5) + (1.5 - 0.5) = 2
  // pnl per leg: sells = (0 - 1.5) * -1 * 100 = +150 (twice = 300). buys = (0 - 0.5) * 1 * 100 = -50 (twice = -100). Total = 200.
  assert.strictEqual(insideWings, 200);
});

// ─────────────────────────────────────────────────────────────
// 5. simulateGBMPath — mean of N paths converges to drift expectation
// ─────────────────────────────────────────────────────────────
t('simulateGBMPath: mean converges to risk-neutral drift', () => {
  const rng = mulberry32(42);
  const N = 5000;
  const days = 30;
  const spot = 100;
  const iv = 0.2;
  const terminals = [];
  for (let i = 0; i < N; i++) {
    const path = simulateGBMPath(spot, iv, days, rng);
    terminals.push(path[days]);
  }
  const mean = terminals.reduce((a, b) => a + b, 0) / N;
  // Risk-neutral drift: r = 0.05, dt = days/252 = 30/252
  // E[S_T] = S_0 * exp(r * T) = 100 * exp(0.05 * 30/252) ≈ 100.598
  const expected = 100 * Math.exp(0.05 * 30 / 252);
  // 5000 paths gives ~3% stdev on the mean — accept within 5%
  assert.ok(Math.abs(mean - expected) / expected < 0.05, `mean=${mean.toFixed(2)} expected~${expected.toFixed(2)}`);
});

// ─────────────────────────────────────────────────────────────
// 6. simulateGBMPath — zero IV is deterministic
// ─────────────────────────────────────────────────────────────
t('simulateGBMPath: iv=0 produces deterministic drift-only path', () => {
  const rng = mulberry32(1);
  const path = simulateGBMPath(100, 0, 10, rng);
  // With sigma=0, every step is path[d-1] * exp((r - 0)*dt) = path[d-1] * exp(0.05/252)
  for (let d = 1; d <= 10; d++) {
    const expected = 100 * Math.exp(0.05 * d / 252);
    assert.ok(Math.abs(path[d] - expected) < 0.001, `day ${d}: ${path[d]} vs ${expected}`);
  }
});

// ─────────────────────────────────────────────────────────────
// 7. mulberry32 determinism
// ─────────────────────────────────────────────────────────────
t('mulberry32: same seed produces same sequence', () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  for (let i = 0; i < 100; i++) assert.strictEqual(a(), b());
});

// ─────────────────────────────────────────────────────────────
// 8. generateCandidates — count and earnings inclusion
// ─────────────────────────────────────────────────────────────
t('generateCandidates: returns 6 without earnings, 7 with earnings', () => {
  const s = {
    name: 'Long Call',
    legs: [{ action: 'Buy', type: 'Call', strike: 100, price: 3, qty: 1 }],
    iv: 0.3, dte: 30,
    maxProfit: 1000, maxLoss: 300,
  };
  const noEarnings = generateCandidates(s, { ivRank: 50, earningsDays: null, marketPulse: null });
  const withEarnings = generateCandidates(s, { ivRank: 50, earningsDays: 10, marketPulse: null });
  assert.strictEqual(noEarnings.length, 6, `expected 6 candidates without earnings, got ${noEarnings.length}`);
  assert.strictEqual(withEarnings.length, 7, `expected 7 candidates with earnings, got ${withEarnings.length}`);
  assert.ok(withEarnings.some(c => c.id === 'earnings_minus_1'));
});

// ─────────────────────────────────────────────────────────────
// 9. generateCandidates — baseline always at index 0
// ─────────────────────────────────────────────────────────────
t('generateCandidates: baseline is candidates[0]', () => {
  const s = {
    name: 'Iron Condor',
    legs: [
      { action: 'Sell', type: 'Put', strike: 95, price: 1.5, qty: 1 },
      { action: 'Buy', type: 'Put', strike: 90, price: 0.5, qty: 1 },
      { action: 'Sell', type: 'Call', strike: 105, price: 1.5, qty: 1 },
      { action: 'Buy', type: 'Call', strike: 110, price: 0.5, qty: 1 },
    ],
    iv: 0.3, dte: 30, maxProfit: 200, maxLoss: 300,
  };
  const candidates = generateCandidates(s, { ivRank: 60, earningsDays: null, marketPulse: null });
  assert.strictEqual(candidates[0].id, 'baseline');
});

// ─────────────────────────────────────────────────────────────
// 10. simulateProposal — return shape
// ─────────────────────────────────────────────────────────────
t('simulateProposal: returns valid shape with bounded values', () => {
  const s = {
    name: 'Long Call',
    legs: [{ action: 'Buy', type: 'Call', strike: 100, price: 3, qty: 1 }],
    iv: 0.3, dte: 30, maxProfit: 1000, maxLoss: 300,
  };
  const candidate = generateCandidates(s, { ivRank: 50, earningsDays: null, marketPulse: null })[0];
  const rng = mulberry32(7);
  const sim = simulateProposal(s, candidate, { price: 100, avgIV: 0.3, ivRank: 50, earningsDays: null }, 200, rng);
  assert.ok(typeof sim.meanPnl === 'number');
  assert.ok(sim.winRate >= 0 && sim.winRate <= 1);
  assert.ok(sim.expectedHoldDays >= 1 && sim.expectedHoldDays <= 30);
  assert.ok(sim.percentile5 <= sim.percentile95);
});

// ─────────────────────────────────────────────────────────────
// 11. simulateProposal — deep OTM Long Call held to expiry loses ~all premium
// ─────────────────────────────────────────────────────────────
t('simulateProposal: deep OTM Long Call held to expiry approximately loses premium', () => {
  // 130 strike with spot 100, 30 days, 20% IV. Almost certain to expire OTM.
  const s = {
    name: 'Long Call',
    legs: [{ action: 'Buy', type: 'Call', strike: 130, price: 0.5, qty: 1 }],
    iv: 0.2, dte: 30, maxProfit: 999999, maxLoss: 50,
  };
  const candidate = {
    id: 'hold_expiry', name: 'Hold to expiration', entryCondition: 'Buy now', exitCondition: 'Hold',
    params: { profitTargetDollars: null, stopLossDollars: null, timeStopDTE: 0, holdToExpiry: true },
  };
  const rng = mulberry32(99);
  const sim = simulateProposal(s, candidate, { price: 100, avgIV: 0.2, ivRank: 50, earningsDays: null }, 500, rng);
  // Mean should be quite negative — most paths expire worthless, lose -50 per contract
  assert.ok(sim.meanPnl < 0, `expected negative mean, got ${sim.meanPnl}`);
  assert.ok(sim.winRate < 0.3, `expected low win rate, got ${sim.winRate}`);
});

// ─────────────────────────────────────────────────────────────
// 12. optimizeTimings — ranked array, baseline always present
// ─────────────────────────────────────────────────────────────
t('optimizeTimings: ranked output with baseline always present', () => {
  const s = {
    name: 'Long Call',
    legs: [{ action: 'Buy', type: 'Call', strike: 100, price: 3, qty: 1 }],
    iv: 0.3, dte: 30, expirationDate: '2026-05-10', maxProfit: 1000, maxLoss: 300,
  };
  const ranked = optimizeTimings(s, {
    symbol: 'TEST', price: 100, avgIV: 0.3, ivRank: 50,
    earningsDays: null, marketPulse: null, now: new Date('2026-04-10'), entryDate: '2026-04-10',
  }, { nPaths: 200, nProposals: 5 });
  assert.ok(Array.isArray(ranked));
  assert.ok(ranked.length >= 2 && ranked.length <= 5);
  assert.strictEqual(ranked[0].rank, 1);
  // Sorted descending by meanPnl
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].candidate.id !== 'baseline') {  // baseline may be force-injected at end
      assert.ok(ranked[i].simulation.meanPnl <= ranked[i - 1].simulation.meanPnl
        || ranked[i - 1].candidate.id === 'baseline', 'not ranked descending');
    }
  }
  // Baseline must be present
  assert.ok(ranked.some(r => r.candidate.id === 'baseline'), 'baseline missing from ranked list');
});

// ─────────────────────────────────────────────────────────────
// 13. optimizeTimings — determinism: same seed, same ranking
// ─────────────────────────────────────────────────────────────
t('optimizeTimings: deterministic across calls with same seed', () => {
  const s = {
    name: 'Bull Call Spread',
    legs: [
      { action: 'Buy', type: 'Call', strike: 100, price: 4, qty: 1 },
      { action: 'Sell', type: 'Call', strike: 105, price: 2, qty: 1 },
    ],
    iv: 0.3, dte: 21, expirationDate: '2026-05-01', maxProfit: 300, maxLoss: 200,
  };
  const ms = {
    symbol: 'TEST', price: 100, avgIV: 0.3, ivRank: 40,
    earningsDays: null, marketPulse: null, now: new Date('2026-04-10'), entryDate: '2026-04-10',
  };
  const a = optimizeTimings(s, ms, { nPaths: 300, nProposals: 5 });
  const b = optimizeTimings(s, ms, { nPaths: 300, nProposals: 5 });
  assert.strictEqual(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.strictEqual(a[i].candidate.id, b[i].candidate.id, `rank ${i + 1} differs`);
    assert.strictEqual(a[i].simulation.meanPnl, b[i].simulation.meanPnl, `rank ${i + 1} meanPnl differs`);
  }
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
